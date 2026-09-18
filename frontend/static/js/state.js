import { loadStoredIds } from './utils.js';

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
    tipoCompraAtual: 'Venda',
    carrinhoCliente: [],
    lojaAtualCliente: null,
    produtoDetalheAtual: null,
    produtosFiltrados: [],
    limiteCatalogo: 9,
    somenteFavoritos: false,
    favoritos: loadStoredIds('boraobra:favoritos')
};
