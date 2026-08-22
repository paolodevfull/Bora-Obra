import os
from flask import Flask, render_template
from backend.database.database import db

# Importar as Blueprints das Controllers
from backend.controllers.user_controller import user_bp
from backend.controllers.loja_controller import loja_bp
from backend.controllers.produto_controller import produto_bp
from backend.controllers.pedido_controller import pedido_bp
from backend.controllers.relatorio_controller import relatorio_bp

app = Flask(
    __name__,
    template_folder="frontend/templates",
    static_folder="frontend/static"
)

database = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(database, "backend/database/bora_obra.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Inicializar Banco
db.init_app(app)

# Registrar Blueprints da API
app.register_blueprint(user_bp)
app.register_blueprint(loja_bp)
app.register_blueprint(produto_bp)
app.register_blueprint(pedido_bp)
app.register_blueprint(relatorio_bp)

# Rota principal para carregar o Frontend (index.html)
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)