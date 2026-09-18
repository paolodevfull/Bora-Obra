from backend.repositories.estoque_repository import EstoqueRepository
from backend.services.validation import inteiro, texto
from backend.services.errors import ServiceError
class EditarEstoqueService:
    def executar(self, estoque_id, dados):
        estoque = EstoqueRepository.buscar_por_id(estoque_id)
        if not estoque: raise ServiceError('Estoque não encontrado.',404)
        quantidade = inteiro(dados.get('quantidade',estoque.quantidade),'Quantidade',0)
        localizacao = texto(dados.get('localizacao_fisica',estoque.localizacao_fisica) or 'Não informada','Localização',maximum=100)
        estoque.quantidade, estoque.localizacao_fisica = quantidade, localizacao
        return EstoqueRepository.atualizar(estoque).to_dict()
