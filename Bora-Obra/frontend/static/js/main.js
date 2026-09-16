let cacheProdutos = [];
let cacheUsuarios = [];
let cacheLojasCliente = [];
let usuarioAtual = null;

// Estado do fluxo de compra do cliente
let tipoCompraAtual = 'Venda';
let carrinhoCliente = []; // [{ produto_id, nome, quantidade, valor_unitario }]
let lojaAtualCliente = null;

document.addEventListener("DOMContentLoaded", () => {
    verificarSessaoAtiva();
});

// Mensagem Visual Trada (Toast/Alert)
function exibirNotificacao(mensagem, ehErro = false) {
    alert(`${ehErro ? '⚠️ ATENÇÃO' : '✅ SUCESSO'}: ${mensagem}`);
}

// Navegação de Abas (painel lojista)
function trocarAba(tabId, el) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (el) el.classList.add('active');
}

// Navegação de Abas (painel cliente)
function trocarAbaCliente(tabId, el) {
    document.querySelectorAll('.cliente-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn-inline').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (el) el.classList.add('active');
}

// ============ AUTENTICAÇÃO ============

async function verificarSessaoAtiva() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const usuario = await res.json();
            iniciarPainelPorTipo(usuario);
        }
    } catch (err) {
        console.error("Erro ao verificar sessão:", err);
    }
}

function mostrarCadastro(e) {
    e.preventDefault();
    document.getElementById('form-login-wrapper').classList.add('hidden');
    document.getElementById('form-cadastro-wrapper').classList.remove('hidden');
    esconderErroAuth();
}

function mostrarLogin(e) {
    e.preventDefault();
    document.getElementById('form-cadastro-wrapper').classList.add('hidden');
    document.getElementById('form-login-wrapper').classList.remove('hidden');
    esconderErroAuth();
}

function mostrarErroAuth(msg) {
    const el = document.getElementById('auth-erro');
    el.innerText = msg;
    el.classList.remove('hidden');
}

function esconderErroAuth() {
    document.getElementById('auth-erro').classList.add('hidden');
}

async function realizarLogin(e) {
    e.preventDefault();
    esconderErroAuth();

    const dados = {
        email: document.getElementById('login-email').value,
        senha: document.getElementById('login-senha').value
    };

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const resposta = await res.json();

        if (!res.ok) throw new Error(resposta.erro || "Falha ao entrar.");

        iniciarPainelPorTipo(resposta);
    } catch (err) {
        mostrarErroAuth(err.message);
    }
}

async function realizarCadastro(e) {
    e.preventDefault();
    esconderErroAuth();

    const dados = {
        nome: document.getElementById('cad-nome').value,
        email: document.getElementById('cad-email').value,
        senha: document.getElementById('cad-senha').value,
        tipo: document.getElementById('cad-tipo').value
    };

    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const resposta = await res.json();

        if (!res.ok) throw new Error(resposta.erro || "Falha ao criar conta.");

        const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: dados.email, senha: dados.senha })
        });
        const loginResposta = await loginRes.json();

        if (!loginRes.ok) throw new Error("Conta criada. Faça login para continuar.");

        iniciarPainelPorTipo(loginResposta);
    } catch (err) {
        mostrarErroAuth(err.message);
    }
}

async function logoutUsuario() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error("Erro ao encerrar sessão:", err);
    }

    usuarioAtual = null;
    carrinhoCliente = [];
    lojaAtualCliente = null;

    document.getElementById('painel-lojista').classList.add('hidden');
    document.getElementById('painel-cliente').classList.add('hidden');
    document.getElementById('painel-entregador').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');

    document.getElementById('form-login').reset();
    mostrarLogin({ preventDefault: () => {} });
}

function iniciarPainelPorTipo(usuario) {
    usuarioAtual = usuario;
    document.getElementById('auth-screen').classList.add('hidden');

    document.getElementById('painel-lojista').classList.add('hidden');
    document.getElementById('painel-cliente').classList.add('hidden');
    document.getElementById('painel-entregador').classList.add('hidden');

    if (usuario.tipo === 'lojista') {
        document.getElementById('painel-lojista').classList.remove('hidden');
        document.getElementById('user-display-name').innerText = usuario.nome;
        carregarRelatorioLucro();
        carregarLojas();
        carregarUsuarios();
        carregarProdutos();
        carregarPedidos();
    } else if (usuario.tipo === 'cliente') {
        document.getElementById('painel-cliente').classList.remove('hidden');
        document.getElementById('cliente-nome-display').innerText = usuario.nome;
        carregarLojasCliente();
        carregarMeusPedidos();
    } else {
        document.getElementById('painel-entregador').classList.remove('hidden');
    }
}

// ============ PAINEL LOJISTA ============

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
        cacheUsuarios = await res.json();

        const tbody = document.getElementById('tbl-usuarios');
        tbody.innerHTML = cacheUsuarios.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td>${u.nome}</td>
                <td>${u.email}</td>
                <td>${u.tipo}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erro usuarios:", err);
    }
}

