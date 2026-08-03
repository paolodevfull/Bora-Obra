from models.user import User

def listar_users_service():
    usuarios = User.query.all()
    return [u.to_dict() for u in usuarios]

def obter_user_por_id_service(user_id: int):
    usuario = User.query.get(user_id)
    if not usuario:
        raise KeyError("Usuário não encontrado.")
    return usuario.to_dict()