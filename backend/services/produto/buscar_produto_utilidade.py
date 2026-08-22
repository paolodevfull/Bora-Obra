from backend.repositories.produto_repository import ProdutoRepository

class BuscarProdutoUtilidadeService:
    def executar(self, utilidade=None, categoria=None):
        repo = ProdutoRepository()
        produtos = repo.buscar_por_utilidade_e_categoria(utilidade, categoria)
        return [p.to_dict() for p in produtos]