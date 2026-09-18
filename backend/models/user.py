from werkzeug.security import generate_password_hash, check_password_hash
from backend.database.database import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    tipo = db.Column(db.String(20), default='cliente')
    senha_hash = db.Column(db.String(255), nullable=False)
    responsavel_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    endereco = db.Column(db.String(250), nullable=True)
    def set_senha(self, senha): self.senha_hash = generate_password_hash(senha)
    def verificar_senha(self, senha): return check_password_hash(self.senha_hash, senha)

    def to_dict(self): return {'id': self.id, 'nome': self.nome, 'email': self.email, 'tipo': self.tipo, 'endereco': self.endereco}