from backend.database.database import db
from backend.models.base_model import ModeloBase
from sqlalchemy.dialects import mysql

class Estoque(ModeloBase):
    __tablename__ = 'estoques'
    
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    localizacao_fisica = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    
    loja_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('lojas.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=False)
    produto_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('produtos.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=False)

    loja = db.relationship('Loja', foreign_keys=[loja_id])
    produto = db.relationship('Produto', foreign_keys=[produto_id])
