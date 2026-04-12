-- ============================================================================
-- Migration 002: Corrigir Relações e Foreign Keys
-- ============================================================================
-- Descrição: Cria Foreign Keys faltantes e corrige tipos incompatíveis
-- Data: 2025-01-16
-- ============================================================================

-- ============================================================================
-- 1. FOREIGN KEY: dados_vendedor.user_id → user.user_id
-- ============================================================================

-- Verificar se a FK já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_dados_vendedor_user_id'
    AND table_name = 'dados_vendedor'
  ) THEN
    ALTER TABLE public.dados_vendedor
    ADD CONSTRAINT fk_dados_vendedor_user_id
    FOREIGN KEY (user_id) REFERENCES public.user(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 2. FOREIGN KEY: pedido_venda.vendedor_uuid → dados_vendedor.user_id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedido_venda_vendedor_uuid'
    AND table_name = 'pedido_venda'
  ) THEN
    ALTER TABLE public.pedido_venda
    ADD CONSTRAINT fk_pedido_venda_vendedor_uuid
    FOREIGN KEY (vendedor_uuid) REFERENCES public.dados_vendedor(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. FOREIGN KEY: metas_vendedor.vendedor_id → dados_vendedor.user_id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_metas_vendedor_vendedor_id'
    AND table_name = 'metas_vendedor'
  ) THEN
    ALTER TABLE public.metas_vendedor
    ADD CONSTRAINT fk_metas_vendedor_vendedor_id
    FOREIGN KEY (vendedor_id) REFERENCES public.dados_vendedor(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 4. CORRIGIR: pedido_venda.lista_de_preco (TEXT → BIGINT)
-- ============================================================================

-- Converter lista_de_preco de TEXT para BIGINT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedido_venda'
    AND column_name = 'lista_de_preco'
    AND data_type = 'text'
  ) THEN
    -- Criar coluna temporária
    ALTER TABLE public.pedido_venda
    ADD COLUMN IF NOT EXISTS lista_preco_id_temp BIGINT;
    
    -- Converter valores válidos
    UPDATE public.pedido_venda
    SET lista_preco_id_temp = CASE
      WHEN lista_de_preco ~ '^[0-9]+$' THEN lista_de_preco::BIGINT
      ELSE NULL
    END;
    
    -- Remover coluna antiga
    ALTER TABLE public.pedido_venda
    DROP COLUMN IF EXISTS lista_de_preco;
    
    -- Renomear coluna temporária
    ALTER TABLE public.pedido_venda
    RENAME COLUMN lista_preco_id_temp TO lista_de_preco;
    
    -- Adicionar FK se a coluna lista_preco_id não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'pedido_venda'
      AND column_name = 'lista_preco_id'
    ) THEN
      ALTER TABLE public.pedido_venda
      RENAME COLUMN lista_de_preco TO lista_preco_id;
    END IF;
  END IF;
END $$;

-- Adicionar FK para lista_preco_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedido_venda'
    AND column_name = 'lista_preco_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedido_venda_lista_preco_id'
    AND table_name = 'pedido_venda'
  ) THEN
    ALTER TABLE public.pedido_venda
    ADD CONSTRAINT fk_pedido_venda_lista_preco_id
    FOREIGN KEY (lista_preco_id) REFERENCES public.listas_preco(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 5. CORRIGIR: pedido_venda.empresa_faturou (TEXT → BIGINT)
-- ============================================================================

-- Converter empresa_faturou de TEXT para BIGINT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedido_venda'
    AND column_name = 'empresa_faturou'
    AND data_type = 'text'
  ) THEN
    -- Criar coluna temporária
    ALTER TABLE public.pedido_venda
    ADD COLUMN IF NOT EXISTS empresa_faturamento_id_temp BIGINT;
    
    -- Converter valores válidos
    UPDATE public.pedido_venda
    SET empresa_faturamento_id_temp = CASE
      WHEN empresa_faturou ~ '^[0-9]+$' THEN empresa_faturou::BIGINT
      ELSE NULL
    END;
    
    -- Remover coluna antiga
    ALTER TABLE public.pedido_venda
    DROP COLUMN IF EXISTS empresa_faturou;
    
    -- Renomear coluna temporária se empresa_faturamento_id não existir
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'pedido_venda'
      AND column_name = 'empresa_faturamento_id'
    ) THEN
      ALTER TABLE public.pedido_venda
      RENAME COLUMN empresa_faturamento_id_temp TO empresa_faturamento_id;
    ELSE
      ALTER TABLE public.pedido_venda
      DROP COLUMN IF EXISTS empresa_faturamento_id_temp;
    END IF;
  END IF;
