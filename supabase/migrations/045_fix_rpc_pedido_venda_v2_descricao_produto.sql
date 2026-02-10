-- ============================================================================
-- Migration 045: Fix RPC pedido_venda_v2 (descricao_produto)
-- ============================================================================
-- Problem:
--   Some environments still have an older version of the RPC that tries to write
--   to a non-existent column `pedido_venda_produtos.descricao_produto`, causing:
--     column "descricao_produto" of relation "pedido_venda_produtos" does not exist
--
-- Fix:
--   Recreate the RPCs to always write to `pedido_venda_produtos.descricao` and
--   accept multiple JSON keys for backwards compatibility.
--
-- Date: 2026-02-10
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION: create_pedido_venda_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pedido_venda_v2(
  p_cliente_id BIGINT,
  p_vendedor_uuid UUID,
  p_natureza_operacao TEXT,
  p_numero_pedido TEXT DEFAULT NULL,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_lista_preco_id BIGINT DEFAULT NULL,
  p_percentual_desconto_padrao NUMERIC DEFAULT 0,
  p_id_condicao BIGINT DEFAULT NULL,
  p_ordem_cliente TEXT DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_data_venda DATE DEFAULT CURRENT_DATE,
  p_status TEXT DEFAULT 'Rascunho',
  p_valor_total NUMERIC DEFAULT 0,
  p_valor_total_produtos NUMERIC DEFAULT 0,
  p_percentual_desconto_extra NUMERIC DEFAULT 0,
  p_valor_desconto_extra NUMERIC DEFAULT 0,
  p_total_quantidades NUMERIC DEFAULT 0,
  p_total_itens INTEGER DEFAULT 0,
  p_peso_bruto_total NUMERIC DEFAULT 0,
  p_peso_liquido_total NUMERIC DEFAULT 0,
  p_produtos JSONB DEFAULT '[]'::JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_pedido_id BIGINT;
  v_user_tipo TEXT;
  v_cliente_nome TEXT;
  v_vendedor_nome TEXT;
  v_natureza_id BIGINT;
  v_empresa_nome TEXT;
  v_lista_preco_nome TEXT;
  v_condicao_nome TEXT;
  v_produto JSONB;
BEGIN
  -- 1. VALIDATIONS
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id is required';
  END IF;

  IF p_vendedor_uuid IS NULL THEN
    RAISE EXCEPTION 'vendedor_uuid is required';
  END IF;

  IF p_natureza_operacao IS NULL OR TRIM(p_natureza_operacao) = '' THEN
    RAISE EXCEPTION 'natureza_operacao is required';
  END IF;

  -- 2. PERMISSIONS
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User not found or inactive';
    END IF;

    -- vendedor can only create for themselves
    IF v_user_tipo = 'vendedor' AND p_vendedor_uuid != p_created_by THEN
      RAISE EXCEPTION 'Vendedor can only create their own pedidos';
    END IF;
  END IF;

  -- 3. CHECK CLIENT
  SELECT c.nome INTO v_cliente_nome
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente not found';
  END IF;

  -- 4. CHECK VENDEDOR
  SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor') INTO v_vendedor_nome
  FROM public.user u
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
  WHERE u.user_id = p_vendedor_uuid
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor not found or inactive';
  END IF;

  -- 5. CHECK NATUREZA
  SELECT no.id INTO v_natureza_id
  FROM public.natureza_operacao no
  WHERE no.nome = p_natureza_operacao
    AND no.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Natureza de operacao not found';
  END IF;

  -- 6. LOOKUPS (optional)
  IF p_empresa_faturamento_id IS NOT NULL THEN
    SELECT e.razao_social INTO v_empresa_nome
    FROM public.empresa e
    WHERE e.empresa_id = p_empresa_faturamento_id
      AND e.deleted_at IS NULL;
  END IF;

  IF p_lista_preco_id IS NOT NULL THEN
    SELECT lp.nome INTO v_lista_preco_nome
    FROM public.lista_preco lp
    WHERE lp.lista_preco_id = p_lista_preco_id
      AND lp.deleted_at IS NULL;
  END IF;

  IF p_id_condicao IS NOT NULL THEN
    SELECT cp.nome INTO v_condicao_nome
    FROM public.condicao_pagamento cp
    WHERE cp.id_condicao = p_id_condicao
      AND cp.deleted_at IS NULL;
  END IF;

  -- 7. INSERT PEDIDO
  INSERT INTO public.pedido_venda (
    cliente_id,
    vendedor_uuid,
    numero_pedido,
    natureza_operacao,
    empresa_faturamento_id,
    nome_empresa_faturamento,
    lista_preco_id,
    nome_lista_preco,
    percentual_desconto_padrao,
    id_condicao,
    nome_condicao_pagamento,
    ordem_cliente,
    observacao,
    observacao_interna,
    data_venda,
    status,
    valor_total,
    valor_total_produtos,
    percentual_desconto_extra,
    valor_desconto_extra,
    total_quantidades,
    total_itens,
    peso_bruto_total,
    peso_liquido_total,
    nome_cliente,
    nome_vendedor,
    nome_natureza_operacao,
    timestamp,
    created_by
  ) VALUES (
    p_cliente_id,
    p_vendedor_uuid,
    p_numero_pedido,
    p_natureza_operacao,
    p_empresa_faturamento_id,
    v_empresa_nome,
    p_lista_preco_id,
    v_lista_preco_nome,
    p_percentual_desconto_padrao,
    p_id_condicao,
    v_condicao_nome,
    p_ordem_cliente,
    p_observacao,
    p_observacao_interna,
    p_data_venda,
    p_status,
    p_valor_total,
    p_valor_total_produtos,
    p_percentual_desconto_extra,
    p_valor_desconto_extra,
    p_total_quantidades,
    p_total_itens,
    p_peso_bruto_total,
    p_peso_liquido_total,
    v_cliente_nome,
    v_vendedor_nome,
    p_natureza_operacao,
    NOW(),
    p_created_by
  )
  RETURNING "pedido_venda_ID" INTO v_pedido_id;

  -- 8. INSERT PRODUCTS (always to column `descricao`)
  IF p_produtos IS NOT NULL AND jsonb_array_length(p_produtos) > 0 THEN
    FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
    LOOP
      INSERT INTO public.pedido_venda_produtos (
        pedido_venda_id,
        produto_id,
        numero,
        descricao,
        codigo_sku,
        codigo_ean,
        valor_tabela,
        percentual_desconto,
        valor_unitario,
        quantidade,
        subtotal,
        peso_bruto,
        peso_liquido,
        unidade
      ) VALUES (
        v_pedido_id,
        (v_produto->>'produtoId')::BIGINT,
        COALESCE((v_produto->>'numero')::INTEGER, 1),
        COALESCE(
          NULLIF(v_produto->>'descricaoProduto', ''),
          NULLIF(v_produto->>'descricao_produto', ''),
          NULLIF(v_produto->>'descricao', '')
        ),
        v_produto->>'codigoSku',
        v_produto->>'codigoEan',
        COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),
        COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),
        COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),
        COALESCE((v_produto->>'quantidade')::NUMERIC, 0),
        COALESCE((v_produto->>'subtotal')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
        COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),
        v_produto->>'unidade'
      );
    END LOOP;
  END IF;

  -- 9. RETURN CREATED PEDIDO
  RETURN get_pedido_venda_v2(v_pedido_id, p_created_by);

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_pedido_venda_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_pedido_venda_v2 IS
'Fix: always writes item description to pedido_venda_produtos.descricao (not descricao_produto)';

