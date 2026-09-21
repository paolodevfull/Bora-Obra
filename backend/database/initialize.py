"""Additive SQLite migrations; existing data is never discarded."""
from sqlalchemy import inspect, text
from backend.database.database import db
import backend.models
ADDITIONS = {
    'users': {'endereco':'VARCHAR(300)', 'responsavel_id':'INTEGER REFERENCES users(id)', 'senha_hash':"VARCHAR(255) NOT NULL DEFAULT ''", 'cep':'VARCHAR(9)', 'logradouro':'VARCHAR(150)', 'numero':'VARCHAR(20)', 'complemento':'VARCHAR(100)', 'bairro':'VARCHAR(100)', 'cidade':'VARCHAR(100)', 'uf':'VARCHAR(2)'},
    'lojas': {'lojista_id':'INTEGER REFERENCES users(id)', 'latitude':'REAL', 'longitude':'REAL', 'cep':'VARCHAR(9)', 'logradouro':'VARCHAR(150)', 'numero':'VARCHAR(20)', 'complemento':'VARCHAR(100)', 'bairro':'VARCHAR(100)', 'cidade':'VARCHAR(100)', 'uf':'VARCHAR(2)'},
    'item_pedidos': {'dias_locacao':'INTEGER NOT NULL DEFAULT 1'},
    'pedidos': {'tipo':"VARCHAR(20) DEFAULT 'Venda'", 'forma_pagamento':'VARCHAR(30)', 'endereco_entrega':'TEXT', 'observacao':'TEXT'},
    'produtos': {'disponivel_venda':'BOOLEAN NOT NULL DEFAULT 1', 'disponivel_locacao':'BOOLEAN NOT NULL DEFAULT 1', 'status_manutencao':'BOOLEAN NOT NULL DEFAULT 0', 'classificacao_curva_a':'BOOLEAN NOT NULL DEFAULT 0', 'descricao':'TEXT', 'cor_tamanho':'VARCHAR(100)'}
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

def povoar_banco():
    from backend.models.user import User
    from backend.models.loja import Loja
    from backend.models.produto import Produto
    import os
    if User.query.first() or Loja.query.first() or Produto.query.first(): return
    user = User(nome='Lojista demonstração',email='demo@boraobra.local',tipo='lojista')
    user.set_senha(os.environ.get('BORAOBRA_DEMO_PASSWORD','BoraObra123!'))
    db.session.add(user)
    db.session.flush()
    loja = Loja(nome='BoraObra Centro',endereco='Rua das Obras, 100 — Centro',telefone='(11) 3333-0000',lojista_id=user.id)
    db.session.add(loja)
    db.session.flush()
    db.session.add(Produto(nome='Furadeira de impacto',loja_id=loja.id,categoria='Furação',utilidade='Furação em concreto',preco_venda=399.90,preco_locacao=35,disponivel=True,classificacao_curva_a=True))
    db.session.commit()
