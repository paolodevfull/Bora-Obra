from flask import Blueprint, Response, jsonify, request, session
from xml.etree.ElementTree import Element, SubElement, tostring
from backend.controllers.http import endpoint
from backend.services.relatorio.gerar_relatorio_lucro import GerarRelatorioLucroService
from backend.services.relatorio.gerar_relatorio_filtrado import GerarRelatorioFiltradoService
from backend.services.relatorio.listar_opcoes import ListarOpcoesRelatorioService
from backend.services.relatorio.exportar_relatorio import exportar_com_playwright
relatorio_bp = Blueprint('relatorio_bp',__name__,url_prefix='/api/relatorios')

@relatorio_bp.route('/opcoes', methods=['GET'])
@endpoint
def opcoes():
    return jsonify(ListarOpcoesRelatorioService().executar(session.get('user_id'), request.args.to_dict()))
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
    def adicionar(pai, chave, valor):
        no = SubElement(pai, chave)
        if isinstance(valor, dict):
            for campo, conteudo in valor.items():
                adicionar(no, campo, conteudo)
        elif isinstance(valor, list):
            for conteudo in valor:
                adicionar(no, 'pedido' if chave == 'pedidos' else 'item', conteudo)
        else:
            no.text = '' if valor is None else str(valor)
    for chave in ('gerado_em', 'regra', 'resumo', 'serie', 'pedidos', 'ranking_completo', 'produtos_selecionados'):
        adicionar(raiz, chave, dados[chave])
    filtros = SubElement(raiz, 'filtros')
    for chave, valor in dados['filtros'].items():
        SubElement(filtros, 'filtro', nome=chave).text = str(valor)
    return Response(tostring(raiz, encoding='utf-8', xml_declaration=True), mimetype='application/xml', headers={'Content-Disposition': 'attachment; filename=relatorio-boraobra.xml'})

@relatorio_bp.route('/detalhado.pdf', methods=['GET'])
@endpoint
def detalhado_pdf():
    dados = GerarRelatorioFiltradoService().executar(session.get('user_id'), request.args.to_dict())
    return Response(exportar_com_playwright(dados, 'pdf'), mimetype='application/pdf',
                    headers={'Content-Disposition': 'attachment; filename=relatorio-boraobra.pdf'})

@relatorio_bp.route('/detalhado.png', methods=['GET'])
@endpoint
def detalhado_png():
    dados = GerarRelatorioFiltradoService().executar(session.get('user_id'), request.args.to_dict())
    return Response(exportar_com_playwright(dados, 'png'), mimetype='image/png',
                    headers={'Content-Disposition': 'attachment; filename=relatorio-boraobra.png'})
