import { state } from './state.js';
import { apiRequest } from './api.js';
import { badgeStatusClass, statusPedidoLabel, exibirNotificacao, escapeHtml, confirmarAcao, formatarMoeda } from './ui.js';
import { formatarData, formatarDataHora } from './utils.js';
import { renderDashboardCliente } from './dashboard.js';

const etapas = ['Pendente', 'Confirmado', 'Despachado', 'Entregue'];
const seguro = (valor, fallback = 'Não informado') => valor ? escapeHtml(valor) : fallback;

function renderizarLinhaTempo(pedido) {
    if (pedido.status === 'Cancelado') return `<ol class="order-timeline"><li class="complete"><i class="fa-solid fa-check"></i><div><strong>Pedido criado</strong><small>${escapeHtml(formatarDataHora(pedido.created_at))}</small></div></li><li class="cancelled current"><i class="fa-solid fa-xmark"></i><div><strong>Pedido cancelado</strong><small>O processamento deste pedido foi encerrado.</small></div></li></ol>`;
    const atual = Math.max(0, etapas.indexOf(pedido.status));
    const rotulos = pedido.tipo === 'Locacao' ? ['Solicitação recebida', 'Locação em preparação', 'Pronto para retirada', 'Locação devolvida'] : ['Pedido recebido', 'Pedido em preparação', 'Pronto para entrega ou retirada', 'Pedido concluído'];
    return `<ol class="order-timeline">${etapas.map((_, indice) => `<li class="${indice <= atual ? 'complete' : ''} ${indice === atual ? 'current' : ''}"><i class="fa-solid ${indice < atual ? 'fa-check' : indice === atual ? 'fa-box' : 'fa-circle'}"></i><div><strong>${rotulos[indice]}</strong><small>${indice === 0 ? escapeHtml(formatarDataHora(pedido.created_at)) : indice === atual ? 'Etapa atual' : 'Aguardando atualização'}</small></div></li>`).join('')}</ol>`;
}

function renderizarItens(pedido) {
    if (!pedido.itens?.length) return '<div class="order-empty-detail">Os itens deste pedido não estão disponíveis.</div>';
    return pedido.itens.map(item => {
        const dias = pedido.tipo === 'Locacao' ? Math.max(1, Number(item.dias_locacao) || 1) : 1;
        const subtotal = Number(item.valor_unitario) * Number(item.quantidade) * dias;
        return `<div class="order-product"><div class="order-product-image"><i class="fa-solid fa-screwdriver-wrench"></i></div><div><strong>${seguro(item.nome_produto, 'Produto removido')}</strong><small>${Number(item.quantidade)} unidade(s)${pedido.tipo === 'Locacao' ? ` · ${dias} diária(s)` : ''}</small><span>${formatarMoeda(item.valor_unitario)}${pedido.tipo === 'Locacao' ? ' por dia' : ''}</span></div><strong>${formatarMoeda(subtotal)}</strong></div>`;
    }).join('');
}

function renderizarPedido(pedido) {
    const podeConfirmarEntrega = pedido.status === 'Despachado';
    const telefone = String(pedido.loja_telefone || '').replace(/[^\d+]/g, '');
    const titulo = pedido.tipo === 'Locacao' ? 'Locação realizada' : 'Compra realizada';
    const periodoLocacao = pedido.tipo === 'Locacao' && pedido.data_inicio_locacao && pedido.data_fim_locacao
        ? `<div><dt>Período</dt><dd>${formatarData(pedido.data_inicio_locacao)} a ${formatarData(pedido.data_fim_locacao)}</dd></div>`
        : '';
    return `<article class="customer-order-card"><header class="customer-order-summary"><div><span>${titulo}</span><small>${escapeHtml(formatarDataHora(pedido.created_at))} · ${seguro(pedido.loja_nome, 'Loja')}</small></div><span class="badge ${escapeHtml(badgeStatusClass(pedido.status))}">${escapeHtml(statusPedidoLabel(pedido.status, pedido.tipo))}</span></header><div class="customer-order-main"><div class="customer-order-products">${renderizarItens(pedido)}</div><div class="customer-order-total"><small>Valor total</small><strong>${formatarMoeda(pedido.valor_total)}</strong><span>${escapeHtml(pedido.tipo)}</span></div></div><div class="customer-order-actions"><button class="btn-secondary" type="button" data-action="pedido-detalhes" data-id="${pedido.id}" aria-expanded="false"><i class="fa-solid fa-receipt"></i> Ver detalhes</button><button class="btn-secondary" type="button" data-action="pedido-acompanhar" data-id="${pedido.id}"><i class="fa-solid fa-route"></i> Acompanhar</button>${telefone ? `<a class="btn-secondary" href="tel:${telefone}"><i class="fa-solid fa-phone"></i> Falar com a loja</a>` : ''}<button class="btn-secondary" type="button" data-action="pedido-ticket" data-id="${pedido.id}"><i class="fa-solid fa-print"></i> Ticket</button>${podeConfirmarEntrega ? `<button class="btn-secondary" type="button" data-action="pedido-entregue" data-id="${pedido.id}"><i class="fa-solid fa-check"></i> Confirmar recebimento</button>` : ''}${pedido.pode_cancelar ? `<button class="btn-danger" type="button" data-action="pedido-cancelar" data-id="${pedido.id}">Cancelar pedido</button>` : ''}</div><div id="pedido-detalhes-${pedido.id}" class="customer-order-details hidden"><div class="order-detail-grid"><section><h4>Pagamento</h4><dl><div><dt>Forma escolhida</dt><dd>${seguro(pedido.forma_pagamento)}</dd></div></dl></section><section><h4>Cliente e entrega</h4><dl><div><dt>Cliente</dt><dd>${seguro(pedido.cliente_nome)}</dd></div><div><dt>E-mail</dt><dd>${seguro(state.usuarioAtual?.email)}</dd></div><div><dt>Endereço</dt><dd>${seguro(pedido.endereco_entrega, 'Retirada na loja')}</dd></div>${periodoLocacao}</dl></section><section><h4>Resumo de valores</h4><dl><div class="order-grand-total"><dt>Total do pedido</dt><dd>${formatarMoeda(pedido.valor_total)}</dd></div></dl><small>O total corresponde aos itens e ao período informados na confirmação.</small></section></div><section class="order-tracking" aria-label="Acompanhamento do pedido"><h4>Linha do tempo</h4>${renderizarLinhaTempo(pedido)}</section></div></article>`;
}

