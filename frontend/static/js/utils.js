export function debounce(callback, delay = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

export function loadStoredIds(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return new Set(Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : []);
    } catch {
        return new Set();
    }
}

export function formatarDataHora(value) {
    if (!value) return '-';
    const normalized = String(value).replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime())
        ? String(value)
        : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function formatarData(value) {
    if (!value) return '-';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime())
        ? String(value)
        : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

export const CAMPOS_ENDERECO = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'];

export function obterEndereco(prefixo) {
    return Object.fromEntries(CAMPOS_ENDERECO.map(campo => [campo, document.getElementById(`${prefixo}-${campo}`)?.value.trim() || '']));
}

export function preencherEndereco(prefixo, dados = {}) {
    CAMPOS_ENDERECO.forEach(campo => {
        const input = document.getElementById(`${prefixo}-${campo}`);
        if (input) input.value = dados[campo] || '';
    });
}
