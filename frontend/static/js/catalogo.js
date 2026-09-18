import { state } from './state.js';
import { apiRequest } from './api.js';
import { exibirNotificacao, formatarMoeda, escapeHtml, trocarAbaCliente, confirmarAcao } from './ui.js';
import { carregarMeusPedidos } from './pedidos.js';
import { imprimirTicket } from './ticket.js';
import { inicializarMapaLojas } from './mapa-lojas.js';

const produtoDisponivel = produto => produto.disponivel
    && !produto.status_manutencao
    && (state.tipoCompraAtual === 'Venda' ? produto.disponivel_venda : produto.disponivel_locacao);

export async function carregarLojasCliente() {
    try {
        const [lojasResponse, produtosResponse] = await Promise.all([
            apiRequest('/api/lojas'), apiRequest('/api/produtos')
        ]);
        state.cacheLojasCliente = await lojasResponse.json();
        state.cacheProdutos = await produtosResponse.json();
        preencherFiltros();
        atualizarSugestoesBusca();
        configurarDatasLocacao();
        inicializarMapaLojas({
            lojas: state.cacheLojasCliente,
            onSelect: selecionarLojaProxima,
            onUpdate: (lojas, localizacaoAtiva) => {
                state.lojasProximas = lojas;
                state.localizacaoAtiva = localizacaoAtiva;
                renderizarLojasProximas();
            }
        });
        aplicarFiltrosCatalogo();
    } catch (error) {
        document.getElementById('cliente-catalogo-produtos').innerHTML = '<div class="empty-market error-state"><i class="fa-solid fa-cloud-arrow-down"></i><h3>Não foi possível carregar o catálogo</h3><p>Confira sua conexão e tente novamente.</p><button class="btn-secondary" type="button" data-action="catalogo-recarregar">Tentar novamente</button></div>';
        exibirNotificacao(error.message || 'Não foi possível carregar o catálogo.', 'erro');
    }
}

export function atualizarSugestoesBusca() {
    const termo = document.getElementById('busca-marketplace').value.trim().toLocaleLowerCase('pt-BR');
    const opcoes = state.cacheProdutos
        .filter(produto => !termo || `${produto.nome} ${produto.categoria || ''}`.toLocaleLowerCase('pt-BR').includes(termo))
        .slice(0, 8);
    document.getElementById('sugestoes-produtos').innerHTML = opcoes
        .map(produto => `<option value="${escapeHtml(produto.nome)}">${escapeHtml(produto.categoria || '')}</option>`).join('');
}

function dataIso(data) {
    return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function configurarDatasLocacao() {
    const inicio = document.getElementById('locacao-data-inicio');
    const fim = document.getElementById('locacao-data-fim');
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    inicio.min = dataIso(hoje);
    fim.min = dataIso(amanha);
    if (!inicio.value) inicio.value = dataIso(hoje);
    if (!fim.value) fim.value = dataIso(amanha);
    atualizarPeriodoLocacao();
}

export function atualizarPeriodoLocacao() {
    const inicioInput = document.getElementById('locacao-data-inicio');
    const fimInput = document.getElementById('locacao-data-fim');
    const inicio = new Date(`${inicioInput.value}T12:00:00`);
    const fim = new Date(`${fimInput.value}T12:00:00`);
    if (!inicioInput.value || !fimInput.value || fim <= inicio) {
        document.getElementById('locacao-periodo-resumo').textContent = 'A devolução deve ser posterior à retirada.';
        document.getElementById('checkout-step-dates').classList.remove('complete');
        return 0;
    }
    fimInput.min = dataIso(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1));
    const dias = Math.max(1, Math.round((fim - inicio) / 86400000));
    state.carrinhoCliente.forEach(item => { item.dias_locacao = dias; });
    document.getElementById('locacao-periodo-resumo').textContent = `${dias} ${dias === 1 ? 'diária' : 'diárias'} calculada${dias === 1 ? '' : 's'} para todo o pedido.`;
    document.getElementById('checkout-step-dates').classList.add('complete');
    renderizarCarrinho();
    return dias;
}

