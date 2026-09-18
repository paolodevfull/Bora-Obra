from flask import Blueprint, jsonify, session
from backend.controllers.http import endpoint, json_body
from backend.services.acesso import AcessoService
from backend.services.loja.criar_loja import CriarLojaService
from backend.services.loja.listar_lojas import ListarLojasService
from backend.services.loja.editar_loja import EditarLojaService
from backend.services.loja.consultar_lojas import ConsultarLojasService
loja_bp = Blueprint('loja_bp', __name__, url_prefix='/api/lojas')
@loja_bp.route('', methods=['POST'])
@endpoint
def criar():
    user = AcessoService().usuario(session.get('user_id'), {'lojista'})
    return jsonify(CriarLojaService().executar(json_body(),user.id)),201
@loja_bp.route('', methods=['GET'])
@endpoint
def listar():
    return jsonify(ConsultarLojasService().executar(session.get('user_id')))
@loja_bp.route('/<int:id>', methods=['PUT','PATCH'])
@endpoint
def editar(id):
    user = AcessoService().usuario(session.get('user_id'), {'lojista'})
    return jsonify(EditarLojaService().executar(id,user.id,json_body()))
