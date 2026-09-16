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
    created_at = db.Column(db.String(50))

    itens = db.relationship(
        'ItemPedidos',
        backref='pedido',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def salvar(self):
        db.session.add(self)
        db.session.commit()
        return self

    def atualizar(self):
        db.session.commit()
        return self

    def deletar(self):
        db.session.delete(self)
        db.session.commit()

    @classmethod
    def listar_todos(cls):
        return cls.query.all()

    @classmethod
    def buscar_por_id(cls, id_pedido):
        return cls.query.get(id_pedido)

    def to_dict(self, incluir_itens=False):
        dados = {
            "id": self.id,
            "user_id": self.user_id,
            "loja_id": self.loja_id,
            "status": self.status,
            "tipo": self.tipo,
            "valor_total": self.valor_total,
            "forma_pagamento": self.forma_pagamento,
            "endereco_entrega": self.endereco_entrega,
            "observacao": self.observacao,
            "created_at": self.created_at
        }
        if incluir_itens:
            dados["itens"] = [item.to_dict() for item in self.itens]
        return dados
