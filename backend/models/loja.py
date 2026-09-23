from backend.database.database import db


class Loja(db.Model):
    __tablename__ = 'lojas'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    endereco = db.Column(db.String(300), nullable=False)
    cep = db.Column(db.String(9), nullable=True)
    logradouro = db.Column(db.String(150), nullable=True)
    numero = db.Column(db.String(20), nullable=True)
    complemento = db.Column(db.String(100), nullable=True)
    bairro = db.Column(db.String(100), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    uf = db.Column(db.String(2), nullable=True)
    telefone = db.Column(db.String(20))
    responsavel_nome = db.Column(db.String(100))
    documento = db.Column(db.String(18))
    email = db.Column(db.String(120))
    logo_url = db.Column(db.String(500))
    logo_marcador_url = db.Column(db.String(500))
    ativa = db.Column(db.Boolean, nullable=False, default=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    lojista_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=True)

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
            "latitude": self.latitude,
            "longitude": self.longitude
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
            "latitude": self.latitude,
            "longitude": self.longitude,
        }
