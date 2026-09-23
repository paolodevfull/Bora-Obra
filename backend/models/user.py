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
    endereco = db.Column(db.String(300), nullable=True)
    cep = db.Column(db.String(9), nullable=True)
    logradouro = db.Column(db.String(150), nullable=True)
    numero = db.Column(db.String(20), nullable=True)
    complemento = db.Column(db.String(100), nullable=True)
    bairro = db.Column(db.String(100), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    uf = db.Column(db.String(2), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    def set_senha(self, senha): self.senha_hash = generate_password_hash(senha)
    def verificar_senha(self, senha): return check_password_hash(self.senha_hash, senha)

    def to_dict(self):
        return {campo: getattr(self, campo) for campo in (
            'id', 'nome', 'email', 'tipo', 'endereco', 'cep', 'logradouro', 'numero',
            'complemento', 'bairro', 'cidade', 'uf', 'telefone', 'ativo'
        )}
