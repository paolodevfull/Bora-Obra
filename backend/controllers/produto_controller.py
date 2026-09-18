from flask import Blueprint, jsonify, request, session
from backend.controllers.http import endpoint, json_body
from backend.services.acesso import AcessoService
from backend.services.produto.acesso_produto import AcessoProdutoService
from backend.services.produto.criar_produto import CriarProdutoService
from backend.services.produto.editar_produto import EditarProdutoService
from backend.services.produto.listar_produto import ListarProdutoService
from backend.services.produto.deletar_produto import DeletarProdutoService
from backend.services.produto.alternar_disponibilidade import AlternarDisponibilidadeService
from backend.services.produto.buscar_produto_utilidade import BuscarProdutoUtilidadeService
produto_bp = Blueprint('produto_bp', __name__, url_prefix='/api/produtos')
@produto_bp.route('', methods=['POST'])
@endpoint
def criar():
    loja = AcessoService().loja(session.get('user_id'))
    return jsonify(CriarProdutoService().executar({**json_body(), 'loja_id':loja.id})),201
@produto_bp.route('', methods=['GET'])
@endpoint
def listar():
    filtro = AcessoProdutoService().filtro(session.get('user_id'), request.args.get('loja_id', type=int))
    return jsonify(ListarProdutoService().executar(filtro))
@produto_bp.route('/buscar', methods=['GET'])
@endpoint
def buscar():
    return jsonify(BuscarProdutoUtilidadeService().executar(request.args.get('utilidade'),request.args.get('categoria')))
@produto_bp.route('/<int:id>', methods=['PUT','PATCH'])
@endpoint
def editar(id):
    AcessoProdutoService().executar(session.get('user_id'),id)
    return jsonify(EditarProdutoService().executar(id,json_body()))
@produto_bp.route('/<int:id>', methods=['DELETE'])
@endpoint
def deletar(id):
    AcessoProdutoService().executar(session.get('user_id'),id)
    DeletarProdutoService().executar(id)
    return jsonify(mensagem='Produto removido.')
@produto_bp.route('/<int:id>/toggle-disponibilidade', methods=['PATCH'])
@endpoint
def alternar(id):
    AcessoProdutoService().executar(session.get('user_id'),id)
    return jsonify(AlternarDisponibilidadeService().executar(id))
