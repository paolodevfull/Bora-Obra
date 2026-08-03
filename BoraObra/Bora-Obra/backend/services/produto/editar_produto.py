from backend.database.database import db
from backend.models.produto import Produto

def editar_produto_service(produto_id: int, dados: dict) -> dict:
    produto = Produto.query.get(produto_id)
    if not produto:
        raise KeyError("Produto não encontrado.")

    # Atualiza apenas os campos enviados no dicionário
    produto.nome = dados.get('nome', produto.nome)
    produto.descricao = dados.get('descricao', produto.descricao)
    produto.utilidade = dados.get('utilidade', produto.utilidade)
    produto.categoria = dados.get('categoria', produto.categoria)
    produto.cor_tamanho = dados.get('cor_tamanho', produto.cor_tamanho)
    produto.preco_venda = dados.get('preco_venda', produto.preco_venda)
    produto.preco_locacao = dados.get('preco_locacao', produto.preco_locacao)

    db.session.commit()
    return produto.to_dict()