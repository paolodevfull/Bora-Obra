let cacheProdutos = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarRelatorioLucro();
    carregarLojas();
    carregarUsuarios();
    carregarProdutos();
    carregarPedidos();
});

// Mensagem Visual Trada (Toast/Alert)
function exibirNotificacao(mensagem, ehErro = false) {
    alert(`${ehErro ? '⚠️ ATENÇÃO' : '✅ SUCESSO'}: ${mensagem}`);
}

// Navegação de Abas
function trocarAba(tabId, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (el) el.classList.add('active');
}

function realizarLogin(e) {
    e.preventDefault();
    document.getElementById('auth-screen').classList.add('hidden');
}

function logout() {
    document.getElementById('auth-screen').classList.remove('hidden');
}

// 1. Dashboard
async function carregarRelatorioLucro() {
    try {
        const res = await fetch('/api/relatorios/lucro-diario');
        if (!res.ok) throw new Error("Falha ao carregar dashboard.");
        const data = await res.json();
        
        document.getElementById('dash-faturamento').innerText = `R$ ${data.faturamento_total.toFixed(2)}`;
        document.getElementById('dash-pedidos').innerText = data.total_pedidos;
        document.getElementById('dash-lucro').innerText = `R$ ${data.lucro_estimado.toFixed(2)}`;
    } catch (err) { 
        console.error("Erro dashboard:", err); 
    }
}

// 2. Lojas
async function carregarLojas() {
    try {
        const res = await fetch('/api/lojas');
        if (!res.ok) throw new Error("Erro ao buscar lojas.");
        const lojas = await res.json();
        
        const tbody = document.getElementById('tbl-lojas');
        tbody.innerHTML = lojas.map(l => `
            <tr>
                <td>#${l.id}</td>
                <td>${l.nome}</td>
                <td>${l.endereco}</td>
                <td>${l.telefone || 'N/A'}</td>
            </tr>
        `).join('');

        const options = lojas.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
        document.getElementById('prod-loja-select').innerHTML = options || '<option value="">Nenhuma loja cadastrada</option>';
        document.getElementById('ped-loja-select').innerHTML = options || '<option value="">Nenhuma loja cadastrada</option>';
    } catch (err) { 
        console.error("Erro lojas:", err); 
    }
}

async function cadastrarLoja(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('loja-nome').value,
        endereco: document.getElementById('loja-endereco').value,
        telefone: document.getElementById('loja-telefone').value
    };

    try {
        const res = await fetch('/api/lojas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao cadastrar loja.");
        }

        exibirNotificacao("Loja cadastrada com sucesso!");
        document.getElementById('form-cad-loja').reset();
        carregarLojas();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

// 3. Usuários / Compradores
async function carregarUsuarios() {
    try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error("Erro ao carregar usuários.");
        const users = await res.json();
        
        const tbody = document.getElementById('tbl-usuarios');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td>${u.nome}</td>
                <td>${u.email}</td>
                <td>${u.tipo}</td>
            </tr>
        `).join('');

        const options = users.map(u => `<option value="${u.id}">${u.nome} (${u.tipo})</option>`).join('');
        document.getElementById('ped-user-select').innerHTML = options || '<option value="">Nenhum usuário cadastrado</option>';
    } catch (err) { 
        console.error("Erro usuarios:", err); 
    }
}

async function cadastrarUsuario(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('user-nome').value,
        email: document.getElementById('user-email').value,
        tipo: document.getElementById('user-tipo').value
    };

    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao cadastrar usuário.");
        }

        exibirNotificacao("Usuário cadastrado com sucesso!");
        document.getElementById('form-cad-user').reset();
        carregarUsuarios();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

// 4. Produtos
async function carregarProdutos() {
    try {
        const res = await fetch('/api/produtos');
        if (!res.ok) throw new Error("Erro ao carregar produtos.");
        cacheProdutos = await res.json();
        
        const tbody = document.getElementById('tbl-produtos');
        tbody.innerHTML = cacheProdutos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.nome}</td>
                <td>${p.utilidade || 'N/A'}</td>
                <td>R$ ${p.preco_venda.toFixed(2)} / R$ ${p.preco_locacao.toFixed(2)}</td>
                <td>
                    <button class="btn-secondary" onclick="alternarDisponibilidade(${p.id})">
                        ${p.disponivel ? '🟢 Ativo' : '🔴 Inativo'}
                    </button>
                </td>
            </tr>
        `).join('');

        const options = cacheProdutos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
        document.getElementById('ped-prod-select').innerHTML = options || '<option value="">Nenhum produto cadastrado</option>';
        
        atualizarValorAutomatico();
    } catch (err) { 
        console.error("Erro produtos:", err); 
    }
}

