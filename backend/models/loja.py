from backend.database.database import db

class Loja(db.Model):
    __tablename__ = 'lojas'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    endereco = db.Column(db.String(200), nullable=False)
    telefone = db.Column(db.String(20))

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
    def buscar_por_id(cls, id_loja):
        return cls.query.get(id_loja)

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "endereco": self.endereco,
            "telefone": self.telefone
        }