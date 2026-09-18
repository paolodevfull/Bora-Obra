from backend.models.user import User
from backend.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository):
    model = User

    @classmethod
    def buscar_por_email(cls, email):
        return cls.model.query.filter_by(email=email).first()
