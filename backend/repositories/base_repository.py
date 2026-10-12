"""Persistence primitives shared by the domain repositories."""
from backend.database.database import db


class BaseRepository:
    model = None

    @classmethod
    def buscar_por_id(cls, identifier):
        return db.session.get(cls.model, identifier)

    @classmethod
    def listar(cls, **filters):
        return cls.model.query.filter_by(**filters).order_by(cls.model.id).all()

    @staticmethod
    def salvar(entity):
        try:
            db.session.add(entity)
            db.session.commit()
            return entity
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def atualizar(entity):
        try:
            db.session.commit()
            return entity
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def deletar(entity):
        try:
            db.session.delete(entity)
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

