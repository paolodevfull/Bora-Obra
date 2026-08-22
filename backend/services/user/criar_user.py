from backend.models.user import User

class CriarUserService:
    def executar(self, dados: dict):
        if not dados.get('nome') or not dados.get('email'):
            raise ValueError("Nome e e-mail são obrigatórios.")
            
        usuario = User(
            nome=dados['nome'],
            email=dados['email'],
            tipo=dados.get('tipo', 'cliente')
        )
        usuario.salvar()
        return usuario.to_dict()