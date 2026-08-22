from backend.models.user import User

class DeletarUserService:
    def executar(self, id_user: int):
        usuario = User.buscar_por_id(id_user)
        if not usuario:
            raise ValueError("Usuário não encontrado.")
        usuario.deletar()