from backend.services.acesso import AcessoService
from backend.services.pedido.listar_pedidos import ListarPedidosService
class ConsultarPedidosService:
    def executar(self, user_id):
        user = AcessoService().usuario(user_id)
        if user.tipo == 'cliente': return ListarPedidosService().executar(user_id=user.id)
        loja = AcessoService().loja(user.id, required=False)
        return ListarPedidosService().executar(loja_id=loja.id) if loja else []
