from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func
from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from backend.models.produto import Produto
from backend.models.user import User
from backend.services.acesso import AcessoService
from backend.services.errors import ServiceError


class GerarRelatorioFiltradoService:
    # O sistema não registra liquidação financeira. Confirmado é status operacional.
    REGRA = ('Valores de pedidos Confirmados, Despachados e Entregues; não representam '
             'pagamento comprovado. Pendentes e cancelados aparecem na lista, mas não nos totais.')
    CONFIRMADOS = {'Confirmado', 'Despachado', 'Entregue'}
    ORDENACOES = {'mais_vendidos', 'menos_vendidos', 'maior_faturamento',
                 'menor_faturamento', 'sem_vendas', 'recentes'}

    def executar(self, user_id, filtros):
        loja = AcessoService().loja(user_id)
        if filtros.get('loja') and str(loja.id) != str(filtros['loja']):
            raise ServiceError('Você não tem acesso a esta loja.', 403)
        if filtros.get('status_pagamento') or filtros.get('vendedor'):
            raise ServiceError('Este sistema ainda não registra status de pagamento ou vendedor por pedido.')
        hoje = date.today()
        try:
            inicio = date.fromisoformat(filtros.get('inicio') or (hoje - timedelta(days=29)).isoformat())
            fim = date.fromisoformat(filtros.get('fim') or hoje.isoformat())
        except (ValueError, TypeError):
            raise ServiceError('Informe datas válidas.')
        if inicio > fim or (fim - inicio).days > 366:
            raise ServiceError('Selecione um período válido de até 366 dias.')
        ordenacao = filtros.get('ordenacao') or 'mais_vendidos'
        criterio = filtros.get('criterio') or 'quantidade'
        limite = filtros.get('limite') or '10'
        if ordenacao not in self.ORDENACOES or criterio not in {'quantidade', 'faturamento'} or str(limite) not in {'5', '10', '20', 'todos'}:
            raise ServiceError('Selecione uma ordenação, critério e limite válidos.')
        try:
            ids = sorted({int(valor) for valor in (filtros.get('produtos') or '').split(',') if valor.strip()})
        except (ValueError, AttributeError):
            raise ServiceError('Selecione produtos válidos.')
        if len(ids) > 2000 or any(valor <= 0 for valor in ids):
            raise ServiceError('Seleção de produtos inválida.')
        produtos = Produto.query.filter_by(loja_id=loja.id)
        if ids:
            permitidos = {p.id for p in produtos.filter(Produto.id.in_(ids)).all()}
            if permitidos != set(ids):
                raise ServiceError('Há produtos indisponíveis para sua loja na seleção.', 403)
            produtos = produtos.filter(Produto.id.in_(ids))
        categoria = (filtros.get('categoria') or '').strip()
        produto = (filtros.get('produto') or '').strip()
        if categoria:
            produtos = produtos.filter(func.lower(Produto.categoria) == categoria.lower())
        if produto:
            produtos = produtos.filter(Produto.nome.icontains(produto, autoescape=True))
        catalogo = produtos.order_by(Produto.nome).all()
        inicio_dt = datetime.combine(inicio, datetime.min.time())
        fim_dt = datetime.combine(fim + timedelta(days=1), datetime.min.time())
        consulta = (Pedido.query.join(User, Pedido.user_id == User.id)
                    .filter(Pedido.loja_id == loja.id,
                            Pedido.created_at >= inicio_dt,
                            Pedido.created_at < fim_dt))
        for chave, campo, valores in (
            ('tipo', Pedido.tipo, {'Venda', 'Locacao'}),
            ('status', Pedido.status, self.CONFIRMADOS | {'Pendente', 'Cancelado'}),
        ):
            if filtros.get(chave):
                if filtros[chave] not in valores:
                    raise ServiceError('Modalidade ou status inválido.')
                consulta = consulta.filter(campo == filtros[chave])
        if filtros.get('pagamento'):
            consulta = consulta.filter(Pedido.forma_pagamento == filtros['pagamento'])
        if filtros.get('cliente'):
            consulta = consulta.filter(User.nome.icontains(filtros['cliente'], autoescape=True))
        if filtros.get('regiao'):
            consulta = consulta.filter(Pedido.endereco_entrega.icontains(filtros['regiao'], autoescape=True))
        # Filtragem no SQL e projeção única evitam consultas por item/cliente.
        linhas = (consulta.join(ItemPedidos, ItemPedidos.pedido_id == Pedido.id)
                  .filter(ItemPedidos.produto_id.in_(produtos.with_entities(Produto.id)))
                  .with_entities(Pedido.id, Pedido.created_at, User.nome, Pedido.tipo,
                                 Pedido.status, Pedido.forma_pagamento, ItemPedidos.produto_id,
                                 ItemPedidos.quantidade, ItemPedidos.valor_unitario, ItemPedidos.dias_locacao)
                  .order_by(Pedido.created_at.desc(), Pedido.id.desc()).all())
        pedidos = {}
        ranking = {p.id: {'nome': p.nome, 'categoria': p.categoria or 'Sem categoria',
                         'sku': p.sku or '', 'quantidade': 0, 'faturamento': Decimal('0'),
                         'ultima_venda': ''} for p in catalogo}
        diario = defaultdict(lambda: {'vendas': Decimal('0'), 'locacoes': Decimal('0')})
        for pid, instante, cliente, tipo, status, pagamento, produto_id, quantidade, unitario, dias in linhas:
            data = instante.date().isoformat()
            valor = (Decimal(str(unitario)) * quantidade * (dias or 1)).quantize(Decimal('0.01'))
            linha = pedidos.setdefault(pid, {'pedido': pid, 'data': str(instante), 'cliente': cliente,
                                            'tipo': tipo, 'status': status, 'pagamento': pagamento,
                                            'total': Decimal('0'), 'quantidade': 0})
            if status in self.CONFIRMADOS:
                linha['total'] += valor
                linha['quantidade'] += quantidade
                diario[data]['vendas' if tipo == 'Venda' else 'locacoes'] += valor
                item = ranking[produto_id]
                item['quantidade'] += quantidade
                item['faturamento'] += valor
                item['ultima_venda'] = max(item['ultima_venda'], str(instante))
        validos = [p for p in pedidos.values() if p['status'] in self.CONFIRMADOS]
        total = sum((p['total'] for p in validos), Decimal('0'))
        campo = 'faturamento' if 'faturamento' in ordenacao else criterio
        resultados = list(ranking.values())
        if ordenacao == 'sem_vendas':
            resultados = [p for p in resultados if p['quantidade'] == 0]
        elif ordenacao == 'recentes':
            resultados.sort(key=lambda p: (p['ultima_venda'], p['nome']), reverse=True)
        else:
            resultados.sort(key=lambda p: (-p[campo] if ordenacao in {'mais_vendidos', 'maior_faturamento'} else p[campo], p['nome']))
        todos_ranking = [{**p, 'faturamento': float(p['faturamento'])} for p in resultados]
        filtros_aplicados = {k: v for k, v in filtros.items() if v}
        filtros_aplicados.update(inicio=inicio.isoformat(), fim=fim.isoformat(), ordenacao=ordenacao, criterio=criterio, limite=str(limite))
        return {
            'periodo': {'inicio': inicio.isoformat(), 'fim': fim.isoformat()},
            'gerado_em': datetime.now().isoformat(timespec='seconds'), 'regra': self.REGRA,
            'filtros': filtros_aplicados, 'loja': {'id': loja.id, 'nome': loja.nome},
            'produtos_selecionados': [p.nome for p in catalogo] if ids else [],
            'resumo': {'total_vendido': float(total), 'quantidade_vendas': len(validos),
                       'quantidade_pedidos': len(pedidos),
                       'ticket_medio': float((total / len(validos)).quantize(Decimal('0.01'))) if validos else 0,
                       'produtos_vendidos': sum(p['quantidade'] for p in validos)},
            'serie': [{'data': d, **{k: float(v) for k, v in valores.items()}} for d, valores in sorted(diario.items())],
            'pedidos': [{**p, 'total': float(p['total'])} for p in pedidos.values()],
            'ranking': todos_ranking if limite == 'todos' else todos_ranking[:int(limite)],
            'ranking_completo': todos_ranking,
        }
