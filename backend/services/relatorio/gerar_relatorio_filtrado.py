from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import joinedload, selectinload
from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from backend.services.acesso import AcessoService
from backend.services.errors import ServiceError


class GerarRelatorioFiltradoService:
    def executar(self, user_id, filtros):
        loja = AcessoService().loja(user_id)
        hoje = date.today()
        inicio_padrao = hoje - timedelta(days=29)
        try:
            inicio = date.fromisoformat(filtros.get('inicio') or inicio_padrao.isoformat())
            fim = date.fromisoformat(filtros.get('fim') or hoje.isoformat())
        except ValueError:
            raise ServiceError('Período inválido.')
        if inicio > fim or (fim - inicio).days > 366:
            raise ServiceError('Selecione um período válido de até 366 dias.')
        query = Pedido.query.filter(
            Pedido.loja_id == loja.id,
            Pedido.created_at >= f'{inicio.isoformat()} 00:00:00',
            Pedido.created_at <= f'{fim.isoformat()} 23:59:59',
        )
        tipo, status, pagamento = filtros.get('tipo'), filtros.get('status'), filtros.get('pagamento')
        produto, categoria = (filtros.get('produto') or '').casefold(), (filtros.get('categoria') or '').casefold()
        cliente = (filtros.get('cliente') or '').casefold()
        if tipo: query = query.filter(Pedido.tipo == tipo)
        if status: query = query.filter(Pedido.status == status)
        if pagamento: query = query.filter(Pedido.forma_pagamento == pagamento)
        pedidos = query.options(
            joinedload(Pedido.cliente),
            selectinload(Pedido.itens).joinedload(ItemPedidos.produto),
        ).order_by(Pedido.created_at).all()
        selecionados = []
        for pedido in pedidos:
            try: data = datetime.fromisoformat(str(pedido.created_at).replace(' ', 'T')).date()
            except ValueError: continue
            if cliente and cliente not in (pedido.cliente.nome if pedido.cliente else '').casefold(): continue
            itens = [item for item in pedido.itens if (not produto or produto in (item.produto.nome if item.produto else '').casefold()) and (not categoria or categoria == (item.produto.categoria if item.produto else '').casefold())]
            if (produto or categoria) and not itens: continue
            selecionados.append((pedido, data, itens or pedido.itens))
        validos = [(p, d, i) for p, d, i in selecionados if p.status != 'Cancelado']
        filtra_itens = bool(produto or categoria)
        def valor_considerado(pedido, itens):
            if not filtra_itens:
                return Decimal(str(pedido.valor_total))
            return sum((Decimal(str(item.valor_unitario)) * item.quantidade * item.dias_locacao for item in itens), Decimal('0'))
        total = float(sum((valor_considerado(p, i) for p, _, i in validos), Decimal('0')).quantize(Decimal('0.01')))
        diario = defaultdict(lambda: {'vendas': 0.0, 'locacoes': 0.0})
        produtos_vendidos = 0
        linhas = []
        for pedido, data, itens in selecionados:
            if pedido.status != 'Cancelado':
                diario[data.isoformat()]['vendas' if pedido.tipo == 'Venda' else 'locacoes'] += float(valor_considerado(pedido, itens))
                produtos_vendidos += sum(item.quantidade for item in itens)
            linhas.append({'pedido': pedido.id, 'data': data.isoformat(), 'cliente': pedido.cliente.nome if pedido.cliente else 'Cliente removido', 'tipo': pedido.tipo, 'status': pedido.status, 'pagamento': pedido.forma_pagamento, 'total': float(valor_considerado(pedido, itens)) if pedido.status != 'Cancelado' else 0})
        resumo = {'total_vendido': total, 'quantidade_vendas': len(validos), 'quantidade_pedidos': len(validos), 'ticket_medio': round(total / len(validos), 2) if validos else 0, 'produtos_vendidos': produtos_vendidos}
        return {'periodo': {'inicio': inicio.isoformat(), 'fim': fim.isoformat()}, 'filtros': {k: v for k, v in filtros.items() if v}, 'resumo': resumo, 'serie': [{'data': data, **valores} for data, valores in sorted(diario.items())], 'pedidos': linhas}
