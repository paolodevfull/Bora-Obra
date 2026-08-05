from backend.database.database import db
from .base_model import ModeloBase


class Loja(ModeloBase):

    __tablename__ = 'lojas'
    
    nome = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(18), unique=True, nullable=False)
    localizacao = db.Column(db.String(255), nullable=False)
    catalogo_ferramentas = db.Column(db.Text)
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    estoques = db.relationship('Estoque', backref='loja', lazy=True)
    pedidos = db.relationship('Pedidos', backref='loja', lazy=True)