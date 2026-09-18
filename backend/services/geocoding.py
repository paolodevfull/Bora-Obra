"""Geocodifica endereços de lojas uma vez e persiste o resultado no banco."""
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import current_app


def geocodificar_endereco(endereco):
    if current_app.config.get('TESTING') or not current_app.config.get('GEOCODING_ENABLED', True):
        return None, None

    query = urlencode({'q': endereco, 'format': 'jsonv2', 'limit': 1, 'countrycodes': 'br'})
    request = Request(
        f'https://nominatim.openstreetmap.org/search?{query}',
        headers={
            'User-Agent': current_app.config['GEOCODING_USER_AGENT'],
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9'
        }
    )
    try:
        with urlopen(request, timeout=6) as response:
            resultados = json.load(response)
        if not resultados:
            return None, None
        return float(resultados[0]['lat']), float(resultados[0]['lon'])
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        current_app.logger.warning('Não foi possível geocodificar o endereço da loja.', exc_info=True)
        return None, None
