from flask import Blueprint, jsonify, session
from backend.controllers.http import endpoint, json_body
from backend.services.user.autenticar_user import AutenticarUserService
from backend.services.user.sessao_user import SessaoUserService

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')
@auth_bp.route('/login', methods=['POST'])
@endpoint
def login():
    user = AutenticarUserService().executar(json_body())
    session.clear()
    session['user_id'], session['user_tipo'] = user['id'], user['tipo']
    return jsonify(user)
@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify(mensagem='Sessão encerrada.')
@auth_bp.route('/me', methods=['GET'])
@endpoint
def me():
    return jsonify(SessaoUserService().executar(session.get('user_id')))
