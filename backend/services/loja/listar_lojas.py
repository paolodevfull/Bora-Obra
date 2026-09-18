from backend.repositories.loja_repository import LojaRepository
class ListarLojasService:
    def executar(self, lojista_id=None):
        return [loja.to_dict() for loja in LojaRepository.listar(**({'lojista_id': lojista_id} if lojista_id else {}))]
