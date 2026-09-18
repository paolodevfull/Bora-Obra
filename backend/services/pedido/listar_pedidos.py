from backend.repositories.pedido_repository import PedidoRepository
class ListarPedidosService:
    def executar(self, user_id=None, loja_id=None):
        filters = {}
        if user_id is not None: filters['user_id'] = user_id
        if loja_id is not None: filters['loja_id'] = loja_id
        return [p.to_dict() for p in reversed(PedidoRepository.listar(**filters))]
