from werkzeug.security import generate_password_hash, check_password_hash
from backend.database.database import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    tipo = db.Column(db.String(20), default='cliente')  # cliente, lojista, entregador
    senha_hash = db.Column(db.String(255), nullable=False)

    def set_senha(self, senha_texto_puro):
        self.senha_hash = generate_password_hash(senha_texto_puro)

    def verificar_senha(self, senha_texto_puro):
        return check_password_hash(self.senha_hash, senha_texto_puro)

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
    def buscar_por_id(cls, id_user):
        return cls.query.get(id_user)

    @classmethod
    def buscar_por_email(cls, email):
        return cls.query.filter_by(email=email).first()

    def to_dict(self):
        # senha_hash nunca é exposta na API de propósito
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "tipo": self.tipo
        }
