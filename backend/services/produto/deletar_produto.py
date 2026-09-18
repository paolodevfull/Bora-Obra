from backend.repositories.item_pedido_repository import ItemPedidoRepository
from backend.repositories.produto_repository import ProdutoRepository
from backend.models.produto import Produto
from backend.services.errors import ServiceError

class DeletarProdutoService:
    def executar(self, id_produto: int) -> bool:
        produto = ProdutoRepository.buscar_por_id(id_produto)
        if not produto:
            raise ServiceError("Produto não encontrado.", 404)

        if ItemPedidoRepository.existe_produto(id_produto):
            raise ServiceError('Produto possui pedidos. Desative sua disponibilidade para preservar o histórico.')
        ProdutoRepository.deletar(produto)
        return True
