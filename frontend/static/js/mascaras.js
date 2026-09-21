export function formatarTelefone(valor) {
    const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);
    if (!numeros) return '';
    if (numeros.length <= 2) return `(${numeros}`;
    const ddd = numeros.slice(0, 2);
    const restante = numeros.slice(2);
    if (restante.length <= 4) return `(${ddd}) ${restante}`;
    const corte = restante.length > 8 ? 5 : 4;
    return `(${ddd}) ${restante.slice(0, corte)}-${restante.slice(corte)}`;
}

export function formatarNumeroEndereco(valor) {
    return String(valor || '')
        .toUpperCase()
        .replace(/[^0-9A-ZÀ-Ü.\-/ ]/g, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 20);
}

export function normalizarTexto(valor) {
    return String(valor || '').trim().replace(/\s{2,}/g, ' ');
}

function registrar(ids, evento, callback) {
    ids.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener(evento, () => { input.value = callback(input.value); });
    });
}

export function configurarMascaras() {
    registrar(['loja-telefone'], 'input', formatarTelefone);
    registrar(['cad-numero', 'loja-numero', 'config-cliente-numero'], 'input', formatarNumeroEndereco);
    registrar(['cad-uf', 'loja-uf', 'config-cliente-uf'], 'input', valor => valor.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2));

    registrar(['login-email', 'cad-email', 'user-email', 'config-cliente-email'], 'input', valor => valor.replace(/\s/g, '').toLowerCase());

    registrar([
        'login-nome', 'cad-nome', 'loja-nome', 'user-nome', 'config-cliente-nome',
        'prod-nome', 'edit-prod-nome', 'prod-categoria', 'edit-prod-categoria',
        'prod-utilidade', 'edit-prod-utilidade', 'cad-logradouro', 'loja-logradouro',
        'config-cliente-logradouro', 'cad-bairro', 'loja-bairro', 'config-cliente-bairro',
        'cad-cidade', 'loja-cidade', 'config-cliente-cidade'
    ], 'blur', normalizarTexto);

    ['prod-preco-venda', 'prod-preco-locacao', 'edit-prod-preco-venda', 'edit-prod-preco-locacao'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('keydown', event => {
            if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault();
        });
        input.addEventListener('blur', () => {
            const valor = Number(input.value);
            if (Number.isFinite(valor) && valor > 0) input.value = valor.toFixed(2);
        });
    });

    const quantidade = document.getElementById('detalhe-quantidade');
    quantidade?.addEventListener('input', () => {
        quantidade.value = quantidade.value.replace(/\D/g, '').slice(0, 6);
    });
}