export function renderizarLojasProximas() {
    const container = document.getElementById('lojas-proximas');
    const termo = document.getElementById('busca-lojas').value.trim().toLocaleLowerCase('pt-BR');
    const selecionada = Number(document.getElementById('filtro-loja').value || 0);
    const origem = state.localizacaoAtiva ? state.lojasProximas : state.cacheLojasCliente;
    const lojas = origem.filter(loja =>
        !termo || `${loja.nome} ${loja.endereco || ''}`.toLocaleLowerCase('pt-BR').includes(termo)
    );
    if (!lojas.length) {
        container.innerHTML = '<div class="nearby-loading"><i class="fa-solid fa-store-slash"></i> Nenhuma loja encontrada.</div>';
        return;
    }
    container.innerHTML = lojas.slice(0, 6).map(loja => `
        <button class="nearby-store ${selecionada === loja.id ? 'selected' : ''}" type="button" data-action="loja-proxima-selecionar" data-id="${loja.id}" aria-pressed="${selecionada === loja.id}">
            <i class="fa-solid fa-store"></i><div><strong>${escapeHtml(loja.nome)}</strong><small>${escapeHtml(loja.endereco || 'Endereço sob consulta')}</small><span class="store-open"><i class="fa-solid fa-location-dot"></i> ${Number.isFinite(loja.distancia_km) ? 'Dentro do raio selecionado' : 'Endereço cadastrado'}</span></div><span class="store-distance">${Number.isFinite(loja.distancia_km) ? `${loja.distancia_km.toFixed(1).replace('.', ',')} km` : '—'}</span>
        </button>`).join('');
}

