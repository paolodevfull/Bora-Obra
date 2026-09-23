import secrets
import time
from collections import defaultdict, deque
from threading import Lock
from flask import Blueprint, jsonify, session, request
from backend.controllers.http import endpoint, json_body
from backend.services.errors import ServiceError
from backend.services.user.autenticar_user import AutenticarUserService
from backend.services.user.sessao_user import SessaoUserService

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')
_login_attempts = defaultdict(deque)
_login_lock = Lock()
_LOGIN_WINDOW_SECONDS = 300
_LOGIN_MAX_ATTEMPTS = 5

def _login_key(data):
    return f"{request.remote_addr or 'unknown'}:{str(data.get('email') or '').strip().casefold()}"

def _check_login_limit(key):
    now = time.monotonic()
    with _login_lock:
        attempts = _login_attempts[key]
        while attempts and now - attempts[0] > _LOGIN_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
            raise ServiceError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429)

def _record_login_failure(key):
    with _login_lock:
        _login_attempts[key].append(time.monotonic())

@auth_bp.route('/csrf', methods=['GET'])
def csrf():
    token = session.get('_csrf_token')
    if not token:
        token = secrets.token_urlsafe(32)
        session['_csrf_token'] = token
    return jsonify(csrf_token=token)

@auth_bp.route('/login', methods=['POST'])
@endpoint
def login():
    data = json_body()
    key = _login_key(data)
    _check_login_limit(key)
    try:
        user = AutenticarUserService().executar(data)
    except ServiceError:
        _record_login_failure(key)
        raise
    with _login_lock:
        _login_attempts.pop(key, None)
    csrf_token = session.get('_csrf_token')
    session.clear()
    session['user_id'], session['user_tipo'] = user['id'], user['tipo']
    session['_csrf_token'] = csrf_token or secrets.token_urlsafe(32)
    return jsonify(user)
@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify(mensagem='Sessão encerrada.')
@auth_bp.route('/me', methods=['GET'])
@endpoint
def me():
    return jsonify(SessaoUserService().executar(session.get('user_id')))
