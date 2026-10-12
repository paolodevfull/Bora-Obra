from backend.database.database import db
from sqlalchemy import func
from sqlalchemy.dialects import mysql

class ModeloBase(db.Model):

    __abstract__ = True
    
    id = db.Column(mysql.INTEGER(unsigned=True), primary_key=True, autoincrement=True)

    created_at = db.Column(db.DateTime, nullable=False, server_default=func.current_timestamp())

    def __repr__(self):
        return f'<{type(self).__name__} {self.id}>'

    def to_dict(self):
        """Converte automaticamente o Model em dicionário para o jsonify"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
