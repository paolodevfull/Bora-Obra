const API_BASE = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    carregarSelectLojas();
    carregarProdutos();

    const formProduto = document.getElementById('form-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', async (e) => {
            e.preventDefault();

            const dados = {
                loja_id: parseInt(document.getElementById('produto-loja').value),
                nome: document.getElementById('produto-nome').value,
                categoria: document.getElementById('produto-categoria').value || null,
                preco_venda: parseFloat(document.getElementById('produto-preco-venda').value),
                preco_locacao: parseFloat(document.getElementById('produto-preco-locacao').value) || null,
                cor_tamanho: document.getElementById('produto-cor-tamanho').value || null,
                utilidade: document.getElementById('produto-utilidade').value || null,
                descricao: document.getElementById('produto-descricao').value || null
            };

            try {
                const response = await fetch(`${API_BASE}/produtos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await response.json();

                if (response.ok) {
                    alert('Produto cadastrado com sucesso!');
                    formProduto.reset();
                    await carregarProdutos();
                } else {
                    alert('Erro ao cadastrar produto: ' + (resultado.erro || resultado.error || 'Erro desconhecido'));
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                alert('Erro de conexão com o servidor.');
            }
        });
    }
});

// Busca as lojas cadastradas e preenche o elemento <select>
async function carregarSelectLojas() {
    const selectLoja = document.getElementById('produto-loja');
    if (!selectLoja) return;

    try {
        const response = await fetch(`${API_BASE}/lojas`);
        const lojas = await response.json();

        if (response.ok && lojas.length > 0) {
            selectLoja.innerHTML = '<option value="">Selecione uma loja...</option>' +
                lojas.map(l => `<option value="${l.id}">${l.nome} (ID: ${l.id})</option>`).join('');
        } else {
            selectLoja.innerHTML = '<option value="">Nenhuma loja cadastrada</option>';
        }
    } catch (err) {
        console.error('Erro ao carregar lojas para o select:', err);
        selectLoja.innerHTML = '<option value="">Erro ao carregar lojas</option>';
    }
}

// Busca e lista todos os produtos na tabela
async function carregarProdutos() {
    const tbody = document.getElementById('tabela-produtos-body');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE}/produtos`);
        const produtos = await response.json();

        if (response.ok) {
            if (produtos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 8px;">Nenhum produto cadastrado.</td></tr>';
                return;
            }

            tbody.innerHTML = produtos.map(prod => `
                <tr>
                    <td style="padding: 8px;">${prod.id}</td>
                    <td style="padding: 8px;">${prod.nome}</td>
                    <td style="padding: 8px;">${prod.categoria || '-'}</td>
                    <td style="padding: 8px;">R$ ${Number(prod.preco_venda).toFixed(2)}</td>
                    <td style="padding: 8px;">${prod.preco_locacao ? 'R$ ' + Number(prod.preco_locacao).toFixed(2) : '-'}</td>
                    <td style="padding: 8px;">${prod.loja_id}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 8px;">Erro ao buscar produtos.</td></tr>';
        }
    } catch (err) {
        console.error('Erro ao carregar produtos:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 8px;">Erro ao conectar com a API.</td></tr>';
    }
}