def devolver_estoque_da_venda(pedido):
    """Restores inventory once when a non-cancelled sale is cancelled."""
    if pedido.tipo != 'Venda' or pedido.status == 'Cancelado':
        return
    for item in pedido.itens:
        if item.produto:
            item.produto.estoque += item.quantidade
            item.produto.disponivel = True
