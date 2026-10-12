from werkzeug.security import generate_password_hash, check_password_hash
from backend.database.database import db
from sqlalchemy.dialects import mysql


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    tipo = db.Column(db.String(20), nullable=False, default='cliente')
    senha_hash = db.Column(db.String(255), nullable=False)
    responsavel_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('users.id', ondelete='RESTRICT', onupdate='RESTRICT'), nullable=True)
    endereco = db.Column(db.String(300), nullable=False)
    cep = db.Column(db.String(9), nullable=False)
    logradouro = db.Column(db.String(150), nullable=False)
    numero = db.Column(db.String(20), nullable=False)
    complemento = db.Column(db.String(100), nullable=True)
    bairro = db.Column(db.String(100), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    uf = db.Column(db.String(2), nullable=False)
    telefone = db.Column(db.String(20), nullable=False)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    responsavel = db.relationship('User', remote_side=[id], foreign_keys=[responsavel_id])

    def __repr__(self):
        return f'<User {self.id}: {self.nome}>'

    def set_senha(self, senha): self.senha_hash = generate_password_hash(senha)
    def verificar_senha(self, senha): return check_password_hash(self.senha_hash, senha)

    def to_dict(self):
        return {campo: getattr(self, campo) for campo in (
            'id', 'nome', 'email', 'tipo', 'endereco', 'cep', 'logradouro', 'numero',
            'complemento', 'bairro', 'cidade', 'uf', 'telefone', 'ativo'
        )}
