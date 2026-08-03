from backend.database.database import db
from backend.models.estoque import Estoque

def criar_estoque_service(dados: dict) -> dict:
    if not dados.get('loja_id') or not dados.get('produto_id'):
        raise ValueError("Loja e Produto são obrigatórios para registrar o estoque.")

    novo_estoque = Estoque(
        quantidade=dados.get('quantidade', 0),
        localizacao_fisica=dados.get('localizacao_fisica'),
        status=dados.get('status', 'Disponível'),
        loja_id=dados.get('loja_id'),
        produto_id=dados.get('produto_id')
    )

    db.session.add(novo_estoque)
    db.session.commit()

    return novo_estoque.to_dict()