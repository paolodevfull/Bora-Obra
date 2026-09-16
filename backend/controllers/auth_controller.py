from flask import Blueprint, request, jsonify, session
from backend.services.user.autenticar_user import AutenticarUserService
from backend.models.user import User

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')


class AuthController:

    @staticmethod
    @auth_bp.route('/login', methods=['POST'])
    def login():
        try:
            dados = request.get_json()
            service = AutenticarUserService()
            usuario = service.executar(dados)
            session['user_id'] = usuario['id']
            session['user_tipo'] = usuario['tipo']
            return jsonify(usuario), 200
        except ValueError as e:
            return jsonify({'erro': str(e)}), 401

    @staticmethod
    @auth_bp.route('/logout', methods=['POST'])
    def logout():
        session.clear()
        return jsonify({'mensagem': 'Sessão encerrada.'}), 200

    @staticmethod
    @auth_bp.route('/me', methods=['GET'])
    def me():
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'erro': 'Não autenticado.'}), 401

        usuario = User.buscar_por_id(user_id)
        if not usuario:
            session.clear()
            return jsonify({'erro': 'Não autenticado.'}), 401

        return jsonify(usuario.to_dict()), 200
