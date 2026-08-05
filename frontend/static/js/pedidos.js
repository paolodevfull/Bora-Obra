const API_BASE = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    carregarSelectUsuarios();
    carregarSelectLojas();
    carregarPedidos();

    const formPedido = document.getElementById('form-pedido');
    if (formPedido) {
        formPedido.addEventListener('submit', async (e) => {
            e.preventDefault();

            const dados = {
                user_id: parseInt(document.getElementById('pedido-usuario').value),
                loja_id: parseInt(document.getElementById('pedido-loja').value),
                tipo: document.getElementById('pedido-tipo').value,
                valor_total: parseFloat(document.getElementById('pedido-valor').value),
                observacao: document.getElementById('pedido-observacao').value || null
            };

            try {
                const response = await fetch(`${API_BASE}/pedidos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await response.json();

                if (response.ok) {
                    alert('Pedido criado com sucesso!');
                    formPedido.reset();
                    await carregarPedidos();
                } else {
                    alert('Erro ao criar pedido: ' + (resultado.erro || resultado.error || 'Erro desconhecido'));
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                alert('Erro de conexão com o servidor.');
            }
        });
    }
});

// Popula o select de Usuários
async function carregarSelectUsuarios() {
    const selectUser = document.getElementById('pedido-usuario');
    if (!selectUser) return;

    try {
        const response = await fetch(`${API_BASE}/users`);
        const usuarios = await response.json();

        if (response.ok && usuarios.length > 0) {
            selectUser.innerHTML = '<option value="">Selecione o usuário...</option>' +
                usuarios.map(u => `<option value="${u.id}">${u.nome} (ID: ${u.id})</option>`).join('');
        } else {
            selectUser.innerHTML = '<option value="">Nenhum usuário cadastrado</option>';
        }
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        selectUser.innerHTML = '<option value="">Erro ao carregar usuários</option>';
    }
}

// Popula o select de Lojas
async function carregarSelectLojas() {
    const selectLoja = document.getElementById('pedido-loja');
    if (!selectLoja) return;

    try {
        const response = await fetch(`${API_BASE}/lojas`);
        const lojas = await response.json();

        if (response.ok && lojas.length > 0) {
            selectLoja.innerHTML = '<option value="">Selecione a loja...</option>' +
                lojas.map(l => `<option value="${l.id}">${l.nome} (ID: ${l.id})</option>`).join('');
        } else {
            selectLoja.innerHTML = '<option value="">Nenhuma loja cadastrada</option>';
        }
    } catch (err) {
        console.error('Erro ao carregar lojas:', err);
        selectLoja.innerHTML = '<option value="">Erro ao carregar lojas</option>';
    }
}

// Busca e renderiza os pedidos na tabela
async function carregarPedidos() {
    const tbody = document.getElementById('tabela-pedidos-body');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE}/pedidos`);
        const pedidos = await response.json();

        if (response.ok) {
            if (pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 8px;">Nenhum pedido realizado.</td></tr>';
                return;
            }

            tbody.innerHTML = pedidos.map(ped => `
                <tr>
                    <td style="padding: 8px;">${ped.id}</td>
                    <td style="padding: 8px;">${ped.user_id}</td>
                    <td style="padding: 8px;">${ped.loja_id}</td>
                    <td style="padding: 8px;">${ped.tipo}</td>
                    <td style="padding: 8px;">R$ ${Number(ped.valor_total).toFixed(2)}</td>
                    <td style="padding: 8px;">${ped.status || 'Pendente'}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 8px;">Erro ao buscar pedidos.</td></tr>';
        }
    } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 8px;">Erro ao conectar com a API.</td></tr>';
    }
}