async function cadastrarUsuarioPainel(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('user-nome').value,
        email: document.getElementById('user-email').value,
        senha: document.getElementById('user-senha').value,
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
        if (tbody) {
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
        }
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

// 5. Pedidos — somente leitura para o lojista
async function carregarPedidos() {
    try {
        const res = await fetch('/api/pedidos');
        if (!res.ok) throw new Error("Erro ao carregar pedidos.");
        const pedidos = await res.json();

        const tbody = document.getElementById('tbl-pedidos');
        if (!tbody) return;

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum pedido recebido ainda.</td></tr>';
            return;
        }

        tbody.innerHTML = pedidos.map(p => {
            const cliente = cacheUsuarios.find(u => u.id === p.user_id);
            return `
                <tr>
                    <td>#${p.id}</td>
                    <td>${cliente ? cliente.nome : `Usuário #${p.user_id}`}</td>
                    <td>${p.tipo}</td>
                    <td>R$ ${p.valor_total.toFixed(2)}</td>
                    <td>${p.endereco_entrega || 'Retirada na loja'}</td>
                    <td>${p.status}</td>
                    <td>
                        <button class="btn-secondary" onclick="imprimirTicket(${p.id})">
                            <i class="fa-solid fa-print"></i> Ticket
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("Erro pedidos:", err);
    }
}

async function imprimirTicket(id) {
    try {
        const res = await fetch(`/api/pedidos/${id}/ticket`);
        if (!res.ok) throw new Error("Erro ao emitir ticket.");
        const ticket = await res.json();

        const linhasItens = (ticket.itens || []).map(item =>
            `${item.quantidade}x ${item.nome} (cód. ${item.codigo}) ........ ${item.subtotal}`
        ).join('\n');

        const formatted = `
========================================
${ticket.ticket_header}
========================================
Data/Hora: ${ticket.data_hora}
Cliente: ${ticket.cliente}
Loja Origem: ${ticket.loja_origem}
Operação: ${ticket.tipo_operacao}
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
    } catch (err) {
        exibirNotificacao("Não foi possível gerar o ticket térmico.", true);
    }
}

function fecharTicket() {
    document.getElementById('ticket-modal').classList.add('hidden');
}

// ============ PAINEL CLIENTE ============

async function carregarLojasCliente() {
    try {
        const [resLojas, resProdutos] = await Promise.all([
            fetch('/api/lojas'),
            fetch('/api/produtos')
        ]);
        cacheLojasCliente = await resLojas.json();
        cacheProdutos = await resProdutos.json();
        renderizarLojasCliente(cacheLojasCliente);
    } catch (err) {
        console.error("Erro ao carregar lojas para o cliente:", err);
    }
}

function renderizarLojasCliente(lojas) {
    const grid = document.getElementById('cliente-lojas-grid');
    if (lojas.length === 0) {
        grid.innerHTML = '<p class="empty-state">Nenhuma loja cadastrada ainda.</p>';
        return;
    }
    grid.innerHTML = lojas.map(l => `
        <div class="loja-card" onclick="abrirCatalogoLoja(${l.id})">
            <i class="fa-solid fa-store"></i>
            <h3>${l.nome}</h3>
            <p>${l.endereco}</p>
            <span class="btn-secondary">Ver catálogo</span>
        </div>
    `).join('');
}

function filtrarLojasCliente() {
    const termo = document.getElementById('cliente-busca-loja').value.toLowerCase();
    const filtradas = cacheLojasCliente.filter(l => l.nome.toLowerCase().includes(termo));
    renderizarLojasCliente(filtradas);
}

function definirTipoCompra(tipo) {
    tipoCompraAtual = tipo;
    document.getElementById('btn-tipo-venda').classList.toggle('active', tipo === 'Venda');
    document.getElementById('btn-tipo-locacao').classList.toggle('active', tipo === 'Locacao');

    // Preço muda conforme o tipo escolhido, então o carrinho é zerado ao trocar
    carrinhoCliente = [];
    renderizarCarrinho();

    if (lojaAtualCliente) {
        renderizarCatalogoProdutos(lojaAtualCliente.id);
    }
}

function abrirCatalogoLoja(lojaId) {
    const loja = cacheLojasCliente.find(l => l.id === lojaId);
    if (!loja) return;
    lojaAtualCliente = loja;

    document.getElementById('cliente-lojas-grid').classList.add('hidden');
    document.getElementById('cliente-catalogo').classList.remove('hidden');
    document.getElementById('cliente-catalogo-loja-nome').innerText = loja.nome;
    document.getElementById('cliente-catalogo-loja-endereco').innerText = loja.endereco;

    renderizarCatalogoProdutos(lojaId);
}

function renderizarCatalogoProdutos(lojaId) {
    const produtosDaLoja = cacheProdutos.filter(p => p.loja_id === lojaId && p.disponivel);
    const container = document.getElementById('cliente-catalogo-produtos');

    if (produtosDaLoja.length === 0) {
        container.innerHTML = '<p class="empty-state">Essa loja ainda não tem produtos disponíveis.</p>';
        return;
    }

    container.innerHTML = produtosDaLoja.map(p => {
        const preco = tipoCompraAtual === 'Venda' ? p.preco_venda : p.preco_locacao;
        return `
        <div class="produto-card">
            <h4>${p.nome}</h4>
            <p class="produto-utilidade">${p.utilidade || 'Sem categoria de uso definida'}</p>
            <div class="produto-precos">
                <span class="badge ${tipoCompraAtual === 'Venda' ? 'venda' : 'locacao'}">R$ ${preco.toFixed(2)}</span>
            </div>
            <div class="produto-add-row">
                <input type="number" min="1" value="1" class="produto-qtd" id="qtd-${p.id}">
                <button class="btn-secondary btn-add-carrinho" onclick="adicionarAoCarrinho(${p.id})">
                    <i class="fa-solid fa-cart-plus"></i> Adicionar
                </button>
            </div>
        </div>`;
    }).join('');
}

function adicionarAoCarrinho(produtoId) {
    const produto = cacheProdutos.find(p => p.id === produtoId);
    if (!produto) return;

    const qtdInput = document.getElementById(`qtd-${produtoId}`);
    const quantidade = parseInt(qtdInput.value) || 1;
    const valorUnitario = tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao;

    const existente = carrinhoCliente.find(i => i.produto_id === produtoId);
    if (existente) {
        existente.quantidade += quantidade;
    } else {
        carrinhoCliente.push({ produto_id: produtoId, nome: produto.nome, quantidade, valor_unitario: valorUnitario });
    }

    renderizarCarrinho();
}

function removerDoCarrinho(produtoId) {
    carrinhoCliente = carrinhoCliente.filter(i => i.produto_id !== produtoId);
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const container = document.getElementById('carrinho-itens');
    const totalDisplay = document.getElementById('carrinho-total-display');
    if (!container || !totalDisplay) return;

    if (carrinhoCliente.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum item adicionado ainda.</p>';
        totalDisplay.innerText = 'R$ 0,00';
        return;
    }

    let total = 0;
    container.innerHTML = carrinhoCliente.map(item => {
        const subtotal = item.valor_unitario * item.quantidade;
        total += subtotal;
        return `
            <div class="carrinho-item">
                <span>${item.quantidade}x ${item.nome}</span>
                <span>R$ ${subtotal.toFixed(2)} <button onclick="removerDoCarrinho(${item.produto_id})" title="Remover"><i class="fa-solid fa-xmark"></i></button></span>
            </div>
        `;
    }).join('');

    totalDisplay.innerText = `R$ ${total.toFixed(2)}`;
}

async function finalizarPedidoCliente() {
    if (carrinhoCliente.length === 0) {
        exibirNotificacao("Adicione pelo menos um item ao pedido.", true);
        return;
    }

    const endereco = document.getElementById('carrinho-endereco').value.trim();
    if (!endereco) {
        exibirNotificacao("Informe o endereço de entrega.", true);
        return;
    }

    const dados = {
        user_id: usuarioAtual.id,
        loja_id: lojaAtualCliente.id,
        tipo: tipoCompraAtual,
        forma_pagamento: document.getElementById('carrinho-forma-pagamento').value,
        endereco_entrega: endereco,
        itens: carrinhoCliente.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade }))
    };

    try {
        const res = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const resposta = await res.json();

        if (!res.ok) throw new Error(resposta.erro || "Falha ao criar pedido.");

        exibirNotificacao("Pedido realizado com sucesso!");
        carrinhoCliente = [];
        renderizarCarrinho();
        document.getElementById('carrinho-endereco').value = '';
        voltarParaLojas();

        trocarAbaCliente('cliente-tab-pedidos', document.getElementById('btn-cliente-tab-pedidos'));
        carregarMeusPedidos();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

function voltarParaLojas() {
    document.getElementById('cliente-catalogo').classList.add('hidden');
    document.getElementById('cliente-lojas-grid').classList.remove('hidden');
    lojaAtualCliente = null;
}

async function carregarMeusPedidos() {
    if (!usuarioAtual) return;

    try {
        const res = await fetch(`/api/pedidos?user_id=${usuarioAtual.id}`);
        if (!res.ok) throw new Error("Erro ao carregar pedidos.");
        const pedidos = await res.json();

        const tbody = document.getElementById('tbl-meus-pedidos');
        if (!tbody) return;

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Você ainda não fez nenhum pedido.</td></tr>';
            return;
        }

        tbody.innerHTML = pedidos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.tipo}</td>
                <td>R$ ${p.valor_total.toFixed(2)}</td>
                <td>${p.endereco_entrega || 'Retirada na loja'}</td>
                <td>${p.status}</td>
                <td>${p.created_at || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Erro meus pedidos:", err);
    }
}
