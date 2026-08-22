from backend.models.user import User

class ListarUserService:
    def executar(self):
        usuarios = User.listar_todos()
        return [u.to_dict() for u in usuarios]