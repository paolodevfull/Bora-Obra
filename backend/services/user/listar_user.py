from backend.repositories.user_repository import UserRepository
class ListarUserService:
    def executar(self, responsavel_id):
        return [user.to_dict() for user in UserRepository.listar(responsavel_id=responsavel_id)]
