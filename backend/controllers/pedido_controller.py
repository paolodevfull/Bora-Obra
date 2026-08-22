from flask import Blueprint, request, jsonify
from backend.services.pedido.criar_pedido import CriarPedidoService
from backend.services.pedido.listar_pedidos import ListarPedidosService
from backend.services.pedido.gerar_ticket_pedido import GerarTicketPedidoService

pedido_bp = Blueprint('pedido_bp', __name__, url_prefix='/api/pedidos')

class PedidoController:

    @staticmethod
    @pedido_bp.route('', methods=['POST'])
    def criar():
        try:
            dados = request.get_json()
            service = CriarPedidoService()
            pedido = service.executar(dados)
            return jsonify(pedido), 201
        except ValueError as e:
            return jsonify({'erro': str(e)}), 400

    @staticmethod
    @pedido_bp.route('', methods=['GET'])
    def listar():
        service = ListarPedidosService()
        return jsonify(service.executar()), 200

    @staticmethod
    @pedido_bp.route('/<int:id>/ticket', methods=['GET'])
    def gerar_ticket(id):
        try:
            service = GerarTicketPedidoService()
            ticket = service.executar(id)
            return jsonify(ticket), 200
        except ValueError as e:
            return jsonify({'erro': str(e)}), 404