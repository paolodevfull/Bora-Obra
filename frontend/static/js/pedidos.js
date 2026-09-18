import { state } from './state.js';
import { apiRequest } from './api.js';
import { badgeStatusClass, statusPedidoLabel, exibirNotificacao, escapeHtml, confirmarAcao } from './ui.js';
import { formatarDataHora } from './utils.js';
import { renderDashboardCliente } from './dashboard.js';

export async function carregarMeusPedidos() {
    if (!state.usuarioAtual) return;

    try {
        const res = await apiRequest(`/api/pedidos?user_id=${state.usuarioAtual.id}`);
        if (!res.ok) throw new Error("Erro ao carregar pedidos.");
        const pedidos = await res.json();
        state.cachePedidosCliente = pedidos;
        document.getElementById('cliente-total-pedidos').textContent = pedidos.length;
        document.getElementById('cliente-total-compras').textContent = pedidos.filter(p => p.tipo === 'Venda' && p.status !== 'Cancelado').length;
        document.getElementById('cliente-locacoes-ativas').textContent = pedidos.filter(p => p.tipo === 'Locacao' && !['Entregue', 'Cancelado'].includes(p.status)).length;
        renderDashboardCliente();

        const tbody = document.getElementById('tbl-meus-pedidos');
        if (!tbody) return;

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Você ainda não fez nenhum pedido.</td></tr>';
            return;
        }

        tbody.innerHTML = pedidos.map(p => {
            const jaEntregue = p.status === 'Entregue';
            const cancelado = p.status === 'Cancelado';
            const acao = (jaEntregue || cancelado)
                ? '-'
                : `<button class="btn-secondary" type="button" data-action="pedido-entregue" data-id="${p.id}">
                        <i class="fa-solid fa-check"></i> Marcar como entregue
                   </button>`;

            return `
            <tr>
                <td>#${p.id}</td>
                <td>${p.tipo}</td>
                <td>R$ ${p.valor_total.toFixed(2)}</td>
                <td>${escapeHtml(p.endereco_entrega || 'Retirada na loja')}</td>
                <td><span class="badge ${escapeHtml(badgeStatusClass(p.status))}">${escapeHtml(statusPedidoLabel(p.status, p.tipo))}</span></td>
                <td>${escapeHtml(formatarDataHora(p.created_at))}</td>
                <td>${acao} <button class="btn-secondary" type="button" data-action="pedido-ticket" data-id="${p.id}">Ticket</button></td>
            </tr>
        `;
        }).join('');
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export async function confirmarEntregaPedido(id) {
    if (!await confirmarAcao('Confirma que recebeu este pedido?', 'Confirmar entrega?')) return;

    try {
        const res = await apiRequest(`/api/pedidos/${id}/confirmar-entrega`, { method: 'PATCH' });
        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Não foi possível confirmar a entrega.");
        }

        exibirNotificacao("Pedido marcado como entregue!");
        carregarMeusPedidos();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}
