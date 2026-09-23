from backend.repositories.pedido_repository import PedidoRepository
from backend.services.acesso import AcessoService
from backend.services.errors import ServiceError
from backend.services.pedido.estoque_pedido import devolver_estoque_da_venda


class CancelarPedidoClienteService:
    def executar(self, pedido_id, user_id):
        usuario = AcessoService().usuario(user_id, {'cliente'})
        pedido = PedidoRepository.buscar_por_id(pedido_id)
        if not pedido or pedido.user_id != usuario.id:
            raise ServiceError('Pedido não encontrado.', 404)
        if pedido.status != 'Pendente':
            raise ServiceError('Somente pedidos pendentes podem ser cancelados.')
        devolver_estoque_da_venda(pedido)
        pedido.status = 'Cancelado'
        return PedidoRepository.atualizar(pedido).to_dict(incluir_itens=True)
