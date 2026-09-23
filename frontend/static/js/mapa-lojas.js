import { escapeHtml } from './ui.js';

const BRASIL = [-14.235, -51.9253];
const LOGO_PADRAO = '/static/img/store-default.svg';
let mapa;
let camadaLojas;
let marcadorCliente;
let circuloPrecisao;
let watchId;
let lojas = [];
let raioKm = 25;
let onUpdate = () => { };
let onSelect = () => { };

export function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const rad = valor => valor * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function status(texto, tipo = '') {
    const elemento = document.getElementById('localizacao-status');
    elemento.textContent = texto;
    elemento.dataset.tipo = tipo;
}

function urlLogoSegura(loja) {
    const valor = loja?.logo_marcador_url || loja?.logo_url || LOGO_PADRAO;
    try {
        const url = new URL(valor, window.location.origin);
        if (url.origin === window.location.origin || url.protocol === 'https:') return url.href;
    } catch (_) { }
    return new URL(LOGO_PADRAO, window.location.origin).href;
}

function criarIconeLoja(loja, selecionada = false) {
    const nome = escapeHtml(loja?.nome || 'Loja');
    const logo = escapeHtml(urlLogoSegura(loja));
    return globalThis.L.divIcon({
        className: '',
        html: `<span class="store-map-pin${selecionada ? ' selected' : ''}" role="img" aria-label="Localização de ${nome}"><span class="store-map-pin-logo"><img src="${logo}" alt=""></span></span>`,
        iconSize: [38, 44], iconAnchor: [19, 42], popupAnchor: [0, -38]
    });
}

export function coordenadasValidas(loja) {
    if (loja?.latitude === null || loja?.latitude === undefined || loja?.latitude === ''
        || loja?.longitude === null || loja?.longitude === undefined || loja?.longitude === '') return false;
    const latitude = Number(loja.latitude);
    const longitude = Number(loja.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
        && latitude >= -90 && latitude <= 90
        && longitude >= -180 && longitude <= 180
        && !(latitude === 0 && longitude === 0);
}

function lojasComCoordenadas() {
    return lojas.filter(coordenadasValidas);
}

function desenharLojas(lista = lojasComCoordenadas()) {
    if (!mapa) return;
    camadaLojas.clearLayers();
    lista.forEach(loja => {
        const popup = document.createElement('div');
        const nome = document.createElement('strong');
        const endereco = document.createElement('span');
        nome.textContent = loja.nome;
        endereco.textContent = loja.endereco || '';
        popup.append(nome, document.createElement('br'), endereco);
        if (Number.isFinite(loja.distancia_km)) {
            const distancia = document.createElement('b');
            distancia.textContent = `${loja.distancia_km.toFixed(1).replace('.', ',')} km`;
            popup.append(document.createElement('br'), distancia);
        }
        const marker = globalThis.L.marker([Number(loja.latitude), Number(loja.longitude)], {
            icon: criarIconeLoja(loja), keyboard: true, title: `Loja ${loja.nome}`
        })
            .bindPopup(popup);
        marker.on('add', () => {
            const imagem = marker.getElement()?.querySelector('.store-map-pin-logo img');
            imagem?.addEventListener('error', () => {
                imagem.src = LOGO_PADRAO;
            }, { once: true });
        });
        marker.on('click', () => onSelect(loja.id));
        marker.addTo(camadaLojas);
    });
}

function atualizarPorPosicao(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const ordenadas = lojasComCoordenadas()
        .map(loja => ({ ...loja, distancia_km: calcularDistanciaKm(latitude, longitude, Number(loja.latitude), Number(loja.longitude)) }))
        .filter(loja => loja.distancia_km <= raioKm)
        .sort((a, b) => a.distancia_km - b.distancia_km);

    if (marcadorCliente) marcadorCliente.setLatLng([latitude, longitude]);
    else marcadorCliente = globalThis.L.circleMarker([latitude, longitude], { radius: 8, className: 'client-location-marker', weight: 3, fillOpacity: 1 })
        .bindPopup('Você está aqui').addTo(mapa);
    if (circuloPrecisao) circuloPrecisao.setLatLng([latitude, longitude]).setRadius(accuracy);
    else circuloPrecisao = globalThis.L.circle([latitude, longitude], { radius: accuracy, className: 'client-location-accuracy', weight: 1, fillOpacity: .07 }).addTo(mapa);

    desenharLojas(ordenadas);
    mapa.setView([latitude, longitude], raioKm <= 10 ? 12 : raioKm <= 25 ? 11 : 10);
    onUpdate(ordenadas, true);
    status(ordenadas.length ? `${ordenadas.length} ${ordenadas.length === 1 ? 'loja encontrada' : 'lojas encontradas'} em até ${raioKm} km.` : `Nenhuma loja geolocalizada em até ${raioKm} km.`, ordenadas.length ? 'sucesso' : 'vazio');
}

function tratarErro(error) {
    const mensagens = {
        1: 'Localização não autorizada. Você ainda pode buscar lojas pelo endereço.',
        2: 'Não foi possível determinar sua localização.',
        3: 'A localização demorou demais. Tente novamente.'
    };
    status(mensagens[error.code] || 'Não foi possível acessar sua localização.', 'erro');
    onUpdate(lojas, false);
}

export function ativarLocalizacao() {
    if (!navigator.geolocation) {
        status('Seu navegador não oferece localização. Busque uma loja pelo endereço.', 'erro');
        return;
    }
    status('Obtendo sua localização…');
    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(atualizarPorPosicao, tratarErro, {
        enableHighAccuracy: true, maximumAge: 30000, timeout: 12000
    });
}

export function definirRaio(novoRaio) {
    raioKm = Number(novoRaio) || 25;
    ativarLocalizacao();
}

export function inicializarMapaLojas(opcoes) {
    lojas = opcoes.lojas || [];
    onUpdate = opcoes.onUpdate || onUpdate;
    onSelect = opcoes.onSelect || onSelect;
    const elemento = document.getElementById('mapa-lojas');
    if (!elemento || !globalThis.L) {
        status('O mapa não pôde ser carregado. A lista de lojas continua disponível.', 'erro');
        onUpdate(lojas, false);
        return;
    }
    if (!mapa) {
        mapa = globalThis.L.map(elemento, { zoomControl: true }).setView(BRASIL, 4);
        globalThis.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapa);
        camadaLojas = globalThis.L.layerGroup().addTo(mapa);
    }
    const geolocalizadas = lojasComCoordenadas();
    desenharLojas(geolocalizadas);
    if (!geolocalizadas.length && lojas.length) {
        status('As lojas cadastradas ainda não possuem coordenadas válidas. Edite e salve o endereço da loja para posicioná-la no mapa.', 'vazio');
    }
    setTimeout(() => mapa.invalidateSize(), 0);
    onUpdate(lojas, false);

    try {
        navigator.permissions?.query({ name: 'geolocation' }).then(resultado => {
            if (resultado.state === 'granted') ativarLocalizacao();
        }).catch(() => { });
    } catch (_) {
        // Alguns navegadores oferecem geolocalização, mas não a Permissions API.
    }
}

export function atualizarTamanhoMapa() {
    setTimeout(() => mapa?.invalidateSize(), 0);
}
