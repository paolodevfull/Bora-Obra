import { state } from './state.js';
import { apiRequest } from './api.js';
import { exibirNotificacao } from './ui.js';
import { carregarRelatorioLucro, carregarLojas, carregarUsuarios, carregarProdutos, carregarPedidos, renderizarPedidosDashboard } from './gestao.js';
import { carregarLojasCliente, carregarDetalheProdutoPage, renderizarCarrinho } from './catalogo.js';
import { carregarMeusPedidos } from './pedidos.js';
import { obterEndereco, preencherEndereco } from './utils.js';
import * as dashboard from './dashboard.js';
import * as relatorios from './relatorios.js';
import { clearFieldErrors, fieldError, validateRequired } from './validation.js';

function atualizarTituloDaLoja(nomeLoja) {
    const nome = String(nomeLoja || '').trim();
    document.title = nome ? `Bora Obra - ${nome}` : 'Bora Obra';
}

export async function verificarSessaoAtiva() {
    try {
        const res = await apiRequest('/api/auth/me', {}, [401, 403]);
        if (res.ok) {
            const usuario = await res.json();
            iniciarPainelPorTipo(usuario);
        } else if (document.body.dataset.area !== 'auth') {
            window.location.replace('/');
        }
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export function mostrarErroAuth(msg) {
    const el = document.getElementById('auth-erro');
    el.innerText = msg;
    el.classList.remove('hidden');
}

export function esconderErroAuth() {
    document.getElementById('auth-erro')?.classList.add('hidden');
}

export async function realizarLogin(e) {
    e.preventDefault();
    esconderErroAuth();
    clearFieldErrors(e.currentTarget);

    const email = document.getElementById('login-email');
    const senha = document.getElementById('login-senha');
    let valido = validateRequired(email, 'Informe seu e-mail.');
    if (email.value && !email.validity.valid) valido = fieldError('login-email', 'Digite um e-mail válido.');
    if (!validateRequired(senha, 'Informe sua senha.')) valido = false;
    if (!valido) return;

    const dados = {
        email: email.value.trim(),
        senha: senha.value
    };

    try {
        const res = await apiRequest('/api/auth/login', {
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

export async function realizarCadastro(e) {
    e.preventDefault();
    esconderErroAuth();
    clearFieldErrors(e.currentTarget);

    const nome = document.getElementById('cad-nome');
    const email = document.getElementById('cad-email');
    const senha = document.getElementById('cad-senha');
    const confirmar = document.getElementById('cad-confirmar-senha');
    let valido = validateRequired(nome, 'Informe seu nome completo.');
    if (!validateRequired(email, 'Informe seu e-mail.')) valido = false;
    else if (!email.validity.valid) valido = fieldError('cad-email', 'Digite um e-mail válido.');
    if (senha.value.length < 6) valido = fieldError('cad-senha', 'A senha precisa ter pelo menos 6 caracteres.');
    if (confirmar.value !== senha.value) valido = fieldError('cad-confirmar-senha', 'As senhas não coincidem.');
    if (!document.getElementById('cad-termos').checked) {
        mostrarErroAuth('Aceite os termos de uso e a política de privacidade para continuar.');
        valido = false;
    }
    if (!valido) return;

    const dados = {
        nome: nome.value.trim(),
        email: email.value.trim(),
        telefone: document.getElementById('cad-telefone').value,
        senha: senha.value,
        tipo: document.getElementById('cad-tipo').value,
    };

    try {
        const res = await apiRequest('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const resposta = await res.json();

        if (!res.ok) throw new Error(resposta.erro || "Falha ao criar conta.");

        const loginRes = await apiRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: dados.email, senha: dados.senha })
        });
        const loginResposta = await loginRes.json();

        if (!loginRes.ok) throw new Error("Conta criada. Faça login para continuar.");

        iniciarPainelPorTipo(loginResposta);
    } catch (err) {
        mostrarErroAuth(err.message.toLowerCase().includes('cadastr')
            ? 'Não foi possível criar a conta com esses dados. Revise as informações ou use outro e-mail.'
            : err.message);
    }
}

export async function logoutUsuario() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }

    state.usuarioAtual = null;
    state.perfilOperacional = null;
    state.carrinhoCliente = [];
    state.lojaAtualCliente = null;

    window.location.replace('/');
}

export async function iniciarPainelPorTipo(usuario) {
    state.usuarioAtual = usuario;
    const area = document.body.dataset.area;
    const pagina = document.body.dataset.page;
    const areaUsuario = usuario.tipo === 'cliente' ? 'cliente' : ['lojista', 'funcionario'].includes(usuario.tipo) ? 'lojista' : 'auth';
    if (area === 'auth') return window.location.replace(areaUsuario === 'cliente' ? '/cliente/index.html' : '/lojista/painel.html');
    if (area !== areaUsuario) return window.location.replace(areaUsuario === 'cliente' ? '/cliente/index.html' : '/lojista/painel.html');
    if (area === 'lojista') {
        state.perfilOperacional = usuario.tipo;
        if (usuario.tipo === 'funcionario' && ['lojas', 'usuarios'].includes(pagina)) {
            return window.location.replace('/lojista/painel.html');
        }
        document.querySelectorAll('[data-user-display-name]').forEach(elemento => {
            elemento.textContent = usuario.nome;
        });
        document.querySelectorAll('[data-owner-only]').forEach(elemento => {
            elemento.hidden = usuario.tipo !== 'lojista';
        });
        const seletorLoja = document.getElementById('loja-operacional-select');
        if (seletorLoja) {
            try {
                const lojas = await apiRequest('/api/lojas').then(resposta => resposta.json());
                seletorLoja.replaceChildren(...lojas.map(loja => new Option(loja.nome, loja.id)));
                if (!lojas.length) seletorLoja.append(new Option('Nenhuma loja cadastrada', ''));
                seletorLoja.closest('.store-switcher')?.classList.toggle('hidden', lojas.length <= 1);
                atualizarTituloDaLoja(lojas[0]?.nome);
                seletorLoja.addEventListener('change', () => {
                    atualizarTituloDaLoja(seletorLoja.selectedOptions[0]?.textContent);
                });
            } catch {
                seletorLoja.replaceChildren(new Option('Loja indisponível', ''));
                atualizarTituloDaLoja();
            }
        }
        if (pagina === 'dashboard') {
            const [produtos, pedidos] = await Promise.all([apiRequest('/api/produtos').then(r => r.json()), apiRequest('/api/pedidos').then(r => r.json())]);
            state.cacheProdutos = produtos; state.cachePedidosLojista = pedidos;
            renderizarPedidosDashboard(pedidos);
            dashboard.renderDashboardLojista();
        } else if (pagina === 'lojas') await carregarLojas();
        else if (pagina === 'usuarios') await carregarUsuarios();
        else if (pagina === 'produtos') { await carregarLojas(); await carregarProdutos(); }
        else if (pagina === 'pedidos') await carregarPedidos();
        else if (pagina === 'relatorios') await relatorios.carregarRelatorioFiltrado();
    } else {
        document.getElementById('cliente-nome-display').textContent = usuario.nome;
        document.getElementById('cliente-dashboard-nome')?.replaceChildren(usuario.nome.split(' ')[0]);
        const endereco = document.getElementById('carrinho-endereco'); if (endereco) endereco.value = usuario.endereco || '';
        renderizarCarrinho();
        if (pagina === 'catalogo') await carregarLojasCliente();
        else if (pagina === 'detalhe-produto') await carregarDetalheProdutoPage(new URLSearchParams(location.search).get('produto'));
        else if (pagina === 'perfil-cliente') {
            document.getElementById('config-cliente-nome').value = usuario.nome || '';
            document.getElementById('config-cliente-email').value = usuario.email || '';
            preencherEndereco('config-cliente', usuario);
        } else {
            await carregarMeusPedidos();
        }
    }
}

export function alternarMenuPerfilCliente() {
    const menu = document.getElementById('cliente-perfil-menu');
    const trigger = document.querySelector('.cliente-perfil-trigger');
    const aberto = menu?.classList.toggle('hidden') === false;
    trigger?.setAttribute('aria-expanded', String(aberto));
}
export async function salvarConfiguracoesCliente(e) {
    e.preventDefault();
    const dados = { nome: document.getElementById('config-cliente-nome').value, email: document.getElementById('config-cliente-email').value, senha: document.getElementById('config-cliente-senha').value, ...obterEndereco('config-cliente') };
    try { const res = await apiRequest('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) }); const usuario = await res.json(); if (!res.ok) throw new Error(usuario.erro || 'Não foi possível salvar.'); state.usuarioAtual = usuario; document.getElementById('cliente-nome-display').innerText = usuario.nome; const endereco = document.getElementById('carrinho-endereco'); if (endereco) endereco.value = usuario.endereco || ''; exibirNotificacao('Configurações atualizadas!'); } catch (err) { exibirNotificacao(err.message, true); }
}
// ============ PAINEL LOJISTA ============

// 1. Dashboard
