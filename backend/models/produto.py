from backend.database.database import db
from .base_model import ModeloBase

class Produto(ModeloBase):
    __tablename__ = 'produtos'

    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    utilidade = db.Column(db.String(100))
    categoria = db.Column(db.String(50))
    cor_tamanho = db.Column(db.String(50))
    preco_venda = db.Column(db.Float, nullable=False)
    preco_locacao = db.Column(db.Float)
    
    # Vinculação obrigatória com a Loja
    loja_id = db.Column(db.Integer, db.ForeignKey('lojas.id'), nullable=False)