from backend.models.user import User

class EditarUserService:
    def executar(self, id_user: int, dados: dict):
        usuario = User.buscar_por_id(id_user)
        if not usuario:
            raise ValueError("Usuário não encontrado.")
            
        usuario.nome = dados.get('nome', usuario.nome)
        usuario.email = dados.get('email', usuario.email)
        usuario.tipo = dados.get('tipo', usuario.tipo)
        usuario.atualizar()
        return usuario.to_dict()