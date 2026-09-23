from backend.database.database import db

class Pedido(db.Model):
    __tablename__ = 'pedidos'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    loja_id = db.Column(db.Integer, db.ForeignKey('lojas.id'), nullable=False)
    status = db.Column(db.String(30), default='Pendente')
    tipo = db.Column(db.String(20), default='Venda')  # Venda ou Locacao
    valor_total = db.Column(db.Float, nullable=False, default=0.0)
    forma_pagamento = db.Column(db.String(30), default='Não informado')
    endereco_entrega = db.Column(db.Text)
    observacao = db.Column(db.Text)
    data_inicio_locacao = db.Column(db.String(10))
    data_fim_locacao = db.Column(db.String(10))
    created_at = db.Column(db.String(50))

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
            "valor_total": self.valor_total,
            "forma_pagamento": self.forma_pagamento,
            "endereco_entrega": self.endereco_entrega,
            "observacao": self.observacao,
            "data_inicio_locacao": self.data_inicio_locacao,
            "data_fim_locacao": self.data_fim_locacao,
            "created_at": self.created_at
        }
        if incluir_itens:
            dados["itens"] = [item.to_dict() for item in self.itens]
        return dados
