from backend.database.database import db

class Produto(db.Model):
    __tablename__ = 'produtos'

    id = db.Column(db.Integer, primary_key=True)
    loja_id = db.Column(db.Integer, db.ForeignKey('lojas.id'), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(50))
    utilidade = db.Column(db.String(100)) # Ex: "Furacao de concreto", "Pintura"
    preco_venda = db.Column(db.Float, nullable=False, default=0.0)
    preco_locacao = db.Column(db.Float, default=0.0)
    disponivel = db.Column(db.Boolean, default=True) # REQ 14 - Toggle Ligar/Desligar

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
    def buscar_por_id(cls, id_produto):
        return cls.query.get(id_produto)

    def to_dict(self):
        return {
            "id": self.id,
            "loja_id": self.loja_id,
            "nome": self.nome,
            "categoria": self.categoria,
            "utilidade": self.utilidade,
            "preco_venda": self.preco_venda,
            "preco_locacao": self.preco_locacao,
            "disponivel": self.disponivel
        }