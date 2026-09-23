from flask import Blueprint, jsonify, session
from backend.controllers.http import endpoint, json_body
from backend.services.user.cadastrar_user import CadastrarUserService
from backend.services.user.listar_user import ListarUserService
from backend.services.user.editar_user import EditarUserService
from backend.services.acesso import AcessoService
from backend.services.user.gerenciar_funcionario import GerenciarFuncionarioService
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
@user_bp.route('/<int:id>', methods=['PATCH','PUT'])
@endpoint
def editar_funcionario(id):
    return jsonify(GerenciarFuncionarioService().editar(id, session.get('user_id'), json_body()))
@user_bp.route('/<int:id>', methods=['DELETE'])
@endpoint
def excluir_funcionario(id):
    GerenciarFuncionarioService().excluir(id, session.get('user_id'))
    return jsonify(mensagem='Funcionário removido.')
