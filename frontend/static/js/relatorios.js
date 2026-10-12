import { apiRequest } from './api.js';
import { escapeHtml, formatarMoeda, exibirNotificacao } from './ui.js';

let grafico = null;
let ultimo = null;
let aplicados = null;
let controller = null;
let iniciado = false;
let buscaVersao = 0;
let produtosDisponiveis = [];
const selecionados = new Set();
const campos = { inicio: 'relatorio-inicio', fim: 'relatorio-fim', loja: 'relatorio-loja', tipo: 'relatorio-tipo', status: 'relatorio-status', pagamento: 'relatorio-pagamento', cliente: 'relatorio-cliente', regiao: 'relatorio-regiao', ordenacao: 'relatorio-ordenacao', criterio: 'relatorio-criterio', limite: 'relatorio-limite' };
const el = id => document.getElementById(id);

function contar() { el('produtos-contagem').textContent = selecionados.size ? `${selecionados.size} selecionado${selecionados.size === 1 ? '' : 's'}` : 'todos os produtos'; }

function renderizarProdutos() {
    const termo = el('produtos-busca').value.trim().toLocaleLowerCase('pt-BR');
    const visiveis = produtosDisponiveis.filter(produto => !termo || `${produto.categoria} ${produto.nome} ${produto.sku}`.toLocaleLowerCase('pt-BR').includes(termo));
    const grupos = visiveis.reduce((mapa, produto) => {
        const categoria = produto.categoria || 'Sem categoria';
        if (!mapa.has(categoria)) mapa.set(categoria, []);
        mapa.get(categoria).push(produto);
        return mapa;
    }, new Map());
    const container = el('produtos-opcoes');
    container.replaceChildren();
    if (!visiveis.length) {
        container.textContent = 'Nenhuma categoria ou produto encontrado.';
        return;
    }
    [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).forEach(([categoria, produtos]) => {
        const ids = produtos.map(produto => String(produto.id));
        const grupo = document.createElement('details');
        grupo.className = 'report-product-group';
        grupo.open = Boolean(termo) || ids.some(id => selecionados.has(id));
        const summary = document.createElement('summary');
        const categoriaLabel = document.createElement('label');
        categoriaLabel.className = 'report-category-check';
        const categoriaInput = document.createElement('input');
        categoriaInput.type = 'checkbox';
        categoriaInput.checked = ids.every(id => selecionados.has(id));
        categoriaInput.indeterminate = !categoriaInput.checked && ids.some(id => selecionados.has(id));
        categoriaInput.setAttribute('aria-label', `Selecionar categoria ${categoria}`);
        categoriaInput.addEventListener('click', event => event.stopPropagation());
        categoriaInput.addEventListener('change', () => {
            ids.forEach(id => categoriaInput.checked ? selecionados.add(id) : selecionados.delete(id));
            contar(); renderizarProdutos();
        });
        const titulo = document.createElement('strong'); titulo.textContent = categoria;
        const quantidade = document.createElement('span'); quantidade.textContent = `${produtos.length} produto${produtos.length === 1 ? '' : 's'}`;
        categoriaLabel.append(categoriaInput, titulo, quantidade); summary.append(categoriaLabel); grupo.append(summary);
        const lista = document.createElement('div'); lista.className = 'report-product-list';
        produtos.forEach(produto => {
            const label = document.createElement('label');
            const input = document.createElement('input'); input.type = 'checkbox'; input.value = produto.id; input.checked = selecionados.has(String(produto.id));
            input.addEventListener('change', () => { input.checked ? selecionados.add(input.value) : selecionados.delete(input.value); contar(); renderizarProdutos(); });
            const texto = document.createElement('span'); texto.innerHTML = `<strong>${escapeHtml(produto.nome)}</strong><small>${escapeHtml([produto.sku, produto.ativo ? 'Ativo' : 'Inativo'].filter(Boolean).join(' · '))}</small>`;
            label.append(input, texto); lista.append(label);
        });
        grupo.append(lista); container.append(grupo);
    });
}

async function opcoes() {
    const versao = ++buscaVersao;
    const params = new URLSearchParams({ hierarquia: '1' });
    if (el('relatorio-loja').value) params.set('loja', el('relatorio-loja').value);
    try {
        const res = await apiRequest(`/api/relatorios/opcoes?${params}`);
        const dados = await res.json();
        if (versao !== buscaVersao) return;
        if (!el('relatorio-loja').options.length) dados.lojas.forEach(l => el('relatorio-loja').add(new Option(l.nome, l.id)));
        produtosDisponiveis = dados.produtos;
        renderizarProdutos();
    } catch { el('produtos-opcoes').textContent = 'Não foi possível carregar os produtos. Abra novamente ou altere a pesquisa para tentar outra vez.'; }
}