-- ============================================================================
-- 2. FUNCTION: update_pedido_venda_v2 (products insert)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pedido_venda_v2(
  p_pedido_id BIGINT,
  p_cliente_id BIGINT DEFAULT NULL,
  p_vendedor_uuid UUID DEFAULT NULL,
  p_numero_pedido TEXT DEFAULT NULL,
  p_natureza_operacao TEXT DEFAULT NULL,
  p_empresa_faturamento_id BIGINT DEFAULT NULL,
  p_lista_preco_id BIGINT DEFAULT NULL,
  p_percentual_desconto_padrao NUMERIC DEFAULT NULL,
  p_id_condicao BIGINT DEFAULT NULL,
  p_ordem_cliente TEXT DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL,
  p_observacao_interna TEXT DEFAULT NULL,
  p_data_venda DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_valor_total NUMERIC DEFAULT NULL,
  p_valor_total_produtos NUMERIC DEFAULT NULL,
  p_percentual_desconto_extra NUMERIC DEFAULT NULL,
  p_valor_desconto_extra NUMERIC DEFAULT NULL,
  p_total_quantidades NUMERIC DEFAULT NULL,
  p_total_itens INTEGER DEFAULT NULL,
  p_peso_bruto_total NUMERIC DEFAULT NULL,
  p_peso_liquido_total NUMERIC DEFAULT NULL,
  p_produtos JSONB DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pedido_owner UUID;
  v_cliente_nome TEXT;
  v_vendedor_nome TEXT;
  v_natureza_id BIGINT;
  v_empresa_nome TEXT;
  v_lista_preco_nome TEXT;
  v_condicao_nome TEXT;
  v_produto JSONB;
BEGIN
  -- 1. VALIDATIONS
  IF p_pedido_id IS NULL THEN
    RAISE EXCEPTION 'pedido_id is required';
  END IF;

  -- 2. CHECK PEDIDO EXISTS
  SELECT pv.vendedor_uuid INTO v_pedido_owner
  FROM public.pedido_venda pv
  WHERE pv."pedido_venda_ID" = p_pedido_id
    AND pv.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido not found';
  END IF;

  -- 3. PERMISSIONS
  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User not found or inactive';
    END IF;

    v_is_backoffice := (v_user_tipo = 'backoffice');

    IF NOT v_is_backoffice AND v_pedido_owner != p_updated_by THEN
      RAISE EXCEPTION 'Not allowed to edit this pedido';
    END IF;

    IF p_vendedor_uuid IS NOT NULL AND p_vendedor_uuid != v_pedido_owner THEN
      IF NOT v_is_backoffice THEN
        RAISE EXCEPTION 'Vendedor cannot change vendedor of the pedido';
      END IF;
    END IF;
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  -- 4. UPDATE LOOKUP NAMES WHEN NEEDED
  IF p_cliente_id IS NOT NULL THEN
    SELECT c.nome INTO v_cliente_nome
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL;
  END IF;

  IF p_vendedor_uuid IS NOT NULL THEN
    SELECT COALESCE(dv.nome, u.nome, u.email, 'Vendedor') INTO v_vendedor_nome
    FROM public.user u
    LEFT JOIN public.dados_vendedor dv ON dv.user_id = u.user_id AND dv.deleted_at IS NULL
    WHERE u.user_id = p_vendedor_uuid
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;
  END IF;

  IF p_natureza_operacao IS NOT NULL THEN
    SELECT no.id INTO v_natureza_id
    FROM public.natureza_operacao no
    WHERE no.nome = p_natureza_operacao
      AND no.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF p_empresa_faturamento_id IS NOT NULL THEN
    SELECT e.razao_social INTO v_empresa_nome
    FROM public.empresa e
    WHERE e.empresa_id = p_empresa_faturamento_id
      AND e.deleted_at IS NULL;
  END IF;

  IF p_lista_preco_id IS NOT NULL THEN
    SELECT lp.nome INTO v_lista_preco_nome
    FROM public.lista_preco lp
    WHERE lp.lista_preco_id = p_lista_preco_id
      AND lp.deleted_at IS NULL;
  END IF;

  IF p_id_condicao IS NOT NULL THEN
    SELECT cp.nome INTO v_condicao_nome
    FROM public.condicao_pagamento cp
    WHERE cp.id_condicao = p_id_condicao
      AND cp.deleted_at IS NULL;
  END IF;

  -- 5. UPDATE PEDIDO
  UPDATE public.pedido_venda pv
  SET
    cliente_id = COALESCE(p_cliente_id, pv.cliente_id),
    vendedor_uuid = COALESCE(p_vendedor_uuid, pv.vendedor_uuid),
    numero_pedido = COALESCE(NULLIF(TRIM(p_numero_pedido), ''), pv.numero_pedido),
    natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.natureza_operacao),
    empresa_faturamento_id = COALESCE(p_empresa_faturamento_id, pv.empresa_faturamento_id),
    nome_empresa_faturamento = COALESCE(v_empresa_nome, pv.nome_empresa_faturamento),
    lista_preco_id = COALESCE(p_lista_preco_id, pv.lista_preco_id),
    nome_lista_preco = COALESCE(v_lista_preco_nome, pv.nome_lista_preco),
    percentual_desconto_padrao = COALESCE(p_percentual_desconto_padrao, pv.percentual_desconto_padrao),
    id_condicao = COALESCE(p_id_condicao, pv.id_condicao),
    nome_condicao_pagamento = COALESCE(v_condicao_nome, pv.nome_condicao_pagamento),
    ordem_cliente = COALESCE(NULLIF(TRIM(p_ordem_cliente), ''), pv.ordem_cliente),
    observacao = COALESCE(NULLIF(TRIM(p_observacao), ''), pv.observacao),
    observacao_interna = COALESCE(NULLIF(TRIM(p_observacao_interna), ''), pv.observacao_interna),
    data_venda = COALESCE(p_data_venda, pv.data_venda),
    status = COALESCE(NULLIF(TRIM(p_status), ''), pv.status),
    valor_total = COALESCE(p_valor_total, pv.valor_total),
    valor_total_produtos = COALESCE(p_valor_total_produtos, pv.valor_total_produtos),
    percentual_desconto_extra = COALESCE(p_percentual_desconto_extra, pv.percentual_desconto_extra),
    valor_desconto_extra = COALESCE(p_valor_desconto_extra, pv.valor_desconto_extra),
    total_quantidades = COALESCE(p_total_quantidades, pv.total_quantidades),
    total_itens = COALESCE(p_total_itens, pv.total_itens),
    peso_bruto_total = COALESCE(p_peso_bruto_total, pv.peso_bruto_total),
    peso_liquido_total = COALESCE(p_peso_liquido_total, pv.peso_liquido_total),
    nome_cliente = COALESCE(v_cliente_nome, pv.nome_cliente),
    nome_vendedor = COALESCE(v_vendedor_nome, pv.nome_vendedor),
    nome_natureza_operacao = COALESCE(NULLIF(TRIM(p_natureza_operacao), ''), pv.nome_natureza_operacao),
    updated_at = NOW()
  WHERE pv."pedido_venda_ID" = p_pedido_id;

  -- 6. UPDATE PRODUCTS (if provided)
  IF p_produtos IS NOT NULL THEN
    DELETE FROM public.pedido_venda_produtos pvp
    WHERE pvp.pedido_venda_id = p_pedido_id;

    IF jsonb_array_length(p_produtos) > 0 THEN
      FOR v_produto IN SELECT * FROM jsonb_array_elements(p_produtos)
      LOOP
        INSERT INTO public.pedido_venda_produtos (
          pedido_venda_id,
          produto_id,
          numero,
          descricao,
          codigo_sku,
          codigo_ean,
          valor_tabela,
          percentual_desconto,
          valor_unitario,
          quantidade,
          subtotal,
          peso_bruto,
          peso_liquido,
          unidade
        ) VALUES (
          p_pedido_id,
          (v_produto->>'produtoId')::BIGINT,
          COALESCE((v_produto->>'numero')::INTEGER, 1),
          COALESCE(
            NULLIF(v_produto->>'descricaoProduto', ''),
            NULLIF(v_produto->>'descricao_produto', ''),
            NULLIF(v_produto->>'descricao', '')
          ),
          v_produto->>'codigoSku',
          v_produto->>'codigoEan',
          COALESCE((v_produto->>'valorTabela')::NUMERIC, 0),
          COALESCE((v_produto->>'percentualDesconto')::NUMERIC, 0),
          COALESCE((v_produto->>'valorUnitario')::NUMERIC, 0),
          COALESCE((v_produto->>'quantidade')::NUMERIC, 0),
          COALESCE((v_produto->>'subtotal')::NUMERIC, 0),
          COALESCE((v_produto->>'pesoBruto')::NUMERIC, 0),
          COALESCE((v_produto->>'pesoLiquido')::NUMERIC, 0),
          v_produto->>'unidade'
        );
      END LOOP;
    END IF;
  END IF;

  -- 7. RETURN UPDATED PEDIDO
  RETURN get_pedido_venda_v2(p_pedido_id, p_updated_by);

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_pedido_venda_v2 IS
'Fix: always writes item description to pedido_venda_produtos.descricao (not descricao_produto)';

-- Permissions (safe to re-run)
GRANT EXECUTE ON FUNCTION create_pedido_venda_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION update_pedido_venda_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_pedido_venda_v2 FROM anon;
REVOKE EXECUTE ON FUNCTION update_pedido_venda_v2 FROM anon;

