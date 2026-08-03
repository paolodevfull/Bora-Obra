from backend.database.database import db
from backend.models.user import User

def editar_user_service(user_id: int, dados: dict) -> dict:
    usuario = User.query.get(user_id)
    if not usuario:
        raise KeyError("Usuário não encontrado.")

    usuario.nome = dados.get('nome', usuario.nome)
    usuario.email = dados.get('email', usuario.email)
    usuario.telefone = dados.get('telefone', usuario.telefone)
    usuario.tipo = dados.get('tipo', usuario.tipo)

    db.session.commit()
    return usuario.to_dict()