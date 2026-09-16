from backend.models.user import User


class AutenticarUserService:
    def executar(self, dados: dict):
        email = dados.get('email')
        senha = dados.get('senha')

        if not email or not senha:
            raise ValueError("E-mail e senha são obrigatórios.")

        usuario = User.buscar_por_email(email)
        if not usuario or not usuario.verificar_senha(senha):
            raise ValueError("E-mail ou senha inválidos.")

        return usuario.to_dict()
