from datetime import datetime


from . import db

class ModeloBase(db.Model):
    __abstract__ = True

    id = db.Column(
        db.Integer, primary_key=True, nullable=False
    )

    data_criacao = db.Column(
        db.DateTime, default=datetime.now, nullable=False
    )

    data_atualizacao = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        nullable=False
    )