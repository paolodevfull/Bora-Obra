from backend.repositories.pedido_repository import PedidoRepository
from backend.models.pedido import Pedido
from backend.services.errors import ServiceError


class ConfirmarEntregaPedidoService:
    def executar(self, id_pedido: int, user_id: int):
        pedido = PedidoRepository.buscar_por_id(id_pedido)
        if not pedido:
            raise ServiceError("Pedido não encontrado.", 404)

        if pedido.user_id != user_id:
            raise ServiceError("Você não tem permissão para alterar este pedido.", 403)

        if pedido.status != 'Despachado':
            raise ServiceError('Confirme a entrega somente quando o pedido estiver a caminho.')
        pedido.status = 'Entregue'
        PedidoRepository.atualizar(pedido)
        return pedido.to_dict()
