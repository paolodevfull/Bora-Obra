import { apiRequest } from './api.js';
import { escapeHtml, formatarMoeda, exibirNotificacao } from './ui.js';

let grafico = null;

const iso = data => new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function definirPeriodo(periodo = '30d') {
    const fim = new Date();
    const inicio = new Date(fim);
    if (periodo === '7d') inicio.setDate(fim.getDate() - 6);
    else if (periodo === '30d') inicio.setDate(fim.getDate() - 29);
    else if (periodo === 'mes') inicio.setDate(1);
    document.getElementById('relatorio-inicio').value = iso(inicio);
    document.getElementById('relatorio-fim').value = iso(fim);
}

function parametros() {
    const campos = { inicio: 'relatorio-inicio', fim: 'relatorio-fim', tipo: 'relatorio-tipo', status: 'relatorio-status', pagamento: 'relatorio-pagamento', cliente: 'relatorio-cliente', produto: 'relatorio-produto', categoria: 'relatorio-categoria' };
    const params = new URLSearchParams();
    Object.entries(campos).forEach(([chave, id]) => { const valor = document.getElementById(id).value.trim(); if (valor) params.set(chave, valor); });
    return params;
}

export async function carregarRelatorioFiltrado(event) {
    event?.preventDefault();
    const res = await apiRequest(`/api/relatorios/detalhado?${parametros()}`);
    const dados = await res.json();
    const resumo = dados.resumo;
    document.getElementById('relatorio-kpis').innerHTML = [['Total no período', formatarMoeda(resumo.total_vendido), 'fa-wallet'], ['Pedidos válidos', resumo.quantidade_pedidos ?? resumo.quantidade_vendas, 'fa-receipt'], ['Ticket médio', formatarMoeda(resumo.ticket_medio), 'fa-chart-line'], ['Itens vendidos ou alugados', resumo.produtos_vendidos, 'fa-box']].map(([titulo, valor, icone]) => `<article class="metric-card"><div class="metric-icon"><i class="fa-solid ${icone}"></i></div><div><span>${titulo}</span><strong>${valor}</strong></div></article>`).join('');
    const filtros = [...parametros().entries()];
    document.getElementById('relatorio-filtros-ativos').innerHTML = filtros.map(([chave, valor]) => `<span>${escapeHtml(chave)}: ${escapeHtml(valor)}</span>`).join('') || '<span>Sem filtros adicionais</span>';
    renderizarGrafico(dados);
}

function renderizarGrafico(dados) {
    grafico?.destroy();
    const estado = document.getElementById('relatorio-chart-state');
    const canvas = document.getElementById('chart-relatorio');
    if (!dados.serie.length) {
        canvas.classList.add('hidden'); estado.classList.remove('hidden'); estado.textContent = 'Nenhum dado encontrado para os filtros selecionados.'; return;
    }
    canvas.classList.remove('hidden'); estado.classList.add('hidden');
    const css = getComputedStyle(document.documentElement);
    const cor = nome => css.getPropertyValue(nome).trim();
    grafico = new Chart(canvas, { type: 'line', data: { labels: dados.serie.map(item => new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')), datasets: [{ label: 'Vendas', data: dados.serie.map(item => item.vendas), borderColor: cor('--orange'), backgroundColor: `${cor('--orange')}26`, fill: true, tension: .25 }, { label: 'Locações', data: dados.serie.map(item => item.locacoes), borderColor: cor('--green'), backgroundColor: `${cor('--green')}21`, fill: true, tension: .25 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: cor('--text') } }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}` } } }, scales: { x: { ticks: { color: cor('--text-muted') }, grid: { color: cor('--border') } }, y: { ticks: { color: cor('--text-muted'), callback: value => formatarMoeda(value) }, grid: { color: cor('--border') } } } } });
}

export function exportarXml() { window.location.href = `/api/relatorios/detalhado.xml?${parametros()}`; }
export function exportarGraficoPng() {
    if (!grafico) return exibirNotificacao('Gere um relatório com dados antes de exportar.', 'aviso');
    const origem = grafico.canvas, destino = document.createElement('canvas');
    destino.width = Math.max(1600, origem.width * 2); destino.height = Math.max(900, origem.height * 2 + 150);
    const estilos = getComputedStyle(document.documentElement);
    const cor = nome => estilos.getPropertyValue(nome).trim();
    const ctx = destino.getContext('2d'); ctx.fillStyle = cor('--color-surface'); ctx.fillRect(0, 0, destino.width, destino.height); ctx.fillStyle = cor('--color-text-primary'); ctx.font = 'bold 38px sans-serif'; ctx.fillText('BoraObra — Vendas e locações', 60, 60); ctx.fillStyle = cor('--color-text-secondary'); ctx.font = '24px sans-serif'; ctx.fillText(`Período: ${document.getElementById('relatorio-inicio').value} a ${document.getElementById('relatorio-fim').value}`, 60, 105); ctx.drawImage(origem, 40, 135, destino.width - 80, destino.height - 175);
    const link = document.createElement('a'); link.download = `relatorio-boraobra-${iso(new Date())}.png`; link.href = destino.toDataURL('image/png', 1); link.click();
}
