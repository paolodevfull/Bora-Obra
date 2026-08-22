from backend.models.pedido import Pedido
from backend.models.user import User
from backend.models.loja import Loja

class GerarTicketPedidoService:
    def executar(self, id_pedido: int):
        pedido = Pedido.buscar_por_id(id_pedido)
        if not pedido:
            raise ValueError("Pedido não encontrado.")
            
        cliente = User.buscar_por_id(pedido.user_id)
        loja = Loja.buscar_por_id(pedido.loja_id)
        
        return {
            "ticket_header": f"=== BORA OBRA - TICKET #{pedido.id} ===",
            "data_hora": pedido.created_at,
            "loja_origem": loja.nome if loja else "N/A",
            "cliente": cliente.nome if cliente else "N/A",
            "tipo_operacao": pedido.tipo,
            "valor_total": f"R$ {pedido.valor_total:.2f}",
            "status": pedido.status,
            "observacao": pedido.observacao or "Sem observações"
        }