const API_BASE = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Carrega a lista assim que a página abre
    carregarUsuarios();

    const formUser = document.getElementById('form-user');
    if (formUser) {
        formUser.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const dados = {
                nome: document.getElementById('user-nome').value,
                email: document.getElementById('user-email').value,
                tipo: document.getElementById('user-tipo').value
            };

            try {
                const response = await fetch(`${API_BASE}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await response.json();

                if (response.ok) {
                    alert('Usuário cadastrado com sucesso!');
                    formUser.reset(); // Limpa os campos do formulário
                    await carregarUsuarios(); // Atualiza a lista na tela
                } else {
                    alert('Erro ao cadastrar: ' + (resultado.erro || resultado.error || 'Erro desconhecido'));
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                alert('Erro de conexão com o servidor.');
            }
        });
    }
});

// Função para buscar e renderizar a lista de usuários
async function carregarUsuarios() {
    const tbody = document.getElementById('tabela-usuarios-body');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE}/users`);
        const usuarios = await response.json();

        if (response.ok) {
            if (usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 8px;">Nenhum usuário cadastrado.</td></tr>';
                return;
            }

            // Monta as linhas da tabela
            tbody.innerHTML = usuarios.map(user => `
                <tr>
                    <td style="padding: 8px;">${user.id}</td>
                    <td style="padding: 8px;">${user.nome}</td>
                    <td style="padding: 8px;">${user.email}</td>
                    <td style="padding: 8px;">${user.tipo}</td>
                </tr>
            `).join('');

        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red; padding: 8px;">Erro ao buscar usuários.</td></tr>';
        }
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red; padding: 8px;">Erro ao conectar com a API.</td></tr>';
    }
}