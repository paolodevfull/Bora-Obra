from flask import Blueprint, render_template, jsonify
from backend.models.produto import Produto

index_bp = Blueprint("index", __name__)

# Rota Principal (Servida ao entrar em http://127.0.0.1:5000/)
@index_bp.route("/", methods=["GET"])
def home():
    return render_template("index.html")

# Rota para a página de usuários
@index_bp.route("/usuarios", methods=["GET"])
def pagina_usuarios():
    return render_template("usuarios.html")

# Rota de Status da API
@index_bp.route("/api/status", methods=["GET"])
def status():
    total_produtos = Produto.query.count()
    return jsonify({
        "status": "API Bora Obra Online",
        "total_produtos": total_produtos
    }), 200