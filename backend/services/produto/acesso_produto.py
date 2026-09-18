from backend.services.acesso import AcessoService
from backend.repositories.produto_repository import ProdutoRepository
from backend.services.errors import ServiceError
class AcessoProdutoService:
    def executar(self, user_id, produto_id):
        loja = AcessoService().loja(user_id)
        produto = ProdutoRepository.buscar_por_id(produto_id)
        if not produto: raise ServiceError('Produto não encontrado.',404)
        if produto.loja_id != loja.id: raise ServiceError('Este produto pertence a outra loja.',403)
        return produto
    def filtro(self, user_id, loja_id=None):
        if not user_id: return loja_id
        user = AcessoService().usuario(user_id)
        if user.tipo in {'lojista','funcionario'}:
            loja = AcessoService().loja(user_id,required=False)
            return loja.id if loja else -1
        return loja_id
