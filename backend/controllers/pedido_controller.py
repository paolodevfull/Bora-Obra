from flask import Blueprint, jsonify, session
from backend.controllers.http import endpoint, json_body
from backend.services.acesso import AcessoService
from backend.services.pedido.criar_pedido import CriarPedidoService
from backend.services.pedido.consultar_pedidos import ConsultarPedidosService
from backend.services.pedido.gerar_ticket_pedido import GerarTicketPedidoService
from backend.services.pedido.confirmar_entrega_pedido import ConfirmarEntregaPedidoService
from backend.services.pedido.atualizar_status import AtualizarStatusPedidoService
from backend.services.pedido.cancelar_pedido_cliente import CancelarPedidoClienteService
pedido_bp = Blueprint('pedido_bp', __name__, url_prefix='/api/pedidos')
@pedido_bp.route('', methods=['POST'])
@endpoint
def criar():
    user = AcessoService().usuario(session.get('user_id'), {'cliente'})
    return jsonify(CriarPedidoService().executar({**json_body(), 'user_id':user.id})),201
@pedido_bp.route('', methods=['GET'])
@endpoint
def listar():
    return jsonify(ConsultarPedidosService().executar(session.get('user_id')))
@pedido_bp.route('/<int:id>/ticket', methods=['GET'])
@endpoint
def ticket(id):
    return jsonify(GerarTicketPedidoService().executar(id,session.get('user_id')))
@pedido_bp.route('/<int:id>/confirmar-entrega', methods=['PATCH'])
@endpoint
def confirmar(id):
    user = AcessoService().usuario(session.get('user_id'), {'cliente'})
    return jsonify(ConfirmarEntregaPedidoService().executar(id,user.id))

@pedido_bp.route('/<int:id>/cancelar', methods=['PATCH'])
@endpoint
def cancelar_pelo_cliente(id):
    return jsonify(CancelarPedidoClienteService().executar(id, session.get('user_id')))

@pedido_bp.route('/<int:id>', methods=['PATCH'])
@endpoint
def atualizar_status(id):
    return jsonify(AtualizarStatusPedidoService().executar(id, session.get('user_id'), json_body()))
