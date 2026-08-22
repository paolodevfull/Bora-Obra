from backend.models.produto import Produto

class ListarProdutoService:
    def executar(self):
        produtos = Produto.listar_todos()
        return [p.to_dict() for p in produtos]