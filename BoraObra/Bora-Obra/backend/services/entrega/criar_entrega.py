from backend.database.database import db
from backend.models.entrega import Entrega
from backend.models.pedido import Pedido

def criar_entrega_service(dados: dict) -> dict:
    pedido_id = dados.get('pedido_id')
    endereco = dados.get('endereco')

    if not pedido_id or not endereco:
        raise ValueError("ID do Pedido e Endereço são obrigatórios.")

    # Valida se o pedido existe
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        raise ValueError("Pedido não encontrado.")

    nova_entrega = Entrega(
        pedido_id=pedido_id,
        endereco=endereco,
        status=dados.get('status', 'Pendente')
    )

    db.session.add(nova_entrega)
    db.session.commit()

    return {
        "id": nova_entrega.id,
        "pedido_id": nova_entrega.pedido_id,
        "endereco": nova_entrega.endereco,
        "status": nova_entrega.status
    }