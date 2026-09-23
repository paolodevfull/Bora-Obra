import * as ui from './ui.js';
import * as auth from './auth.js?v=20260922-2';
import * as gestao from './gestao.js';
import * as catalogo from './catalogo.js';
import * as pedidos from './pedidos.js';
import * as ticket from './ticket.js';
import { debounce } from './utils.js';
import { state } from './state.js';
import * as dashboard from './dashboard.js';
import { ativarLocalizacao, definirRaio, atualizarTamanhoMapa } from './mapa-lojas.js?v=20260922-8';
import { configurarViaCep } from './viacep.js';
import { configurarMascaras } from './mascaras.js';
import * as relatorios from './relatorios.js';
import { mountComponents } from './components.js?v=20260922-2';
import { setThemePreference, updateThemeControls } from './theme.js';

const pageForTab = { 'tab-dashboard': 'painel.html', 'tab-lojas': 'lojas.html', 'tab-usuarios': 'usuarios.html', 'tab-produtos': 'produtos.html', 'tab-vendas': 'pedidos.html', 'tab-relatorios': 'relatorios.html' };

function sincronizarMenuResponsivo() {
    const layout = document.querySelector('.app-layout');
    const controle = document.querySelector('.topbar .sidebar-toggle');
    if (!layout || !controle) return;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    layout.classList.remove('sidebar-open');
    controle.setAttribute('aria-expanded', String(!mobile));
    controle.setAttribute('aria-label', mobile ? 'Abrir menu' : 'Recolher menu');
}

const forms = {
    'form-login': auth.realizarLogin,
    'form-cadastro': auth.realizarCadastro,
    'form-cad-loja': gestao.cadastrarLoja,
    'form-cad-user': gestao.cadastrarUsuarioPainel,
    'form-cad-prod': gestao.cadastrarProduto,
    'form-editar-produto': gestao.salvarEdicaoProduto,
    'form-config-cliente': auth.salvarConfiguracoesCliente,
    'form-relatorio-filtros': relatorios.carregarRelatorioFiltrado
};

