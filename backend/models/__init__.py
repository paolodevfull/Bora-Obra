from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


#fazer os imports dos models aqui
from .base_model import ModeloBase
from .produto import Produto

__all__ = ["db","ModeloBase","Produto"]