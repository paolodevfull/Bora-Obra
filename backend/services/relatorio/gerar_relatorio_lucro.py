from backend.repositories.relatorio_repository import RelatorioRepository
from backend.services.acesso import AcessoService
class GerarRelatorioLucroService:
    def executar(self, user_id):
        loja = AcessoService().loja(user_id,required=False)
        return RelatorioRepository.calcular_lucro_e_resumo_diario(loja.id if loja else -1)
