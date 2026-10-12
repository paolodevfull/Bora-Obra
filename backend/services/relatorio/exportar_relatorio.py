"""Renderização isolada dos relatórios em Chromium para PDF e PNG."""
from html import escape
import os
from pathlib import Path

from backend.services.errors import ServiceError


def _moeda(valor):
    texto = f'{float(valor or 0):,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')
    return f'R$ {texto}'


def _tabela(cabecalhos, linhas):
    if not linhas:
        return '<p class="empty">Nenhum resultado encontrado.</p>'
    th = ''.join(f'<th>{escape(str(item))}</th>' for item in cabecalhos)
    body = ''.join('<tr>' + ''.join(f'<td>{escape(str(valor))}</td>' for valor in linha) + '</tr>' for linha in linhas)
    return f'<table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>'


def _grafico_svg(serie):
    if not serie:
        return '<div class="empty chart">Sem movimentações no período selecionado.</div>'
    largura, altura, margem = 1100, 300, 42
    valores = [float(item[chave]) for item in serie for chave in ('vendas', 'locacoes')]
    maximo = max(valores + [1])
    passo = (largura - 2 * margem) / max(len(serie) - 1, 1)
    def pontos(chave):
        return ' '.join(f'{margem + indice * passo:.1f},{altura - margem - (float(item[chave]) / maximo) * (altura - 2 * margem):.1f}' for indice, item in enumerate(serie))
    rotulos = ''.join(f'<text x="{margem + i * passo:.1f}" y="286" text-anchor="middle">{escape(item["data"][5:])}</text>' for i, item in enumerate(serie))
    return f'''<svg viewBox="0 0 {largura} {altura}" role="img" aria-label="Vendas e locações no período">
      <line x1="{margem}" y1="{altura-margem}" x2="{largura-margem}" y2="{altura-margem}" class="axis" />
      <polyline points="{pontos('vendas')}" class="sales"/><polyline points="{pontos('locacoes')}" class="rentals"/>
      {rotulos}<g class="legend"><text x="44" y="22">● Vendas</text><text x="140" y="22">● Locações</text></g>
    </svg>'''


def montar_html(dados):
    resumo = dados['resumo']
    filtros = ''.join(f'<span><b>{escape(str(chave))}:</b> {escape(str(valor))}</span>' for chave, valor in dados['filtros'].items())
    ranking = [[p['nome'], p['categoria'], p['sku'] or '—', p['quantidade'], _moeda(p['faturamento'])] for p in dados['ranking']]
    pedidos = [[p['data'], p['cliente'], p['tipo'], p['status'], p['pagamento'], _moeda(p['total'])] for p in dados['pedidos']]
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
      @page {{ size: A4 landscape; margin: 12mm; }}
      * {{ box-sizing: border-box; }} body {{ margin: 0; font: 13px Arial, sans-serif; color: #25221f; background: #f2f0eb; }}
      main {{ padding: 28px; }} header {{ display:flex; justify-content:space-between; border-bottom:3px solid #f56a0b; padding-bottom:14px; }}
      h1,h2 {{ margin:0 0 8px; }} .brand {{ color:#f56a0b; font-weight:800; }} .period {{ color:#66605a; }}
      .filters {{ display:flex; gap:8px; flex-wrap:wrap; margin:16px 0; }} .filters span {{ padding:6px 10px; border:1px solid #d4cec5; border-radius:12px; background:#faf8f4; }}
      .kpis {{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:18px 0; }} .kpi {{ padding:16px; border:1px solid #d4cec5; border-radius:10px; background:#faf8f4; }} .kpi small {{ color:#66605a; }} .kpi strong {{ display:block; font-size:22px; margin-top:7px; }}
      section {{ margin-top:20px; padding:18px; border:1px solid #d4cec5; border-radius:10px; background:#faf8f4; break-inside:avoid; }}
      svg {{ width:100%; height:300px; }} .axis {{ stroke:#aaa39a; }} polyline {{ fill:none; stroke-width:4; }} .sales {{ stroke:#f56a0b; }} .rentals {{ stroke:#078b63; }} svg text {{ font-size:11px; fill:#66605a; }} .legend text:first-child {{ fill:#f56a0b; }} .legend text:last-child {{ fill:#078b63; }}
      table {{ width:100%; border-collapse:collapse; }} th,td {{ padding:8px; border-bottom:1px solid #ddd7ce; text-align:left; }} th {{ background:#ebe7e0; }} tbody tr:nth-child(even) {{ background:#f3f0eb; }} .empty {{ padding:24px; color:#66605a; text-align:center; }}
      footer {{ margin-top:18px; color:#66605a; font-size:11px; }}
    </style></head><body><main>
      <header><div><div class="brand">BoraObra</div><h1>Relatório de vendas e locações</h1><div class="period">{escape(dados['periodo']['inicio'])} a {escape(dados['periodo']['fim'])}</div></div><div>{escape(dados['loja']['nome'])}<br><small>Gerado em {escape(dados['gerado_em'])}</small></div></header>
      <div class="filters">{filtros}</div>
      <div class="kpis"><div class="kpi"><small>Valor confirmado</small><strong>{_moeda(resumo['total_vendido'])}</strong></div><div class="kpi"><small>Pedidos</small><strong>{resumo['quantidade_pedidos']}</strong></div><div class="kpi"><small>Ticket médio</small><strong>{_moeda(resumo['ticket_medio'])}</strong></div><div class="kpi"><small>Itens confirmados</small><strong>{resumo['produtos_vendidos']}</strong></div></div>
      <section><h2>Vendas e locações por dia</h2>{_grafico_svg(dados['serie'])}</section>
      <section><h2>Desempenho dos produtos</h2>{_tabela(['Produto','Categoria','SKU','Quantidade','Valor'], ranking)}</section>
      <section><h2>Pedidos no período</h2>{_tabela(['Data','Cliente','Modalidade','Status','Pagamento','Valor'], pedidos)}</section>
      <footer>{escape(dados['regra'])}</footer>
    </main></body></html>'''


def exportar_com_playwright(dados, formato):
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as playwright:
            candidatos = [
                os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),
                r'C:\Program Files\Google\Chrome\Application\chrome.exe',
                r'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe',
                r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            ]
            executavel = next((item for item in candidatos if item and Path(item).is_file()), None)
            opcoes = {'headless': True}
            if executavel:
                opcoes['executable_path'] = executavel
            browser = playwright.chromium.launch(**opcoes)
            try:
                page = browser.new_page(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1.5)
                page.set_content(montar_html(dados), wait_until='load')
                page.emulate_media(media='print' if formato == 'pdf' else 'screen')
                if formato == 'pdf':
                    return page.pdf(format='A4', landscape=True, print_background=True,
                                    margin={'top':'12mm','right':'12mm','bottom':'12mm','left':'12mm'})
                return page.screenshot(full_page=True, type='png', animations='disabled')
            finally:
                browser.close()
    except Exception as error:
        raise ServiceError('Não foi possível gerar o arquivo. Verifique a instalação do Chromium do Playwright.') from error
