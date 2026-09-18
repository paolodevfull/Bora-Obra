from backend.models.entrega import Entrega
from backend.repositories.entrega_repository import EntregaRepository
from backend.repositories.pedido_repository import PedidoRepository
from backend.services.validation import inteiro, texto
from backend.services.errors import ServiceError
class CriarEntregaService:
    def executar(self, dados):
        pedido_id = inteiro(dados.get('pedido_id'),'Pedido')
        if not PedidoRepository.buscar_por_id(pedido_id): raise ServiceError('Pedido não encontrado.',404)
        if EntregaRepository.listar(pedido_id=pedido_id): raise ServiceError('Este pedido já possui uma entrega.')
        entrega = Entrega(pedido_id=pedido_id,endereco=texto(dados.get('endereco'),'Endereço'),status='Pendente')
        return EntregaRepository.salvar(entrega).to_dict()
