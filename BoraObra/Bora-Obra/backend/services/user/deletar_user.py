from backend.database.database import db
from backend.models.user import User

def deletar_user_service(user_id: int):
    usuario = User.query.get(user_id)
    if not usuario:
        raise KeyError("Usuário não encontrado.")

    db.session.delete(usuario)
    db.session.commit()
    return True