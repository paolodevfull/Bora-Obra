from flask import Blueprint, request, jsonify
from backend.services.user.criar_user import CriarUserService
from backend.services.user.listar_user import ListarUserService
from backend.services.user.editar_user import EditarUserService
from backend.services.user.deletar_user import DeletarUserService

user_bp = Blueprint('user_bp', __name__, url_prefix='/api/users')

class UserController:

    @staticmethod
    @user_bp.route('', methods=['POST'])
    def criar():
        try:
            dados = request.get_json()
            service = CriarUserService()
            usuario = service.executar(dados)
            return jsonify(usuario), 201
        except ValueError as e:
            return jsonify({'erro': str(e)}), 400

    @staticmethod
    @user_bp.route('', methods=['GET'])
    def listar():
        service = ListarUserService()
        return jsonify(service.executar()), 200

    @staticmethod
    @user_bp.route('/<int:id>', methods=['PUT'])
    def editar(id):
        try:
            dados = request.get_json()
            service = EditarUserService()
            usuario = service.executar(id, dados)
            return jsonify(usuario), 200
        except ValueError as e:
            return jsonify({'erro': str(e)}), 400

    @staticmethod
    @user_bp.route('/<int:id>', methods=['DELETE'])
    def deletar(id):
        try:
            service = DeletarUserService()
            service.executar(id)
            return jsonify({'mensagem': 'Usuário removido com sucesso'}), 200
        except ValueError as e:
            return jsonify({'erro': str(e)}), 400