const actions = {
    logout: () => auth.logoutUsuario(),
    'tema-selecionar': element => setThemePreference(element.dataset.theme),
    'senha-toggle': element => {
        const input = document.getElementById(element.dataset.target);
        const mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        element.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
        element.querySelector('i').className = `fa-regular ${mostrar ? 'fa-eye-slash' : 'fa-eye'}`;
    },
    'gestao-tab': element => { window.location.href = `/lojista/${pageForTab[element.dataset.tab] || 'painel.html'}`; },
    'sidebar-toggle': element => {
        const layout = document.querySelector('.app-layout');
        if (window.matchMedia('(max-width: 760px)').matches) {
            const aberta = layout.classList.toggle('sidebar-open');
            const controle = document.querySelector('.topbar .sidebar-toggle');
            controle?.setAttribute('aria-expanded', String(aberta));
            controle?.setAttribute('aria-label', aberta ? 'Fechar menu' : 'Abrir menu');
            return;
        }
        const recolhida = layout.classList.toggle('sidebar-collapsed');
        element.setAttribute('aria-expanded', String(!recolhida));
        element.setAttribute('aria-label', recolhida ? 'Expandir menu' : 'Recolher menu');
    },
    'relatorio-periodo': element => { relatorios.definirPeriodo(element.dataset.period); relatorios.carregarRelatorioFiltrado(); },
    'relatorio-exportar-xml': () => relatorios.exportarXml(),
    'relatorio-grafico-png': () => relatorios.exportarGraficoPng(),
    'loja-editar': () => gestao.abrirEdicaoLoja(),
    'loja-logo-escolher': () => document.getElementById('loja-logo-arquivo')?.click(),
    'loja-logo-remover': () => gestao.removerLogoLoja(),
    'produto-edicao-fechar': () => gestao.fecharEdicaoProduto(),
    'pedidos-gestao-atualizar': () => gestao.carregarPedidos(),
    'cliente-catalogo': () => { window.location.href = '/cliente/index.html'; },
    'cliente-dashboard': () => { window.location.href = '/cliente/painel.html'; },
    'cliente-pedidos': () => { window.location.href = '/cliente/pedidos.html'; },
    'cliente-carrinho': () => {
        window.location.href = '/cliente/pedidos.html#checkout';
    },
    'perfil-menu': () => auth.alternarMenuPerfilCliente(),
    operacao: element => catalogo.definirTipoCompra(element.dataset.operation),
    'loja-proxima-selecionar': element => catalogo.selecionarLojaProxima(element.dataset.id),
    'localizacao-ativar': () => ativarLocalizacao(),
    'catalogo-recarregar': () => catalogo.carregarLojasCliente(),
    'catalogo-mais': () => catalogo.carregarMaisProdutos(),
    'categoria-selecionar': element => catalogo.selecionarCategoria(element.dataset.value),
    'favorito-toggle': element => catalogo.alternarFavorito(element.dataset.id),
    'favoritos-abrir': element => document.body.dataset.page === 'catalogo'
        ? catalogo.abrirFavoritos(element)
        : (window.location.href = '/cliente/index.html#favoritos'),
    'filtro-remover': element => catalogo.removerFiltro(element.dataset.filter),
    'filtros-mobile': () => document.getElementById('market-filters')?.classList.toggle('mobile-open'),
    'filtros-limpar': () => {
        document.getElementById('filtro-categoria').value = '';
        document.getElementById('filtro-loja').value = '';
        document.getElementById('filtro-disponivel').checked = true;
        document.getElementById('busca-marketplace').value = '';
        document.getElementById('busca-lojas').value = '';
        document.getElementById('filtro-preco-min').value = '';
        document.getElementById('filtro-preco-max').value = '';
        document.getElementById('ordenar-produtos').value = 'relevancia';
        state.somenteFavoritos = false;
        const botaoFavoritos = document.querySelector('[data-action="favoritos-abrir"]');
        botaoFavoritos.setAttribute('aria-pressed', 'false');
        botaoFavoritos.classList.remove('active');
        catalogo.renderizarLojasProximas();
        catalogo.aplicarFiltrosCatalogo();
    },
    'produto-detalhe': element => { window.location.href = `/cliente/detalhes.html?produto=${encodeURIComponent(element.dataset.id)}`; },
    'produto-voltar': () => catalogo.voltarParaCatalogo(),
    'carrinho-adicionar': () => catalogo.adicionarDetalheAoCarrinho(),
    'carrinho-remover': element => catalogo.removerDoCarrinho(element.dataset.id),
    checkout: () => catalogo.finalizarPedidoCliente(),
    'pedidos-atualizar': () => pedidos.carregarMeusPedidos(),
    'pedido-entregue': element => pedidos.confirmarEntregaPedido(element.dataset.id),
    'pedido-detalhes': element => pedidos.alternarDetalhesPedido(element.dataset.id),
    'pedido-acompanhar': element => pedidos.alternarDetalhesPedido(element.dataset.id, true),
    'pedido-cancelar': element => pedidos.cancelarPedido(element.dataset.id),
    'pedido-ticket': element => ticket.imprimirTicket(element.dataset.id),
    'produto-toggle': element => gestao.alternarDisponibilidade(element.dataset.id),
    'produto-editar': element => gestao.abrirEdicaoProduto(Number(element.dataset.id)),
    'produto-excluir': element => gestao.confirmarExclusaoProduto(Number(element.dataset.id)),
    'usuario-senha-toggle': element => gestao.alternarVisibilidadeSenhas(element),
    'usuario-editar': element => gestao.editarUsuario(Number(element.dataset.id)),
    'usuario-toggle': element => gestao.alternarUsuario(Number(element.dataset.id)),
    'usuario-excluir': element => gestao.excluirUsuario(Number(element.dataset.id)),
    'produto-duplicar': element => gestao.duplicarProduto(Number(element.dataset.id)),
    'gestao-pagina': element => gestao.mudarPagina(element.dataset.list, Number(element.dataset.delta)),
    'pedido-status': element => gestao.atualizarStatusPedido(Number(element.dataset.id), element.dataset.status),
    'ticket-fechar': () => ticket.fecharTicket(),
    'ticket-imprimir': () => window.print(),
    'dashboard-recarregar': element => dashboard.reloadDashboard(element.dataset.profile),
    'dashboard-periodo-aplicar': element => dashboard.reloadDashboard(element.dataset.profile)
};

