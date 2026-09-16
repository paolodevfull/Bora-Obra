from backend.models.user import User


class CriarUserService:
    def executar(self, dados: dict):
        if not dados.get('nome') or not dados.get('email'):
            raise ValueError("Nome e e-mail são obrigatórios.")

        if not dados.get('senha') or len(dados.get('senha')) < 6:
            raise ValueError("A senha deve ter pelo menos 6 caracteres.")

        if User.buscar_por_email(dados['email']):
            raise ValueError("Já existe uma conta cadastrada com esse e-mail.")

        usuario = User(
            nome=dados['nome'],
            email=dados['email'],
            tipo=dados.get('tipo', 'cliente')
        )
        usuario.set_senha(dados['senha'])
        usuario.salvar()
        return usuario.to_dict()
