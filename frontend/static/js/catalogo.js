import { state } from './state.js';
import { apiRequest } from './api.js';
import { exibirNotificacao, formatarMoeda, escapeHtml, confirmarAcao } from './ui.js';
import { carregarMeusPedidos } from './pedidos.js';
import { imprimirTicket } from './ticket.js';
import { inicializarMapaLojas, coordenadasValidas } from './mapa-lojas.js';

const produtoDisponivel = produto => produto.disponivel
    && !produto.status_manutencao
    && Number(produto.estoque) > 0
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
        sincronizarTipoCompraNaTela();
        inicializarMapaLojas({
            lojas: state.cacheLojasCliente,
            onSelect: selecionarLojaProxima,
            onUpdate: (lojas, localizacaoAtiva) => {
                const semCoordenadas = state.cacheLojasCliente.filter(loja => !coordenadasValidas(loja));
                state.lojasProximas = localizacaoAtiva ? [...lojas, ...semCoordenadas] : lojas;
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

export async function carregarDetalheProdutoPage(id) {
    try {
        const [lojasResponse, produtosResponse] = await Promise.all([apiRequest('/api/lojas'), apiRequest('/api/produtos')]);
        state.cacheLojasCliente = await lojasResponse.json();
        state.cacheProdutos = await produtosResponse.json();
        configurarDatasLocacao();
        abrirDetalheProduto(id);
    } catch (error) {
        document.getElementById('detalhe-nome').textContent = 'Produto indisponível';
        document.getElementById('detalhe-utilidade').textContent = 'Não foi possível carregar este produto. Volte ao catálogo e tente novamente.';
        exibirNotificacao(error.message || 'Não foi possível carregar o produto.', 'erro');
    }
}

export function atualizarSugestoesBusca() {
    const busca = document.getElementById('busca-marketplace');
    const sugestoes = document.getElementById('sugestoes-produtos');
    if (!busca || !sugestoes) return;
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const opcoes = state.cacheProdutos
        .filter(produto => !termo || `${produto.nome} ${produto.categoria || ''}`.toLocaleLowerCase('pt-BR').includes(termo))
        .slice(0, 8);
    sugestoes.innerHTML = opcoes
        .map(produto => `<option value="${escapeHtml(produto.nome)}">${escapeHtml(produto.categoria || '')}</option>`).join('');
}

function dataIso(data) {
    return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function configurarDatasLocacao() {
    const inicio = document.getElementById('locacao-data-inicio');
    const fim = document.getElementById('locacao-data-fim');
    if (!inicio || !fim) return;
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
    if (!inicioInput || !fimInput) return 0;
    const inicio = new Date(`${inicioInput.value}T12:00:00`);
    const fim = new Date(`${fimInput.value}T12:00:00`);
    if (!inicioInput.value || !fimInput.value || fim <= inicio) {
        document.getElementById('locacao-periodo-resumo').textContent = 'A devolução deve ser posterior à retirada.';
        document.getElementById('checkout-step-dates')?.classList.remove('complete');
        if (state.produtoDetalheAtual) atualizarTotalDetalhe(0);
        return 0;
    }
    fimInput.min = dataIso(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1));
    const dias = Math.max(1, Math.round((fim - inicio) / 86400000));
    state.carrinhoCliente.forEach(item => {
        item.dias_locacao = dias;
        item.data_inicio_locacao = inicioInput.value;
        item.data_fim_locacao = fimInput.value;
    });
    document.getElementById('locacao-periodo-resumo').textContent = `${dias} ${dias === 1 ? 'diária' : 'diárias'} calculada${dias === 1 ? '' : 's'} para todo o pedido.`;
    document.getElementById('checkout-step-dates')?.classList.add('complete');
    renderizarCarrinho();
    if (state.produtoDetalheAtual) atualizarTotalDetalhe(dias);
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
    const logoSeguro = loja => {
        const candidato = String(loja.logo_marcador_url || loja.logo_url || '').trim();
        return candidato.startsWith('/') || candidato.startsWith('https://')
            ? candidato
            : '/static/img/store-default.svg';
    };
    container.innerHTML = lojas.slice(0, 6).map(loja => `
        <button class="nearby-store ${selecionada === loja.id ? 'selected' : ''}" type="button" data-action="loja-proxima-selecionar" data-id="${loja.id}" aria-pressed="${selecionada === loja.id}">
            <img class="nearby-store-logo" src="${escapeHtml(logoSeguro(loja))}" alt="Logotipo da ${escapeHtml(loja.nome)}" data-logo-fallback="/static/img/store-default.svg"><div><strong>${escapeHtml(loja.nome)}</strong><small>${escapeHtml(loja.endereco || 'Endereço sob consulta')}</small><span class="store-open"><i class="fa-solid fa-location-dot"></i> ${Number.isFinite(loja.distancia_km) ? 'Dentro do raio selecionado' : 'Endereço cadastrado'}</span></div><span class="store-distance">${Number.isFinite(loja.distancia_km) ? `${loja.distancia_km.toFixed(1).replace('.', ',')} km` : 'Distância indisponível'}</span>
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
    if (!document.getElementById('cliente-catalogo-produtos')) return;
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
    renderizarFiltrosAtivos({ termo, lojaId, categoria, minimo, maximo: Number.isFinite(maximo) ? maximo : 0 });
}

function renderizarFiltrosAtivos({ termo, lojaId, categoria, minimo, maximo }) {
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
    const campos = { busca: 'busca-marketplace', categoria: 'filtro-categoria', loja: 'filtro-loja', 'preco-min': 'filtro-preco-min', 'preco-max': 'filtro-preco-max' };
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
    if (!['Venda', 'Locacao'].includes(tipo)) return;
    if (tipo === state.tipoCompraAtual) {
        sincronizarTipoCompraNaTela(tipo);
        if (tipo === 'Locacao') configurarDatasLocacao();
        if (state.produtoDetalheAtual) atualizarTotalDetalhe();
        return;
    }
    if (state.carrinhoCliente.length && !await confirmarAcao('Trocar a operação esvaziará o pedido atual. Deseja continuar?', 'Trocar operação?')) return;
    state.tipoCompraAtual = tipo;
    state.carrinhoCliente = [];
    state.lojaAtualCliente = null;
    document.getElementById('checkout-datas')?.classList.toggle('hidden', tipo !== 'Locacao');
    document.getElementById('checkout-step-dates')?.classList.toggle('complete', tipo === 'Venda');
    sincronizarTipoCompraNaTela(tipo);
    if (tipo === 'Locacao') configurarDatasLocacao();
    renderizarCarrinho();
    if (document.getElementById('cliente-catalogo-produtos')) aplicarFiltrosCatalogo();
    if (state.produtoDetalheAtual && !document.getElementById('cliente-produto-detalhe')?.classList.contains('hidden')) atualizarTotalDetalhe();
}

function sincronizarTipoCompraNaTela(tipo = state.tipoCompraAtual) {
    document.getElementById('checkout-datas')?.classList.toggle('hidden', tipo !== 'Locacao');
    document.querySelectorAll('[data-operation]').forEach(button => {
        const ativo = button.dataset.operation === tipo;
        button.classList.toggle('active', ativo);
        button.setAttribute('aria-pressed', String(ativo));
    });
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
    return `<article class="market-product-card ${disponivel ? '' : 'is-unavailable'}">
            <button class="product-image" type="button" data-action="produto-detalhe" data-id="${produto.id}" aria-label="Ver detalhes de ${escapeHtml(produto.nome)}">
                ${produto.imagem_url
            ? `<img src="${escapeHtml(produto.imagem_url)}" alt="${escapeHtml(produto.nome)}" loading="lazy">`
            : '<i class="fa-solid fa-screwdriver-wrench"></i>'}
                ${produto.classificacao_curva_a ? '<span class="curve-badge">Mais procurado</span>' : ''}
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
    document.getElementById('cliente-marketplace')?.classList.add('hidden');
    document.getElementById('cliente-produto-detalhe').classList.remove('hidden');
    document.getElementById('detalhe-nome').textContent = produto.nome;
    document.getElementById('detalhe-categoria').textContent = produto.categoria || 'Ferramentas e equipamentos';
    document.getElementById('detalhe-breadcrumb-categoria').textContent = produto.categoria || 'Produto';
    document.getElementById('detalhe-utilidade').textContent = [produto.utilidade, produto.descricao, produto.cor_tamanho].filter(Boolean).join(' · ') || 'Consulte a loja para mais informações.';
    const imagem = document.getElementById('detalhe-imagem') || document.querySelector('.produto-imagem-placeholder');
    if (imagem) imagem.innerHTML = produto.imagem_url
        ? `<img src="${escapeHtml(produto.imagem_url)}" alt="${escapeHtml(produto.nome)}">`
        : '<i class="fa-solid fa-screwdriver-wrench"></i>';
    const loja = state.cacheLojasCliente.find(item => item.id === produto.loja_id);
    document.getElementById('detalhe-loja').textContent = loja ? `${loja.nome} · ${loja.endereco || 'Retirada a combinar'}` : 'Loja não informada';
    document.getElementById('detalhe-quantidade').value = 1;
    document.getElementById('detalhe-quantidade').max = Math.max(0, Number(produto.estoque) || 0);
    document.getElementById('checkout-datas').classList.toggle('hidden', state.tipoCompraAtual !== 'Locacao');
    if (state.tipoCompraAtual === 'Locacao') configurarDatasLocacao();
    document.querySelectorAll('.detail-operation [data-operation]').forEach(botao => {
        const disponivel = botao.dataset.operation === 'Venda' ? produto.disponivel_venda : produto.disponivel_locacao;
        botao.disabled = !disponivel;
        botao.classList.toggle('active', botao.dataset.operation === state.tipoCompraAtual);
        botao.setAttribute('aria-pressed', String(botao.dataset.operation === state.tipoCompraAtual));
    });
    const modalidades = [produto.disponivel_venda && 'compra', produto.disponivel_locacao && 'locação'].filter(Boolean);
    document.getElementById('detalhe-operacao-ajuda').textContent = modalidades.length > 1
        ? 'Escolha entre comprar ou alugar antes de adicionar ao pedido.'
        : `Disponível somente para ${modalidades[0] || 'consulta'}.`;
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
    if (document.body.dataset.page === 'detalhe-produto') return window.location.href = '/cliente/index.html';
    document.getElementById('cliente-produto-detalhe').classList.add('hidden');
    document.getElementById('cliente-marketplace').classList.remove('hidden');
}

export function atualizarTotalDetalhe(diasCalculados = null) {
    const produto = state.produtoDetalheAtual;
    if (!produto) return;
    const quantidade = Math.max(1, Number(document.getElementById('detalhe-quantidade').value) || 1);
    if (quantidade > Number(produto.estoque)) {
        document.getElementById('detalhe-quantidade').focus();
        return exibirNotificacao(`Quantidade máxima disponível: ${produto.estoque}.`, 'erro');
    }
    const diasInformados = Number(diasCalculados);
    const dias = state.tipoCompraAtual === 'Locacao'
        ? (Number.isFinite(diasInformados) && diasInformados > 0 ? diasInformados : calcularDiasLocacaoSemEfeitos() || 1)
        : 1;
    const preco = Number(state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao);
    document.getElementById('detalhe-preco').textContent = formatarMoeda(preco);
    document.getElementById('detalhe-preco-ajuda').textContent = state.tipoCompraAtual === 'Locacao' ? 'por dia' : 'preço de venda';
    document.getElementById('detalhe-total').textContent = formatarMoeda(preco * quantidade * dias);
}

function calcularDiasLocacaoSemEfeitos() {
    const inicioInput = document.getElementById('locacao-data-inicio');
    const fimInput = document.getElementById('locacao-data-fim');
    if (!inicioInput?.value || !fimInput?.value) return 0;
    const inicio = new Date(`${inicioInput.value}T12:00:00`);
    const fim = new Date(`${fimInput.value}T12:00:00`);
    if (fim <= inicio) return 0;
    return Math.max(1, Math.round((fim - inicio) / 86400000));
}

export async function adicionarDetalheAoCarrinho() {
    const produto = state.produtoDetalheAtual;
    if (!produto || !produtoDisponivel(produto)) return exibirNotificacao('Este equipamento não está disponível para a operação selecionada.', 'erro');
    const dias = state.tipoCompraAtual === 'Locacao' ? atualizarPeriodoLocacao() : 1;
    if (state.tipoCompraAtual === 'Locacao' && !dias) {
        document.getElementById('locacao-data-fim').focus();
        return exibirNotificacao('Selecione um período válido antes de adicionar a locação.', 'erro');
    }
    if (state.lojaAtualCliente && state.lojaAtualCliente.id !== produto.loja_id) {
        if (!await confirmarAcao('Seu pedido contém itens de outra loja. Deseja iniciar um novo pedido?', 'Trocar de loja?')) return;
        state.carrinhoCliente = [];
    }
    state.lojaAtualCliente = state.cacheLojasCliente.find(loja => loja.id === produto.loja_id);
    const quantidade = Math.max(1, Number(document.getElementById('detalhe-quantidade').value) || 1);
    const preco = Number(state.tipoCompraAtual === 'Venda' ? produto.preco_venda : produto.preco_locacao);
    const existente = state.carrinhoCliente.find(item => item.produto_id === produto.id);
    if (quantidade + Number(existente?.quantidade || 0) > Number(produto.estoque)) {
        return exibirNotificacao(`Você pode adicionar no máximo ${produto.estoque} unidade(s) deste produto.`, 'erro');
    }
    if (existente) existente.quantidade += quantidade;
    else state.carrinhoCliente.push({
        produto_id: produto.id,
        nome: produto.nome,
        quantidade,
        dias_locacao: dias,
        data_inicio_locacao: state.tipoCompraAtual === 'Locacao' ? document.getElementById('locacao-data-inicio')?.value : null,
        data_fim_locacao: state.tipoCompraAtual === 'Locacao' ? document.getElementById('locacao-data-fim')?.value : null,
        valor_unitario: preco
    });
    renderizarCarrinho();
    abrirPedidosCliente();
}

export function removerDoCarrinho(produtoId) {
    state.carrinhoCliente = state.carrinhoCliente.filter(item => item.produto_id !== Number(produtoId));
    if (!state.carrinhoCliente.length) state.lojaAtualCliente = null;
    renderizarCarrinho();
}

export function renderizarCarrinho() {
    const itens = document.getElementById('carrinho-itens');
    const total = state.carrinhoCliente.reduce((soma, item) => soma + item.valor_unitario * item.quantidade * item.dias_locacao, 0);
    const contador = document.getElementById('carrinho-contador');
    if (contador) contador.textContent = state.carrinhoCliente.reduce((soma, item) => soma + item.quantidade, 0);
    if (document.getElementById('carrinho-total-display')) document.getElementById('carrinho-total-display').textContent = formatarMoeda(total);
    if (document.getElementById('checkout-loja')) document.getElementById('checkout-loja').textContent = state.lojaAtualCliente?.nome || 'Escolha um produto';
    document.getElementById('checkout-step-review')?.classList.toggle('complete', state.carrinhoCliente.length > 0);
    if (itens) itens.innerHTML = state.carrinhoCliente.length ? state.carrinhoCliente.map(item => `
        <div class="cart-line"><div><strong>${escapeHtml(item.nome)}</strong><small>${item.quantidade} un.${state.tipoCompraAtual === 'Locacao' ? ` · ${item.dias_locacao} dia(s)` : ''}</small></div>
        <span>${formatarMoeda(item.valor_unitario * item.quantidade * item.dias_locacao)}</span>
        <button type="button" data-action="carrinho-remover" data-id="${item.produto_id}" aria-label="Remover ${escapeHtml(item.nome)}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')
        : '<div class="cart-empty"><i class="fa-solid fa-cart-shopping"></i><p>Seu pedido está vazio</p><small>Escolha um equipamento para continuar.</small></div>';
    localStorage.setItem('boraobra:carrinho', JSON.stringify(state.carrinhoCliente));
    localStorage.setItem('boraobra:loja-carrinho', JSON.stringify(state.lojaAtualCliente));
    localStorage.setItem('boraobra:tipo-compra', state.tipoCompraAtual);
}

export function atualizarStepEntrega() {
    document.getElementById('checkout-step-delivery')?.classList.toggle('complete', Boolean(document.getElementById('carrinho-endereco').value.trim()));
}

export async function finalizarPedidoCliente() {
    if (!state.carrinhoCliente.length) return exibirNotificacao('Adicione pelo menos um item ao pedido.', 'erro');
    const endereco = document.getElementById('carrinho-endereco').value.trim();
    if (!endereco) return exibirNotificacao('Informe o endereço de entrega.', 'erro');
    if (state.tipoCompraAtual === 'Locacao' && state.carrinhoCliente.some(item => !item.dias_locacao || item.dias_locacao < 1)) return exibirNotificacao('Selecione um período válido para a locação.', 'erro');
    const botao = document.getElementById('checkout-submit');
    botao.disabled = true;
    botao.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Gerando pedido...';
    try {
        const response = await apiRequest('/api/pedidos', {
            method: 'POST', body: JSON.stringify({
                loja_id: state.lojaAtualCliente.id, tipo: state.tipoCompraAtual,
                forma_pagamento: document.getElementById('carrinho-forma-pagamento').value,
                endereco_entrega: endereco,
                data_inicio_locacao: state.tipoCompraAtual === 'Locacao' ? state.carrinhoCliente[0]?.data_inicio_locacao : null,
                data_fim_locacao: state.tipoCompraAtual === 'Locacao' ? state.carrinhoCliente[0]?.data_fim_locacao : null,
                itens: state.carrinhoCliente.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade, dias_locacao: item.dias_locacao }))
            })
        });
        const pedido = await response.json();
        state.carrinhoCliente = [];
        state.lojaAtualCliente = null;
        renderizarCarrinho();
        exibirNotificacao('Pedido criado com sucesso.', 'sucesso');
        await carregarMeusPedidos();
        await imprimirTicket(pedido.id);
    } finally {
        botao.disabled = false;
        botao.innerHTML = '<i class="fa-solid fa-lock"></i> Confirmar e gerar ticket';
    }
}

export function abrirPedidosCliente() {
    window.location.href = '/cliente/pedidos.html';
}