END $$;

-- Adicionar FK para empresa_faturamento_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedido_venda'
    AND column_name = 'empresa_faturamento_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedido_venda_empresa_faturamento_id'
    AND table_name = 'pedido_venda'
  ) THEN
    ALTER TABLE public.pedido_venda
    ADD CONSTRAINT fk_pedido_venda_empresa_faturamento_id
    FOREIGN KEY (empresa_faturamento_id) REFERENCES public.ref_empresas_subsidiarias(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 6. FOREIGN KEY: cliente.aprovado_por → user.user_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cliente'
    AND column_name = 'aprovado_por'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cliente_aprovado_por'
    AND table_name = 'cliente'
  ) THEN
    ALTER TABLE public.cliente
    ADD CONSTRAINT fk_cliente_aprovado_por
    FOREIGN KEY (aprovado_por) REFERENCES public.user(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 7. FOREIGN KEY: cliente.criado_por → user.user_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cliente'
    AND column_name = 'criado_por'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cliente_criado_por'
    AND table_name = 'cliente'
  ) THEN
    ALTER TABLE public.cliente
    ADD CONSTRAINT fk_cliente_criado_por
    FOREIGN KEY (criado_por) REFERENCES public.user(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 8. FOREIGN KEY: cliente.atualizado_por → user.user_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cliente'
    AND column_name = 'atualizado_por'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cliente_atualizado_por'
    AND table_name = 'cliente'
  ) THEN
    ALTER TABLE public.cliente
    ADD CONSTRAINT fk_cliente_atualizado_por
    FOREIGN KEY (atualizado_por) REFERENCES public.user(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 9. FOREIGN KEY: pedido_venda.created_by → user.user_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedido_venda'
    AND column_name = 'created_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedido_venda_created_by'
    AND table_name = 'pedido_venda'
  ) THEN
    ALTER TABLE public.pedido_venda
    ADD CONSTRAINT fk_pedido_venda_created_by
    FOREIGN KEY (created_by) REFERENCES public.user(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 10. FOREIGN KEY: vendedor_comissão.cliente_id → cliente.cliente_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendedor_comissão'
    AND column_name = 'cliente_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vendedor_comissao_cliente_id'
    AND table_name = 'vendedor_comissão'
  ) THEN
    ALTER TABLE public.vendedor_comissão
    ADD CONSTRAINT fk_vendedor_comissao_cliente_id
    FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 11. FOREIGN KEY: vendedor_comissão.lista_preco_id → listas_preco.id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendedor_comissão'
    AND column_name = 'lista_preco_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vendedor_comissao_lista_preco_id'
    AND table_name = 'vendedor_comissão'
  ) THEN
    ALTER TABLE public.vendedor_comissão
    ADD CONSTRAINT fk_vendedor_comissao_lista_preco_id
    FOREIGN KEY (lista_preco_id) REFERENCES public.listas_preco(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 12. FOREIGN KEY: vendedor_comissão.editado_por → user.user_id
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendedor_comissão'
    AND column_name = 'editado_por'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vendedor_comissao_editado_por'
    AND table_name = 'vendedor_comissão'
  ) THEN
    ALTER TABLE public.vendedor_comissão
    ADD CONSTRAINT fk_vendedor_comissao_editado_por
    FOREIGN KEY (editado_por) REFERENCES public.user(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

