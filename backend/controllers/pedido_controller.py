from flask import Blueprint, request, jsonify, session
from backend.services.pedido.criar_pedido import CriarPedidoService
from backend.services.pedido.listar_pedidos import ListarPedidosService
from backend.services.pedido.gerar_ticket_pedido import GerarTicketPedidoService

pedido_bp = Blueprint('pedido_bp', __name__, url_prefix='/api/pedidos')


class PedidoController:

    @staticmethod
    @pedido_bp.route('', methods=['POST'])
    def criar():
        # Lojista não cria pedido — apenas o cliente, a partir do catálogo.
        if session.get('user_tipo') == 'lojista':
            return jsonify({'erro': 'Lojistas não podem criar pedidos.'}), 403

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
        # ?user_id=<id> filtra "meus pedidos" (usado pela tela do cliente).
        # Sem o parâmetro, retorna todos (usado pela tela do lojista).
        user_id = request.args.get('user_id', type=int)
        service = ListarPedidosService()
        return jsonify(service.executar(user_id=user_id)), 200

    @staticmethod
    @pedido_bp.route('/<int:id>/ticket', methods=['GET'])
    def gerar_ticket(id):
        try:
            service = GerarTicketPedidoService()
            ticket = service.executar(id)
            return jsonify(ticket), 200
        except ValueError as e:
            return jsonify({'erro': str(e)}), 404
