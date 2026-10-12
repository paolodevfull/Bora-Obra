from backend.database.database import db
from sqlalchemy.dialects import mysql
from backend.models.base_model import ModeloBase


class ItemPedidos(ModeloBase):
    __tablename__ = 'item_pedidos'

    quantidade = db.Column(db.Integer, nullable=False)
    valor_unitario = db.Column(db.Numeric(12, 2), nullable=False)
    dias_locacao = db.Column(db.Integer, nullable=False, default=1)
    pedido_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('pedidos.id', ondelete='CASCADE', onupdate='RESTRICT'), nullable=False)
    produto_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('produtos.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=False)

    produto = db.relationship('Produto')

    def to_dict(self):
        return {
            'id': self.id, 'quantidade': self.quantidade,
            'valor_unitario': float(self.valor_unitario), 'dias_locacao': self.dias_locacao,
            'pedido_id': self.pedido_id, 'produto_id': self.produto_id,
            'nome_produto': self.produto.nome if self.produto else 'Produto Removido'
        }
