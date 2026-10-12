-- Idempotência de checkout: migration aditiva e segura para bancos existentes.
SET @schema_name = DATABASE();

SET @statement = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema=@schema_name AND table_name='pedidos'
             AND column_name='idempotency_key'),
    'SELECT 1',
    'ALTER TABLE pedidos ADD COLUMN idempotency_key VARCHAR(64) NULL AFTER data_fim_locacao'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @statement = IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@schema_name AND table_name='pedidos'
             AND index_name='uq_pedidos_user_idempotency'),
    'SELECT 1',
    'ALTER TABLE pedidos ADD CONSTRAINT uq_pedidos_user_idempotency UNIQUE (user_id, idempotency_key)'
);
PREPARE migration_statement FROM @statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
