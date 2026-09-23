from backend.repositories.loja_repository import LojaRepository
class ListarLojasService:
    def executar(self, lojista_id=None, publico=False):
        filtros = {'lojista_id': lojista_id} if lojista_id else {'ativa': True}
        return [loja.to_public_dict() if publico else loja.to_dict() for loja in LojaRepository.listar(**filtros)]
