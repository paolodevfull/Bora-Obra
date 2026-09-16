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

        itens_ticket = []
        for item in pedido.itens:
            produto = item.produto
            itens_ticket.append({
                "codigo": item.produto_id,
                "nome": produto.nome if produto else "Produto removido",
                "quantidade": item.quantidade,
                "valor_unitario": f"R$ {item.valor_unitario:.2f}",
                "subtotal": f"R$ {(item.valor_unitario * item.quantidade):.2f}"
            })

        return {
            "ticket_header": f"=== BORA OBRA - TICKET #{pedido.id} ===",
            "data_hora": pedido.created_at,
            "loja_origem": loja.nome if loja else "N/A",
            "cliente": cliente.nome if cliente else "N/A",
            "tipo_operacao": pedido.tipo,
            "itens": itens_ticket,
            "forma_pagamento": pedido.forma_pagamento or "Não informado",
            "endereco_entrega": pedido.endereco_entrega or "Retirada na loja",
            "valor_total": f"R$ {pedido.valor_total:.2f}",
            "status": pedido.status,
            "observacao": pedido.observacao or "Sem observações"
        }
