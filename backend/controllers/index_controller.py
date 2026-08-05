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

@index_bp.route("/lojas", methods=["GET"])
def pagina_lojas():
    return render_template("lojas.html")


@index_bp.route("/produtos", methods=["GET"])
def pagina_produtos():
    return render_template("produtos.html")

@index_bp.route("/pedidos", methods=["GET"])
def pagina_pedidos():
    return render_template("pedidos.html")

    
# Rota de Status da API
@index_bp.route("/api/status", methods=["GET"])
def status():
    total_produtos = Produto.query.count()
    return jsonify({
        "status": "API Bora Obra Online",
        "total_produtos": total_produtos
    }), 200