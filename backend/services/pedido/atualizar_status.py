from backend.repositories.pedido_repository import PedidoRepository
from backend.services.acesso import AcessoService
from backend.services.errors import ServiceError
from backend.services.pedido.estoque_pedido import devolver_estoque_da_venda


class AtualizarStatusPedidoService:
    TRANSICOES = {
        'Pendente': {'Confirmado', 'Cancelado'},
        'Confirmado': {'Despachado', 'Cancelado'},
        'Despachado': {'Entregue'},
        'Entregue': set(),
        'Cancelado': set(),
    }

    def executar(self, pedido_id, user_id, dados):
        acesso = AcessoService()
        acesso.usuario(user_id, {'lojista', 'funcionario'})
        pedido = acesso.pedido(PedidoRepository.buscar_por_id(pedido_id), user_id)
        status = dados.get('status')
        if not isinstance(status, str) or status not in self.TRANSICOES.get(pedido.status, set()):
            raise ServiceError('Esta mudança de status não é permitida.')
        if status == 'Cancelado':
            devolver_estoque_da_venda(pedido)
        pedido.status = status
        return PedidoRepository.atualizar(pedido).to_dict()
