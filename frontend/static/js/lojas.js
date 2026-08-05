const API_BASE = 'http://127.0.0.1:5000/api';

// Função auxiliar para aplicar a máscara de CNPJ (00.000.000/0000-00)
function mascararCNPJ(valor) {
    return valor
        .replace(/\D/g, '')                            // Remove tudo o que não é dígito
        .replace(/^(\d{2})(\d)/, '$1.$2')               // Ponto após o 2º dígito
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')     // Ponto após o 5º dígito
        .replace(/\.(\d{3})(\d)/, '.$1/$2')             // Barra após o 8º dígito
        .replace(/(\d{4})(\d)/, '$1-$2')                // Hífen após o 12º dígito
        .replace(/(-\d{2})\d+?$/, '$1');                // Limita a 14 dígitos formatados
}

document.addEventListener('DOMContentLoaded', () => {
    carregarLojas();

    // Aplica a máscara no input do CNPJ em tempo real enquanto o usuário digita
    const inputCNPJ = document.getElementById('loja-cnpj');
    if (inputCNPJ) {
        inputCNPJ.addEventListener('input', (e) => {
            e.target.value = mascararCNPJ(e.target.value);
        });
    }

    // Manipulação do envio do formulário
    const formLoja = document.getElementById('form-loja');
    if (formLoja) {
        formLoja.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Mapeia os dados do formulário
            const dados = {
                nome: document.getElementById('loja-nome').value,
                cnpj: document.getElementById('loja-cnpj').value, // Envia o CNPJ formatado ou limpo (ajustável conforme o service)
                localizacao: document.getElementById('loja-localizacao').value,
                user_id: parseInt(document.getElementById('loja-user-id').value),
                catalogo_ferramentas: document.getElementById('loja-catalogo').value || null
            };

            try {
                const response = await fetch(`${API_BASE}/lojas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await response.json();

                if (response.ok) {
                    alert('Loja cadastrada com sucesso!');
                    formLoja.reset();
                    await carregarLojas();
                } else {
                    alert('Erro ao cadastrar loja: ' + (resultado.erro || resultado.error || 'Erro interno no servidor'));
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                alert('Erro de conexão com o servidor.');
            }
        });
    }
});

// Função para buscar e renderizar a lista de lojas
async function carregarLojas() {
    const tbody = document.getElementById('tabela-lojas-body');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE}/lojas`);
        const lojas = await response.json();

        if (response.ok) {
            if (lojas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 8px;">Nenhuma loja cadastrada.</td></tr>';
                return;
            }

            tbody.innerHTML = lojas.map(loja => `
                <tr>
                    <td style="padding: 8px;">${loja.id}</td>
                    <td style="padding: 8px;">${loja.nome}</td>
                    <td style="padding: 8px;">${mascararCNPJ(loja.cnpj || '')}</td>
                    <td style="padding: 8px;">${loja.localizacao}</td>
                    <td style="padding: 8px;">${loja.user_id}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red; padding: 8px;">Erro ao buscar lojas.</td></tr>';
        }
    } catch (err) {
        console.error('Erro ao carregar lojas:', err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red; padding: 8px;">Erro ao conectar com a API.</td></tr>';
    }
}