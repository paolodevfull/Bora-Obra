from backend.models.produto import Produto
from backend.repositories.produto_repository import ProdutoRepository
from backend.services.produto.validar_produto import validar_produto
class CriarProdutoService:
    def executar(self, dados):
        return ProdutoRepository.salvar(Produto(**validar_produto(dados))).to_dict()