async function iniciar() {
    if (iniciado) return;
    iniciado = true;
    let timer;
    el('produtos-busca').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(renderizarProdutos, 180); });
    el('produtos-limpar').addEventListener('click', () => { selecionados.clear(); contar(); renderizarProdutos(); });
    // Uma seleção vazia representa todos, inclusive produtos fora da página atual.
    el('produtos-todos').addEventListener('click', () => { selecionados.clear(); contar(); renderizarProdutos(); exibirNotificacao('Todo o catálogo será considerado.', 'sucesso'); });
    el('relatorio-loja').addEventListener('change', () => { selecionados.clear(); contar(); opcoes(); });
    el('relatorio-limpar').addEventListener('click', () => { el('form-relatorio-filtros').reset(); selecionados.clear(); contar(); definirPeriodo(); opcoes(); carregarRelatorioFiltrado(); });
    document.querySelector('.report-product-picker').addEventListener('toggle', event => { if (event.target.open) opcoes(); });
    await opcoes();
    const restaurar = new URLSearchParams(location.search);
    Object.entries(campos).forEach(([chave, id]) => { if (restaurar.has(chave) && chave !== 'loja') el(id).value = restaurar.get(chave); });
    (restaurar.get('produtos') || '').split(',').filter(Boolean).forEach(id => selecionados.add(id)); contar();
}

const iso = data => new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function definirPeriodo(periodo = '30d') {
    const fim = new Date();
    const inicio = new Date(fim);
    if (periodo === '7d') inicio.setDate(fim.getDate() - 6);
    else if (periodo === '30d') inicio.setDate(fim.getDate() - 29);
    else if (periodo === 'mes') inicio.setDate(1);
    document.getElementById('relatorio-inicio').value = iso(inicio);
    document.getElementById('relatorio-fim').value = iso(fim);
}

function parametros() {
    const params = new URLSearchParams();
    Object.entries(campos).forEach(([chave, id]) => { const valor = document.getElementById(id).value.trim(); if (valor) params.set(chave, valor); });
    if (selecionados.size) params.set('produtos', [...selecionados].join(','));
    return params;
}

export async function carregarRelatorioFiltrado(event) {
    event?.preventDefault();
    await iniciar();
    controller?.abort();
    const atual = new AbortController(); controller = atual;
    const params = parametros();
    el('relatorio-feedback').textContent = 'Carregando relatório…';
    el('form-relatorio-filtros').setAttribute('aria-busy', 'true');
    el('form-relatorio-filtros').querySelector('[type="submit"]').disabled = true;
    try {
    const res = await apiRequest(`/api/relatorios/detalhado?${params}`, { signal: atual.signal });
    const dados = await res.json();
    if (controller !== atual) return;
    aplicados = params; ultimo = dados;
    history.replaceState(null, '', `${location.pathname}?${params}`);
    const resumo = dados.resumo;
    document.getElementById('relatorio-kpis').innerHTML = [['Valor confirmado nos pedidos', formatarMoeda(resumo.total_vendido), 'fa-wallet'], ['Total de pedidos', resumo.quantidade_pedidos, 'fa-receipt'], ['Ticket médio dos confirmados', formatarMoeda(resumo.ticket_medio), 'fa-chart-line'], ['Itens confirmados', resumo.produtos_vendidos, 'fa-box']].map(([titulo, valor, icone]) => `<article class="metric-card"><div class="metric-icon"><i class="fa-solid ${icone}"></i></div><div><span>${titulo}</span><strong>${valor}</strong></div></article>`).join('');
    const nomes = {inicio: 'De', fim: 'Até', tipo: 'Modalidade', status: 'Status', pagamento: 'Pagamento', cliente: 'Cliente', categoria: 'Categoria', regiao: 'Região', ordenacao: 'Análise', criterio: 'Critério', limite: 'Resultados'};
    const filtros = [...params.entries()].filter(([chave]) => !['produtos', 'loja'].includes(chave)).map(([chave, valor]) => [nomes[chave] || chave, el(campos[chave])?.selectedOptions?.[0]?.textContent || valor]);
    filtros.push(['Loja', dados.loja.nome], ['Produtos', dados.produtos_selecionados.join(', ') || 'Todos']);
    document.getElementById('relatorio-filtros-ativos').innerHTML = filtros.map(([chave, valor]) => `<span>${escapeHtml(chave)}: ${escapeHtml(valor)}</span>`).join('') || '<span>Sem filtros adicionais</span>';
    renderizarGrafico(dados);
    el('relatorio-regra').textContent = dados.regra;
    const ordem = dados.filtros.ordenacao;
    const criterioReal = ordem.includes('faturamento') ? 'Valor dos pedidos confirmados' : ordem === 'recentes' ? 'Data da última venda' : ordem === 'sem_vendas' ? 'Produtos sem vendas confirmadas' : el('relatorio-criterio').selectedOptions[0].textContent;
    el('ranking-criterio').textContent = `${el('relatorio-ordenacao').selectedOptions[0].textContent} · Ordenado por: ${criterioReal}. O limite é aplicado somente a esta lista.`;
    tabela('relatorio-ranking', ['Produto', 'Categoria', 'SKU', 'Quantidade', 'Valor'], dados.ranking.map(p => [p.nome, p.categoria, p.sku, p.quantidade, formatarMoeda(p.faturamento)]));
    tabela('relatorio-pedidos', ['Data', 'Cliente', 'Modalidade', 'Status', 'Pagamento', 'Valor considerado'], dados.pedidos.map(p => [new Date(p.data.replace(' ', 'T')).toLocaleString('pt-BR'), p.cliente, p.tipo, p.status, p.pagamento, formatarMoeda(p.total)]));
    el('relatorio-feedback').textContent = dados.pedidos.length ? '' : 'Nenhum pedido encontrado para esses filtros.';
    } catch (error) {
        if (error.name !== 'AbortError' && controller === atual) el('relatorio-feedback').textContent = `${error.message} Clique em Aplicar filtros para tentar novamente. Os resultados anteriores foram mantidos.`;
    } finally {
        if (controller === atual) { el('form-relatorio-filtros').removeAttribute('aria-busy'); el('form-relatorio-filtros').querySelector('[type="submit"]').disabled = false; }
    }
}