async function executarAcao(element, event) {
    const action = actions[element.dataset.action];
    if (!action) return;
    event.preventDefault();
    if (element.dataset.loading === 'true') return;
    element.dataset.loading = 'true';
    const deveDesabilitar = element.matches('button');
    if (deveDesabilitar) element.disabled = true;
    element.setAttribute('aria-busy', 'true');
    try {
        await action(element, event);
    } catch (error) {
        ui.exibirNotificacao(error.message || 'Não foi possível concluir esta ação.', 'erro');
    } finally {
        delete element.dataset.loading;
        if (deveDesabilitar) element.disabled = false;
        element.removeAttribute('aria-busy');
    }
}

function registrarEventos() {
    let encerrandoSessao = false;
    document.addEventListener('click', event => {
        const element = event.target.closest('[data-action]');
        if (element) executarAcao(element, event);
        if (!event.target.closest('.cliente-perfil-wrap')) {
            document.getElementById('cliente-perfil-menu')?.classList.add('hidden');
            document.querySelector('.cliente-perfil-trigger')?.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('submit', async event => {
        const handler = forms[event.target.id];
        if (!handler) return;
        event.preventDefault();
        if (event.target.dataset.submitting === 'true') return;
        event.target.dataset.submitting = 'true';
        const submit = event.target.querySelector('[type="submit"]');
        if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
        try { await handler(event); }
        catch (error) { ui.exibirNotificacao(error.message || 'Não foi possível enviar o formulário.', 'erro'); }
        finally {
            delete event.target.dataset.submitting;
            if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
        }
    });

    const on = (id, event, handler) => document.getElementById(id)?.addEventListener(event, handler);
    const buscarCatalogo = debounce(() => {
        catalogo.atualizarSugestoesBusca();
        catalogo.aplicarFiltrosCatalogo();
    }, 220);
    on('busca-marketplace', 'input', buscarCatalogo);
    on('prod-imagem-url', 'input', gestao.atualizarPreviewImagemProduto);
    on('loja-logo-arquivo', 'change', event => gestao.selecionarLogoLoja(event.target.files?.[0]));
    on('filtro-categoria', 'change', catalogo.aplicarFiltrosCatalogo);
    on('filtro-loja', 'change', () => {
        catalogo.renderizarLojasProximas();
        catalogo.aplicarFiltrosCatalogo();
    });
    on('busca-lojas', 'input', catalogo.renderizarLojasProximas); on('raio-lojas', 'change', event => definirRaio(event.target.value)); on('filtro-disponivel', 'change', catalogo.aplicarFiltrosCatalogo); on('filtro-preco-min', 'input', debounce(catalogo.aplicarFiltrosCatalogo, 250)); on('filtro-preco-max', 'input', debounce(catalogo.aplicarFiltrosCatalogo, 250)); on('ordenar-produtos', 'change', catalogo.aplicarFiltrosCatalogo); on('carrinho-endereco', 'input', catalogo.atualizarStepEntrega); on('locacao-data-inicio', 'change', catalogo.atualizarPeriodoLocacao); on('locacao-data-fim', 'change', catalogo.atualizarPeriodoLocacao); on('detalhe-quantidade', 'input', () => catalogo.atualizarTotalDetalhe()); on('filtro-pedido-cliente', 'input', gestao.filtrarPedidosLojista); on('filtro-pedido-status', 'change', gestao.filtrarPedidosLojista); on('filtro-pedido-tipo', 'change', gestao.filtrarPedidosLojista); on('filtro-pedido-data', 'change', gestao.filtrarPedidosLojista); on('filtro-usuarios-busca', 'input', gestao.filtrarUsuarios); on('filtro-usuarios-status', 'change', gestao.filtrarUsuarios); on('ordenar-usuarios', 'change', gestao.filtrarUsuarios); on('filtro-produtos-busca', 'input', gestao.filtrarProdutos); on('filtro-produtos-status', 'change', gestao.filtrarProdutos); on('ordenar-produtos-gestao', 'change', gestao.filtrarProdutos); on('user-confirmar-senha', 'input', event => event.target.setCustomValidity(event.target.value === document.getElementById('user-senha').value ? '' : 'As senhas não coincidem.')); on('ticket-width', 'change', event => ticket.definirLarguraTicket(event.target.value)); on('periodo-dashboard-lojista', 'change', () => dashboard.periodChanged('lojista')); on('periodo-dashboard-cliente', 'change', () => dashboard.periodChanged('cliente'));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const layout = document.querySelector('.app-layout.sidebar-open');
            if (layout) {
                layout.classList.remove('sidebar-open');
                const controle = document.querySelector('.topbar .sidebar-toggle');
                controle?.setAttribute('aria-expanded', 'false');
                controle?.setAttribute('aria-label', 'Abrir menu');
            }
        }
        const modalAberto = document.querySelector('.modal-overlay:not(.hidden)');
        if (event.key === 'Tab' && modalAberto) {
            const focaveis = [...modalAberto.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(item => !item.disabled);
            if (focaveis.length) {
                const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
                if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
                else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
            }
        }
        if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.market-product-card')) {
            event.preventDefault();
            event.target.click();
            return;
        }
        if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.store-logo-dropzone')) {
            event.preventDefault();
            document.getElementById('loja-logo-arquivo')?.click();
        }
        if (event.key === 'Escape' && document.getElementById('confirm-modal')?.classList.contains('hidden')) {
            document.querySelectorAll('.modal-overlay:not(#confirm-modal)').forEach(modal => modal.classList.add('hidden'));
            document.getElementById('market-filters')?.classList.remove('mobile-open');
        }
    });
    const logoDropzone = document.getElementById('loja-logo-dropzone');
    if (logoDropzone) {
        ['dragenter', 'dragover'].forEach(tipo => logoDropzone.addEventListener(tipo, event => {
            event.preventDefault();
            logoDropzone.classList.add('is-dragging');
        }));
        ['dragleave', 'drop'].forEach(tipo => logoDropzone.addEventListener(tipo, event => {
            event.preventDefault();
            logoDropzone.classList.remove('is-dragging');
        }));
        logoDropzone.addEventListener('drop', event => gestao.selecionarLogoLoja(event.dataTransfer?.files?.[0]));
    }
    document.addEventListener('error', event => {
        if (event.target.matches?.('img[data-logo-fallback]')) {
            event.target.removeAttribute('data-logo-fallback');
            event.target.src = '/static/img/store-default.svg';
        }
    }, true);
    window.addEventListener('offline', () => ui.showToast('Você está sem conexão. Algumas ações podem não funcionar.', 'aviso'));
    window.addEventListener('online', () => ui.showToast('Conexão restabelecida.', 'sucesso'));
    window.addEventListener('resize', debounce(sincronizarMenuResponsivo, 150));
    window.addEventListener('boraobra:theme-changed', () => {
        if (document.body.dataset.page === 'dashboard') dashboard.renderDashboardLojista();
        if (document.body.dataset.page === 'dashboard-cliente') dashboard.renderDashboardCliente();
        if (document.body.dataset.page === 'relatorios') relatorios.carregarRelatorioFiltrado();
    });
    const sincronizarPainelLojista = debounce(() => {
        if (document.hidden || !['lojista', 'funcionario'].includes(state.perfilOperacional)) return;
        const pagina = document.body.dataset.page;
        if (pagina === 'dashboard') dashboard.reloadDashboard('lojista');
        else if (pagina === 'pedidos') gestao.carregarPedidos(true);
    }, 120);
    window.setInterval(sincronizarPainelLojista, 15000);
    window.addEventListener('focus', sincronizarPainelLojista);
    document.addEventListener('visibilitychange', sincronizarPainelLojista);
    window.addEventListener('boraobra:session-expired', async () => {
        if (encerrandoSessao) return;
        encerrandoSessao = true;
        ui.showToast('Sua sessão expirou. Entre novamente para continuar.', 'aviso');
        await auth.logoutUsuario();
        encerrandoSessao = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    mountComponents();
    sincronizarMenuResponsivo();
    updateThemeControls();
    registrarEventos();
    configurarViaCep(['loja', 'config-cliente']);
    configurarMascaras();
    if (document.getElementById('relatorio-inicio')) relatorios.definirPeriodo('30d');
    document.querySelectorAll('.input-group').forEach(group => {
        const label = group.querySelector('label');
        const input = group.querySelector('input, select, textarea');
        if (label && input?.id) label.htmlFor = input.id;
    });
    auth.verificarSessaoAtiva();
});
