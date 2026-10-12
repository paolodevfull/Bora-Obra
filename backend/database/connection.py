import os

from sqlalchemy import URL, text


REQUIRED_ENV = ('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER')


def mysql_url():
    missing = [name for name in REQUIRED_ENV if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Configuração MySQL ausente: {', '.join(missing)}.")
    try:
        port = int(os.environ['DB_PORT'])
    except ValueError as error:
        raise RuntimeError('DB_PORT deve ser um número válido.') from error
    return URL.create(
        'mysql+pymysql',
        username=os.environ['DB_USER'],
        password=os.environ.get('DB_PASSWORD', ''),
        host=os.environ['DB_HOST'],
        port=port,
        database=os.environ['DB_NAME'],
        query={'charset': os.environ.get('DB_CHARSET', 'utf8mb4')},
    )


def testar_conexao(db):
    with db.engine.connect() as connection:
        database, version = connection.execute(
            text('SELECT DATABASE(), VERSION()')
        ).one()
    return {'database': database, 'version': version}
