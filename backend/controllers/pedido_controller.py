from flask import Blueprint, request, jsonify
from backend.services.pedido.criar_pedido import criar_pedido_service
from backend.services.pedido.listar_pedidos import listar_pedidos_service, obter_pedido_detalhado_service

pedido_bp = Blueprint('pedido_bp', __name__, url_prefix='/api/pedidos')

@pedido_bp.route('', methods=['GET'])
def listar():
    pedidos = listar_pedidos_service()
    return jsonify(pedidos), 200

@pedido_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    try:
        pedido = obter_pedido_detalhado_service(id)
        return jsonify(pedido), 200
    except KeyError as e:
        return jsonify({'erro': str(e)}), 404

@pedido_bp.route('', methods=['POST'])
def criar():
    try:
        dados = request.get_json()
        novo_pedido = criar_pedido_service(dados)
        return jsonify(novo_pedido), 201
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    except KeyError as e:
        return jsonify({'erro': str(e)}), 404