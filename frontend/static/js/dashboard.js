import { apiRequest } from './api.js';
import { state } from './state.js';
import { escapeHtml, formatarMoeda, statusPedidoLabel, badgeStatusClass, showToast } from './ui.js';
import { formatarDataHora } from './utils.js';
import { criarGraficoFaturamento, criarGraficoGastos, criarGraficoStatusPedidos, criarGraficoModalidades, criarGraficoProdutosPopulares, criarGraficoCategorias } from './dashboard-charts.js?v=20260922-5';

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
    const normalized = String(value || '').trim();
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00:00` : normalized.replace(' ', 'T'));
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
    return { start, end };
}

function filterOrders(orders, profile) {
    const { start, end } = range(profile);
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
        const item = dates.get(key) || { vendas: 0, locacoes: 0, total: 0 };
        const value = order.status === 'Cancelado' ? 0 : Number(order.valor_total || 0);
        if (order.tipo === 'Venda') item.vendas += value; else item.locacoes += value;
        item.total += value; dates.set(key, item);
    });
    const timeline = [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${date}T12:00:00`)), ...values }));
    return { status, modalidades, timeline };
}

function aggregateProducts(orders, products) {
    const productNames = new Map(products.map(product => [Number(product.id), product.nome]));
    const productCategories = new Map(products.map(product => [Number(product.id), product.categoria || 'Sem categoria']));
    const productTotals = new Map();
    const categoryTotals = new Map();
    orders.filter(order => order.status !== 'Cancelado').forEach(order => {
        (order.itens || []).forEach(item => {
            const productId = Number(item.produto_id);
            const quantity = Math.max(0, Number(item.quantidade) || 0);
            const name = productNames.get(productId) || item.nome_produto || 'Produto removido';
            const category = productCategories.get(productId) || 'Sem categoria';
            productTotals.set(name, (productTotals.get(name) || 0) + quantity);
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + quantity);
        });
    });
    const rank = values => [...values.entries()]
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'))
        .slice(0, 6);
    return { products: rank(productTotals), categories: rank(categoryTotals) };
}

export function renderDashboardLojista() {
    clearError('lojista');
    const orders = filterOrders(state.cachePedidosLojista || [], 'lojista');
    const products = state.cacheProdutos || [];
    const valid = orders.filter(order => order.status !== 'Cancelado');
    const revenue = valid.reduce((sum, order) => sum + Number(order.valor_total || 0), 0);
    document.getElementById('dash-faturamento').textContent = formatarMoeda(revenue);
    document.getElementById('dash-alugueis').textContent = valid.filter(order => order.tipo === 'Locacao' && order.status !== 'Entregue').length;
    const pending = orders.filter(order => order.status === 'Pendente').length;
    document.getElementById('dash-pendentes').textContent = pending;
    document.getElementById('dash-produtos').textContent = products.length;
    document.getElementById('dash-disponiveis').textContent = products.filter(product => product.disponivel && !product.status_manutencao && Number(product.estoque || 0) > 0).length;
    const concluded = valid.filter(order => order.tipo === 'Venda' && order.status === 'Entregue').length;
    const unavailable = products.filter(product => !product.disponivel || product.status_manutencao || Number(product.estoque || 0) <= 0).length;
    const lowStock = products.filter(product => product.disponivel && !product.status_manutencao && Number(product.estoque || 0) > 0 && Number(product.estoque) <= 5).length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingReturns = valid.filter(order => {
        if (order.tipo !== 'Locacao' || order.status === 'Entregue') return false;
        const returnDate = parseDate(order.data_fim_locacao);
        return returnDate && returnDate <= nextWeek;
    }).length;
    const extra = [
        ['fa-receipt', 'Pedidos no período', orders.length],
        ['fa-circle-check', 'Vendas concluídas', concluded],
        ['fa-chart-line', 'Ticket médio', valid.length ? formatarMoeda(revenue / valid.length) : formatarMoeda(0)],
        ['fa-pause', 'Produtos indisponíveis', unavailable],
        ['fa-box-open', 'Estoque baixo', lowStock],
        ['fa-calendar-day', 'Devoluções próximas', upcomingReturns]
    ];
    document.getElementById('lojista-dashboard-kpis-extra').innerHTML = extra.map(([icon, label, value]) => `<article><i class="fa-solid ${icon}"></i><div><small>${label}</small><strong>${escapeHtml(value)}</strong></div></article>`).join('');
    const alerts = document.getElementById('dashboard-alertas');
    if (alerts) alerts.innerHTML = pending
        ? `<div class="attention-summary"><i class="fa-solid fa-bell"></i><div><strong>${pending} ${pending === 1 ? 'pedido aguarda' : 'pedidos aguardam'} aprovação</strong><small>Abra a fila para iniciar o atendimento.</small></div><a class="btn-secondary" href="/lojista/pedidos.html">Ver fila</a></div>`
        : '<i class="fa-solid fa-check"></i>Nenhum alerta no momento.';
    const data = aggregate(orders);
    criarGraficoFaturamento('chart-lojista-faturamento', data.timeline);
    criarGraficoStatusPedidos('chart-lojista-status', data.status);
    criarGraficoModalidades('chart-lojista-modalidades', data.modalidades);
    const ranking = aggregateProducts(orders, products);
    criarGraficoProdutosPopulares('chart-lojista-produtos', ranking.products);
    criarGraficoCategorias('chart-lojista-categorias', ranking.categories);
}