function tabela(id, titulos, linhas) {
    const numerico = titulo => ['Quantidade', 'Valor', 'Valor considerado'].includes(titulo);
    el(id).innerHTML = linhas.length ? `<table><caption>${linhas.length} ${id === 'relatorio-ranking' ? 'produtos apresentados' : 'pedidos encontrados'}</caption><thead><tr>${titulos.map(t => `<th scope="col" class="${numerico(t) ? 'report-number' : ''}">${escapeHtml(t)}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map((v, i) => {
        const texto = escapeHtml(String(v || (v === 0 ? 0 : '—')));
        const conteudo = titulos[i] === 'Status' ? `<span class="report-status" data-status="${texto}">${texto}</span>` : texto;
        return `<td class="${numerico(titulos[i]) ? 'report-number' : ''}" data-label="${escapeHtml(titulos[i])}">${conteudo}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table>` : '<p>Nenhum resultado encontrado.</p>';
}

export function atualizarTema() { if (ultimo) renderizarGrafico(ultimo); }

function renderizarGrafico(dados) {
    grafico?.destroy();
    grafico = null;
    const estado = document.getElementById('relatorio-chart-state');
    const canvas = document.getElementById('chart-relatorio');
    if (!dados.serie.length) {
        canvas.classList.add('hidden'); estado.classList.remove('hidden'); estado.textContent = 'Nenhum dado encontrado para os filtros selecionados.'; return;
    }
    canvas.classList.remove('hidden'); estado.classList.add('hidden');
    const css = getComputedStyle(document.documentElement);
    const cor = nome => css.getPropertyValue(nome).trim();
    grafico = new Chart(canvas, { type: 'line', data: { labels: dados.serie.map(item => new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')), datasets: [{ label: 'Vendas', data: dados.serie.map(item => item.vendas), borderColor: cor('--orange'), backgroundColor: `${cor('--orange')}26`, fill: true, tension: .25 }, { label: 'Locações', data: dados.serie.map(item => item.locacoes), borderColor: cor('--green'), backgroundColor: `${cor('--green')}21`, fill: true, tension: .25 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: cor('--text') } }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}` } } }, scales: { x: { ticks: { color: cor('--text-muted') }, grid: { color: cor('--border') } }, y: { ticks: { color: cor('--text-muted'), callback: value => formatarMoeda(value) }, grid: { color: cor('--border') } } } } });
}

export function exportarXml() { if (!aplicados) return exibirNotificacao('Aplique os filtros antes de exportar.', 'aviso'); window.location.href = `/api/relatorios/detalhado.xml?${aplicados}`; }
export function exportarPdf() { if (!aplicados) return exibirNotificacao('Aplique os filtros antes de exportar.', 'aviso'); window.location.href = `/api/relatorios/detalhado.pdf?${aplicados}`; }
export function exportarGraficoPng() {
    if (!aplicados) return exibirNotificacao('Aplique os filtros antes de exportar.', 'aviso');
    window.location.href = `/api/relatorios/detalhado.png?${aplicados}`;
}
