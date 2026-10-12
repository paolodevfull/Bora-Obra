import os

import pymysql
from sqlalchemy import URL


def mysql_test_url():
    host = os.environ.get('TEST_DB_HOST', os.environ.get('DB_HOST', '127.0.0.1'))
    port = int(os.environ.get('TEST_DB_PORT', os.environ.get('DB_PORT', '3306')))
    user = os.environ.get('TEST_DB_USER', os.environ.get('DB_USER', 'root'))
    password = os.environ.get('TEST_DB_PASSWORD', os.environ.get('DB_PASSWORD', ''))
    database = os.environ.get('TEST_DB_NAME', 'bora_obra_test')
    if not database.endswith('_test'):
        raise RuntimeError('TEST_DB_NAME deve terminar com _test.')
    connection = pymysql.connect(host=host, port=port, user=user, password=password,
                                 charset='utf8mb4', autocommit=True)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        connection.close()
    return URL.create('mysql+pymysql', username=user, password=password, host=host,
                      port=port, database=database, query={'charset': 'utf8mb4'})
