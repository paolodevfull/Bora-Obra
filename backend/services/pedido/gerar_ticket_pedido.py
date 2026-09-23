from backend.services.errors import ServiceError
from backend.services.acesso import AcessoService
from backend.repositories.pedido_repository import PedidoRepository
from backend.repositories.user_repository import UserRepository
from backend.repositories.loja_repository import LojaRepository
from backend.models.pedido import Pedido
from backend.models.user import User
from backend.models.loja import Loja


class GerarTicketPedidoService:
    def executar(self, id_pedido: int, user_id):
        pedido = PedidoRepository.buscar_por_id(id_pedido)
        if not pedido:
            raise ServiceError('Pedido nao encontrado.', 404)
        AcessoService().pedido(pedido, user_id)
        cliente = UserRepository.buscar_por_id(pedido.user_id)
        loja = LojaRepository.buscar_por_id(pedido.loja_id)
        itens_ticket = []
        for item in pedido.itens:
            dias_locacao = item.dias_locacao or 1
            itens_ticket.append({
                'codigo': item.produto_id,
                'nome': item.produto.nome if item.produto else 'Produto removido',
                'quantidade': item.quantidade,
                'valor_unitario': f'R$ {item.valor_unitario:.2f}',
                'dias_locacao': dias_locacao,
                'subtotal': f'R$ {(item.valor_unitario * item.quantidade * dias_locacao):.2f}'
            })
        return {'ticket_header': f'=== BORA OBRA - TICKET #{pedido.id} ===', 'data_hora': pedido.created_at, 'loja_origem': loja.nome if loja else 'N/A', 'loja_endereco': loja.endereco if loja else '', 'loja_telefone': loja.telefone if loja else '', 'cliente': cliente.nome if cliente else 'N/A', 'tipo_operacao': pedido.tipo, 'data_inicio_locacao': pedido.data_inicio_locacao, 'data_fim_locacao': pedido.data_fim_locacao, 'itens': itens_ticket, 'forma_pagamento': pedido.forma_pagamento or 'Nao informado', 'endereco_entrega': pedido.endereco_entrega or 'Retirada na loja', 'valor_total': f'R$ {pedido.valor_total:.2f}', 'status': pedido.status, 'observacao': pedido.observacao or 'Sem observacoes'}
