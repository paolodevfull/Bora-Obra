import { formatarMoeda } from './ui.js';

const instances = new Map();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const palette = { orange: '#FF6B00', green: '#00875A', warning: '#F5A623', red: '#D64545', blue: '#4B8FE2', text: '#F5F5F5', muted: '#B3B3B3', grid: '#333333' };

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
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : {duration: 450},
        indexAxis,
        interaction: {mode: 'index', intersect: false},
        plugins: {
            legend: {labels: {color: palette.text, usePointStyle: true, padding: 16}},
            tooltip: {callbacks: {label: context => `${context.dataset.label}: ${currency ? formatarMoeda(context.parsed.y ?? context.parsed) : context.formattedValue}`}}
        },
        scales: indexAxis === 'x' ? {
            x: {ticks: {color: palette.muted}, grid: {color: palette.grid}},
            y: {beginAtZero: true, ticks: {color: palette.muted, callback: value => currency ? formatarMoeda(value) : value}, grid: {color: palette.grid}}
        } : {
            x: {beginAtZero: true, ticks: {color: palette.muted}, grid: {color: palette.grid}},
            y: {ticks: {color: palette.muted}, grid: {display: false}}
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
    create(canvasId, {type: 'line', data: {labels: series.map(item => item.label), datasets: [
        {label: 'Vendas', data: series.map(item => item.vendas), borderColor: palette.orange, backgroundColor: '#FF6B0030', fill: true, tension: .32},
        {label: 'Locações', data: series.map(item => item.locacoes), borderColor: palette.green, backgroundColor: '#00875A25', fill: true, tension: .32}
    ]}, options: options(true)}, 'Nenhum faturamento registrado no período.');
}

export function criarGraficoGastos(canvasId, series) {
    create(canvasId, {type: 'line', data: {labels: series.map(item => item.label), datasets: [
        {label: 'Total gasto', data: series.map(item => item.total), borderColor: palette.orange, backgroundColor: '#FF6B0030', fill: true, tension: .32}
    ]}, options: options(true)}, 'Nenhum gasto registrado no período.');
}

export function criarGraficoStatusPedidos(canvasId, status) {
    const labels = ['Pendente', 'A preparar', 'Concluído', 'Cancelado'];
    create(canvasId, {type: 'doughnut', data: {labels, datasets: [{label: 'Pedidos', data: [status.Pendente || 0, status.Confirmado || 0, (status.Despachado || 0) + (status.Entregue || 0), status.Cancelado || 0], backgroundColor: [palette.warning, palette.blue, palette.green, palette.red], borderColor: '#1A1A1A', borderWidth: 3}]}, options: {...options(), cutout: '66%', scales: {}}}, 'Nenhum pedido registrado no período.');
}

export function criarGraficoModalidades(canvasId, modalidades) {
    create(canvasId, {type: 'bar', data: {labels: ['Venda', 'Locação'], datasets: [{label: 'Pedidos', data: [modalidades.Venda || 0, modalidades.Locacao || 0], backgroundColor: [palette.orange, palette.green], borderRadius: 7}]}, options: options()}, 'Nenhuma venda ou locação registrada no período.');
}