export function renderDashboardCliente() {
    clearError('cliente');
    const orders = filterOrders(state.cachePedidosCliente || [], 'cliente');
    const valid = orders.filter(order => order.status !== 'Cancelado');
    const cards = [
        ['fa-spinner', 'Em andamento', orders.filter(order => !['Entregue', 'Cancelado'].includes(order.status)).length],
        ['fa-clock-rotate-left', 'Locações ativas', valid.filter(order => order.tipo === 'Locacao' && order.status !== 'Entregue').length],
        ['fa-wallet', 'Total gasto', formatarMoeda(valid.reduce((sum, order) => sum + Number(order.valor_total || 0), 0))],
        ['fa-circle-check', 'Concluídos', orders.filter(order => order.status === 'Entregue').length]
    ];
    document.getElementById('cliente-dashboard-kpis').innerHTML = cards.map(([icon, label, value]) => `<article><i class="fa-solid ${icon}"></i><div><small>${label}</small><strong>${escapeHtml(value)}</strong></div></article>`).join('');
    const data = aggregate(orders);
    criarGraficoGastos('chart-cliente-gastos', data.timeline);
    criarGraficoModalidades('chart-cliente-modalidades', data.modalidades);
    const recent = [...orders].sort((a, b) => b.id - a.id).slice(0, 5);
    document.getElementById('cliente-dashboard-recentes').innerHTML = recent.length ? recent.map(order => `<article class="recent-order"><div><strong>${escapeHtml(order.tipo)}</strong><small>${escapeHtml(formatarDataHora(order.created_at))}</small></div><strong>${formatarMoeda(order.valor_total)}</strong><span class="badge ${badgeStatusClass(order.status)}">${escapeHtml(statusPedidoLabel(order.status, order.tipo))}</span><button class="btn-secondary" type="button" data-action="pedido-ticket" data-id="${order.id}"><i class="fa-solid fa-print"></i> Ticket</button></article>`).join('') : '<div class="dashboard-empty">Nenhum pedido encontrado neste período.</div>';
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
        if (profile === 'lojista') {
            const [ordersResponse, productsResponse] = await Promise.all([
                apiRequest('/api/pedidos', { signal: activeController.signal }),
                apiRequest('/api/produtos', { signal: activeController.signal })
            ]);
            [state.cachePedidosLojista, state.cacheProdutos] = await Promise.all([
                ordersResponse.json(), productsResponse.json()
            ]);
            renderDashboardLojista();
        } else {
            const response = await apiRequest('/api/pedidos', { signal: activeController.signal });
            state.cachePedidosCliente = await response.json();
            renderDashboardCliente();
        }
    } catch (error) {
        if (error.name !== 'AbortError') { showError(profile, error.message); showToast(error.message, 'erro'); }
    } finally {
        root.classList.remove('is-loading');
    }
}
