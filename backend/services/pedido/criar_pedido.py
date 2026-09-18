from datetime import datetime
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
        if not LojaRepository.buscar_por_id(loja_id): raise ServiceError('Loja não encontrada.', 404)
        tipo = dados.get('tipo', 'Venda')
        if tipo not in {'Venda','Locacao'}: raise ServiceError('Selecione Venda ou Locacao.')
        items = dados.get('itens')
        if not isinstance(items, list) or not 1 <= len(items) <= 100:
            raise ServiceError('Inclua entre 1 e 100 itens no pedido.')
        total = Decimal('0')
        validated = []
        for item in items:
            if not isinstance(item, dict): raise ServiceError('Item do pedido inválido.')
            produto = ProdutoRepository.buscar_por_id(inteiro(item.get('produto_id'), 'Produto'))
            if not produto or produto.loja_id != loja_id: raise ServiceError('Produto não encontrado nesta loja.', 404)
            enabled = produto.disponivel_venda if tipo == 'Venda' else produto.disponivel_locacao
            if not produto.disponivel or not enabled or produto.status_manutencao:
                raise ServiceError(f'{produto.nome} está indisponível para esta operação.')
            quantidade = inteiro(item.get('quantidade',1), 'Quantidade')
            dias = inteiro(item.get('dias_locacao',1), 'Dias de locação') if tipo == 'Locacao' else 1
            preco = positivo(produto.preco_venda if tipo == 'Venda' else produto.preco_locacao, 'Preço')
            total += Decimal(str(preco)) * quantidade * dias
            validated.append(dict(produto_id=produto.id, quantidade=quantidade, dias_locacao=dias, valor_unitario=preco))
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
            created_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        return PedidoRepository.criar_com_itens(pedido, validated).to_dict(incluir_itens=True)
