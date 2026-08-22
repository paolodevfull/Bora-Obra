from backend.models.produto import Produto

class CriarProdutoService:
    def executar(self, dados: dict):
        if not dados.get('nome') or not dados.get('loja_id'):
            raise ValueError("Nome e ID da loja são obrigatórios.")
            
        produto = Produto(
            loja_id=dados['loja_id'],
            nome=dados['nome'],
            categoria=dados.get('categoria'),
            utilidade=dados.get('utilidade'),
            preco_venda=float(dados.get('preco_venda', 0.0)),
            preco_locacao=float(dados.get('preco_locacao', 0.0)),
            disponivel=dados.get('disponivel', True)
        )
        produto.salvar()
        return produto.to_dict()