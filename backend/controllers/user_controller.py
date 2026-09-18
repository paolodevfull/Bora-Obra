from flask import Blueprint, jsonify, session
from backend.controllers.http import endpoint, json_body
from backend.services.user.cadastrar_user import CadastrarUserService
from backend.services.user.listar_user import ListarUserService
from backend.services.user.editar_user import EditarUserService
from backend.services.acesso import AcessoService
user_bp = Blueprint('user_bp', __name__, url_prefix='/api/users')
@user_bp.route('', methods=['POST'])
@endpoint
def criar():
    return jsonify(CadastrarUserService().executar(json_body(),session.get('user_id'))),201
@user_bp.route('', methods=['GET'])
@endpoint
def listar():
    user = AcessoService().usuario(session.get('user_id'), {'lojista'})
    return jsonify(ListarUserService().executar(user.id))
@user_bp.route('/me', methods=['PUT','PATCH'])
@endpoint
def editar():
    user = AcessoService().usuario(session.get('user_id'))
    return jsonify(EditarUserService().executar(user.id,json_body()))
