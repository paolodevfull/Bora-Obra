from backend.database.database import db
from .base_model import ModeloBase

class User(ModeloBase):

    __tablename__ = 'users'
    
    
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(255), nullable=False)
    telefone = db.Column(db.String(20))
    tipo = db.Column(db.String(20), nullable=False) # ex: 'Lojista', 'Cliente', 'Motoboy'

    lojas = db.relationship('Loja', backref='gerente', lazy=True)
    pedidos = db.relationship('Pedidos', backref='cliente', lazy=True)