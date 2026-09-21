import * as ui from './ui.js';
import * as auth from './auth.js';
import * as gestao from './gestao.js';
import * as catalogo from './catalogo.js';
import * as pedidos from './pedidos.js';
import * as ticket from './ticket.js';
import { debounce } from './utils.js';
import { state } from './state.js';
import * as dashboard from './dashboard.js';
import { ativarLocalizacao, definirRaio, atualizarTamanhoMapa } from './mapa-lojas.js';
import { configurarViaCep } from './viacep.js';
import { configurarMascaras } from './mascaras.js';

const forms = {
    'form-login': auth.realizarLogin,
    'form-cadastro': auth.realizarCadastro,
    'form-cad-loja': gestao.cadastrarLoja,
    'form-cad-user': gestao.cadastrarUsuarioPainel,
    'form-cad-prod': gestao.cadastrarProduto,
    'form-editar-produto': gestao.salvarEdicaoProduto,
    'form-config-cliente': auth.salvarConfiguracoesCliente
};

const actions = {
    'auth-cadastro': (_, event) => auth.mostrarCadastro(event),
    'auth-login': (_, event) => auth.mostrarLogin(event),
    logout: () => auth.logoutUsuario(),
    'ajuda-notificacoes': () => ui.exibirNotificacao('As confirmações e avisos aparecem aqui.', 'sucesso'),
    'gestao-tab': element => ui.trocarAba(element.dataset.tab, element),
    'sidebar-toggle': element => {
        const layout = document.querySelector('.app-layout');
        const recolhida = layout.classList.toggle('sidebar-collapsed');
        element.setAttribute('aria-expanded', String(!recolhida));
        element.setAttribute('aria-label', recolhida ? 'Expandir menu' : 'Recolher menu');
    },
    'nova-venda': () => {
        const menu = document.querySelector('[data-tab="tab-vendas"]');
        ui.trocarAba('tab-vendas', menu);
        document.getElementById('filtro-pedido-cliente').focus();
        ui.exibirNotificacao('A API atual ainda não permite criar venda manual pelo lojista. A fila de vendas foi aberta.', 'aviso');
    },
    'relatorio-atualizar': () => gestao.carregarRelatorioLucro(),
    'loja-editar': () => gestao.abrirEdicaoLoja(),
    'produto-edicao-fechar': () => gestao.fecharEdicaoProduto(),
    'pedidos-gestao-atualizar': () => gestao.carregarPedidos(),
    'cliente-catalogo': () => {
        catalogo.voltarParaCatalogo();
        ui.trocarAbaCliente('cliente-tab-lojas');
        atualizarTamanhoMapa();
    },
    'cliente-dashboard': () => ui.trocarAbaCliente('cliente-tab-dashboard'),
    'cliente-pedidos': () => catalogo.abrirPedidosCliente(),
    'cliente-carrinho': () => document.getElementById('checkout-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }),
    'perfil-menu': () => auth.alternarMenuPerfilCliente(),
    'perfil-config': () => auth.abrirConfiguracoesCliente(),
    'perfil-config-fechar': () => auth.fecharConfiguracoesCliente(),
    operacao: element => catalogo.definirTipoCompra(element.dataset.operation),
    'loja-proxima-selecionar': element => catalogo.selecionarLojaProxima(element.dataset.id),
    'localizacao-ativar': () => ativarLocalizacao(),
    'catalogo-recarregar': () => catalogo.carregarLojasCliente(),
    'catalogo-mais': () => catalogo.carregarMaisProdutos(),
    'categoria-selecionar': element => catalogo.selecionarCategoria(element.dataset.value),
    'favorito-toggle': element => catalogo.alternarFavorito(element.dataset.id),
    'favoritos-abrir': element => catalogo.abrirFavoritos(element),
    'filtro-remover': element => catalogo.removerFiltro(element.dataset.filter),
    'filtros-mobile': () => document.getElementById('market-filters').classList.toggle('mobile-open'),
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
    'produto-detalhe': element => catalogo.abrirDetalheProduto(element.dataset.id),
    'produto-voltar': () => catalogo.voltarParaCatalogo(),
    'carrinho-adicionar': () => catalogo.adicionarDetalheAoCarrinho(),
    'carrinho-remover': element => catalogo.removerDoCarrinho(element.dataset.id),
    checkout: () => catalogo.finalizarPedidoCliente(),
    'pedidos-atualizar': () => pedidos.carregarMeusPedidos(),
    'pedido-entregue': element => pedidos.confirmarEntregaPedido(element.dataset.id),
    'pedido-ticket': element => ticket.imprimirTicket(element.dataset.id),
    'produto-toggle': element => gestao.alternarDisponibilidade(element.dataset.id),
    'produto-editar': element => gestao.abrirEdicaoProduto(Number(element.dataset.id)),
    'produto-excluir': element => gestao.confirmarExclusaoProduto(Number(element.dataset.id)),
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

    const buscarCatalogo = debounce(() => {
        catalogo.atualizarSugestoesBusca();
        catalogo.aplicarFiltrosCatalogo();
    }, 220);
    document.getElementById('busca-marketplace').addEventListener('input', buscarCatalogo);
    document.getElementById('filtro-categoria').addEventListener('change', catalogo.aplicarFiltrosCatalogo);
    document.getElementById('filtro-loja').addEventListener('change', () => {
        catalogo.renderizarLojasProximas();
        catalogo.aplicarFiltrosCatalogo();
    });
    document.getElementById('busca-lojas').addEventListener('input', catalogo.renderizarLojasProximas);
    document.getElementById('raio-lojas').addEventListener('change', event => definirRaio(event.target.value));
    document.getElementById('filtro-disponivel').addEventListener('change', catalogo.aplicarFiltrosCatalogo);
    document.getElementById('filtro-preco-min').addEventListener('input', debounce(catalogo.aplicarFiltrosCatalogo, 250));
    document.getElementById('filtro-preco-max').addEventListener('input', debounce(catalogo.aplicarFiltrosCatalogo, 250));
    document.getElementById('ordenar-produtos').addEventListener('change', catalogo.aplicarFiltrosCatalogo);
    document.getElementById('carrinho-endereco').addEventListener('input', catalogo.atualizarStepEntrega);
    document.getElementById('locacao-data-inicio').addEventListener('change', catalogo.atualizarPeriodoLocacao);
    document.getElementById('locacao-data-fim').addEventListener('change', catalogo.atualizarPeriodoLocacao);
    document.getElementById('detalhe-quantidade').addEventListener('input', catalogo.atualizarTotalDetalhe);
    document.getElementById('busca-painel').addEventListener('input', event => gestao.buscarNoPainel(event.target.value));
    document.getElementById('filtro-pedido-cliente').addEventListener('input', gestao.filtrarPedidosLojista);
    document.getElementById('filtro-pedido-status').addEventListener('change', gestao.filtrarPedidosLojista);
    document.getElementById('filtro-pedido-tipo').addEventListener('change', gestao.filtrarPedidosLojista);
    document.getElementById('filtro-pedido-data').addEventListener('change', gestao.filtrarPedidosLojista);
    document.getElementById('ticket-width').addEventListener('change', event => ticket.definirLarguraTicket(event.target.value));
    document.getElementById('periodo-dashboard-lojista').addEventListener('change', () => dashboard.periodChanged('lojista'));
    document.getElementById('periodo-dashboard-cliente').addEventListener('change', () => dashboard.periodChanged('cliente'));
    document.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.market-product-card')) {
            event.preventDefault();
            event.target.click();
            return;
        }
        if (event.key === 'Escape' && document.getElementById('confirm-modal').classList.contains('hidden')) {
            document.querySelectorAll('.modal-overlay:not(#confirm-modal)').forEach(modal => modal.classList.add('hidden'));
            document.getElementById('market-filters').classList.remove('mobile-open');
        }
    });
    window.addEventListener('offline', () => ui.showToast('Você está sem conexão. Algumas ações podem não funcionar.', 'aviso'));
    window.addEventListener('online', () => ui.showToast('Conexão restabelecida.', 'sucesso'));
    window.addEventListener('boraobra:session-expired', async () => {
        if (encerrandoSessao) return;
        encerrandoSessao = true;
        ui.showToast('Sua sessão expirou. Entre novamente para continuar.', 'aviso');
        await auth.logoutUsuario();
        encerrandoSessao = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    registrarEventos();
    configurarViaCep(['cad', 'loja', 'config-cliente']);
    configurarMascaras();
    document.querySelectorAll('.input-group').forEach(group => {
        const label = group.querySelector('label');
        const input = group.querySelector('input, select, textarea');
        if (label && input?.id) label.htmlFor = input.id;
    });
    auth.verificarSessaoAtiva();
});
