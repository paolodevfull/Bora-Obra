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

    disponivel_venda = db.Column(db.Boolean, nullable=False, default=True)
    disponivel_locacao = db.Column(db.Boolean, nullable=False, default=True)
    status_manutencao = db.Column(db.Boolean, nullable=False, default=False)
    classificacao_curva_a = db.Column(db.Boolean, nullable=False, default=False)
    descricao = db.Column(db.Text)
    cor_tamanho = db.Column(db.String(100))
    estoque = db.Column(db.Integer, nullable=False, default=0)
    unidade = db.Column(db.String(20), nullable=False, default='un')
    sku = db.Column(db.String(60))
    imagem_url = db.Column(db.String(500))

    def to_dict(self):
        return {
            "id": self.id,
            "loja_id": self.loja_id,
            "nome": self.nome,
            "categoria": self.categoria,
            "utilidade": self.utilidade,
            "preco_venda": self.preco_venda,
            "preco_locacao": self.preco_locacao,
            "disponivel": self.disponivel,
            "disponivel_venda": self.disponivel_venda,
            "disponivel_locacao": self.disponivel_locacao,
            "status_manutencao": self.status_manutencao,
            "classificacao_curva_a": self.classificacao_curva_a,
            "descricao": self.descricao,
            "cor_tamanho": self.cor_tamanho
            ,"estoque": self.estoque
            ,"unidade": self.unidade
            ,"sku": self.sku
            ,"imagem_url": self.imagem_url
        }