export async function carregarMeusPedidos() {
    if (!state.usuarioAtual) return;
    const lista = document.getElementById('cliente-pedidos-lista');
    const status = document.getElementById('pedidos-lista-status');
    try {
        if (status) status.textContent = 'Atualizando pedidos...';
        const res = await apiRequest('/api/pedidos');
        const pedidos = await res.json();
        state.cachePedidosCliente = pedidos;
        if (document.getElementById('cliente-total-pedidos')) document.getElementById('cliente-total-pedidos').textContent = pedidos.length;
        if (document.getElementById('cliente-total-compras')) document.getElementById('cliente-total-compras').textContent = pedidos.filter(p => p.tipo === 'Venda' && p.status !== 'Cancelado').length;
        if (document.getElementById('cliente-locacoes-ativas')) document.getElementById('cliente-locacoes-ativas').textContent = pedidos.filter(p => p.tipo === 'Locacao' && !['Entregue', 'Cancelado'].includes(p.status)).length;
        if (document.getElementById('dashboard-charts-cliente')) renderDashboardCliente();
        if (!lista) return;
        status.textContent = `${pedidos.length} ${pedidos.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}`;
        lista.innerHTML = pedidos.length ? pedidos.map(renderizarPedido).join('') : '<div class="orders-empty"><i class="fa-solid fa-box-open"></i><h3>Você ainda não fez pedidos</h3><p>Explore o catálogo e adicione o primeiro equipamento ao carrinho.</p><button class="btn-primary" type="button" data-action="cliente-catalogo">Ir para o catálogo</button></div>';
    } catch (error) {
        if (status) status.textContent = 'Não foi possível atualizar';
        if (lista) lista.innerHTML = '<div class="orders-empty error-state"><i class="fa-solid fa-cloud-arrow-down"></i><h3>Pedidos indisponíveis</h3><p>Tente novamente em alguns instantes.</p><button class="btn-secondary" type="button" data-action="pedidos-atualizar">Tentar novamente</button></div>';
        exibirNotificacao(error.message || 'Não foi possível carregar os pedidos.', 'erro');
    }
}

export function alternarDetalhesPedido(id, acompanhar = false) {
    const detalhes = document.getElementById(`pedido-detalhes-${id}`);
    if (!detalhes) return;
    if (acompanhar) detalhes.classList.remove('hidden'); else detalhes.classList.toggle('hidden');
    document.querySelector(`[data-action="pedido-detalhes"][data-id="${id}"]`)?.setAttribute('aria-expanded', String(!detalhes.classList.contains('hidden')));
    if (acompanhar) detalhes.querySelector('.order-tracking')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export async function confirmarEntregaPedido(id) {
    if (!await confirmarAcao('Confirma que recebeu este pedido?', 'Confirmar recebimento?')) return;
    const res = await apiRequest(`/api/pedidos/${id}/confirmar-entrega`, { method: 'PATCH' });
    const resposta = await res.json();
    if (!res.ok) throw new Error(resposta.erro || 'Não foi possível confirmar a entrega.');
    exibirNotificacao('Recebimento confirmado.', 'sucesso');
    await carregarMeusPedidos();
}

export async function cancelarPedido(id) {
    if (!await confirmarAcao('O cancelamento não poderá ser desfeito. Deseja continuar?', 'Cancelar pedido?')) return;
    const res = await apiRequest(`/api/pedidos/${id}/cancelar`, { method: 'PATCH' });
    const resposta = await res.json();
    if (!res.ok) throw new Error(resposta.erro || 'Não foi possível cancelar o pedido.');
    exibirNotificacao('Pedido cancelado.', 'sucesso');
    await carregarMeusPedidos();
}