export function selecionarLojaProxima(lojaId) {
    const loja = state.cacheLojasCliente.find(item => item.id === Number(lojaId));
    if (!loja) return;
    document.getElementById('filtro-loja').value = String(loja.id);
    renderizarLojasProximas();
    aplicarFiltrosCatalogo();
    document.querySelector('.market-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    exibirNotificacao(`${loja.nome} selecionada. Exibindo o catálogo desta loja.`);
}

function preencherFiltros() {
    const categorias = [...new Set(state.cacheProdutos.map(produto => produto.categoria).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    document.getElementById('filtro-loja').innerHTML = '<option value="">Todas as lojas</option>' + state.cacheLojasCliente
        .map(loja => `<option value="${loja.id}">${escapeHtml(loja.nome)}</option>`).join('');
    document.getElementById('filtro-categoria').innerHTML = '<option value="">Todas as categorias</option>' + categorias
        .map(categoria => `<option value="${escapeHtml(categoria)}">${escapeHtml(categoria)}</option>`).join('');
    document.getElementById('categorias-atalhos').innerHTML = categorias.slice(0, 6)
        .map(categoria => `<button type="button" data-action="categoria-selecionar" data-value="${escapeHtml(categoria)}">${escapeHtml(categoria)}</button>`).join('');
}

export function aplicarFiltrosCatalogo(reset = true) {
    if (reset) state.limiteCatalogo = 9;
    const termo = document.getElementById('busca-marketplace').value.trim().toLocaleLowerCase('pt-BR');
    const lojaId = Number(document.getElementById('filtro-loja').value || 0);
    const categoria = document.getElementById('filtro-categoria').value;
    const somenteDisponiveis = document.getElementById('filtro-disponivel').checked;
    const minimo = Number(document.getElementById('filtro-preco-min').value || 0);
    const maximo = Number(document.getElementById('filtro-preco-max').value || Infinity);
    const ordenacao = document.getElementById('ordenar-produtos').value;
    const produtos = state.cacheProdutos.filter(produto => {
        const texto = [produto.nome, produto.categoria, produto.utilidade, produto.descricao]
            .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
        const operacaoCompativel = state.tipoCompraAtual === 'Venda' ? produto.disponivel_venda : produto.disponivel_locacao;
        const preco = Number(state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao);
        return (!termo || texto.includes(termo)) && (!lojaId || produto.loja_id === lojaId)
            && (!categoria || produto.categoria === categoria) && operacaoCompativel
            && (!somenteDisponiveis || produtoDisponivel(produto)) && preco >= minimo && preco <= maximo
            && (!state.somenteFavoritos || state.favoritos.has(produto.id));
    });
    const precoProduto = produto => Number(state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao);
    if (ordenacao === 'menor-preco') produtos.sort((a, b) => precoProduto(a) - precoProduto(b));
    if (ordenacao === 'maior-preco') produtos.sort((a, b) => precoProduto(b) - precoProduto(a));
    if (ordenacao === 'recentes') produtos.sort((a, b) => b.id - a.id);
    state.produtosFiltrados = produtos;
    renderizarProdutosGrid(produtos.slice(0, state.limiteCatalogo));
    document.getElementById('catalogo-carregar-mais').classList.toggle('hidden', produtos.length <= state.limiteCatalogo);
    document.getElementById('resultado-contagem').textContent = `${produtos.length} ${produtos.length === 1 ? 'item encontrado' : 'itens encontrados'}`;
    renderizarFiltrosAtivos({termo, lojaId, categoria, minimo, maximo: Number.isFinite(maximo) ? maximo : 0});
}

function renderizarFiltrosAtivos({termo, lojaId, categoria, minimo, maximo}) {
    const loja = state.cacheLojasCliente.find(item => item.id === lojaId);
    const filtros = [
        termo && ['Busca', termo, 'busca'], categoria && ['Categoria', categoria, 'categoria'],
        loja && ['Loja', loja.nome, 'loja'], minimo > 0 && ['Mínimo', formatarMoeda(minimo), 'preco-min'],
        maximo > 0 && ['Máximo', formatarMoeda(maximo), 'preco-max'], state.somenteFavoritos && ['Lista', 'Favoritos', 'favoritos']
    ].filter(Boolean);
    document.getElementById('filtros-ativos').innerHTML = filtros.map(([rotulo, valor, filtro]) =>
        `<button type="button" data-action="filtro-remover" data-filter="${filtro}">${escapeHtml(rotulo)}: ${escapeHtml(valor)} <i class="fa-solid fa-xmark"></i></button>`
    ).join('');
}

export function carregarMaisProdutos() {
    state.limiteCatalogo += 9;
    renderizarProdutosGrid(state.produtosFiltrados.slice(0, state.limiteCatalogo));
    document.getElementById('catalogo-carregar-mais').classList.toggle('hidden', state.produtosFiltrados.length <= state.limiteCatalogo);
}

export function selecionarCategoria(categoria) {
    document.getElementById('filtro-categoria').value = categoria;
    document.getElementById('market-filters').classList.remove('mobile-open');
    aplicarFiltrosCatalogo();
}

export function alternarFavorito(produtoId) {
    const id = Number(produtoId);
    state.favoritos.has(id) ? state.favoritos.delete(id) : state.favoritos.add(id);
    localStorage.setItem('boraobra:favoritos', JSON.stringify([...state.favoritos]));
    aplicarFiltrosCatalogo(false);
    exibirNotificacao(state.favoritos.has(id) ? 'Produto salvo nos favoritos.' : 'Produto removido dos favoritos.');
}

export function abrirFavoritos(element) {
    state.somenteFavoritos = !state.somenteFavoritos;
    element.setAttribute('aria-pressed', String(state.somenteFavoritos));
    element.classList.toggle('active', state.somenteFavoritos);
    aplicarFiltrosCatalogo();
}

export function removerFiltro(nome) {
    const campos = {busca:'busca-marketplace', categoria:'filtro-categoria', loja:'filtro-loja', 'preco-min':'filtro-preco-min', 'preco-max':'filtro-preco-max'};
    if (nome === 'favoritos') {
        state.somenteFavoritos = false;
        const botao = document.querySelector('[data-action="favoritos-abrir"]');
        botao?.setAttribute('aria-pressed', 'false');
        botao?.classList.remove('active');
    }
    else if (campos[nome]) document.getElementById(campos[nome]).value = '';
    aplicarFiltrosCatalogo();
}

export async function definirTipoCompra(tipo) {
    if (!['Venda', 'Locacao'].includes(tipo) || tipo === state.tipoCompraAtual) return;
    if (state.carrinhoCliente.length && !await confirmarAcao('Trocar a operação esvaziará o pedido atual. Deseja continuar?', 'Trocar operação?')) return;
    state.tipoCompraAtual = tipo;
    state.carrinhoCliente = [];
    state.lojaAtualCliente = null;
    document.getElementById('checkout-datas').classList.toggle('hidden', tipo !== 'Locacao');
    document.getElementById('checkout-step-dates').classList.toggle('complete', tipo === 'Venda');
    document.querySelectorAll('[data-operation]').forEach(button => {
        button.classList.toggle('active', button.dataset.operation === tipo);
        button.setAttribute('aria-pressed', String(button.dataset.operation === tipo));
    });
    renderizarCarrinho();
    aplicarFiltrosCatalogo();
}

export function renderizarProdutosGrid(produtos) {
    const container = document.getElementById('cliente-catalogo-produtos');
    if (!produtos.length) {
        container.innerHTML = '<div class="empty-market"><i class="fa-solid fa-magnifying-glass"></i><h3>Nenhum equipamento encontrado</h3><p>Tente remover algum filtro ou buscar outro termo.</p></div>';
        return;
    }
    container.innerHTML = produtos.map(produtoCardHtml).join('');
}

function produtoCardHtml(produto) {
    const loja = state.cacheLojasCliente.find(item => item.id === produto.loja_id);
    const disponivel = produtoDisponivel(produto);
    const preco = state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao;
    const favorito = state.favoritos.has(produto.id);
    const vende = produto.disponivel_venda;
    const aluga = produto.disponivel_locacao;
    const badge = vende && aluga ? 'Venda e locação' : vende ? 'Venda' : 'Locação';
    return `<article class="market-product-card ${disponivel ? '' : 'is-unavailable'}" data-action="produto-detalhe" data-id="${produto.id}" tabindex="0" role="link" aria-label="Ver detalhes de ${escapeHtml(produto.nome)}">
            <button class="product-image" type="button" data-action="produto-detalhe" data-id="${produto.id}" aria-label="Ver detalhes de ${escapeHtml(produto.nome)}">
                <i class="fa-solid fa-screwdriver-wrench"></i>${produto.classificacao_curva_a ? '<span class="curve-badge">Mais procurado</span>' : ''}
            </button>
            <button class="favorite-button ${favorito ? 'active' : ''}" type="button" data-action="favorito-toggle" data-id="${produto.id}" aria-label="${favorito ? 'Remover dos' : 'Adicionar aos'} favoritos" aria-pressed="${favorito}"><i class="fa-${favorito ? 'solid' : 'regular'} fa-heart"></i></button>
            <div class="product-card-body">
                <span class="operation-badge ${state.tipoCompraAtual === 'Venda' ? 'sale' : 'rent'}">${badge}</span>
                <h3>${escapeHtml(produto.nome)}</h3>
                <p>${escapeHtml(produto.utilidade || produto.categoria || 'Equipamento para sua obra')}</p>
                <small><i class="fa-solid fa-store"></i> ${escapeHtml(loja?.nome || 'Loja')}</small>
                <strong>${formatarMoeda(preco)}${state.tipoCompraAtual === 'Locacao' ? '<em>/dia</em>' : ''}</strong>
                <span class="availability ${disponivel ? 'available' : 'unavailable'}">${disponivel ? 'Disponível agora' : 'Indisponível'}</span>
                <button class="btn-primary product-action" type="button" data-action="produto-detalhe" data-id="${produto.id}" ${disponivel ? '' : 'disabled'}>${state.tipoCompraAtual === 'Venda' ? 'Comprar' : 'Alugar'}</button>
            </div>
        </article>`;
}

export function abrirDetalheProduto(produtoId) {
    const produto = state.cacheProdutos.find(item => item.id === Number(produtoId));
    if (!produto) return;
    state.produtoDetalheAtual = produto;
    document.getElementById('cliente-marketplace').classList.add('hidden');
    document.getElementById('cliente-produto-detalhe').classList.remove('hidden');
    document.getElementById('detalhe-nome').textContent = produto.nome;
    document.getElementById('detalhe-categoria').textContent = produto.categoria || 'Ferramentas e equipamentos';
    document.getElementById('detalhe-breadcrumb-categoria').textContent = produto.categoria || 'Produto';
    document.getElementById('detalhe-utilidade').textContent = [produto.utilidade, produto.descricao, produto.cor_tamanho].filter(Boolean).join(' · ') || 'Consulte a loja para mais informações.';
    const loja = state.cacheLojasCliente.find(item => item.id === produto.loja_id);
    document.getElementById('detalhe-loja').textContent = loja ? `${loja.nome} · ${loja.endereco || 'Retirada a combinar'}` : 'Loja não informada';
    document.getElementById('detalhe-quantidade').value = 1;
    atualizarTotalDetalhe();
    const semelhantes = state.cacheProdutos.filter(item => item.id !== produto.id && item.categoria === produto.categoria).slice(0, 3);
    const containerSemelhantes = document.getElementById('produtos-semelhantes');
    if (semelhantes.length) renderizarProdutosGridNoContainer(semelhantes, containerSemelhantes);
    else containerSemelhantes.innerHTML = '<div class="empty-market compact"><p>Nenhum produto semelhante disponível.</p></div>';
}

function renderizarProdutosGridNoContainer(produtos, container) {
    container.innerHTML = produtos.map(produtoCardHtml).join('');
}

export function voltarParaCatalogo() {
    document.getElementById('cliente-produto-detalhe').classList.add('hidden');
    document.getElementById('cliente-marketplace').classList.remove('hidden');
}

export function atualizarTotalDetalhe() {
    const produto = state.produtoDetalheAtual;
    if (!produto) return;
    const quantidade = Math.max(1, Number(document.getElementById('detalhe-quantidade').value) || 1);
    const dias = state.tipoCompraAtual === 'Locacao' ? (atualizarPeriodoLocacao() || 1) : 1;
    const preco = Number(state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao);
    document.getElementById('detalhe-preco').textContent = formatarMoeda(preco);
    document.getElementById('detalhe-preco-ajuda').textContent = state.tipoCompraAtual === 'Locacao' ? 'por dia' : 'preço de venda';
    document.getElementById('detalhe-total').textContent = formatarMoeda(preco * quantidade * dias);
}

export async function adicionarDetalheAoCarrinho() {
    const produto = state.produtoDetalheAtual;
    if (!produto || !produtoDisponivel(produto)) return exibirNotificacao('Este equipamento não está disponível para a operação selecionada.', 'erro');
    if (state.lojaAtualCliente && state.lojaAtualCliente.id !== produto.loja_id) {
        if (!await confirmarAcao('Seu pedido contém itens de outra loja. Deseja iniciar um novo pedido?', 'Trocar de loja?')) return;
        state.carrinhoCliente = [];
    }
    state.lojaAtualCliente = state.cacheLojasCliente.find(loja => loja.id === produto.loja_id);
    const quantidade = Math.max(1, Number(document.getElementById('detalhe-quantidade').value) || 1);
    const dias = state.tipoCompraAtual === 'Locacao' ? (atualizarPeriodoLocacao() || 1) : 1;
    const preco = Number(state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao);
    const existente = state.carrinhoCliente.find(item => item.produto_id === produto.id);
    if (existente) existente.quantidade += quantidade;
    else state.carrinhoCliente.push({ produto_id: produto.id, nome: produto.nome, quantidade, dias_locacao: dias, valor_unitario: preco });
    renderizarCarrinho();
    voltarParaCatalogo();
    exibirNotificacao('Item adicionado ao pedido.', 'sucesso');
}

export function removerDoCarrinho(produtoId) {
    state.carrinhoCliente = state.carrinhoCliente.filter(item => item.produto_id !== Number(produtoId));
    if (!state.carrinhoCliente.length) state.lojaAtualCliente = null;
    renderizarCarrinho();
}

export function renderizarCarrinho() {
    const itens = document.getElementById('carrinho-itens');
    const total = state.carrinhoCliente.reduce((soma, item) => soma + item.valor_unitario * item.quantidade * item.dias_locacao, 0);
    document.getElementById('carrinho-contador').textContent = state.carrinhoCliente.reduce((soma, item) => soma + item.quantidade, 0);
    document.getElementById('carrinho-total-display').textContent = formatarMoeda(total);
    document.getElementById('checkout-loja').textContent = state.lojaAtualCliente?.nome || 'Escolha um produto';
    document.getElementById('checkout-step-review').classList.toggle('complete', state.carrinhoCliente.length > 0);
    itens.innerHTML = state.carrinhoCliente.length ? state.carrinhoCliente.map(item => `
        <div class="cart-line"><div><strong>${escapeHtml(item.nome)}</strong><small>${item.quantidade} un.${state.tipoCompraAtual === 'Locacao' ? ` · ${item.dias_locacao} dia(s)` : ''}</small></div>
        <span>${formatarMoeda(item.valor_unitario * item.quantidade * item.dias_locacao)}</span>
        <button type="button" data-action="carrinho-remover" data-id="${item.produto_id}" aria-label="Remover ${escapeHtml(item.nome)}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')
        : '<div class="cart-empty"><i class="fa-solid fa-cart-shopping"></i><p>Seu pedido está vazio</p><small>Escolha um equipamento para continuar.</small></div>';
}

export function atualizarStepEntrega() {
    document.getElementById('checkout-step-delivery').classList.toggle('complete', Boolean(document.getElementById('carrinho-endereco').value.trim()));
}

export async function finalizarPedidoCliente() {
    if (!state.carrinhoCliente.length) return exibirNotificacao('Adicione pelo menos um item ao pedido.', 'erro');
    const endereco = document.getElementById('carrinho-endereco').value.trim();
    if (!endereco) return exibirNotificacao('Informe o endereço de entrega.', 'erro');
    if (state.tipoCompraAtual === 'Locacao' && !atualizarPeriodoLocacao()) return exibirNotificacao('Selecione um período válido para a locação.', 'erro');
    const botao = document.getElementById('checkout-submit');
    botao.disabled = true;
    botao.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Gerando pedido...';
    try {
        const response = await apiRequest('/api/pedidos', { method: 'POST', body: JSON.stringify({
            loja_id: state.lojaAtualCliente.id, tipo: state.tipoCompraAtual,
            forma_pagamento: document.getElementById('carrinho-forma-pagamento').value,
            endereco_entrega: endereco,
            itens: state.carrinhoCliente.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade, dias_locacao: item.dias_locacao }))
        }) });
        const pedido = await response.json();
        state.carrinhoCliente = [];
        state.lojaAtualCliente = null;
        renderizarCarrinho();
        exibirNotificacao(`Pedido #${pedido.id} criado com sucesso.`, 'sucesso');
        await carregarMeusPedidos();
        await imprimirTicket(pedido.id);
    } finally {
        botao.disabled = false;
        botao.innerHTML = '<i class="fa-solid fa-lock"></i> Confirmar e gerar ticket';
    }
}

export function abrirPedidosCliente() {
    trocarAbaCliente('cliente-tab-pedidos');
    carregarMeusPedidos();
}
