from backend.models.produto import Produto

class ProdutoRepository:

    @staticmethod
    def buscar_por_utilidade_e_categoria(utilidade=None, categoria=None, disponivel_apenas=True):
        query = Produto.query

        if disponivel_apenas:
            query = query.filter(Produto.disponivel == True)

        if utilidade:
            query = query.filter(Produto.utilidade.ilike(f"%{utilidade}%"))

        if categoria:
            query = query.filter(Produto.categoria.ilike(f"%{categoria}%"))

        return query.all()