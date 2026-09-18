import { state } from './state.js';
import { apiRequest } from './api.js';
import { exibirNotificacao } from './ui.js';
import { carregarRelatorioLucro, carregarLojas, carregarUsuarios, carregarProdutos, carregarPedidos } from './gestao.js';
import { carregarLojasCliente } from './catalogo.js';
import { carregarMeusPedidos } from './pedidos.js';

export async function verificarSessaoAtiva() {
    try {
        const res = await apiRequest('/api/auth/me', {}, [401]);
        if (res.ok) {
            const usuario = await res.json();
            iniciarPainelPorTipo(usuario);
        }
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export function mostrarCadastro(e) {
    e.preventDefault();
    document.getElementById('form-login-wrapper').classList.add('hidden');
    document.getElementById('form-cadastro-wrapper').classList.remove('hidden');
    esconderErroAuth();
}

export function mostrarLogin(e) {
    e.preventDefault();
    document.getElementById('form-cadastro-wrapper').classList.add('hidden');
    document.getElementById('form-login-wrapper').classList.remove('hidden');
    esconderErroAuth();
}

export function mostrarErroAuth(msg) {
    const el = document.getElementById('auth-erro');
    el.innerText = msg;
    el.classList.remove('hidden');
}

export function esconderErroAuth() {
    document.getElementById('auth-erro').classList.add('hidden');
}

export async function realizarLogin(e) {
    e.preventDefault();
    esconderErroAuth();

    const dados = {
        email: document.getElementById('login-email').value,
        senha: document.getElementById('login-senha').value
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

    const dados = {
        nome: document.getElementById('cad-nome').value,
        email: document.getElementById('cad-email').value,
        senha: document.getElementById('cad-senha').value,
        tipo: document.getElementById('cad-tipo').value
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
        mostrarErroAuth(err.message);
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

    document.getElementById('painel-lojista').classList.add('hidden');
    document.getElementById('painel-cliente').classList.add('hidden');
    document.getElementById('painel-entregador').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');

    document.getElementById('form-login').reset();
    mostrarLogin({ preventDefault: () => {} });
}

export function iniciarPainelPorTipo(usuario) {
    state.usuarioAtual = usuario;
    document.getElementById('auth-screen').classList.add('hidden');

    document.getElementById('painel-lojista').classList.add('hidden');
    document.getElementById('painel-cliente').classList.add('hidden');
    document.getElementById('painel-entregador').classList.add('hidden');

    if (usuario.tipo === 'lojista' || usuario.tipo === 'funcionario') {
        state.perfilOperacional = usuario.tipo;
        const ehFuncionario = usuario.tipo === 'funcionario';
        if (ehFuncionario) {
            document.getElementById('prod-loja-select').innerHTML = '<option value="0">Loja do seu responsável</option>';
            document.getElementById('loja-operacional-select').innerHTML = '<option value="0">Loja vinculada</option>';
        }
        document.getElementById('painel-lojista').classList.remove('hidden');
        document.getElementById('user-display-name').innerText = usuario.nome;
        document.getElementById('menu-lojas').classList.toggle('hidden', ehFuncionario);
        document.getElementById('menu-usuarios').classList.toggle('hidden', ehFuncionario);
        carregarRelatorioLucro();
        if (!ehFuncionario) {
            carregarLojas();
            carregarUsuarios();
        }
        carregarProdutos();
        carregarPedidos();
    } else if (usuario.tipo === 'cliente') {
        document.getElementById('painel-cliente').classList.remove('hidden');
        document.getElementById('cliente-nome-display').innerText = usuario.nome;
        document.getElementById('cliente-dashboard-nome').innerText = usuario.nome.split(' ')[0];
        document.getElementById('carrinho-endereco').value = usuario.endereco || '';
        carregarLojasCliente();
        carregarMeusPedidos();
    } else {
        document.getElementById('painel-entregador').classList.remove('hidden');
    }
}

export function alternarMenuPerfilCliente() { document.getElementById('cliente-perfil-menu').classList.toggle('hidden'); }
export function abrirConfiguracoesCliente() {
    document.getElementById('cliente-perfil-menu').classList.add('hidden');
    document.getElementById('config-cliente-nome').value = state.usuarioAtual.nome || '';
    document.getElementById('config-cliente-email').value = state.usuarioAtual.email || '';
    document.getElementById('config-cliente-endereco').value = state.usuarioAtual.endereco || '';
    document.getElementById('config-cliente-senha').value = '';
    document.getElementById('cliente-config-modal').classList.remove('hidden');
}
export function fecharConfiguracoesCliente() { document.getElementById('cliente-config-modal').classList.add('hidden'); }
export async function salvarConfiguracoesCliente(e) {
    e.preventDefault();
    const dados = { nome: document.getElementById('config-cliente-nome').value, email: document.getElementById('config-cliente-email').value, endereco: document.getElementById('config-cliente-endereco').value, senha: document.getElementById('config-cliente-senha').value };
    try { const res = await apiRequest('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) }); const usuario = await res.json(); if (!res.ok) throw new Error(usuario.erro || 'Não foi possível salvar.'); state.usuarioAtual = usuario; document.getElementById('cliente-nome-display').innerText = usuario.nome; document.getElementById('carrinho-endereco').value = usuario.endereco || ''; fecharConfiguracoesCliente(); exibirNotificacao('Configurações atualizadas!'); } catch (err) { exibirNotificacao(err.message, true); }
}
// ============ PAINEL LOJISTA ============

// 1. Dashboard
