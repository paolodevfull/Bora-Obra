from backend.models.pedido import Pedido


class ListarPedidosService:
    def executar(self, user_id=None):
        if user_id:
            pedidos = Pedido.query.filter_by(user_id=user_id).all()
        else:
            pedidos = Pedido.listar_todos()
        return [p.to_dict() for p in pedidos]
