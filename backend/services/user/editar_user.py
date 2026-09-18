from backend.repositories.user_repository import UserRepository
from backend.services.validation import texto
from backend.services.errors import ServiceError
class EditarUserService:
    def executar(self, id_user, dados):
        user = UserRepository.buscar_por_id(id_user)
        if not user: raise ServiceError('Usuário não encontrado.', 404)
        nome = texto(dados.get('nome', user.nome), 'Nome', maximum=100)
        email = texto(dados.get('email', user.email), 'E-mail', maximum=120).lower()
        if '@' not in email or '.' not in email.split('@')[-1]: raise ServiceError('Informe um e-mail válido.')
        other = UserRepository.buscar_por_email(email)
        if other and other.id != user.id: raise ServiceError('Este e-mail já está em uso.')
        senha = dados.get('senha')
        if senha: senha = texto(senha, 'Senha', 6, 128)
        endereco = dados.get('endereco', user.endereco) or ''
        if not isinstance(endereco, str) or len(endereco)>250: raise ServiceError('Endereço inválido.')
        user.nome, user.email, user.endereco = nome, email, endereco.strip()
        if senha: user.set_senha(senha)
        return UserRepository.atualizar(user).to_dict()
