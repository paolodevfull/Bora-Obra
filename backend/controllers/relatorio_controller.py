from flask import Blueprint, jsonify, session
from backend.controllers.http import endpoint
from backend.services.relatorio.gerar_relatorio_lucro import GerarRelatorioLucroService
relatorio_bp = Blueprint('relatorio_bp',__name__,url_prefix='/api/relatorios')
@relatorio_bp.route('/lucro-diario', methods=['GET'])
@endpoint
def diario():
    return jsonify(GerarRelatorioLucroService().executar(session.get('user_id')))
