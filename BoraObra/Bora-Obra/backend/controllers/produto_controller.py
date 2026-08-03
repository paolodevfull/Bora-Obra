from flask import Blueprint, request, jsonify
from backend.services.produto.criar_produto import criar_produto_service
from backend.services.produto.listar_produto import listar_produtos_service, obter_produto_por_id_service
from backend.services.produto.editar_produto import editar_produto_service
from backend.services.produto.deletar_produto import deletar_produto_service

produto_bp = Blueprint('produto_bp', __name__, url_prefix='/api/produtos')

@produto_bp.route('', methods=['GET'])
def listar():
    produtos = listar_produtos_service()
    return jsonify(produtos), 200

@produto_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    try:
        produto = obter_produto_por_id_service(id)
        return jsonify(produto), 200
    except KeyError as e:
        return jsonify({'erro': str(e)}), 404

@produto_bp.route('', methods=['POST'])
def criar():
    try:
        dados = request.get_json()
        novo_produto = criar_produto_service(dados)
        return jsonify(novo_produto), 201
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400

@produto_bp.route('/<int:id>', methods=['PUT'])
def editar(id):
    try:
        dados = request.get_json()
        produto_atualizado = editar_produto_service(id, dados)
        return jsonify(produto_atualizado), 200
    except KeyError as e:
        return jsonify({'erro': str(e)}), 404

@produto_bp.route('/<int:id>', methods=['DELETE'])
def deletar(id):
    try:
        deletar_produto_service(id)
        return jsonify({'mensagem': 'Produto removido com sucesso'}), 200
    except KeyError as e:
        return jsonify({'erro': str(e)}), 404