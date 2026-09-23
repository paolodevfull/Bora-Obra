import { formatarMoeda } from './ui.js';

const instances = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function palette() {
    const css = getComputedStyle(document.documentElement);
    return {
        orange: css.getPropertyValue('--orange').trim(), green: css.getPropertyValue('--green').trim(),
        warning: css.getPropertyValue('--warning').trim(), red: css.getPropertyValue('--red').trim(), blue: '#4B8FE2',
        text: css.getPropertyValue('--text').trim(), muted: css.getPropertyValue('--text-muted').trim(),
        grid: css.getPropertyValue('--border').trim(), panel: css.getPropertyValue('--panel').trim()
    };
}

function chartLibrary() {
    return globalThis.Chart || null;
}

export function destruirGrafico(canvasId) {
    instances.get(canvasId)?.destroy();
    instances.delete(canvasId);
}

export function destruirGraficos(prefix = '') {
    [...instances.keys()].filter(id => id.startsWith(prefix)).forEach(destruirGrafico);
}

function setState(canvasId, message = '') {
    const canvas = document.getElementById(canvasId);
    const state = canvas?.parentElement.querySelector('.chart-state');
    if (!canvas || !state) return;
    canvas.classList.toggle('hidden', Boolean(message));
    state.classList.toggle('hidden', !message);
    state.textContent = message;
}

function options(currency = false, indexAxis = 'x') {
    const colors = palette();
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : { duration: 450 },
        indexAxis,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { labels: { color: colors.text, usePointStyle: true, padding: 16 } },
            tooltip: { callbacks: { label: context => `${context.dataset.label}: ${currency ? formatarMoeda(context.parsed.y ?? context.parsed) : context.formattedValue}` } }
        },
        scales: indexAxis === 'x' ? {
            x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
            y: { beginAtZero: true, grace: '12%', ticks: { color: colors.muted, callback: value => currency ? formatarMoeda(value) : value }, grid: { color: colors.grid } }
        } : {
            x: { beginAtZero: true, ticks: { color: colors.muted }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.muted }, grid: { display: false } }
        }
    };
}

function create(canvasId, config, emptyMessage) {
    destruirGrafico(canvasId);
    const Chart = chartLibrary();
    if (!Chart) return setState(canvasId, 'Não foi possível carregar a biblioteca de gráficos.');
    const hasData = config.data.datasets.some(dataset => dataset.data.some(value => Number(value) > 0));
    if (!hasData) return setState(canvasId, emptyMessage);
    setState(canvasId);
    instances.set(canvasId, new Chart(document.getElementById(canvasId), config));
}

export function criarGraficoFaturamento(canvasId, series) {
    const colors = palette();
    const unicoDia = series.length === 1;
    const configuracaoDatasets = unicoDia
        ? [
            { label: 'Vendas', data: series.map(item => item.vendas), backgroundColor: colors.orange, borderColor: colors.orange, borderWidth: 1, borderRadius: 8, maxBarThickness: 90 },
            { label: 'Locações', data: series.map(item => item.locacoes), backgroundColor: colors.green, borderColor: colors.green, borderWidth: 1, borderRadius: 8, maxBarThickness: 90 }
        ]
        : [
            { label: 'Vendas', data: series.map(item => item.vendas), borderColor: colors.orange, backgroundColor: `${colors.orange}30`, fill: true, tension: .32, pointRadius: 5, pointHoverRadius: 7, pointBackgroundColor: colors.orange },
            { label: 'Locações', data: series.map(item => item.locacoes), borderColor: colors.green, backgroundColor: `${colors.green}25`, fill: true, tension: .32, pointRadius: 5, pointHoverRadius: 7, pointBackgroundColor: colors.green }
        ];
    const chartOptions = options(true);
    chartOptions.scales.x.offset = unicoDia;
    create(canvasId, {
        type: unicoDia ? 'bar' : 'line',
        data: { labels: series.map(item => item.label), datasets: configuracaoDatasets },
        options: chartOptions
    }, 'Nenhum faturamento registrado no período.');
}

export function criarGraficoGastos(canvasId, series) {
    const colors = palette();
    create(canvasId, {
        type: 'line', data: {
            labels: series.map(item => item.label), datasets: [
                { label: 'Total gasto', data: series.map(item => item.total), borderColor: colors.orange, backgroundColor: `${colors.orange}30`, fill: true, tension: .32 }
            ]
        }, options: options(true)
    }, 'Nenhum gasto registrado no período.');
}

export function criarGraficoStatusPedidos(canvasId, status) {
    const colors = palette();
    const labels = ['Pendente', 'A preparar', 'Concluído', 'Cancelado'];
    create(canvasId, { type: 'doughnut', data: { labels, datasets: [{ label: 'Pedidos', data: [status.Pendente || 0, status.Confirmado || 0, (status.Despachado || 0) + (status.Entregue || 0), status.Cancelado || 0], backgroundColor: [colors.warning, colors.blue, colors.green, colors.red], borderColor: colors.panel, borderWidth: 3 }] }, options: { ...options(), cutout: '66%', scales: {} } }, 'Nenhum pedido registrado no período.');
}

export function criarGraficoModalidades(canvasId, modalidades) {
    const colors = palette();
    create(canvasId, { type: 'bar', data: { labels: ['Venda', 'Locação'], datasets: [{ label: 'Pedidos', data: [modalidades.Venda || 0, modalidades.Locacao || 0], backgroundColor: [colors.orange, colors.green], borderRadius: 7 }] }, options: options() }, 'Nenhuma venda ou locação registrada no período.');
}

export function criarGraficoProdutosPopulares(canvasId, produtos) {
    const colors = palette();
    create(canvasId, {
        type: 'bar',
        data: {
            labels: produtos.map(item => item.nome),
            datasets: [{ label: 'Unidades pedidas', data: produtos.map(item => item.quantidade), backgroundColor: colors.orange, borderRadius: 7 }]
        },
        options: options(false, 'y')
    }, 'Nenhum produto foi pedido neste período.');
}

export function criarGraficoCategorias(canvasId, categorias) {
    const colors = palette();
    create(canvasId, {
        type: 'bar',
        data: {
            labels: categorias.map(item => item.nome),
            datasets: [{ label: 'Unidades pedidas', data: categorias.map(item => item.quantidade), backgroundColor: colors.green, borderRadius: 7 }]
        },
        options: options(false, 'y')
    }, 'Nenhuma categoria teve pedidos neste período.');
}
