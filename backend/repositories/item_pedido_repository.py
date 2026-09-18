from backend.models.item_pedidos import ItemPedidos
class ItemPedidoRepository:
    @staticmethod
    def existe_produto(produto_id):
        return ItemPedidos.query.filter_by(produto_id=produto_id).first() is not None
