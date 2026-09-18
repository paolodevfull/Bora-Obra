from backend.services.validation import texto
from backend.repositories.user_repository import UserRepository
from backend.models.user import User
from backend.services.errors import ServiceError


class CriarUserService:
    def executar(self, dados: dict):
        nome = texto(dados.get('nome'), 'Nome', maximum=100)
        email = texto(dados.get('email'), 'E-mail', maximum=120).lower()
        senha = texto(dados.get('senha'), 'Senha', 6, 128)
        tipo = dados.get('tipo', 'cliente')

        if tipo not in {'cliente', 'lojista', 'funcionario'}:
            raise ServiceError("Tipo de conta inválido.")
        if '@' not in email or '.' not in email.split('@')[-1]:
            raise ServiceError('Informe um e-mail válido.')
        if UserRepository.buscar_por_email(email):
            raise ServiceError("Já existe uma conta cadastrada com esse e-mail.")

        usuario = User(
            nome=nome,
            email=email,
            tipo=tipo,
            responsavel_id=dados.get('responsavel_id')
        )
        usuario.set_senha(senha)
        UserRepository.salvar(usuario)
        return usuario.to_dict()
