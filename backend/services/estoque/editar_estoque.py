from backend.database.database import db
from backend.models.estoque import Estoque

def editar_estoque_service(estoque_id: int, dados: dict) -> dict:
    estoque = Estoque.query.get(estoque_id)
    if not estoque:
        raise KeyError("Registro de estoque não encontrado.")

    estoque.quantidade = dados.get('quantidade', estoque.quantidade)
    estoque.localizacao_fisica = dados.get('localizacao_fisica', estoque.localizacao_fisica)
    estoque.status = dados.get('status', estoque.status)

    db.session.commit()
    return estoque.to_dict()