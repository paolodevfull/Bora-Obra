import { state } from './state.js';
import { apiRequest } from './api.js';
import { badgeStatusClass, statusPedidoLabel, exibirNotificacao, escapeHtml, trocarAba, confirmarAcao } from './ui.js';
import { renderDashboardLojista } from './dashboard.js';
import { formatarDataHora } from './utils.js';

export async function carregarRelatorioLucro() {
    try {
        const res = await apiRequest('/api/relatorios/lucro-diario');
        if (!res.ok) throw new Error("Falha ao carregar dashboard.");
        const data = await res.json();

        document.getElementById('dash-faturamento').innerText = `R$ ${data.faturamento_total.toFixed(2)}`;
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
        tbody.innerHTML = lojas.map(l => `
            <tr>
                <td>#${l.id}</td>
                <td>${escapeHtml(l.nome)}</td>
                <td>${escapeHtml(l.endereco)}</td>
                <td>${escapeHtml(l.telefone || 'N/A')}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="empty-state">Cadastre sua loja para começar.</td></tr>';

        const options = lojas.map(l => `<option value="${l.id}">${escapeHtml(l.nome)}</option>`).join('');
        document.getElementById('prod-loja-select').innerHTML = options || '<option value="">Cadastre sua loja primeiro</option>';
        document.getElementById('loja-operacional-select').innerHTML = options || '<option value="">Nenhuma loja cadastrada</option>';
        renderizarAreaDaLoja();
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export async function cadastrarLoja(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('loja-nome').value,
        endereco: document.getElementById('loja-endereco').value,
        telefone: document.getElementById('loja-telefone').value
    };

    try {
        const res = await apiRequest(state.lojaDoLojista ? `/api/lojas/${state.lojaDoLojista.id}` : '/api/lojas', {
            method: state.lojaDoLojista ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resposta = await res.json();

        if (!res.ok) {
            throw new Error(resposta.erro || "Falha ao cadastrar loja.");
        }

        exibirNotificacao(state.lojaDoLojista ? "Informações da loja atualizadas!" : "Loja cadastrada com sucesso!");
        state.editandoLoja = false;
        carregarLojas();
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
        return;
    }

    document.getElementById('loja-nome').value = state.lojaDoLojista.nome || '';
    document.getElementById('loja-endereco').value = state.lojaDoLojista.endereco || '';
    document.getElementById('loja-telefone').value = state.lojaDoLojista.telefone || '';
    document.getElementById('loja-resumo-nome').innerText = state.lojaDoLojista.nome || '-';
    document.getElementById('loja-resumo-endereco').innerText = state.lojaDoLojista.endereco || '-';
    document.getElementById('loja-resumo-telefone').innerText = state.lojaDoLojista.telefone || 'Não informado';

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

        const tbody = document.getElementById('tbl-usuarios');
        tbody.innerHTML = state.cacheUsuarios.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td>${escapeHtml(u.nome)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${u.tipo}</td>
            </tr>
        `).join('');
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export async function cadastrarUsuarioPainel(e) {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('user-nome').value,
        email: document.getElementById('user-email').value,
        senha: document.getElementById('user-senha').value,
        tipo: document.getElementById('user-tipo').value
    };

    try {
        const res = await apiRequest('/api/users', {
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
export async function carregarProdutos() {
    try {
        const res = await apiRequest('/api/produtos');
        if (!res.ok) throw new Error("Erro ao carregar produtos.");
        state.cacheProdutos = await res.json();
        document.getElementById('dash-produtos').textContent = state.cacheProdutos.length;
        document.getElementById('dash-disponiveis').textContent = state.cacheProdutos.filter(p => p.disponivel && !p.status_manutencao).length;

        const tbody = document.getElementById('tbl-produtos');
        if (tbody) {
            tbody.innerHTML = state.cacheProdutos.length ? state.cacheProdutos.map(p => `
                <tr class="listing-row">
                    <td><div class="listing-product"><span class="listing-thumb"><i class="fa-solid fa-screwdriver-wrench"></i></span><div><strong>${escapeHtml(p.nome)}</strong><small>#${p.id} · ${escapeHtml(p.categoria || 'Sem categoria')}</small></div></div></td>
                    <td>${escapeHtml(p.utilidade || 'Uso geral')}<small class="product-flags">${p.status_manutencao ? '<span class="maintenance-flag">Em manutenção</span>' : ''}${p.classificacao_curva_a ? '<span class="curve-a-flag">Curva A</span>' : ''}${p.disponivel_venda ? ' Venda' : ''}${p.disponivel_locacao ? ' · Locação' : ''}</small></td>
                    <td><strong>R$ ${p.preco_venda.toFixed(2)}</strong><small class="product-flags">Locação R$ ${p.preco_locacao.toFixed(2)}/dia</small></td>
                    <td>
                        <button class="toggle-switch ${p.disponivel ? 'is-on' : ''}" type="button" role="switch" aria-checked="${p.disponivel}" data-action="produto-toggle" data-id="${p.id}" aria-label="Alterar disponibilidade de ${escapeHtml(p.nome)}">
                            <span></span><b>${p.disponivel ? 'Ativo' : 'Inativo'}</b>
                        </button>
                    </td>
                    <td class="table-actions">
                        <button class="btn-secondary" type="button" data-action="produto-editar" data-id="${p.id}" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-remove-item" type="button" data-action="produto-excluir" data-id="${p.id}" title="Excluir">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="5" class="empty-state">Nenhum anúncio cadastrado. Use o formulário ao lado para publicar o primeiro.</td></tr>';
        }
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

export async function cadastrarProduto(e) {
    e.preventDefault();
    const dados = {
        loja_id: parseInt(document.getElementById('prod-loja-select').value),
        nome: document.getElementById('prod-nome').value,
        categoria: document.getElementById('prod-categoria').value,
        utilidade: document.getElementById('prod-utilidade').value,
        cor_tamanho: document.getElementById('prod-cor-tamanho').value,
        descricao: document.getElementById('prod-descricao').value,
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
    const nome = produto ? produto.nome : `#${id}`;

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
export async function carregarPedidos() {
    try {
        const res = await apiRequest('/api/pedidos');
        if (!res.ok) throw new Error("Erro ao carregar pedidos.");
        state.cachePedidosLojista = await res.json();
        const ativos = state.cachePedidosLojista.filter(p => p.tipo === 'Locacao' && !['Entregue', 'Cancelado'].includes(p.status)).length;
        const pendentes = state.cachePedidosLojista.filter(p => p.status === 'Pendente').length;
        document.getElementById('dash-alugueis').textContent = ativos;
        document.getElementById('dash-pendentes').textContent = pendentes;
        document.getElementById('dashboard-alertas').innerHTML = pendentes
            ? `<div class="attention-summary"><i class="fa-solid fa-bell"></i><div><strong>${pendentes} ${pendentes === 1 ? 'pedido aguarda' : 'pedidos aguardam'} aprovação</strong><small>Abra a fila para iniciar o atendimento.</small></div><button type="button" class="btn-secondary" data-action="gestao-tab" data-tab="tab-vendas">Ver fila</button></div>`
            : '<i class="fa-solid fa-check"></i>Nenhum alerta no momento.';
        renderizarPedidosLojista(state.cachePedidosLojista);
        renderizarPedidosDashboard(state.cachePedidosLojista);
        renderDashboardLojista();
    } catch (err) {
        exibirNotificacao(err.message || "Não foi possível carregar os dados.", true);
    }
}

// Mostra os pedidos mais recentes no card "Últimos pedidos" do dashboard
export function renderizarPedidosDashboard(pedidos) {
    const tbody = document.getElementById('tbl-pedidos-dash');
    if (!tbody) return;

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Os pedidos recentes aparecerão aqui.</td></tr>';
        return;
    }

    const recentes = [...pedidos].sort((a, b) => b.id - a.id).slice(0, 5);

    tbody.innerHTML = recentes.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td>${escapeHtml(p.cliente_nome || `Cliente #${p.user_id}`)}</td>
            <td>${p.tipo}</td>
            <td>R$ ${p.valor_total.toFixed(2)}</td>
            <td>${escapeHtml(formatarDataHora(p.created_at))}</td>
            <td><span class="badge ${escapeHtml(badgeStatusClass(p.status))}">${escapeHtml(statusPedidoLabel(p.status, p.tipo))}</span></td>
            <td>
                ${p.status !== 'Pendente' ? `<button class="btn-ticket" type="button" data-action="pedido-ticket" data-id="${p.id}"><i class="fa-solid fa-print"></i> Imprimir Ticket</button>` : '<small class="awaiting-approval">Aguardando aprovação</small>'}
            </td>
        </tr>
    `).join('');
}

export function renderizarPedidosLojista(pedidos) {
    const tbody = document.getElementById('tbl-pedidos');
    if (!tbody) return;

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = pedidos.map(p => {
        const cliente = state.cacheUsuarios.find(u => u.id === p.user_id);
        return `
            <tr>
                <td>#${p.id}</td>
                <td>${escapeHtml(p.cliente_nome || (cliente ? cliente.nome : `Cliente #${p.user_id}`))}</td>
                <td>${p.tipo}</td>
                <td>R$ ${p.valor_total.toFixed(2)}</td>
                <td>${escapeHtml(p.endereco_entrega || 'Retirada na loja')}</td>
                <td><span class="badge ${escapeHtml(badgeStatusClass(p.status))}">${escapeHtml(statusPedidoLabel(p.status, p.tipo))}</span></td>
                <td>
                    ${acoesPedido(p)}
                    ${p.status !== 'Pendente' ? `<button class="btn-ticket" type="button" data-action="pedido-ticket" data-id="${p.id}"><i class="fa-solid fa-print"></i> Imprimir Ticket</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
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
        const bateNome = !termo || nomeCliente.includes(termo) || String(p.id).includes(termo.replace('#', ''));
        const bateStatus = !statusFiltro || p.status === statusFiltro;
        const bateTipo = !tipoFiltro || p.tipo === tipoFiltro;
        const bateData = !dataFiltro || String(p.created_at || '').startsWith(dataFiltro);
        return bateNome && bateStatus && bateTipo && bateData;
    });

    renderizarPedidosLojista(filtrados);
}

export function acoesPedido(pedido) {
    const transicoes = {Pendente:['Confirmado','Cancelado'], Confirmado:['Despachado','Cancelado'], Despachado:['Entregue']};
    const rotulos = {Confirmado:'Aprovar pedido', Cancelado:'Cancelar', Despachado:'Em andamento', Entregue: pedido.tipo === 'Locacao' ? 'Registrar devolução' : 'Concluir entrega'};
    return (transicoes[pedido.status] || []).map(status => `<button class="btn-secondary" type="button" data-action="pedido-status" data-id="${pedido.id}" data-status="${status}">${rotulos[status]}</button>`).join(' ');
}
export async function atualizarStatusPedido(id, status) {
    if (status === 'Cancelado' && !await confirmarAcao('Cancelar este pedido?', 'Cancelar pedido?')) return;
    try {
        await apiRequest(`/api/pedidos/${id}`, {method:'PATCH',body:JSON.stringify({status})});
        exibirNotificacao('Status do pedido atualizado.');
        await Promise.all([carregarPedidos(), carregarRelatorioLucro()]);
    } catch (err) { exibirNotificacao(err.message, true); }
}
export function buscarNoPainel(termo) {
    trocarAba('tab-produtos', document.querySelector('[data-tab-produtos]'));
    const busca = termo.trim().toLowerCase();
    document.querySelectorAll('#tbl-produtos tr').forEach(row => {
        row.hidden = !row.textContent.toLowerCase().includes(busca);
    });
}
