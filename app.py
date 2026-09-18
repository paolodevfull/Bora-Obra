import os
import secrets
from pathlib import Path
from flask import Flask, jsonify, render_template, request
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException
from backend.database.database import db
from backend.database.initialize import inicializar_banco, povoar_banco
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
    app = Flask(__name__,template_folder='frontend/templates',static_folder='frontend/static')
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('FLASK_SECRET_KEY') or secrets.token_hex(32),
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL') or 'sqlite:///' + str(Path(__file__).parent / 'backend/database/bora_obra.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',MAX_CONTENT_LENGTH=1024*1024,
        SEED_DATA=os.environ.get('BORAOBRA_SEED','1')=='1',
        GEOCODING_ENABLED=os.environ.get('BORAOBRA_GEOCODING','1')=='1',
        GEOCODING_USER_AGENT=os.environ.get('BORAOBRA_GEOCODING_USER_AGENT','BoraObra/1.0 (aplicacao local)'))
    if config: app.config.update(config)
    db.init_app(app)
    for blueprint in (loja_bp,user_bp,produto_bp,pedido_bp,relatorio_bp,auth_bp):
        app.register_blueprint(blueprint)
    @app.route('/', methods=['GET'])
    def index(): return render_template('index.html')
    @app.errorhandler(HTTPException)
    def http_error(error): return jsonify(erro=error.description), error.code
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
        if app.config['SEED_DATA']: povoar_banco()
    return app

if __name__ == '__main__':
    create_app().run(debug=os.environ.get('FLASK_DEBUG')=='1')
