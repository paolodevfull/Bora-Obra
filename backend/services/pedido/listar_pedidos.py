from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from sqlalchemy.orm import joinedload, selectinload
class ListarPedidosService:
    def executar(self, user_id=None, loja_id=None):
        filters = {}
        if user_id is not None: filters['user_id'] = user_id
        if loja_id is not None: filters['loja_id'] = loja_id
        query = Pedido.query.filter_by(**filters).options(
            joinedload(Pedido.cliente),
            joinedload(Pedido.loja),
            selectinload(Pedido.itens).joinedload(ItemPedidos.produto),
        ).order_by(Pedido.id.desc())
        pedidos = []
        for pedido in query.all():
            dados = pedido.to_dict(incluir_itens=True)
            dados['pode_cancelar'] = user_id is not None and pedido.status == 'Pendente'
            pedidos.append(dados)
        return pedidos
