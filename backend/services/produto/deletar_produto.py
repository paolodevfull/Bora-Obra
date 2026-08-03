from backend.database.database import db
from backend.models.produto import Produto

def deletar_produto_service(produto_id: int):
    produto = Produto.query.get(produto_id)
    if not produto:
        raise KeyError("Produto não encontrado.")

    db.session.delete(produto)
    db.session.commit()
    return True