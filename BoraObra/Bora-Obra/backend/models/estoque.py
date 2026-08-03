from . import db
from .base_model import ModeloBase

class Estoque(ModeloBase):
    __tablename__ = 'estoques'
    
    quantidade = db.Column(db.Integer, default=0)
    localizacao_fisica = db.Column(db.String(100)) # Prateleira, Corredor, etc.
    status = db.Column(db.String(50))
    
    loja_id = db.Column(db.Integer, db.ForeignKey('lojas.id'), nullable=False)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)