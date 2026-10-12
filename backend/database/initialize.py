"""Validação não destrutiva do schema MySQL existente."""
from sqlalchemy import inspect

from backend.database.database import db
import backend.models


def validar_schema():
    if db.engine.dialect.name != 'mysql':
        raise RuntimeError('O BoraObra suporta exclusivamente MySQL.')
    inspector = inspect(db.engine)
    existentes = set(inspector.get_table_names())
    esperadas = set(db.metadata.tables)
    faltantes = sorted(esperadas - existentes)
    if faltantes:
        raise RuntimeError(f'Tabelas ausentes no MySQL: {faltantes}. Execute o schema oficial.')
    divergencias = {}
    for tabela in db.metadata.sorted_tables:
        inspecionadas = {column['name']: column for column in inspector.get_columns(tabela.name)}
        missing = sorted(set(tabela.columns.keys()) - set(inspecionadas))
        if missing:
            divergencias[tabela.name] = missing
            continue
        nulabilidade = [column.name for column in tabela.columns
                        if bool(inspecionadas[column.name]['nullable']) != bool(column.nullable)]
        if nulabilidade:
            divergencias[tabela.name] = [f'{nome} (nulabilidade)' for nome in nulabilidade]
    if divergencias:
        raise RuntimeError(f'Colunas ausentes no MySQL: {divergencias}. Execute a migration correspondente.')
