"""Geocodifica endereços de lojas uma vez e persiste o resultado no banco."""
import json
import re
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app


def _geocodificar_por_cep(cep, headers):
    cep_numerico = re.sub(r'\D', '', str(cep or ''))
    if len(cep_numerico) != 8:
        return None, None
    request = Request(f'https://brasilapi.com.br/api/cep/v2/{cep_numerico}', headers=headers)
    try:
        with urlopen(request, timeout=8) as response:
            dados = json.load(response)
        coordenadas = (dados.get('location') or {}).get('coordinates') or {}
        latitude = float(coordenadas.get('latitude'))
        longitude = float(coordenadas.get('longitude'))
        if -90 <= latitude <= 90 and -180 <= longitude <= 180 and (latitude or longitude):
            return latitude, longitude
    except (OSError, TypeError, ValueError, KeyError, json.JSONDecodeError):
        current_app.logger.warning('Falha ao consultar coordenadas pelo CEP.', exc_info=True)
    return None, None


def geocodificar_endereco(endereco, componentes=None):
    if current_app.config.get('TESTING') or not current_app.config.get('GEOCODING_ENABLED', True):
        return None, None

    componentes = componentes or {}
    consultas = [{'q': endereco}]
    if componentes:
        consultas.extend([
            {
                'street': ' '.join(filter(None, (componentes.get('numero'), componentes.get('logradouro')))),
                'city': componentes.get('cidade'), 'state': componentes.get('uf'),
                'postalcode': componentes.get('cep'), 'country': 'Brasil'
            },
            {
                'street': componentes.get('logradouro'), 'city': componentes.get('cidade'),
                'state': componentes.get('uf'), 'postalcode': componentes.get('cep'), 'country': 'Brasil'
            },
            {'q': ', '.join(filter(None, (
                componentes.get('logradouro'), componentes.get('bairro'),
                componentes.get('cidade'), componentes.get('uf'), 'Brasil'
            )))},
            {'postalcode': componentes.get('cep'), 'city': componentes.get('cidade'),
             'state': componentes.get('uf'), 'country': 'Brasil'},
            {'q': ', '.join(filter(None, (
                componentes.get('bairro'), componentes.get('cidade'), componentes.get('uf'), 'Brasil'
            )))}
        ])

    # Evita chamadas duplicadas e parâmetros vazios, que podem ser rejeitados pelo provedor.
    normalizadas = []
    assinaturas = set()
    for consulta in consultas:
        consulta = {chave: valor for chave, valor in consulta.items() if valor}
        assinatura = tuple(sorted(consulta.items()))
        if consulta and assinatura not in assinaturas:
            assinaturas.add(assinatura)
            normalizadas.append(consulta)

    headers = {
        'User-Agent': current_app.config['GEOCODING_USER_AGENT'],
        'Accept': 'application/json', 'Accept-Language': 'pt-BR,pt;q=0.9'
    }
    for indice, consulta in enumerate(normalizadas):
        parametros = {**consulta, 'format': 'jsonv2', 'limit': 1, 'countrycodes': 'br'}
        request = Request(f'https://nominatim.openstreetmap.org/search?{urlencode(parametros)}', headers=headers)
        try:
            if indice: time.sleep(1.05)
            with urlopen(request, timeout=8) as response:
                resultados = json.load(response)
            if resultados:
                return float(resultados[0]['lat']), float(resultados[0]['lon'])
        except (OSError, ValueError, KeyError, json.JSONDecodeError):
            current_app.logger.warning('Falha ao consultar geocodificação da loja.', exc_info=True)
            break
    latitude, longitude = _geocodificar_por_cep(componentes.get('cep'), headers)
    if latitude is not None and longitude is not None:
        return latitude, longitude
    current_app.logger.warning('Endereço da loja não encontrado pelo serviço de geocodificação: %s', endereco)
    return None, None
