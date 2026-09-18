from backend.database.database import db
from backend.models.base_model import ModeloBase


class ItemPedidos(ModeloBase):
    __tablename__ = 'item_pedidos'

    quantidade = db.Column(db.Integer, nullable=False)
    valor_unitario = db.Column(db.Float, nullable=False)
    dias_locacao = db.Column(db.Integer, nullable=False, default=1)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)

    produto = db.relationship('Produto')

    def to_dict(self):
        return {
            'id': self.id, 'quantidade': self.quantidade,
            'valor_unitario': self.valor_unitario, 'dias_locacao': self.dias_locacao,
            'pedido_id': self.pedido_id, 'produto_id': self.produto_id,
            'nome_produto': self.produto.nome if self.produto else 'Produto Removido'
        }