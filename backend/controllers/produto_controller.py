from flask import Blueprint, request, jsonify
from backend.services.produto.criar_produto import CriarProdutoService
from backend.services.produto.listar_produto import ListarProdutoService
from backend.services.produto.alternar_disponibilidade import AlternarDisponibilidadeService
from backend.services.produto.buscar_produto_utilidade import BuscarProdutoUtilidadeService

produto_bp = Blueprint('produto_bp', __name__, url_prefix='/api/produtos')

class ProdutoController:

    @staticmethod
    @produto_bp.route('', methods=['POST'])
    def criar():
        try:
            dados = request.get_json()
            service = CriarProdutoService()
            produto = service.executar(dados)
            return jsonify(produto), 201
        except ValueError as e:
            return jsonify({'erro': str(e)}), 400

    @staticmethod
    @produto_bp.route('', methods=['GET'])
    def listar():
        service = ListarProdutoService()
        return jsonify(service.executar()), 200

    @staticmethod
    @produto_bp.route('/<int:id>/toggle-disponibilidade', methods=['PATCH'])
    def alternar_disponibilidade(id):
        try:
            service = AlternarDisponibilidadeService()
            produto = service.executar(id)
            return jsonify(produto), 200
        except ValueError as e:
            return jsonify({'erro': str(e)}), 404

    @staticmethod
    @produto_bp.route('/buscar', methods=['GET'])
    def buscar_por_utilidade():
        utilidade = request.args.get('utilidade')
        categoria = request.args.get('categoria')
        service = BuscarProdutoUtilidadeService()
        resultado = service.executar(utilidade, categoria)
        return jsonify(resultado), 200