from backend.database.database import db
from backend.models.base_model import ModeloBase
from sqlalchemy.dialects import mysql
class Entrega(ModeloBase):
    __tablename__ = 'entregas'
    pedido_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('pedidos.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=False, unique=True)
    endereco = db.Column(db.String(250), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='Pendente')

    pedido = db.relationship('Pedido', foreign_keys=[pedido_id])
