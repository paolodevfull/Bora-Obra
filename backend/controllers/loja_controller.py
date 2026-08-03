from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models.loja import Loja

loja_bp = Blueprint('lojas', __name__, url_prefix='/api/lojas')

@loja_bp.route('', methods=['GET'])
def listar_lojas():
    lojas = Loja.query.all()
    return jsonify([l.to_dict() for l in lojas]), 200

@loja_bp.route('/<int:id>', methods=['GET'])
def buscar_loja(id):
    loja = Loja.query.get_or_404(id)
    return jsonify(loja.to_dict()), 200

@loja_bp.route('', methods=['POST'])
def criar_loja():
    data = request.get_json()
    
    nova_loja = Loja(
        nome=data.get('nome'),
        cnpj=data.get('cnpj'),
        localizacao=data.get('localizacao'),
        catalogo_ferramentas=data.get('catalogo_ferramentas'),
        user_id=data.get('user_id')
    )
    
    db.session.add(nova_loja)
    db.session.commit()
    return jsonify(nova_loja.to_dict()), 201