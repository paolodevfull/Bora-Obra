"""Comando de diagnóstico somente leitura para a conexão MySQL."""
from app import create_app
from backend.database.connection import testar_conexao
from backend.database.database import db


if __name__ == '__main__':
    application = create_app()
    with application.app_context():
        info = testar_conexao(db)
        print(f"MySQL conectado; banco={info['database']}; versão={info['version']}")
