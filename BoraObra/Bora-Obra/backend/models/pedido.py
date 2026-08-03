from . import db
from .base_model import ModeloBase
from datetime import datetime

class Pedidos(ModeloBase):
    __tablename__ = 'pedidos'
    
    data = db.Column(db.DateTime, default= datetime.now)
    valor_total = db.Column(db.Float, nullable=False)
    status_pagamento = db.Column(db.String(50), nullable=False)
    tipo = db.Column(db.String(50)) # Venda ou Locacao
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    loja_id = db.Column(db.Integer, db.ForeignKey('lojas.id'), nullable=False)
    
    itens = db.relationship('ItemPedidos', backref='pedido', lazy=True)