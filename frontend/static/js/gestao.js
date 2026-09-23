import { state } from './state.js';
import { apiRequest } from './api.js';
import { badgeStatusClass, statusPedidoLabel, exibirNotificacao, escapeHtml, confirmarAcao, formatarMoeda } from './ui.js';
import { renderDashboardLojista } from './dashboard.js';
import { formatarDataHora, obterEndereco, preencherEndereco } from './utils.js';
let paginaUsuarios = 1;
let paginaProdutos = 1;
const ITENS_PAGINA = 8;
const LOGO_PADRAO = '/static/img/store-default.svg';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TIPOS = new Set(['image/png', 'image/jpeg', 'image/webp']);
let arquivoLogoLoja = null;
let removerLogoPendente = false;
let previewLogoTemporario = '';

function definirPreviewLogo(url, texto = 'Pré-visualização do logotipo') {
    const preview = document.getElementById('loja-logo-preview');
    if (preview) { preview.src = url || LOGO_PADRAO; preview.alt = texto; }
}

function limparPreviewTemporario() {
    if (previewLogoTemporario) URL.revokeObjectURL(previewLogoTemporario);
    previewLogoTemporario = '';
}

function atualizarStatusLogo(mensagem, tipo = '') {
    const status = document.getElementById('loja-logo-status');
    if (!status) return;
    status.textContent = mensagem;
    status.dataset.tipo = tipo;
}

export function prepararLogoLoja(loja = null) {
    limparPreviewTemporario();
    arquivoLogoLoja = null;
    removerLogoPendente = false;
    const input = document.getElementById('loja-logo-arquivo');
    if (input) input.value = '';
    definirPreviewLogo(loja?.logo_url || LOGO_PADRAO, loja?.nome ? `Logotipo de ${loja.nome}` : undefined);
    document.getElementById('loja-logo-remover')?.classList.toggle('hidden', !loja?.logo_url);
    atualizarStatusLogo('A imagem será otimizada automaticamente para o catálogo e o mapa.');
}

export async function selecionarLogoLoja(arquivo) {
    if (!arquivo) return;
    if (!LOGO_TIPOS.has(arquivo.type)) return atualizarStatusLogo('Escolha um arquivo PNG, JPEG ou WebP.', 'erro');
    if (arquivo.size > LOGO_MAX_BYTES) return atualizarStatusLogo('O logotipo deve ter no máximo 2 MB.', 'erro');
    const url = URL.createObjectURL(arquivo);
    try {
        const dimensoes = await new Promise((resolve, reject) => {
            const imagem = new Image();
            imagem.onload = () => resolve({ largura: imagem.naturalWidth, altura: imagem.naturalHeight });
            imagem.onerror = reject;
            imagem.src = url;
        });
        if (dimensoes.largura < 48 || dimensoes.altura < 48 || dimensoes.largura > 4096 || dimensoes.altura > 4096) {
            URL.revokeObjectURL(url);
            return atualizarStatusLogo('Use uma imagem entre 48 × 48 e 4096 × 4096 pixels.', 'erro');
        }
        limparPreviewTemporario();
        previewLogoTemporario = url;
        arquivoLogoLoja = arquivo;
        removerLogoPendente = false;
        definirPreviewLogo(url, `Novo logotipo selecionado: ${arquivo.name}`);
        document.getElementById('loja-logo-remover')?.classList.remove('hidden');
        atualizarStatusLogo(`${arquivo.name} pronto para enviar.`, 'sucesso');
    } catch (_) {
        URL.revokeObjectURL(url);
        atualizarStatusLogo('Não foi possível ler esta imagem.', 'erro');
    }
}

export function removerLogoLoja() {
    limparPreviewTemporario();
    arquivoLogoLoja = null;
    removerLogoPendente = Boolean(state.lojaDoLojista?.logo_url);
    definirPreviewLogo(LOGO_PADRAO, 'Imagem padrão da loja');
    document.getElementById('loja-logo-remover')?.classList.add('hidden');
    atualizarStatusLogo(removerLogoPendente ? 'O logotipo será removido ao salvar.' : 'A imagem padrão será utilizada.', 'aviso');
}

