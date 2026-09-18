from backend.models.estoque import Estoque
from backend.repositories.estoque_repository import EstoqueRepository
from backend.repositories.produto_repository import ProdutoRepository
from backend.services.validation import inteiro, texto
from backend.services.errors import ServiceError
class CriarEstoqueService:
    def executar(self, dados):
        loja_id = inteiro(dados.get('loja_id'),'Loja')
        produto_id = inteiro(dados.get('produto_id'),'Produto')
        produto = ProdutoRepository.buscar_por_id(produto_id)
        if not produto or produto.loja_id != loja_id: raise ServiceError('Produto não encontrado nesta loja.',404)
        estoque = Estoque(loja_id=loja_id,produto_id=produto_id,quantidade=inteiro(dados.get('quantidade',0),'Quantidade',0),localizacao_fisica=texto(dados.get('localizacao_fisica') or 'Não informada','Localização',maximum=100),status='Disponível')
        return EstoqueRepository.salvar(estoque).to_dict()
