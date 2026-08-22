from backend.models.pedido import Pedido

class ListarPedidosService:
    def executar(self):
        pedidos = Pedido.listar_todos()
        return [p.to_dict() for p in pedidos]