function aplicarRotulosTabela(tbody) {
    if (!tbody) return;
    const headers = [...tbody.closest('table')?.querySelectorAll('thead th') || []]
        .map(header => header.textContent.trim());
    tbody.querySelectorAll('tr').forEach(row => {
        [...row.children].forEach((cell, index) => {
            if (!cell.classList.contains('empty-state')) cell.dataset.label = headers[index] || '';
        });
    });
}

export async function carregarRelatorioLucro() {
    try {
        const res = await apiRequest('/api/relatorios/lucro-diario');
        if (!res.ok) throw new Error("Falha ao carregar dashboard.");
        const data = await res.json();

        document.getElementById('dash-faturamento').innerText = formatarMoeda(data.faturamento_total);
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

// 2. Lojas
export async function carregarLojas() {
    try {
        const res = await apiRequest('/api/lojas');
        if (!res.ok) throw new Error("Erro ao buscar lojas.");
        const lojas = await res.json();

        state.lojaDoLojista = lojas[0] || null;
        const tbody = document.getElementById('tbl-lojas');
        if (tbody) {
            tbody.innerHTML = lojas.map(l => `
            <tr>
                <td><div class="store-listing-identity"><img src="${escapeHtml(l.logo_url || LOGO_PADRAO)}" alt="" data-logo-fallback><strong>${escapeHtml(l.nome)}</strong></div></td>
                <td>${escapeHtml(l.responsavel_nome || 'Não informado')}</td>
                <td>${escapeHtml(l.endereco)}</td>
                <td>${escapeHtml(l.telefone || 'N/A')}</td>
                <td><span class="badge ${l.ativa ? 'status-concluido' : 'status-cancelado'}">${l.ativa ? 'Ativa' : 'Inativa'}</span></td>
            </tr>
            `).join('') || '<tr><td colspan="5" class="empty-state">Cadastre sua loja para começar.</td></tr>';
            aplicarRotulosTabela(tbody);
        }

        const options = lojas.map(l => `<option value="${l.id}">${escapeHtml(l.nome)}</option>`).join('');
        if (document.getElementById('prod-loja-select')) document.getElementById('prod-loja-select').innerHTML = options || '<option value="">Cadastre sua loja primeiro</option>';
        document.getElementById('loja-operacional-select').innerHTML = options || '<option value="">Nenhuma loja cadastrada</option>';
        if (document.getElementById('form-cad-loja')) renderizarAreaDaLoja();
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export async function cadastrarLoja(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('loja-nome').value,
        telefone: document.getElementById('loja-telefone').value,
        responsavel_nome: document.getElementById('loja-responsavel').value,
        documento: document.getElementById('loja-documento').value,
        email: document.getElementById('loja-email').value,
        ativa: document.getElementById('loja-ativa').checked,
        ...obterEndereco('loja')
    };

    try {
        const res = await apiRequest(state.lojaDoLojista ? `/api/lojas/${state.lojaDoLojista.id}` : '/api/lojas', {
            method: state.lojaDoLojista ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        let resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao cadastrar loja.");
        }

        if (arquivoLogoLoja) {
            const formularioLogo = new FormData();
            formularioLogo.append('logo', arquivoLogoLoja);
            const logoResponse = await apiRequest(`/api/lojas/${resposta.id}/logo`, { method: 'POST', body: formularioLogo });
            resposta = await logoResponse.json();
        } else if (removerLogoPendente) {
            const logoResponse = await apiRequest(`/api/lojas/${resposta.id}/logo`, { method: 'DELETE' });
            resposta = await logoResponse.json();
        }
        const possuiCoordenadas = resposta.latitude !== null && resposta.longitude !== null;
        exibirNotificacao(
            possuiCoordenadas
                ? (state.lojaDoLojista ? 'Informações e localização da loja atualizadas!' : 'Loja cadastrada e posicionada no mapa!')
                : 'Loja salva e disponível no catálogo. A distância no mapa ainda não pôde ser calculada.',
            'sucesso'
        );
        state.editandoLoja = false;
        prepararLogoLoja(resposta);
        await carregarLojas();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

export function renderizarAreaDaLoja() {
    const formulario = document.getElementById('form-cad-loja');
    const resumo = document.getElementById('loja-resumo');
    const titulo = document.getElementById('loja-form-titulo');
    const botaoSalvar = document.getElementById('loja-form-submit');

    if (!state.lojaDoLojista) {
        state.editandoLoja = false;
        titulo.innerText = 'Cadastre sua loja';
        botaoSalvar.innerText = 'Cadastrar minha loja';
        resumo.classList.add('hidden');
        formulario.classList.remove('hidden');
        formulario.reset();
        prepararLogoLoja();
        return;
    }

    document.getElementById('loja-nome').value = state.lojaDoLojista.nome || '';
    preencherEndereco('loja', state.lojaDoLojista);
    document.getElementById('loja-telefone').value = state.lojaDoLojista.telefone || '';
    document.getElementById('loja-responsavel').value = state.lojaDoLojista.responsavel_nome || '';
    document.getElementById('loja-documento').value = state.lojaDoLojista.documento || '';
    document.getElementById('loja-email').value = state.lojaDoLojista.email || '';
    prepararLogoLoja(state.lojaDoLojista);
    document.getElementById('loja-ativa').checked = state.lojaDoLojista.ativa !== false;
    document.getElementById('loja-resumo-nome').innerText = state.lojaDoLojista.nome || '-';
    document.getElementById('loja-resumo-endereco').innerText = state.lojaDoLojista.endereco || '-';
    document.getElementById('loja-resumo-telefone').innerText = state.lojaDoLojista.telefone || 'Não informado';
    const resumoLogo = document.getElementById('loja-resumo-logo');
    if (resumoLogo) { resumoLogo.src = state.lojaDoLojista.logo_url || LOGO_PADRAO; resumoLogo.alt = `Logotipo de ${state.lojaDoLojista.nome}`; }

    titulo.innerText = 'Configurações da loja';
    botaoSalvar.innerText = 'Salvar alterações';
    resumo.classList.toggle('hidden', state.editandoLoja);
    formulario.classList.toggle('hidden', !state.editandoLoja);
}

export function abrirEdicaoLoja() {
    if (!state.lojaDoLojista) return;
    state.editandoLoja = true;
    renderizarAreaDaLoja();
}
// 3. Funcionários da loja
export async function carregarUsuarios() {
    try {
        const res = await apiRequest('/api/users');
        if (!res.ok) throw new Error("Erro ao carregar usuários.");
        state.cacheUsuarios = await res.json();

        filtrarUsuarios();
    } catch (err) {
        document.getElementById('tbl-usuarios').innerHTML = '<tr><td colspan="6" class="empty-state">Não foi possível carregar os funcionários.</td></tr>';
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

function renderizarUsuarios(usuarios) {
    const tbody = document.getElementById('tbl-usuarios');
    const totalPaginas = Math.max(1, Math.ceil(usuarios.length / ITENS_PAGINA)); paginaUsuarios = Math.min(paginaUsuarios, totalPaginas);
    const pagina = usuarios.slice((paginaUsuarios - 1) * ITENS_PAGINA, paginaUsuarios * ITENS_PAGINA);
    tbody.innerHTML = pagina.map(u => `
            <tr>
                <td>${escapeHtml(u.nome)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.telefone || 'Não informado')}</td>
                <td><span class="badge status-confirmado">Funcionário</span></td>
                <td><span class="badge ${u.ativo !== false ? 'status-concluido' : 'status-cancelado'}">${u.ativo !== false ? 'Ativo' : 'Inativo'}</span></td>
                <td class="table-actions"><button class="btn-secondary" type="button" data-action="usuario-editar" data-id="${u.id}" aria-label="Editar ${escapeHtml(u.nome)}"><i class="fa-solid fa-pen"></i></button><button class="btn-secondary" type="button" data-action="usuario-toggle" data-id="${u.id}">${u.ativo !== false ? 'Desativar' : 'Ativar'}</button><button class="btn-remove-item" type="button" data-action="usuario-excluir" data-id="${u.id}" aria-label="Excluir ${escapeHtml(u.nome)}"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="empty-state">Nenhum funcionário encontrado.</td></tr>';
    aplicarRotulosTabela(tbody);
    document.getElementById('paginacao-usuarios').innerHTML = `<button type="button" data-action="gestao-pagina" data-list="usuarios" data-delta="-1" ${paginaUsuarios === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${paginaUsuarios} de ${totalPaginas}</span><button type="button" data-action="gestao-pagina" data-list="usuarios" data-delta="1" ${paginaUsuarios === totalPaginas ? 'disabled' : ''}>Próxima</button>`;
}
export function filtrarUsuarios() {
    const termo = document.getElementById('filtro-usuarios-busca').value.trim().toLowerCase();
    const status = document.getElementById('filtro-usuarios-status').value;
    const usuarios = state.cacheUsuarios.filter(u => (!termo || `${u.nome} ${u.email} ${u.telefone || ''}`.toLowerCase().includes(termo)) && (!status || (status === 'ativo') === (u.ativo !== false)));
    usuarios.sort(document.getElementById('ordenar-usuarios').value === 'recentes' ? (a, b) => b.id - a.id : (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); renderizarUsuarios(usuarios);
}

export async function cadastrarUsuarioPainel(e) {
    e.preventDefault();
    const senha = document.getElementById('user-senha').value;
    if (senha !== document.getElementById('user-confirmar-senha').value) return exibirNotificacao('As senhas não coincidem.', 'erro');
    const id = Number(document.getElementById('user-edit-id').value || 0);
    const dados = {
        nome: document.getElementById('user-nome').value,
        email: document.getElementById('user-email').value,
        senha,
        telefone: document.getElementById('user-telefone').value,
        ativo: document.getElementById('user-ativo').checked,
        tipo: document.getElementById('user-tipo').value
    };

    try {
        const res = await apiRequest(id ? `/api/users/${id}` : '/api/users', {
            method: id ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao cadastrar usuário.");
        }

        exibirNotificacao("Usuário cadastrado com sucesso!");
        document.getElementById('form-cad-user').reset();
        document.getElementById('user-edit-id').value = '';
        document.getElementById('user-senha').required = true;
        document.getElementById('user-confirmar-senha').required = true;
        carregarUsuarios();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

// 4. Produtos
export async function carregarProdutos() {
    try {
        const res = await apiRequest('/api/produtos');
        if (!res.ok) throw new Error("Erro ao carregar produtos.");
        state.cacheProdutos = await res.json();
        if (document.getElementById('dash-produtos')) document.getElementById('dash-produtos').textContent = state.cacheProdutos.length;
        if (document.getElementById('dash-disponiveis')) document.getElementById('dash-disponiveis').textContent = state.cacheProdutos.filter(p => p.disponivel && !p.status_manutencao).length;

        filtrarProdutos();
    } catch (err) {
        document.getElementById('tbl-produtos').innerHTML = '<tr><td colspan="5" class="empty-state">Não foi possível carregar os produtos.</td></tr>';
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}
function renderizarProdutos(produtos) {
    const tbody = document.getElementById('tbl-produtos');
    const totalPaginas = Math.max(1, Math.ceil(produtos.length / ITENS_PAGINA)); paginaProdutos = Math.min(paginaProdutos, totalPaginas);
    const pagina = produtos.slice((paginaProdutos - 1) * ITENS_PAGINA, paginaProdutos * ITENS_PAGINA);
    if (tbody) {
        tbody.innerHTML = pagina.length ? pagina.map(p => `
                <tr class="listing-row">
                    <td><div class="listing-product"><span class="listing-thumb">${p.imagem_url ? `<img src="${escapeHtml(p.imagem_url)}" alt="">` : '<i class="fa-solid fa-screwdriver-wrench"></i>'}</span><div><strong>${escapeHtml(p.nome)}</strong><small>${escapeHtml(p.sku || 'Sem SKU')} · ${escapeHtml(p.categoria || 'Sem categoria')}</small></div></div></td>
                    <td>${escapeHtml(p.utilidade || 'Uso geral')}<small class="product-flags">Estoque: ${Number(p.estoque)} ${escapeHtml(p.unidade || 'un')} ${p.status_manutencao ? '<span class="maintenance-flag">Em manutenção</span>' : ''}${p.classificacao_curva_a ? '<span class="curve-a-flag">Curva A</span>' : ''}</small></td>
                    <td><strong>${formatarMoeda(p.preco_venda)}</strong><small class="product-flags">Locação ${formatarMoeda(p.preco_locacao)}/dia</small></td>
                    <td>
                        <button class="toggle-switch ${p.disponivel ? 'is-on' : ''}" type="button" role="switch" aria-checked="${p.disponivel}" data-action="produto-toggle" data-id="${p.id}" aria-label="Alterar disponibilidade de ${escapeHtml(p.nome)}">
                            <span></span><b>${p.disponivel ? 'Ativo' : 'Inativo'}</b>
                        </button>
                    </td>
                    <td class="table-actions">
                        <button class="btn-secondary" type="button" data-action="produto-editar" data-id="${p.id}" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-secondary" type="button" data-action="produto-duplicar" data-id="${p.id}" title="Duplicar"><i class="fa-solid fa-copy"></i></button>
                        <button class="btn-remove-item" type="button" data-action="produto-excluir" data-id="${p.id}" title="Excluir">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
        `).join('') : '<tr><td colspan="5" class="empty-state">Nenhum anúncio encontrado.</td></tr>';
        aplicarRotulosTabela(tbody);
    }
    document.getElementById('paginacao-produtos').innerHTML = `<button type="button" data-action="gestao-pagina" data-list="produtos" data-delta="-1" ${paginaProdutos === 1 ? 'disabled' : ''}>Anterior</button><span>Página ${paginaProdutos} de ${totalPaginas}</span><button type="button" data-action="gestao-pagina" data-list="produtos" data-delta="1" ${paginaProdutos === totalPaginas ? 'disabled' : ''}>Próxima</button>`;
}
export function filtrarProdutos() {
    const termo = document.getElementById('filtro-produtos-busca').value.trim().toLowerCase(), status = document.getElementById('filtro-produtos-status').value;
    const produtos = state.cacheProdutos.filter(p => (!termo || `${p.nome} ${p.sku || ''} ${p.categoria || ''}`.toLowerCase().includes(termo)) && (!status || (status === 'ativo') === Boolean(p.disponivel))); const ordem = document.getElementById('ordenar-produtos-gestao').value; produtos.sort(ordem === 'recentes' ? (a, b) => b.id - a.id : ordem === 'estoque' ? (a, b) => a.estoque - b.estoque : (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); renderizarProdutos(produtos);
}
export function mudarPagina(lista, delta) { if (lista === 'usuarios') { paginaUsuarios = Math.max(1, paginaUsuarios + delta); filtrarUsuarios(); } else { paginaProdutos = Math.max(1, paginaProdutos + delta); filtrarProdutos(); } }

export async function cadastrarProduto(e) {
    e.preventDefault();
    const dados = {
        loja_id: parseInt(document.getElementById('prod-loja-select').value),
        nome: document.getElementById('prod-nome').value,
        categoria: document.getElementById('prod-categoria').value,
        utilidade: document.getElementById('prod-utilidade').value,
        cor_tamanho: document.getElementById('prod-cor-tamanho').value,
        descricao: document.getElementById('prod-descricao').value,
        sku: document.getElementById('prod-sku').value,
        imagem_url: document.getElementById('prod-imagem-url').value,
        estoque: Number(document.getElementById('prod-estoque').value),
        unidade: document.getElementById('prod-unidade').value,
        preco_venda: parseFloat(document.getElementById('prod-preco-venda').value),
        preco_locacao: parseFloat(document.getElementById('prod-preco-locacao').value),
        disponivel_venda: document.getElementById('prod-disponivel_venda').checked,
        disponivel_locacao: document.getElementById('prod-disponivel_locacao').checked,
        status_manutencao: document.getElementById('prod-status_manutencao').checked,
        classificacao_curva_a: document.getElementById('prod-classificacao_curva_a').checked
    };

    try {
        const res = await apiRequest('/api/produtos', {
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
        atualizarPreviewImagemProduto();
        carregarProdutos();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

export async function alternarDisponibilidade(id) {
    try {
        await apiRequest(`/api/produtos/${id}/toggle-disponibilidade`, { method: 'PATCH' });
        exibirNotificacao('Disponibilidade atualizada.');
        carregarProdutos();
    } catch (err) {
        exibirNotificacao("Não foi possível alterar a disponibilidade.", true);
    }
}

// Edição de produto (modal)
export function abrirEdicaoProduto(id) {
    const produto = state.cacheProdutos.find(p => p.id === id);
    if (!produto) return;

    document.getElementById('edit-prod-id').value = produto.id;
    document.getElementById('edit-prod-disponivel_venda').checked = produto.disponivel_venda;
    document.getElementById('edit-prod-disponivel_locacao').checked = produto.disponivel_locacao;
    document.getElementById('edit-prod-status_manutencao').checked = produto.status_manutencao;
    document.getElementById('edit-prod-classificacao_curva_a').checked = produto.classificacao_curva_a;
    document.getElementById('edit-prod-nome').value = produto.nome || '';
    document.getElementById('edit-prod-sku').value = produto.sku || '';
    document.getElementById('edit-prod-imagem-url').value = produto.imagem_url || '';
    document.getElementById('edit-prod-estoque').value = produto.estoque || 0;
    document.getElementById('edit-prod-unidade').value = produto.unidade || 'un';
    document.getElementById('edit-prod-categoria').value = produto.categoria || '';
    document.getElementById('edit-prod-utilidade').value = produto.utilidade || '';
    document.getElementById('edit-prod-cor-tamanho').value = produto.cor_tamanho || '';
    document.getElementById('edit-prod-descricao').value = produto.descricao || '';
    document.getElementById('edit-prod-preco-venda').value = produto.preco_venda;
    document.getElementById('edit-prod-preco-locacao').value = produto.preco_locacao;

    document.getElementById('produto-edit-modal').classList.remove('hidden');
}

export function fecharEdicaoProduto() {
    document.getElementById('produto-edit-modal').classList.add('hidden');
}

export async function salvarEdicaoProduto(e) {
    e.preventDefault();
    const id = document.getElementById('edit-prod-id').value;

    const dados = {
        nome: document.getElementById('edit-prod-nome').value,
        categoria: document.getElementById('edit-prod-categoria').value,
        utilidade: document.getElementById('edit-prod-utilidade').value,
        cor_tamanho: document.getElementById('edit-prod-cor-tamanho').value,
        descricao: document.getElementById('edit-prod-descricao').value,
        sku: document.getElementById('edit-prod-sku').value,
        imagem_url: document.getElementById('edit-prod-imagem-url').value,
        estoque: Number(document.getElementById('edit-prod-estoque').value),
        unidade: document.getElementById('edit-prod-unidade').value,
        preco_venda: parseFloat(document.getElementById('edit-prod-preco-venda').value),
        preco_locacao: parseFloat(document.getElementById('edit-prod-preco-locacao').value),
        disponivel_venda: document.getElementById('edit-prod-disponivel_venda').checked,
        disponivel_locacao: document.getElementById('edit-prod-disponivel_locacao').checked,
        status_manutencao: document.getElementById('edit-prod-status_manutencao').checked,
        classificacao_curva_a: document.getElementById('edit-prod-classificacao_curva_a').checked
    };

    try {
        const res = await apiRequest(`/api/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao editar produto.");
        }

        exibirNotificacao("Produto atualizado com sucesso!");
        fecharEdicaoProduto();
        carregarProdutos();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

export async function confirmarExclusaoProduto(id) {
    const produto = state.cacheProdutos.find(p => p.id === id);
    const nome = produto ? produto.nome : 'este produto';

    if (!await confirmarAcao(`Tem certeza que deseja excluir "${nome}"? Essa ação não pode ser desfeita.`, 'Excluir produto?')) {
        return;
    }

    try {
        const res = await apiRequest(`/api/produtos/${id}`, { method: 'DELETE' });
        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao excluir produto.");
        }

        exibirNotificacao("Produto excluído com sucesso!");
        carregarProdutos();
    } catch (err) {
        exibirNotificacao(err.message, true);
    }
}

// 5. Pedidos — somente leitura para o lojista
let carregandoPedidos = false;
let atualizarPedidosNovamente = false;
export async function carregarPedidos(silencioso = false) {
    if (carregandoPedidos) {
        if (!silencioso) atualizarPedidosNovamente = true;
        return;
    }
    carregandoPedidos = true;
    try {
        const res = await apiRequest('/api/pedidos');
        if (!res.ok) throw new Error("Erro ao carregar pedidos.");
        state.cachePedidosLojista = await res.json();
        const ativos = state.cachePedidosLojista.filter(p => p.tipo === 'Locacao' && !['Entregue', 'Cancelado'].includes(p.status)).length;
        const pendentes = state.cachePedidosLojista.filter(p => p.status === 'Pendente').length;
        if (document.getElementById('dash-alugueis')) document.getElementById('dash-alugueis').textContent = ativos;
        if (document.getElementById('dash-pendentes')) document.getElementById('dash-pendentes').textContent = pendentes;
        if (document.getElementById('dashboard-alertas')) document.getElementById('dashboard-alertas').innerHTML = pendentes
            ? `<div class="attention-summary"><i class="fa-solid fa-bell"></i><div><strong>${pendentes} ${pendentes === 1 ? 'pedido aguarda' : 'pedidos aguardam'} aprovação</strong><small>Abra a fila para iniciar o atendimento.</small></div><button type="button" class="btn-secondary" data-action="gestao-tab" data-tab="tab-vendas">Ver fila</button></div>`
            : '<i class="fa-solid fa-check"></i>Nenhum alerta no momento.';
        renderizarPedidosLojista(state.cachePedidosLojista);
        renderizarPedidosDashboard(state.cachePedidosLojista);
        if (document.getElementById('dashboard-charts-lojista')) renderDashboardLojista();
    } catch (err) {
        if (!silencioso) exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    } finally {
        carregandoPedidos = false;
        if (atualizarPedidosNovamente) {
            atualizarPedidosNovamente = false;
            carregarPedidos(true);
        }
    }
}

export function atualizarPreviewImagemProduto() {
    const input = document.getElementById('prod-imagem-url');
    if (!input) return;
    let preview = document.getElementById('prod-imagem-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'prod-imagem-preview';
        preview.className = 'product-image-preview';
        preview.setAttribute('aria-live', 'polite');
        input.insertAdjacentElement('afterend', preview);
    }
    const url = input.value.trim();
    preview.innerHTML = url
        ? `<img src="${escapeHtml(url)}" alt="Pré-visualização do produto">`
        : '<i class="fa-solid fa-image"></i><span>A prévia da imagem aparecerá aqui</span>';
}
export function duplicarProduto(id) { const p = state.cacheProdutos.find(item => item.id === id); if (!p) return; document.getElementById('prod-nome').value = `${p.nome} (cópia)`; document.getElementById('prod-categoria').value = p.categoria || ''; document.getElementById('prod-utilidade').value = p.utilidade || ''; document.getElementById('prod-cor-tamanho').value = p.cor_tamanho || ''; document.getElementById('prod-descricao').value = p.descricao || ''; document.getElementById('prod-sku').value = p.sku ? `${p.sku}-COPIA` : ''; document.getElementById('prod-imagem-url').value = p.imagem_url || ''; document.getElementById('prod-estoque').value = p.estoque || 0; document.getElementById('prod-unidade').value = p.unidade || 'un'; document.getElementById('prod-preco-venda').value = p.preco_venda; document.getElementById('prod-preco-locacao').value = p.preco_locacao; document.getElementById('prod-nome').focus(); exibirNotificacao('Dados copiados. Revise e salve o novo produto.', 'aviso'); }
export function alternarVisibilidadeSenhas(botao) { const mostrar = document.getElementById('user-senha').type === 'password';['user-senha', 'user-confirmar-senha'].forEach(id => document.getElementById(id).type = mostrar ? 'text' : 'password'); botao.innerHTML = `<i class="fa-regular fa-eye${mostrar ? '-slash' : ''}"></i> ${mostrar ? 'Ocultar' : 'Mostrar'} senhas`; }
export function editarUsuario(id) { const u = state.cacheUsuarios.find(item => item.id === id); if (!u) return; document.getElementById('user-edit-id').value = u.id; document.getElementById('user-nome').value = u.nome; document.getElementById('user-email').value = u.email; document.getElementById('user-telefone').value = u.telefone || ''; document.getElementById('user-ativo').checked = u.ativo !== false; document.getElementById('user-senha').required = false; document.getElementById('user-confirmar-senha').required = false; document.getElementById('user-nome').focus(); }
export async function alternarUsuario(id) { const u = state.cacheUsuarios.find(item => item.id === id); if (!u) return; await apiRequest(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo: u.ativo === false }) }); exibirNotificacao('Status atualizado.'); carregarUsuarios(); }
export async function excluirUsuario(id) { const u = state.cacheUsuarios.find(item => item.id === id); if (!u || !await confirmarAcao(`Excluir ${u.nome}?`, 'Excluir funcionário?')) return; await apiRequest(`/api/users/${id}`, { method: 'DELETE' }); exibirNotificacao('Funcionário excluído.'); carregarUsuarios(); }

// Mostra os pedidos mais recentes no card "Últimos pedidos" do dashboard
export function renderizarPedidosDashboard(pedidos) {
    const tbody = document.getElementById('tbl-pedidos-dash');
    if (!tbody) return;

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Os pedidos recentes aparecerão aqui.</td></tr>';
        return;
    }

    const recentes = [...pedidos].sort((a, b) => b.id - a.id).slice(0, 5);

    tbody.innerHTML = recentes.map(p => `
        <tr>
            <td>${escapeHtml(p.cliente_nome || 'Cliente')}</td>
            <td>${p.tipo}</td>
            <td>${formatarMoeda(p.valor_total)}</td>
            <td>${escapeHtml(formatarDataHora(p.created_at))}</td>
            <td><span class="badge ${escapeHtml(badgeStatusClass(p.status))}">${escapeHtml(statusPedidoLabel(p.status, p.tipo))}</span></td>
            <td>
                ${p.status !== 'Pendente' ? `<button class="btn-ticket" type="button" data-action="pedido-ticket" data-id="${p.id}"><i class="fa-solid fa-print"></i> Imprimir Ticket</button>` : '<small class="awaiting-approval">Aguardando aprovação</small>'}
            </td>
        </tr>
    `).join('');
    aplicarRotulosTabela(tbody);
}

export function renderizarPedidosLojista(pedidos) {
    const tbody = document.getElementById('tbl-pedidos');
    if (!tbody) return;

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = pedidos.map(p => {
        const cliente = state.cacheUsuarios.find(u => u.id === p.user_id);
        return `
            <tr>
                <td>${escapeHtml(p.cliente_nome || (cliente ? cliente.nome : 'Cliente'))}</td>
                <td>${p.tipo}</td>
                <td>${formatarMoeda(p.valor_total)}</td>
                <td>${escapeHtml(p.endereco_entrega || 'Retirada na loja')}</td>
                <td><span class="badge ${escapeHtml(badgeStatusClass(p.status))}">${escapeHtml(statusPedidoLabel(p.status, p.tipo))}</span></td>
                <td>
                    ${acoesPedido(p)}
                    ${p.status !== 'Pendente' ? `<button class="btn-ticket" type="button" data-action="pedido-ticket" data-id="${p.id}"><i class="fa-solid fa-print"></i> Imprimir Ticket</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    aplicarRotulosTabela(tbody);
}

// Filtra a tabela de pedidos do lojista por nome do cliente e/ou status, sem nova requisição
export function filtrarPedidosLojista() {
    const termo = document.getElementById('filtro-pedido-cliente').value.toLowerCase();
    const statusFiltro = document.getElementById('filtro-pedido-status').value;
    const tipoFiltro = document.getElementById('filtro-pedido-tipo').value;
    const dataFiltro = document.getElementById('filtro-pedido-data').value;

    const filtrados = state.cachePedidosLojista.filter(p => {
        const cliente = state.cacheUsuarios.find(u => u.id === p.user_id);
        const nomeCliente = (p.cliente_nome || cliente?.nome || '').toLowerCase();
        const bateNome = !termo || nomeCliente.includes(termo);
        const bateStatus = !statusFiltro || p.status === statusFiltro;
        const bateTipo = !tipoFiltro || p.tipo === tipoFiltro;
        const bateData = !dataFiltro || String(p.created_at || '').startsWith(dataFiltro);
        return bateNome && bateStatus && bateTipo && bateData;
    });

    renderizarPedidosLojista(filtrados);
}

export function acoesPedido(pedido) {
    const transicoes = { Pendente: ['Confirmado', 'Cancelado'], Confirmado: ['Despachado', 'Cancelado'], Despachado: ['Entregue'] };
    const rotulos = { Confirmado: 'Aprovar pedido', Cancelado: 'Cancelar', Despachado: 'Em andamento', Entregue: pedido.tipo === 'Locacao' ? 'Registrar devolução' : 'Concluir entrega' };
    return (transicoes[pedido.status] || []).map(status => `<button class="btn-secondary" type="button" data-action="pedido-status" data-id="${pedido.id}" data-status="${status}">${rotulos[status]}</button>`).join(' ');
}
export async function atualizarStatusPedido(id, status) {
    if (status === 'Cancelado' && !await confirmarAcao('Cancelar este pedido?', 'Cancelar pedido?')) return;
    try {
        await apiRequest(`/api/pedidos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        exibirNotificacao('Status do pedido atualizado.');
        await carregarPedidos();
        await carregarRelatorioLucro();
    } catch (err) { exibirNotificacao(err.message, true); }
}
