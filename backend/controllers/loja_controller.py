from flask import Blueprint, request, jsonify
from backend.services.loja.criar_loja import CriarLojaService
from backend.services.loja.listar_lojas import ListarLojasService

loja_bp = Blueprint('loja_bp', __name__, url_prefix='/api/lojas')

class LojaController:

    @staticmethod
    @loja_bp.route('', methods=['POST'])
    def criar():
        try:
            dados = request.get_json()
            if not dados:
                return jsonify({'erro': 'Corpo da requisição inválido ou vazio.'}), 400

            service = CriarLojaService()
            loja = service.executar(dados)
            return jsonify(loja), 201
        except ValueError as e:
            return jsonify({'erro': str(e)}), 400
        except Exception as e:
            return jsonify({'erro': f'Erro interno no servidor: {str(e)}'}), 500

    @staticmethod
    @loja_bp.route('', methods=['GET'])
    def listar():
        try:
            service = ListarLojasService()
            lojas = service.executar()
            return jsonify(lojas), 200
        except Exception as e:
            return jsonify({'erro': str(e)}), 500