from datetime import date, datetime
from decimal import Decimal
from backend.models.pedido import Pedido
from backend.repositories.pedido_repository import PedidoRepository
from backend.repositories.produto_repository import ProdutoRepository
from backend.repositories.user_repository import UserRepository
from backend.repositories.loja_repository import LojaRepository
from backend.services.validation import inteiro, positivo, texto
from backend.services.errors import ServiceError
class CriarPedidoService:
    def executar(self, dados):
        user_id = inteiro(dados.get('user_id'), 'Cliente')
        loja_id = inteiro(dados.get('loja_id'), 'Loja')
        user = UserRepository.buscar_por_id(user_id)
        if not user or user.tipo != 'cliente': raise ServiceError('Cliente não encontrado.', 404)
        loja = LojaRepository.buscar_por_id(loja_id)
        if not loja: raise ServiceError('Loja não encontrada.', 404)
        if not loja.ativa: raise ServiceError('Esta loja não está recebendo pedidos no momento.')
        tipo = dados.get('tipo', 'Venda')
        if tipo not in {'Venda','Locacao'}: raise ServiceError('Selecione Venda ou Locacao.')
        inicio_locacao = fim_locacao = None
        dias_do_periodo = None
        if tipo == 'Locacao' and (dados.get('data_inicio_locacao') or dados.get('data_fim_locacao')):
            try:
                inicio_locacao = date.fromisoformat(str(dados.get('data_inicio_locacao') or ''))
                fim_locacao = date.fromisoformat(str(dados.get('data_fim_locacao') or ''))
            except ValueError:
                raise ServiceError('Informe datas válidas para retirada e devolução.')
            if inicio_locacao < date.today():
                raise ServiceError('A retirada não pode estar no passado.')
            dias_do_periodo = (fim_locacao - inicio_locacao).days
            if not 1 <= dias_do_periodo <= 366:
                raise ServiceError('A devolução deve ocorrer depois da retirada, em até 366 dias.')
        items = dados.get('itens')
        if not isinstance(items, list) or not 1 <= len(items) <= 100:
            raise ServiceError('Inclua entre 1 e 100 itens no pedido.')
        total = Decimal('0')
        validated = []
        produtos_validados = []
        produtos_no_pedido = set()
        for item in items:
            if not isinstance(item, dict): raise ServiceError('Item do pedido inválido.')
            produto = ProdutoRepository.buscar_por_id(inteiro(item.get('produto_id'), 'Produto'))
            if not produto or produto.loja_id != loja_id: raise ServiceError('Produto não encontrado nesta loja.', 404)
            if produto.id in produtos_no_pedido:
                raise ServiceError('Cada produto deve aparecer apenas uma vez no pedido.')
            produtos_no_pedido.add(produto.id)
            enabled = produto.disponivel_venda if tipo == 'Venda' else produto.disponivel_locacao
            if not produto.disponivel or not enabled or produto.status_manutencao:
                raise ServiceError(f'{produto.nome} está indisponível para esta operação.')
            quantidade = inteiro(item.get('quantidade',1), 'Quantidade')
            if quantidade > produto.estoque:
                raise ServiceError(f'{produto.nome}: há somente {produto.estoque} {produto.unidade or "un"} em estoque.')
            dias = dias_do_periodo or (inteiro(item.get('dias_locacao',1), 'Dias de locação') if tipo == 'Locacao' else 1)
            preco = positivo(produto.preco_venda if tipo == 'Venda' else produto.preco_locacao, 'Preço')
            total += Decimal(str(preco)) * quantidade * dias
            validated.append(dict(produto_id=produto.id, quantidade=quantidade, dias_locacao=dias, valor_unitario=preco))
            produtos_validados.append((produto, quantidade))
        if total > 1000000000: raise ServiceError('Valor do pedido excede o limite permitido.')
        pagamento = texto(dados.get('forma_pagamento') or 'Não informado', 'Pagamento', maximum=30)
        endereco = dados.get('endereco_entrega') or ''
        observacao = dados.get('observacao') or ''
        if not isinstance(endereco, str) or not isinstance(observacao, str): raise ServiceError('Endereço e observação devem ser texto.')
        if len(endereco.strip()) > 250: raise ServiceError('Endereço deve ter no máximo 250 caracteres.')
        if len(observacao.strip()) > 1000: raise ServiceError('Observação deve ter no máximo 1000 caracteres.')
        pedido = Pedido(user_id=user_id, loja_id=loja_id, tipo=tipo, status='Pendente',
            valor_total=float(total.quantize(Decimal('0.01'))), forma_pagamento=pagamento,
            endereco_entrega=endereco.strip(), observacao=observacao.strip(),
            data_inicio_locacao=inicio_locacao.isoformat() if inicio_locacao else None,
            data_fim_locacao=fim_locacao.isoformat() if fim_locacao else None,
            created_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        if tipo == 'Venda':
            for produto, quantidade in produtos_validados:
                produto.estoque -= quantidade
                if produto.estoque == 0 and not produto.disponivel_locacao:
                    produto.disponivel = False
        return PedidoRepository.criar_com_itens(pedido, validated).to_dict(incluir_itens=True)
