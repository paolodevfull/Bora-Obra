CREATE DATABASE IF NOT EXISTS bora_obra
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bora_obra;

SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- Usuários
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'cliente',
    `senha_hash` VARCHAR(255) NOT NULL,
    `responsavel_id` INT UNSIGNED NULL,
    `endereco` VARCHAR(300) NOT NULL,
    `cep` VARCHAR(9) NOT NULL,
    `logradouro` VARCHAR(150) NOT NULL,
    `numero` VARCHAR(20) NOT NULL,
    `complemento` VARCHAR(100) NULL,
    `bairro` VARCHAR(100) NOT NULL,
    `cidade` VARCHAR(100) NOT NULL,
    `uf` VARCHAR(2) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_users_email` UNIQUE (`email`),
    KEY `idx_users_responsavel_id` (`responsavel_id`),
    CONSTRAINT `fk_users_responsavel`
        FOREIGN KEY (`responsavel_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Lojas
CREATE TABLE IF NOT EXISTS `lojas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `endereco` VARCHAR(300) NOT NULL,
    `cep` VARCHAR(9) NOT NULL,
    `logradouro` VARCHAR(150) NOT NULL,
    `numero` VARCHAR(20) NOT NULL,
    `complemento` VARCHAR(100) NULL,
    `bairro` VARCHAR(100) NOT NULL,
    `cidade` VARCHAR(100) NOT NULL,
    `uf` VARCHAR(2) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL,
    `responsavel_nome` VARCHAR(100) NOT NULL,
    `documento` VARCHAR(18) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `logo_url` VARCHAR(500) NULL,
    `logo_marcador_url` VARCHAR(500) NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT TRUE,
    `latitude` DECIMAL(10,7) NOT NULL,
    `longitude` DECIMAL(10,7) NOT NULL,
    `lojista_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `ux_lojas_lojista_id` UNIQUE (`lojista_id`),
    CONSTRAINT `fk_lojas_lojista`
        FOREIGN KEY (`lojista_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Produtos
CREATE TABLE IF NOT EXISTS `produtos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `loja_id` INT UNSIGNED NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL,
    `utilidade` VARCHAR(100) NOT NULL,
    `preco_venda` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `preco_locacao` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `disponivel` BOOLEAN NOT NULL DEFAULT TRUE,
    `disponivel_venda` BOOLEAN NOT NULL DEFAULT TRUE,
    `disponivel_locacao` BOOLEAN NOT NULL DEFAULT TRUE,
    `status_manutencao` BOOLEAN NOT NULL DEFAULT FALSE,
    `classificacao_curva_a` BOOLEAN NOT NULL DEFAULT FALSE,
    `descricao` TEXT NOT NULL,
    `cor_tamanho` VARCHAR(100) NULL,
    `estoque` INT NOT NULL DEFAULT 0,
    `unidade` VARCHAR(20) NOT NULL DEFAULT 'un',
    `sku` VARCHAR(60) NOT NULL,
    `imagem_url` VARCHAR(500) NULL,
    PRIMARY KEY (`id`),
    KEY `idx_produtos_loja_id` (`loja_id`),
    KEY `idx_produtos_loja_categoria_nome` (`loja_id`, `categoria`, `nome`),
    CONSTRAINT `fk_produtos_loja`
        FOREIGN KEY (`loja_id`) REFERENCES `lojas` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Pedidos
CREATE TABLE IF NOT EXISTS `pedidos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `loja_id` INT UNSIGNED NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    `tipo` VARCHAR(20) NOT NULL DEFAULT 'Venda',
    `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `forma_pagamento` VARCHAR(30) NOT NULL DEFAULT 'Não informado',
    `endereco_entrega` TEXT NOT NULL,
    `observacao` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `data_inicio_locacao` DATE NULL,
    `data_fim_locacao` DATE NULL,
    `idempotency_key` VARCHAR(64) NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_pedidos_user_idempotency` UNIQUE (`user_id`, `idempotency_key`),
    KEY `idx_pedidos_user_id` (`user_id`),
    KEY `idx_pedidos_loja_id` (`loja_id`),
    KEY `idx_pedidos_loja_created_at` (`loja_id`, `created_at`),
    KEY `idx_pedidos_loja_status_created_at` (`loja_id`, `status`, `created_at`),
    CONSTRAINT `fk_pedidos_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT `fk_pedidos_loja`
        FOREIGN KEY (`loja_id`) REFERENCES `lojas` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Itens dos pedidos
CREATE TABLE IF NOT EXISTS `item_pedidos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pedido_id` INT UNSIGNED NOT NULL,
    `produto_id` INT UNSIGNED NOT NULL,
    `quantidade` INT NOT NULL,
    `valor_unitario` DECIMAL(12,2) NOT NULL,
    `dias_locacao` INT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_item_pedidos_pedido_id` (`pedido_id`),
    KEY `idx_item_pedidos_produto_id` (`produto_id`),
    CONSTRAINT `fk_item_pedidos_pedido`
        FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    CONSTRAINT `fk_item_pedidos_produto`
        FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Estoques
CREATE TABLE IF NOT EXISTS `estoques` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `loja_id` INT UNSIGNED NOT NULL,
    `produto_id` INT UNSIGNED NOT NULL,
    `quantidade` INT NOT NULL DEFAULT 0,
    `localizacao_fisica` VARCHAR(100) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_estoques_loja_id` (`loja_id`),
    KEY `idx_estoques_produto_id` (`produto_id`),
    CONSTRAINT `fk_estoques_loja`
        FOREIGN KEY (`loja_id`) REFERENCES `lojas` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
    CONSTRAINT `fk_estoques_produto`
        FOREIGN KEY (`produto_id`) REFERENCES `produtos` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Entregas
CREATE TABLE IF NOT EXISTS `entregas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `pedido_id` INT UNSIGNED NOT NULL,
    `endereco` VARCHAR(250) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `uq_entregas_pedido_id` UNIQUE (`pedido_id`),
    CONSTRAINT `fk_entregas_pedido`
        FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
