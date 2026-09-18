from backend.services.acesso import AcessoService
from backend.services.loja.listar_lojas import ListarLojasService
class ConsultarLojasService:
    def executar(self, user_id):
        user = AcessoService().usuario(user_id, {'cliente','lojista'}) if user_id else None
        return ListarLojasService().executar(user.id if user and user.tipo == 'lojista' else None)
