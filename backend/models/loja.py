from backend.database.database import db
from sqlalchemy.dialects import mysql


class Loja(db.Model):
    __tablename__ = 'lojas'

    id = db.Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False)
    endereco = db.Column(db.String(300), nullable=False)
    cep = db.Column(db.String(9), nullable=False)
    logradouro = db.Column(db.String(150), nullable=False)
    numero = db.Column(db.String(20), nullable=False)
    complemento = db.Column(db.String(100), nullable=True)
    bairro = db.Column(db.String(100), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    uf = db.Column(db.String(2), nullable=False)
    telefone = db.Column(db.String(20), nullable=False)
    responsavel_nome = db.Column(db.String(100), nullable=False)
    documento = db.Column(db.String(18), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    logo_url = db.Column(db.String(500))
    logo_marcador_url = db.Column(db.String(500))
    ativa = db.Column(db.Boolean, nullable=False, default=True)
    latitude = db.Column(db.Numeric(10, 7), nullable=False)
    longitude = db.Column(db.Numeric(10, 7), nullable=False)
    lojista_id = db.Column(mysql.INTEGER(unsigned=True), db.ForeignKey('users.id', ondelete='RESTRICT', onupdate='RESTRICT'), unique=True, nullable=False)

    lojista = db.relationship('User', foreign_keys=[lojista_id])

    def __repr__(self):
        return f'<Loja {self.id}: {self.nome}>'

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "endereco": self.endereco,
            "cep": self.cep,
            "logradouro": self.logradouro,
            "numero": self.numero,
            "complemento": self.complemento,
            "bairro": self.bairro,
            "cidade": self.cidade,
            "uf": self.uf,
            "telefone": self.telefone,
            "responsavel_nome": self.responsavel_nome,
            "documento": self.documento,
            "email": self.email,
            "logo_url": self.logo_url,
            "logo_marcador_url": self.logo_marcador_url,
            "ativa": self.ativa,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None
        }

    def to_public_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "endereco": self.endereco,
            "cep": self.cep,
            "cidade": self.cidade,
            "uf": self.uf,
            "telefone": self.telefone,
            "logo_url": self.logo_url,
            "logo_marcador_url": self.logo_marcador_url,
            "ativa": self.ativa,
            "latitude": float(self.latitude) if self.latitude is not None else None,
            "longitude": float(self.longitude) if self.longitude is not None else None,
        }
