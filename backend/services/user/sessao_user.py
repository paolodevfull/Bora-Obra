from backend.services.acesso import AcessoService
class SessaoUserService:
    def executar(self, user_id):
        return AcessoService().usuario(user_id).to_dict()
