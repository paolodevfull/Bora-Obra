import os
import hmac
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, session, abort, g
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException
from backend.database.database import db
from backend.database.initialize import validar_schema
from backend.database.connection import mysql_url, testar_conexao
from backend.controllers.loja_controller import loja_bp
from backend.controllers.user_controller import user_bp
from backend.controllers.produto_controller import produto_bp
from backend.controllers.pedido_controller import pedido_bp
from backend.controllers.relatorio_controller import relatorio_bp
from backend.controllers.auth_controller import auth_bp
from backend.config.settings import application_settings
from backend.middleware.request_context import begin_request, finish_request

load_dotenv(Path(__file__).parent / '.env')

def create_app(config=None):
    app = Flask(__name__, static_folder='frontend/static')
    app.config.from_mapping(application_settings(Path(__file__).parent, config))
    if config: app.config.update(config)
    db.init_app(app)
    for blueprint in (loja_bp,user_bp,produto_bp,pedido_bp,relatorio_bp,auth_bp):
        app.register_blueprint(blueprint)

    app.before_request(begin_request)

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
        if request.path.startswith('/api/'):
            response.headers.setdefault('Cache-Control', 'no-store')
        return finish_request(app, response)
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
        app.logger.exception('Falha inesperada request_id=%s path=%s', getattr(g, 'request_id', '-'), request.path)
        return jsonify(erro='Não foi possível concluir a operação. Tente novamente.'),500
    with app.app_context():
        try:
            info = testar_conexao(db)
            if app.config.get('TESTING'):
                if not str(info['database']).endswith('_test'):
                    raise RuntimeError('Testes só podem recriar bancos com sufixo _test.')
                db.drop_all()
                db.create_all()
            validar_schema()
            app.logger.info('MySQL conectado ao banco %s (servidor %s).', info['database'], info['version'])
        except Exception as error:
            app.logger.error('Não foi possível conectar ou validar o MySQL: %s', error)
            raise RuntimeError('Falha ao inicializar o MySQL. Verifique o serviço e as variáveis DB_*.') from error
    return app

if __name__ == '__main__':
    create_app().run(debug=os.environ.get('FLASK_DEBUG')=='1')
