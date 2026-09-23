from flask import Blueprint, jsonify, session, request
from backend.controllers.http import endpoint, json_body
from backend.services.acesso import AcessoService
from backend.services.loja.criar_loja import CriarLojaService
from backend.services.loja.listar_lojas import ListarLojasService
from backend.services.loja.editar_loja import EditarLojaService
from backend.services.loja.consultar_lojas import ConsultarLojasService
from backend.services.loja.logo_loja import LogoLojaService
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
@loja_bp.route('/<int:id>/logo', methods=['POST'])
@endpoint
def enviar_logo(id):
    user = AcessoService().usuario(session.get('user_id'), {'lojista'})
    return jsonify(LogoLojaService().enviar(id, user.id, request.files.get('logo')))
@loja_bp.route('/<int:id>/logo', methods=['DELETE'])
@endpoint
def remover_logo(id):
    user = AcessoService().usuario(session.get('user_id'), {'lojista'})
    return jsonify(LogoLojaService().remover(id, user.id))
