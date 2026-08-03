import os

from flask import Flask


#importa o banco
from backend.database.database import db


#importar as blueprints
from backend.controllers import index_bp, loja_bp,pedido_bp, produto_bp, user_bp

#----------------------------- BANCO ----------------------------

app = Flask(
        __name__,
        template_folder="frontend/templates",
        static_folder="frontend/static",
    )

database = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(  
    database, 'backend','database','bora_obra.db'
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


app.register_blueprint(index_bp)
app.register_blueprint(user_bp)
app.register_blueprint(produto_bp)
app.register_blueprint(loja_bp)
app.register_blueprint(pedido_bp)

db.init_app(app)

with app.app_context():
    db.create_all()

#-----------------------------------------------------------------


if __name__ == '__main__':
    app.run(debug=True)
    