async function cadastrarProduto(e) {
    e.preventDefault();
    const dados = {
        loja_id: parseInt(document.getElementById('prod-loja-select').value),
        nome: document.getElementById('prod-nome').value,
        categoria: document.getElementById('prod-categoria').value,
        utilidade: document.getElementById('prod-utilidade').value,
        preco_venda: parseFloat(document.getElementById('prod-preco-venda').value),
        preco_locacao: parseFloat(document.getElementById('prod-preco-locacao').value)
    };

    try {
        const res = await fetch('/api/produtos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao cadastrar produto.");
        }

        exibirNotificacao("Produto cadastrado com sucesso!");
        document.getElementById('form-cad-prod').reset();
        carregarProdutos();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

async function alternarDisponibilidade(id) {
    try {
        await fetch(`/api/produtos/${id}/toggle-disponibilidade`, { method: 'PATCH' });
        carregarProdutos();
    } catch (err) {
        exibirNotificacao("Não foi possível alterar a disponibilidade.", true);
    }
}

function atualizarValorAutomatico() {
    const prodId = parseInt(document.getElementById('ped-prod-select').value);
    const tipo = document.getElementById('ped-tipo').value;
    const produto = cacheProdutos.find(p => p.id === prodId);

    if (produto) {
        const valor = tipo === 'Venda' ? produto.preco_venda : produto.preco_locacao;
        document.getElementById('ped-valor').value = valor.toFixed(2);
    }
}

// 5. Pedidos
async function carregarPedidos() {
    try {
        const res = await fetch('/api/pedidos');
        if (!res.ok) throw new Error("Erro ao carregar pedidos.");
        const pedidos = await res.json();
        
        const tbody = document.getElementById('tbl-pedidos');
        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.tipo}</td>
                <td>R$ ${p.valor_total.toFixed(2)}</td>
                <td>${p.status}</td>
                <td>
                    <button class="btn-secondary" onclick="imprimirTicket(${p.id})">
                        <i class="fa-solid fa-print"></i> Ticket
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) { 
        console.error("Erro pedidos:", err); 
    }
}

async function cadastrarPedido(e) {
    e.preventDefault();
    const dados = {
        user_id: parseInt(document.getElementById('ped-user-select').value),
        loja_id: parseInt(document.getElementById('ped-loja-select').value),
        tipo: document.getElementById('ped-tipo').value,
        valor_total: parseFloat(document.getElementById('ped-valor').value),
        observacao: document.getElementById('ped-obs').value
    };

    try {
        const res = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao registrar pedido.");
        }

        exibirNotificacao("Pedido/Venda criado com sucesso!");
        document.getElementById('form-cad-pedido').reset();
        carregarPedidos();
        carregarRelatorioLucro();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

async function imprimirTicket(id) {
    try {
        const res = await fetch(`/api/pedidos/${id}/ticket`);
        if (!res.ok) throw new Error("Erro ao emitir ticket.");
        const ticket = await res.json();
        
        const formatted = `
========================================
${ticket.ticket_header}
========================================
Data/Hora: ${ticket.data_hora}
Cliente: ${ticket.cliente}
Loja Origem: ${ticket.loja_origem}
Operação: ${ticket.tipo_operacao}
Total: ${ticket.valor_total}
Status: ${ticket.status}
Obs: ${ticket.observacao}
========================================
        `;
        document.getElementById('ticket-content').innerText = formatted;
        document.getElementById('ticket-modal').classList.remove('hidden');
    } catch (err) {
        exibirNotificacao("Não foi possível gerar o ticket térmico.", true);
    }
}

function fecharTicket() {
    document.getElementById('ticket-modal').classList.add('hidden');
}