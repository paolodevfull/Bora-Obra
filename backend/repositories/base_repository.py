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
        db.session.add(entity)
        db.session.commit()
        return entity

    @staticmethod
    def atualizar(entity):
        db.session.commit()
        return entity

    @staticmethod
    def deletar(entity):
        db.session.delete(entity)
        db.session.commit()

