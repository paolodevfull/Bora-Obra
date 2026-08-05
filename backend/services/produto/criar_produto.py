from backend.database.database import db
from backend.models.produto import Produto

def criar_produto_service(dados: dict) -> dict:
    # Regra de negócio / Validações
    if not dados.get('nome') or not dados.get('preco_venda'):
        raise ValueError("Nome e Preço de Venda são obrigatórios.")

    novo_produto = Produto(
        nome=dados.get('nome'),
        descricao=dados.get('descricao'),
        utilidade=dados.get('utilidade'),
        categoria=dados.get('categoria'),
        cor_tamanho=dados.get('cor_tamanho'),
        preco_venda=dados.get('preco_venda'),
        preco_locacao=dados.get('preco_locacao'),
        loja_id=dados.get('loja_id')
    )

    db.session.add(novo_produto)
    db.session.commit()

    return novo_produto.to_dict()