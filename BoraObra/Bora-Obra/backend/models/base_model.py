from datetime import datetime


from . import db

class ModeloBase(db.Model):

    __abstract__ = True
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        """Converte automaticamente o Model em dicionário para o jsonify"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}