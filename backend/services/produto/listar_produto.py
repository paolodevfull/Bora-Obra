from backend.models.produto import Produto

def listar_produtos_service():
    produtos = Produto.query.all()
    return [produto.to_dict() for produto in produtos]

def obter_produto_por_id_service(produto_id: int):
    produto = Produto.query.get(produto_id)
    if not produto:
        raise KeyError("Produto não encontrado.")
    return produto.to_dict()