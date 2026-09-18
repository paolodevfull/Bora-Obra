import { apiRequest } from './api.js';
import { state } from './state.js';
import { escapeHtml, formatarMoeda, statusPedidoLabel, badgeStatusClass, showToast } from './ui.js';
import { formatarDataHora } from './utils.js';
import { criarGraficoFaturamento, criarGraficoGastos, criarGraficoStatusPedidos, criarGraficoModalidades } from './dashboard-charts.js';

let activeController;

function clearError(profile) {
    document.querySelector(`#dashboard-charts-${profile} > .dashboard-error`)?.remove();
}

function showError(profile, message) {
    const root = document.getElementById(`dashboard-charts-${profile}`);
    clearError(profile);
    const error = document.createElement('div');
    error.className = 'dashboard-error';
    const text = document.createElement('span');
    text.textContent = message;
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'btn-secondary'; retry.dataset.action = 'dashboard-recarregar'; retry.dataset.profile = profile; retry.textContent = 'Tentar novamente';
    error.append(text, retry); root.prepend(error);
}

function parseDate(value) {
    const date = new Date(String(value || '').replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
}

function range(profile) {
    const selected = document.getElementById(`periodo-dashboard-${profile}`).value;
    const end = new Date(); end.setHours(23, 59, 59, 999);
    let start = new Date(end); start.setHours(0, 0, 0, 0);
    if (selected === '7d') start.setDate(start.getDate() - 6);
    if (selected === '30d') start.setDate(start.getDate() - 29);
    if (selected === 'mes') start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (selected === 'personalizado') {
        const from = document.getElementById(`periodo-inicio-${profile}`).value;
        const to = document.getElementById(`periodo-fim-${profile}`).value;
        if (!from || !to || from > to) throw new Error('Informe um período personalizado válido.');
        start = new Date(`${from}T00:00:00`);
        end.setTime(new Date(`${to}T23:59:59`).getTime());
    }
    return {start, end};
}

function filterOrders(orders, profile) {
    const {start, end} = range(profile);
    return orders.filter(order => { const date = parseDate(order.created_at); return date && date >= start && date <= end; });
}

function aggregate(orders) {
    const status = {}, modalidades = {}, dates = new Map();
    orders.forEach(order => {
        status[order.status] = (status[order.status] || 0) + 1;
        modalidades[order.tipo] = (modalidades[order.tipo] || 0) + 1;
        const date = parseDate(order.created_at);
        if (!date) return;
        const key = date.toISOString().slice(0, 10);
        const item = dates.get(key) || {vendas: 0, locacoes: 0, total: 0};
        const value = order.status === 'Cancelado' ? 0 : Number(order.valor_total || 0);
        if (order.tipo === 'Venda') item.vendas += value; else item.locacoes += value;
        item.total += value; dates.set(key, item);
    });
    const timeline = [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({label: new Intl.DateTimeFormat('pt-BR', {day:'2-digit', month:'2-digit'}).format(new Date(`${date}T12:00:00`)), ...values}));
    return {status, modalidades, timeline};
}

export function renderDashboardLojista() {
    clearError('lojista');
    const orders = filterOrders(state.cachePedidosLojista || [], 'lojista');
    const valid = orders.filter(order => order.status !== 'Cancelado');
    const revenue = valid.reduce((sum, order) => sum + Number(order.valor_total || 0), 0);
    document.getElementById('dash-faturamento').textContent = formatarMoeda(revenue);
    document.getElementById('dash-alugueis').textContent = valid.filter(order => order.tipo === 'Locacao' && order.status !== 'Entregue').length;
    document.getElementById('dash-pendentes').textContent = orders.filter(order => order.status === 'Pendente').length;
    const concluded = valid.filter(order => order.tipo === 'Venda' && order.status === 'Entregue').length;
    const unavailable = (state.cacheProdutos || []).filter(product => !product.disponivel || product.status_manutencao).length;
    const extra = [
        ['fa-receipt', 'Pedidos no período', orders.length],
        ['fa-circle-check', 'Vendas concluídas', concluded],
        ['fa-chart-line', 'Ticket médio', valid.length ? formatarMoeda(revenue / valid.length) : formatarMoeda(0)],
        ['fa-pause', 'Produtos indisponíveis', unavailable],
        ['fa-box-open', 'Estoque baixo', 'Sem dados'],
        ['fa-calendar-day', 'Devoluções próximas', 'Sem datas']
    ];
    document.getElementById('lojista-dashboard-kpis-extra').innerHTML = extra.map(([icon, label, value]) => `<article><i class="fa-solid ${icon}"></i><div><small>${label}</small><strong>${escapeHtml(value)}</strong></div></article>`).join('');
    const data = aggregate(orders);
    criarGraficoFaturamento('chart-lojista-faturamento', data.timeline);
    criarGraficoStatusPedidos('chart-lojista-status', data.status);
    criarGraficoModalidades('chart-lojista-modalidades', data.modalidades);
}

export function renderDashboardCliente() {
    clearError('cliente');
    const orders = filterOrders(state.cachePedidosCliente || [], 'cliente');
    const valid = orders.filter(order => order.status !== 'Cancelado');
    const cards = [
        ['fa-spinner', 'Em andamento', orders.filter(order => !['Entregue','Cancelado'].includes(order.status)).length],
        ['fa-clock-rotate-left', 'Locações ativas', valid.filter(order => order.tipo === 'Locacao' && order.status !== 'Entregue').length],
        ['fa-wallet', 'Total gasto', formatarMoeda(valid.reduce((sum, order) => sum + Number(order.valor_total || 0), 0))],
        ['fa-circle-check', 'Concluídos', orders.filter(order => order.status === 'Entregue').length]
    ];
    document.getElementById('cliente-dashboard-kpis').innerHTML = cards.map(([icon, label, value]) => `<article><i class="fa-solid ${icon}"></i><div><small>${label}</small><strong>${escapeHtml(value)}</strong></div></article>`).join('');
    const data = aggregate(orders);
    criarGraficoGastos('chart-cliente-gastos', data.timeline);
    criarGraficoModalidades('chart-cliente-modalidades', data.modalidades);
    const recent = [...orders].sort((a,b) => b.id - a.id).slice(0, 5);
    document.getElementById('cliente-dashboard-recentes').innerHTML = recent.length ? recent.map(order => `<article class="recent-order"><div><strong>#${order.id} · ${escapeHtml(order.tipo)}</strong><small>${escapeHtml(formatarDataHora(order.created_at))}</small></div><strong>${formatarMoeda(order.valor_total)}</strong><span class="badge ${badgeStatusClass(order.status)}">${escapeHtml(statusPedidoLabel(order.status, order.tipo))}</span><button class="btn-secondary" type="button" data-action="pedido-ticket" data-id="${order.id}"><i class="fa-solid fa-print"></i> Ticket</button></article>`).join('') : '<div class="dashboard-empty">Nenhum pedido encontrado neste período.</div>';
}

export function periodChanged(profile) {
    const value = document.getElementById(`periodo-dashboard-${profile}`).value;
    document.getElementById(`periodo-personalizado-${profile}`).classList.toggle('hidden', value !== 'personalizado');
    if (value !== 'personalizado') reloadDashboard(profile);
}

export async function reloadDashboard(profile) {
    activeController?.abort();
    activeController = new AbortController();
    const root = document.getElementById(`dashboard-charts-${profile}`);
    root.classList.add('is-loading');
    try {
        const response = await apiRequest('/api/pedidos', {signal: activeController.signal});
        const orders = await response.json();
        if (profile === 'lojista') { state.cachePedidosLojista = orders; renderDashboardLojista(); }
        else { state.cachePedidosCliente = orders; renderDashboardCliente(); }
    } catch (error) {
        if (error.name !== 'AbortError') { showError(profile, error.message); showToast(error.message, 'erro'); }
    } finally {
        root.classList.remove('is-loading');
    }
}
