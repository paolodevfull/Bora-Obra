from backend.database.database import db
from backend.models.base_model import ModeloBase
class Entrega(ModeloBase):
    __tablename__ = 'entregas'
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False, unique=True)
    endereco = db.Column(db.String(250), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='Pendente')
