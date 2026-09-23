from flask import Blueprint, Response, jsonify, request, session
from xml.etree.ElementTree import Element, SubElement, tostring
from backend.controllers.http import endpoint
from backend.services.relatorio.gerar_relatorio_lucro import GerarRelatorioLucroService
from backend.services.relatorio.gerar_relatorio_filtrado import GerarRelatorioFiltradoService
relatorio_bp = Blueprint('relatorio_bp',__name__,url_prefix='/api/relatorios')
@relatorio_bp.route('/lucro-diario', methods=['GET'])
@endpoint
def diario():
    return jsonify(GerarRelatorioLucroService().executar(session.get('user_id')))
@relatorio_bp.route('/detalhado', methods=['GET'])
@endpoint
def detalhado():
    return jsonify(GerarRelatorioFiltradoService().executar(session.get('user_id'), request.args.to_dict()))
@relatorio_bp.route('/detalhado.xml', methods=['GET'])
@endpoint
def detalhado_xml():
    dados = GerarRelatorioFiltradoService().executar(session.get('user_id'), request.args.to_dict())
    raiz = Element('relatorio', inicio=dados['periodo']['inicio'], fim=dados['periodo']['fim'])
    resumo = SubElement(raiz, 'resumo')
    for chave, valor in dados['resumo'].items(): SubElement(resumo, chave).text = str(valor)
    pedidos = SubElement(raiz, 'pedidos')
    for linha in dados['pedidos']:
        item = SubElement(pedidos, 'pedido')
        for chave, valor in linha.items(): SubElement(item, chave).text = str(valor or '')
    return Response(tostring(raiz, encoding='utf-8', xml_declaration=True), mimetype='application/xml', headers={'Content-Disposition': 'attachment; filename=relatorio-boraobra.xml'})
