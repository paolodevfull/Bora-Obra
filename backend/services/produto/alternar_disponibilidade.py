from backend.models.produto import Produto

class AlternarDisponibilidadeService:
    def executar(self, id_produto: int):
        produto = Produto.buscar_por_id(id_produto)
        if not produto:
            raise ValueError("Produto não encontrado.")
            
        produto.disponivel = not produto.disponivel
        produto.atualizar()
        return produto.to_dict()