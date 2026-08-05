from backend.database.database import db
from backend.models.pedido import Pedidos

def criar_pedido_service(dados):
    user_id = dados.get('user_id')
    loja_id = dados.get('loja_id')

    if not user_id or not loja_id:
        raise ValueError("Os campos 'user_id' e 'loja_id' são obrigatórios.")

    novo_pedido = Pedidos(
        user_id=user_id,
        loja_id=loja_id,
        tipo=dados.get('tipo'),
        valor_total=dados.get('valor_total'),
        observacao=dados.get('observacao'),
        status='Pendente'
    )

    db.session.add(novo_pedido)
    db.session.commit()

    return novo_pedido.to_dict()