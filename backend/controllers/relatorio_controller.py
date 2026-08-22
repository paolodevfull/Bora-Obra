from flask import Blueprint, jsonify
from backend.services.relatorio.gerar_relatorio_lucro import GerarRelatorioLucroService

relatorio_bp = Blueprint('relatorio_bp', __name__, url_prefix='/api/relatorios')

class RelatorioController:

    @staticmethod
    @relatorio_bp.route('/lucro-diario', methods=['GET'])
    def obter_relatorio_lucro():
        try:
            service = GerarRelatorioLucroService()
            relatorio = service.executar()
            return jsonify(relatorio), 200
        except Exception as e:
            return jsonify({'erro': str(e)}), 500