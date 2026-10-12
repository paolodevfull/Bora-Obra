-- Índices compostos usados pelo dashboard e pelos relatórios filtrados.
SET @schema_name = DATABASE();

SET @statement = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@schema_name AND table_name='pedidos'
             AND index_name='idx_pedidos_loja_created_at'),
    'SELECT 1',
    'CREATE INDEX idx_pedidos_loja_created_at ON pedidos (loja_id, created_at)'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@schema_name AND table_name='pedidos'
             AND index_name='idx_pedidos_loja_status_created_at'),
    'SELECT 1',
    'CREATE INDEX idx_pedidos_loja_status_created_at ON pedidos (loja_id, status, created_at)'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@schema_name AND table_name='produtos'
             AND index_name='idx_produtos_loja_categoria_nome'),
    'SELECT 1',
    'CREATE INDEX idx_produtos_loja_categoria_nome ON produtos (loja_id, categoria, nome)'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
