from backend.repositories.produto_repository import ProdutoRepository
from backend.services.produto.validar_produto import validar_produto
from backend.services.errors import ServiceError
class EditarProdutoService:
    def executar(self, id_produto, dados):
        produto = ProdutoRepository.buscar_por_id(id_produto)
        if not produto: raise ServiceError('Produto não encontrado.', 404)
        values = validar_produto({**produto.to_dict(), **dados, 'loja_id': produto.loja_id})
        for key, value in values.items(): setattr(produto, key, value)
        return ProdutoRepository.atualizar(produto).to_dict()
