import os
import secrets
from datetime import timedelta
from pathlib import Path

from backend.database.connection import mysql_url


def application_settings(root: Path, overrides=None):
    """Build environment-aware settings without embedding credentials in code."""
    overrides = overrides or {}
    environment = os.environ.get('BORAOBRA_ENV', 'development').lower()
    configured_secret = os.environ.get('FLASK_SECRET_KEY')
    if environment == 'production' and not configured_secret and not overrides.get('SECRET_KEY'):
        raise RuntimeError('Defina FLASK_SECRET_KEY antes de iniciar o BoraObra em produção.')
    database_uri = overrides.get('SQLALCHEMY_DATABASE_URI') or mysql_url()
    return {
        'SECRET_KEY': configured_secret or secrets.token_hex(32),
        'SQLALCHEMY_DATABASE_URI': database_uri,
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'SQLALCHEMY_ENGINE_OPTIONS': {
            'pool_pre_ping': True, 'pool_recycle': 1800, 'pool_size': 5, 'max_overflow': 10,
        },
        'SESSION_COOKIE_HTTPONLY': True,
        'SESSION_COOKIE_SAMESITE': 'Lax',
        'SESSION_COOKIE_SECURE': os.environ.get('FLASK_COOKIE_SECURE', '0') == '1',
        'PERMANENT_SESSION_LIFETIME': timedelta(
            minutes=max(15, int(os.environ.get('BORAOBRA_SESSION_MINUTES', '480')))
        ),
        'SESSION_REFRESH_EACH_REQUEST': True,
        'MAX_CONTENT_LENGTH': 3 * 1024 * 1024,
        'LOGO_UPLOAD_DIR': str(root / 'frontend/static/uploads/lojas'),
        'GEOCODING_ENABLED': os.environ.get('BORAOBRA_GEOCODING', '1') == '1',
        'GEOCODING_USER_AGENT': os.environ.get(
            'BORAOBRA_GEOCODING_USER_AGENT', 'BoraObra/1.0 (aplicacao local)'
        ),
        'SLOW_REQUEST_MS': max(100, int(os.environ.get('BORAOBRA_SLOW_REQUEST_MS', '1000'))),
    }

