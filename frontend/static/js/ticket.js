import { state } from './state.js';
import { apiRequest } from './api.js';
import { exibirNotificacao } from './ui.js';
import { formatarData } from './utils.js';

export async function imprimirTicket(id) {
    try {
        const res = await apiRequest(`/api/pedidos/${id}/ticket`);
        if (!res.ok) throw new Error("Erro ao emitir ticket.");
        const ticket = await res.json();

        const linhasItens = (ticket.itens || []).map(item =>
            `${item.quantidade}x ${item.nome}${ticket.tipo_operacao === 'Locacao' ? ` · ${item.dias_locacao} dia(s)` : ''} ........ ${item.subtotal}`
        ).join('\n');

        const formatted = `
========================================
${String(ticket.ticket_header || 'COMPROVANTE DO PEDIDO').replace(/#\d+/g, '').trim()}
========================================
Data/Hora: ${ticket.data_hora}
Cliente: ${ticket.cliente}
Loja Origem: ${ticket.loja_origem}
Endereço da loja: ${ticket.loja_endereco || ""}
Telefone: ${ticket.loja_telefone || ""}
Operação: ${ticket.tipo_operacao}
${ticket.tipo_operacao === 'Locacao' && ticket.data_inicio_locacao && ticket.data_fim_locacao
                ? `Período: ${formatarData(ticket.data_inicio_locacao)} a ${formatarData(ticket.data_fim_locacao)}`
                : ''}
----------------------------------------
Itens:
${linhasItens || 'Nenhum item registrado'}
----------------------------------------
Entrega: ${ticket.endereco_entrega}
Forma de pagamento: ${ticket.forma_pagamento}
Total: ${ticket.valor_total}
Status: ${ticket.status}
Obs: ${ticket.observacao}
========================================
        `;
        document.getElementById('ticket-content').innerText = formatted;
        document.getElementById('ticket-modal').classList.remove('hidden');
        document.querySelector('#ticket-modal [data-action="ticket-imprimir"]').focus();
    } catch (err) {
        exibirNotificacao("Não foi possível gerar o ticket térmico.", true);
    }
}

export function fecharTicket() {
    document.getElementById('ticket-modal').classList.add('hidden');
}

// ============ PAINEL CLIENTE ============

export function definirLarguraTicket(value) {
    const width = value === '58' ? '58mm' : '80mm';
    document.documentElement.style.setProperty('--ticket-width', width);
}
