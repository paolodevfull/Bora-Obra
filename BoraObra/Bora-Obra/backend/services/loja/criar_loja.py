from backend.database.database import db
from backend.models.loja import Loja

def criar_loja_service(dados: dict) -> dict:
    if not dados.get('nome') or not dados.get('cnpj') or not dados.get('user_id'):
        raise ValueError("Nome, CNPJ e Gerente (user_id) são obrigatórios.")

    nova_loja = Loja(
        nome=dados.get('nome'),
        cnpj=dados.get('cnpj'),
        localizacao=dados.get('localizacao'),
        catalogo_ferramentas=dados.get('catalogo_ferramentas'),
        user_id=dados.get('user_id')
    )

    db.session.add(nova_loja)
    db.session.commit()
    return nova_loja.to_dict()