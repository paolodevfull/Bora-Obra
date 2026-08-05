from backend.database.database import db
from .base_model import ModeloBase

class Pedidos(ModeloBase):
    __tablename__ = 'pedidos'

    # Relacionamentos de chave estrangeira
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    loja_id = db.Column(db.Integer, db.ForeignKey('lojas.id'), nullable=False)

    # Detalhes do Pedido
    status = db.Column(db.String(50), default='Pendente') # Ex: Pendente, Aprovado, Concluído, Cancelado
    tipo = db.Column(db.String(50), nullable=False) # Ex: Venda, Locacao
    valor_total = db.Column(db.Float, nullable=False, default=0.0)
    observacao = db.Column(db.Text)