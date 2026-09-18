from backend.repositories.user_repository import UserRepository
from backend.models.user import User
from backend.services.errors import ServiceError

class DeletarUserService:
    def executar(self, id_user: int):
        usuario = UserRepository.buscar_por_id(id_user)
        if not usuario:
            raise ServiceError("Usuário não encontrado.", 404)
        UserRepository.deletar(usuario)
