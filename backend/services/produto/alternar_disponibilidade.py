from backend.repositories.produto_repository import ProdutoRepository
from backend.models.produto import Produto
from backend.services.errors import ServiceError

class AlternarDisponibilidadeService:
    def executar(self, id_produto: int):
        produto = ProdutoRepository.buscar_por_id(id_produto)
        if not produto:
            raise ServiceError("Produto não encontrado.", 404)
            
        produto.disponivel = not produto.disponivel
        ProdutoRepository.atualizar(produto)
        return produto.to_dict()
