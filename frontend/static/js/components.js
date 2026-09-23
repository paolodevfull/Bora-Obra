const lojistaLinks = [
    ['dashboard', '/lojista/painel.html', 'fa-house', 'Início'],
    ['usuarios', '/lojista/usuarios.html', 'fa-users', 'Funcionários', true],
    ['produtos', '/lojista/produtos.html', 'fa-boxes-stacked', 'Produtos'],
    ['pedidos', '/lojista/pedidos.html', 'fa-receipt', 'Pedidos'],
    ['relatorios', '/lojista/relatorios.html', 'fa-chart-column', 'Relatórios'],
    ['lojas', '/lojista/lojas.html', 'fa-gear', 'Configurações', true]
];

function sidebar(page) {
    return `<aside class="sidebar" id="lojista-sidebar" aria-label="Navegação do lojista"><nav class="sidebar-menu">${lojistaLinks.map(([id, href, icon, label, ownerOnly]) => `<a class="menu-btn ${page === id ? 'active' : ''}" href="${href}" ${ownerOnly ? 'data-owner-only' : ''} ${page === id ? 'aria-current="page"' : ''}><i class="fa-solid ${icon}"></i><span>${label}</span></a>`).join('')}</nav><div class="sidebar-bottom"><section class="sidebar-mobile-account" aria-label="Conta do usuário"><div class="sidebar-account-user"><i class="fa-solid fa-circle-user" aria-hidden="true"></i><span><small>Conta</small><strong data-user-display-name>Loja</strong></span></div><button class="btn-secondary logout-button" type="button" data-action="logout"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Sair da conta</span></button></section><footer class="sidebar-footer">BoraObra</footer></div></aside>`;
}

function lojistaShell(page) {
    return `<div id="painel-lojista"><a class="skip-link" href="#static-page-content">Pular para o conteúdo</a><header class="topbar"><button class="sidebar-toggle" type="button" data-action="sidebar-toggle" aria-controls="lojista-sidebar" aria-label="Recolher menu" aria-expanded="true"><i class="fa-solid fa-bars"></i></button><a class="topbar-brand" href="/lojista/painel.html"><i class="fa-solid fa-helmet-safety"></i><strong>BoraObra</strong></a><label class="store-switcher"><i class="fa-solid fa-store"></i><span><small>Loja em operação</small><select id="loja-operacional-select"><option>Carregando...</option></select></span></label><div class="topbar-right"><a class="btn-primary quick-sale-button" href="/lojista/pedidos.html"><i class="fa-solid fa-receipt"></i> Ver pedidos</a><span class="topbar-user"><i class="fa-solid fa-circle-user"></i><strong id="user-display-name" data-user-display-name>Loja</strong></span><button class="btn-secondary logout-button" type="button" data-action="logout" aria-label="Sair da conta" title="Sair da conta"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Sair</span></button></div></header><div class="app-layout">${sidebar(page)}<button class="sidebar-backdrop" type="button" data-action="sidebar-toggle" aria-label="Fechar menu" tabindex="-1"></button><div class="page-slot"></div></div></div>`;
}

function clienteShell(page) {
    const active = id => page === id ? 'active' : '';
    const busca = page === 'catalogo'
        ? `<label class="market-search"><span class="sr-only">Buscar equipamentos</span><input id="busca-marketplace" type="search" list="sugestoes-produtos" placeholder="Busque ferramentas, máquinas e materiais"><i class="fa-solid fa-magnifying-glass"></i></label><datalist id="sugestoes-produtos"></datalist>`
        : `<a class="market-search market-search-link" href="/cliente/index.html"><span>Buscar ferramentas, máquinas e materiais</span><i class="fa-solid fa-magnifying-glass"></i></a>`;
    return `<div id="painel-cliente"><a class="skip-link" href="#static-page-content">Pular para o conteúdo</a><header class="market-header"><a class="market-brand" href="/cliente/index.html"><i class="fa-solid fa-helmet-safety"></i><span>Bora<strong>Obra</strong></span></a>${busca}<nav class="market-actions" aria-label="Navegação do cliente"><a class="${active('dashboard-cliente')}" href="/cliente/painel.html"><i class="fa-solid fa-house"></i><span>Início</span></a><a class="${active('catalogo')}" href="/cliente/index.html"><i class="fa-solid fa-store"></i><span>Produtos</span></a><a href="/cliente/index.html#favoritos" data-action="favoritos-abrir"><i class="fa-regular fa-heart"></i><span>Favoritos</span></a><a class="${active('pedidos-cliente')}" href="/cliente/pedidos.html"><i class="fa-solid fa-receipt"></i><span>Pedidos</span></a><a href="/cliente/pedidos.html#checkout"><i class="fa-solid fa-cart-shopping"></i><span>Carrinho</span><b id="carrinho-contador">0</b></a><div class="cliente-perfil-wrap"><button class="cliente-perfil-trigger" type="button" data-action="perfil-menu" aria-haspopup="true" aria-expanded="false"><i class="fa-solid fa-circle-user"></i><span id="cliente-nome-display">Cliente</span></button><div id="cliente-perfil-menu" class="cliente-perfil-menu hidden"><a href="/cliente/cadastro.html">Configurações</a><button type="button" data-action="logout">Sair</button></div></div></nav></header><nav class="market-shortcuts"><button type="button" data-action="filtros-mobile"><i class="fa-solid fa-sliders"></i> Filtros</button><span><i class="fa-solid fa-location-dot"></i> Entrega ou retirada na loja selecionada</span><div id="categorias-atalhos"></div></nav><div class="page-slot"></div></div>`;
}

function sharedModals() {
    return `<div id="confirm-modal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div class="modal-card confirm-card"><div class="confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3 id="confirm-title">Confirmar ação</h3><p id="confirm-message"></p><div class="modal-actions"><button id="confirm-cancel" class="btn-secondary" type="button">Cancelar</button><button id="confirm-accept" class="btn-primary" type="button">Confirmar</button></div></div></div><div id="ticket-modal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="ticket-title"><div class="modal-card ticket-modal-card"><header><h3 id="ticket-title">Ticket do pedido</h3><button type="button" data-action="ticket-fechar" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></header><label>Largura<select id="ticket-width"><option value="80">80 mm</option><option value="58">58 mm</option></select></label><pre id="ticket-content" class="thermal-ticket"></pre><button class="btn-primary" type="button" data-action="ticket-imprimir">Imprimir ticket</button></div></div>`;
}

export function mountComponents() {
    const body = document.body;
    const area = body.dataset.area;
    if (!['lojista', 'cliente'].includes(area)) return;
    const shell = document.getElementById('app-shell');
    const content = document.getElementById('static-page-content');
    content.className = area === 'lojista' ? 'main-content' : 'market-main';
    shell.innerHTML = area === 'lojista' ? lojistaShell(body.dataset.page) : clienteShell(body.dataset.page);
    shell.querySelector('.page-slot').replaceWith(content);
    document.getElementById('shared-modals').innerHTML = sharedModals();
}
