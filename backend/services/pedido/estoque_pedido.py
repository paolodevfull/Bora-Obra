from backend.repositories.produto_repository import ProdutoRepository


def bloquear_produtos_do_pedido(pedido):
    """Serialize stock changes for cancellation and prevent lost updates."""
    ids = [item.produto_id for item in pedido.itens if item.produto_id]
    if ids:
        ProdutoRepository.buscar_ids_para_atualizacao(ids)


def devolver_estoque_da_venda(pedido):
    """Restores inventory once when a non-cancelled sale is cancelled."""
    if pedido.tipo != 'Venda' or pedido.status == 'Cancelado':
        return
    bloquear_produtos_do_pedido(pedido)
    for item in pedido.itens:
        if item.produto:
            item.produto.estoque += item.quantidade
            item.produto.disponivel = True
