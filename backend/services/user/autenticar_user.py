from backend.services.validation import texto
from backend.services.errors import ServiceError
from backend.repositories.user_repository import UserRepository
from backend.models.user import User


class AutenticarUserService:
    def executar(self, dados: dict):
        email = texto(dados.get('email'), 'E-mail', maximum=120).lower()
        senha = texto(dados.get('senha'), 'Senha', maximum=128)

        usuario = UserRepository.buscar_por_email(email)
        if not usuario or not usuario.verificar_senha(senha):
            raise ServiceError("E-mail ou senha inválidos.", 401)

        return usuario.to_dict()
