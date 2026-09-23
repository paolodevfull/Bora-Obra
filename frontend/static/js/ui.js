// Mapeia o texto de status pra uma classe de badge colorida
export function badgeStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('pend')) return 'status-pendente';
    if (s.includes('confirm') || s.includes('andamento')) return 'status-confirmado';
    if (s.includes('atras')) return 'status-atrasado';
    if (s.includes('despach')) return 'status-despachado';
    if (s.includes('entreg') || s.includes('conclu')) return 'status-concluido';
    if (s.includes('cancel')) return 'status-cancelado';
    return 'status-pendente';
}



// Snackbar centralizado para feedback de todas as operações da interface.
export function showToast(mensagem, tipo = 'sucesso') {
    const ehErro = tipo === true || tipo === 'erro';
    const toast = document.createElement('div');
    toast.className = `toast ${ehErro ? 'toast-error' : tipo === 'aviso' ? 'toast-warning' : 'toast-success'}`;
    toast.setAttribute('role', ehErro ? 'alert' : 'status');
    toast.textContent = mensagem;
    document.getElementById('notifications').append(toast);
    setTimeout(() => toast.remove(), 6500);
}

export function statusPedidoLabel(status, tipo = '') {
    const labels = {
        Pendente: 'Pendente',
        Confirmado: 'A preparar',
        Despachado: 'Pronto para retirar',
        Cancelado: 'Cancelado'
    };
    if (status === 'Entregue') return tipo === 'Locacao' ? 'Devolvido' : 'Concluído';
    return labels[status] || status || 'Pendente';
}

// Alias em português mantido para os módulos existentes.
export const exibirNotificacao = showToast;

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function confirmarAcao(mensagem, titulo = 'Confirmar ação') {
    const modal = document.getElementById('confirm-modal');
    const aceitar = document.getElementById('confirm-accept');
    const cancelar = document.getElementById('confirm-cancel');
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').textContent = mensagem;
    modal.classList.remove('hidden');
    const focoAnterior = document.activeElement;
    aceitar.focus();

    return new Promise(resolve => {
        const concluir = resultado => {
            modal.classList.add('hidden');
            aceitar.removeEventListener('click', confirmar);
            cancelar.removeEventListener('click', negar);
            modal.removeEventListener('click', fecharFora);
            document.removeEventListener('keydown', fecharEscape);
            focoAnterior?.focus();
            resolve(resultado);
        };
        const confirmar = () => concluir(true);
        const negar = () => concluir(false);
        const fecharFora = event => { if (event.target === modal) concluir(false); };
        const fecharEscape = event => { if (event.key === 'Escape') concluir(false); };
        aceitar.addEventListener('click', confirmar);
        cancelar.addEventListener('click', negar);
        modal.addEventListener('click', fecharFora);
        document.addEventListener('keydown', fecharEscape);
    });
}

export function formatarMoeda(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}
