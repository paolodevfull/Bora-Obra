"""Additive SQLite migrations; existing data is never discarded."""
from sqlalchemy import inspect, text
from backend.database.database import db
import backend.models
ADDITIONS = {
    'users': {'endereco':'VARCHAR(300)', 'responsavel_id':'INTEGER REFERENCES users(id)', 'senha_hash':"VARCHAR(255) NOT NULL DEFAULT ''", 'cep':'VARCHAR(9)', 'logradouro':'VARCHAR(150)', 'numero':'VARCHAR(20)', 'complemento':'VARCHAR(100)', 'bairro':'VARCHAR(100)', 'cidade':'VARCHAR(100)', 'uf':'VARCHAR(2)', 'telefone':'VARCHAR(20)', 'ativo':'BOOLEAN NOT NULL DEFAULT 1'},
    'lojas': {'lojista_id':'INTEGER REFERENCES users(id)', 'latitude':'REAL', 'longitude':'REAL', 'cep':'VARCHAR(9)', 'logradouro':'VARCHAR(150)', 'numero':'VARCHAR(20)', 'complemento':'VARCHAR(100)', 'bairro':'VARCHAR(100)', 'cidade':'VARCHAR(100)', 'uf':'VARCHAR(2)', 'responsavel_nome':'VARCHAR(100)', 'documento':'VARCHAR(18)', 'email':'VARCHAR(120)', 'logo_url':'VARCHAR(500)', 'logo_marcador_url':'VARCHAR(500)', 'ativa':'BOOLEAN NOT NULL DEFAULT 1'},
    'item_pedidos': {'dias_locacao':'INTEGER NOT NULL DEFAULT 1'},
    'pedidos': {'tipo':"VARCHAR(20) DEFAULT 'Venda'", 'forma_pagamento':'VARCHAR(30)', 'endereco_entrega':'TEXT', 'observacao':'TEXT', 'data_inicio_locacao':'VARCHAR(10)', 'data_fim_locacao':'VARCHAR(10)'},
    'produtos': {'disponivel_venda':'BOOLEAN NOT NULL DEFAULT 1', 'disponivel_locacao':'BOOLEAN NOT NULL DEFAULT 1', 'status_manutencao':'BOOLEAN NOT NULL DEFAULT 0', 'classificacao_curva_a':'BOOLEAN NOT NULL DEFAULT 0', 'descricao':'TEXT', 'cor_tamanho':'VARCHAR(100)', 'estoque':'INTEGER NOT NULL DEFAULT 0', 'unidade':"VARCHAR(20) NOT NULL DEFAULT 'un'", 'sku':'VARCHAR(60)', 'imagem_url':'VARCHAR(500)'}
}
def inicializar_banco():
    db.create_all()
    with db.engine.begin() as connection:
        inspector = inspect(connection)
        for table, additions in ADDITIONS.items():
            existing = {c['name'] for c in inspector.get_columns(table)}
            for column, definition in additions.items():
                if column not in existing:
                    connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {definition}'))
        connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ux_lojas_lojista_id ON lojas (lojista_id)'))
    inspector = inspect(db.engine)
    for table in db.metadata.sorted_tables:
        missing = set(table.columns.keys()) - {c['name'] for c in inspector.get_columns(table.name)}
        if missing: raise RuntimeError(f'Migração necessária para {table.name}: {sorted(missing)}. Preserve um backup do banco.')
