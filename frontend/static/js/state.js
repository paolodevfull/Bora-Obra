import { loadStoredIds } from './utils.js';
const storedCart = (() => { try { return JSON.parse(localStorage.getItem('boraobra:carrinho') || '[]'); } catch { return []; } })();
const storedStore = (() => { try { return JSON.parse(localStorage.getItem('boraobra:loja-carrinho') || 'null'); } catch { return null; } })();

export const state = {
    cacheProdutos: [],
    cacheUsuarios: [],
    lojaDoLojista: null,
    editandoLoja: false,
    cacheLojasCliente: [],
    lojasProximas: [],
    localizacaoAtiva: false,
    cachePedidosLojista: [],
    cachePedidosCliente: [],
    usuarioAtual: null,
    perfilOperacional: null,
    tipoCompraAtual: localStorage.getItem('boraobra:tipo-compra') || 'Venda',
    carrinhoCliente: Array.isArray(storedCart) ? storedCart : [],
    lojaAtualCliente: storedStore,
    produtoDetalheAtual: null,
    produtosFiltrados: [],
    limiteCatalogo: 9,
    somenteFavoritos: false,
    favoritos: loadStoredIds('boraobra:favoritos')
};
