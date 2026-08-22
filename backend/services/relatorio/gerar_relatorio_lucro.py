from backend.repositories.relatorio_repository import RelatorioRepository

class GerarRelatorioLucroService:
    def executar(self):
        repo = RelatorioRepository()
        return repo.calcular_lucro_e_resumo_diario()