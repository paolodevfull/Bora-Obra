from backend.repositories.produto_repository import ProdutoRepository
class ListarProdutoService:
    def executar(self, loja_id=None):
        return [p.to_dict() for p in ProdutoRepository.listar(**({'loja_id': loja_id} if loja_id is not None else {}))]
