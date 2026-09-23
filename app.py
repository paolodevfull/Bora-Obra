import os
import secrets
import hmac
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, session, abort
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException
from backend.database.database import db
from backend.database.initialize import inicializar_banco
from backend.controllers.loja_controller import loja_bp
from backend.controllers.user_controller import user_bp
from backend.controllers.produto_controller import produto_bp
from backend.controllers.pedido_controller import pedido_bp
from backend.controllers.relatorio_controller import relatorio_bp
from backend.controllers.auth_controller import auth_bp

@event.listens_for(Engine, 'connect')
def enable_foreign_keys(connection, _):
    if connection.__class__.__module__ == 'sqlite3':
        connection.execute('PRAGMA foreign_keys=ON')

def create_app(config=None):
    environment = os.environ.get('BORAOBRA_ENV', 'development').lower()
    configured_secret = os.environ.get('FLASK_SECRET_KEY')
    if environment == 'production' and not configured_secret and not (config and config.get('SECRET_KEY')):
        raise RuntimeError('Defina FLASK_SECRET_KEY antes de iniciar o BoraObra em produção.')
    app = Flask(__name__, static_folder='frontend/static')
    app.config.from_mapping(
        SECRET_KEY=configured_secret or secrets.token_hex(32),
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL') or 'sqlite:///' + str(Path(__file__).parent / 'backend/database/bora_obra.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=os.environ.get('FLASK_COOKIE_SECURE', '0') == '1',
        MAX_CONTENT_LENGTH=3*1024*1024,
        LOGO_UPLOAD_DIR=str(Path(__file__).parent / 'frontend/static/uploads/lojas'),
        GEOCODING_ENABLED=os.environ.get('BORAOBRA_GEOCODING','1')=='1',
        GEOCODING_USER_AGENT=os.environ.get('BORAOBRA_GEOCODING_USER_AGENT','BoraObra/1.0 (aplicacao local)'))
    if config: app.config.update(config)
    db.init_app(app)
    for blueprint in (loja_bp,user_bp,produto_bp,pedido_bp,relatorio_bp,auth_bp):
        app.register_blueprint(blueprint)

    @app.before_request
    def protect_state_changes():
        if not request.path.startswith('/api/') or request.method not in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            return None
        expected = session.get('_csrf_token')
        received = request.headers.get('X-CSRF-Token', '')
        if not expected or not received or not hmac.compare_digest(expected, received):
            return jsonify(erro='A sessão de segurança expirou. Atualize a página e tente novamente.'), 403
        return None

    @app.after_request
    def security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
        return response
    frontend_root = Path(__file__).parent / 'frontend'
    client_pages = {'index.html', 'painel.html', 'pedidos.html', 'cadastro.html', 'detalhes.html'}
    merchant_pages = {'painel.html', 'lojas.html', 'usuarios.html', 'produtos.html', 'pedidos.html', 'relatorios.html'}
    @app.route('/', methods=['GET'])
    def index(): return send_from_directory(frontend_root, 'login.html')
    @app.route('/login.html', methods=['GET'])
    def login_page(): return send_from_directory(frontend_root, 'login.html')
    @app.route('/cadastro.html', methods=['GET'])
    def cadastro_page(): return send_from_directory(frontend_root, 'cadastro.html')
    @app.route('/cliente/<path:page>', methods=['GET'])
    def cliente_page(page):
        if page not in client_pages: abort(404)
        return send_from_directory(frontend_root / 'cliente', page)
    @app.route('/lojista/<path:page>', methods=['GET'])
    def lojista_page(page):
        if page not in merchant_pages: abort(404)
        return send_from_directory(frontend_root / 'lojista', page)
    @app.errorhandler(HTTPException)
    def http_error(error):
        if error.code == 413:
            return jsonify(erro='O arquivo excede o limite permitido de 2 MB.'), 413
        return jsonify(erro=error.description), error.code
    @app.errorhandler(IntegrityError)
    def integrity_error(error):
        db.session.rollback()
        return jsonify(erro='Operação conflita com cadastro existente ou possui vínculos em uso.'),400
    @app.errorhandler(Exception)
    def unexpected_error(error):
        db.session.rollback()
        app.logger.exception('Falha inesperada em %s',request.path)
        return jsonify(erro='Não foi possível concluir a operação. Tente novamente.'),500
    with app.app_context():
        inicializar_banco()
    return app

if __name__ == '__main__':
    create_app().run(debug=os.environ.get('FLASK_DEBUG')=='1')
