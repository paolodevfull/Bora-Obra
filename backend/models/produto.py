from . import db
from .base_model import ModeloBase

class Produto(ModeloBase):

    __tablename__ = "produtos"

    nome = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(60), nullable=False)
    preco_venda = db.Column(db.Integer,nullable=False)
    preco_locacao = db.Column(db.Integer,nullable=False)
    utilidade = db.Column(db.String(50),nullable=False)



    @classmethod
    def listar(cls):
        return cls.query.order_by(cls.nome).all()
