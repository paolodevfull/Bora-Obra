from backend.database.database import db
from sqlalchemy import func
from sqlalchemy.dialects import mysql

class Pedido(db.Model):
    __tablename__ = 'pedidos'

    id = db.Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    user_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('users.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=False)
    loja_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('lojas.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='Pendente')
    tipo = db.Column(db.String(20), nullable=False, default='Venda')
    valor_total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    forma_pagamento = db.Column(db.String(30), nullable=False, default='Não informado')
    endereco_entrega = db.Column(db.Text, nullable=False)
    observacao = db.Column(db.Text)
    data_inicio_locacao = db.Column(db.Date)
    data_fim_locacao = db.Column(db.Date)
    idempotency_key = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, nullable=False, server_default=func.current_timestamp())

    __table_args__ = (
        db.UniqueConstraint('user_id', 'idempotency_key', name='uq_pedidos_user_idempotency'),
    )

    def __repr__(self):
        return f'<Pedido {self.id}: {self.status}>'

    cliente = db.relationship('User', foreign_keys=[user_id])
    loja = db.relationship('Loja', foreign_keys=[loja_id])

    itens = db.relationship(
        'ItemPedidos',
        backref='pedido',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def to_dict(self, incluir_itens=False):
        dados = {
            "id": self.id,
            "user_id": self.user_id,
            "cliente_nome": self.cliente.nome if self.cliente else "Cliente removido",
            "loja_id": self.loja_id,
            "loja_nome": self.loja.nome if self.loja else "Loja removida",
            "loja_telefone": self.loja.telefone if self.loja else "",
            "status": self.status,
            "tipo": self.tipo,
            "valor_total": float(self.valor_total),
            "forma_pagamento": self.forma_pagamento,
            "endereco_entrega": self.endereco_entrega,
            "observacao": self.observacao,
            "data_inicio_locacao": self.data_inicio_locacao.isoformat() if self.data_inicio_locacao else None,
            "data_fim_locacao": self.data_fim_locacao.isoformat() if self.data_fim_locacao else None,
            "created_at": self.created_at.isoformat(sep=' ') if self.created_at else None
        }
        if incluir_itens:
            dados["itens"] = [item.to_dict() for item in self.itens]
        return dados
