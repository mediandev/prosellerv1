-- ============================================================================
-- Migration 009: Funções RPC para Listas de Preço (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciar listas de preço com produtos
--            e regras de comissionamento
-- Data: 2025-01-17
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: list_listas_preco_v2
-- ============================================================================
-- Lista todas as listas de preço com contagem de produtos e faixas de comissão
-- Retorna dados formatados prontos para uso no frontend
-- ============================================================================

CREATE OR REPLACE FUNCTION list_listas_preco_v2()
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', lp.id,
      'nome', lp.nome,
      'desconto', COALESCE(lp.desconto, 0),
      'ativo', COALESCE(lp.ativo, true),
      'codigo_sequencial', lp.codigo_sequencial,
      'total_produtos', COALESCE(produtos_count.total, 0),
      'total_faixas_comissao', COALESCE(faixas_count.total, 0),
      'tipo_comissao', CASE 
        WHEN faixas_count.total > 0 THEN 'conforme_desconto'
        ELSE 'fixa'
      END,
      'created_at', lp.data_criacao,
      'updated_at', lp.data_criacao
    )
    ORDER BY lp.nome
  )
  INTO v_result
  FROM listas_preco lp
  LEFT JOIN (
    SELECT 
      lista_preco_id,
      COUNT(*) as total
    FROM produtos_listas_precos
    GROUP BY lista_preco_id
  ) produtos_count ON produtos_count.lista_preco_id = lp.id
  LEFT JOIN (
    SELECT 
      lista_preco_id,
      COUNT(*) as total
    FROM listas_preco_comissionamento
    GROUP BY lista_preco_id
  ) faixas_count ON faixas_count.lista_preco_id = lp.id;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

COMMENT ON FUNCTION list_listas_preco_v2 IS 
'Lista todas as listas de preço com contagem de produtos e faixas de comissão';

GRANT EXECUTE ON FUNCTION list_listas_preco_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_listas_preco_v2 TO anon;

-- ============================================================================
-- 2. FUNÇÃO: get_lista_preco_v2
-- ============================================================================
-- Busca uma lista de preço específica com produtos e faixas de comissão
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lista_preco_v2(p_lista_preco_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_lista_preco RECORD;
  v_produtos JSON;
  v_faixas JSON;
BEGIN
  -- Buscar dados da lista
  SELECT 
    lp.id,
    lp.nome,
    COALESCE(lp.desconto, 0) as desconto,
    COALESCE(lp.ativo, true) as ativo,
    lp.codigo_sequencial,
    lp.data_criacao
  INTO v_lista_preco
  FROM listas_preco lp
  WHERE lp.id = p_lista_preco_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista de preço não encontrada';
  END IF;

  -- Buscar produtos da lista
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'produtoId', plp.produto_id,
      'preco', plp.preco
    )
  )
  INTO v_produtos
  FROM produtos_listas_precos plp
  WHERE plp.lista_preco_id = p_lista_preco_id;

  -- Buscar faixas de comissão
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', lpc.id,
      'descontoMin', lpc.desconto_minimo,
      'descontoMax', lpc.desconto_maximo,
      'percentualComissao', lpc.comissao
    )
    ORDER BY lpc.desconto_minimo
  )
  INTO v_faixas
  FROM listas_preco_comissionamento lpc
  WHERE lpc.lista_preco_id = p_lista_preco_id;

  -- Montar resposta
  -- Verificar se há faixas (v_faixas pode ser NULL ou array vazio)
  v_result := JSON_BUILD_OBJECT(
    'id', v_lista_preco.id,
    'nome', v_lista_preco.nome,
    'desconto', v_lista_preco.desconto,
    'ativo', v_lista_preco.ativo,
    'codigo_sequencial', v_lista_preco.codigo_sequencial,
    'produtos', COALESCE(v_produtos, '[]'::JSON),
    'faixas_comissao', COALESCE(v_faixas, '[]'::JSON),
    'tipo_comissao', CASE 
      WHEN v_faixas IS NOT NULL 
        AND jsonb_typeof(v_faixas::jsonb) = 'array' 
        AND jsonb_array_length(v_faixas::jsonb) > 0 
      THEN 'conforme_desconto'
      ELSE 'fixa'
    END,
    'created_at', v_lista_preco.data_criacao,
    'updated_at', v_lista_preco.data_criacao
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_lista_preco_v2 IS 
'Busca uma lista de preço específica com produtos e faixas de comissão';

GRANT EXECUTE ON FUNCTION get_lista_preco_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_lista_preco_v2 TO anon;

-- ============================================================================
-- 3. FUNÇÃO: create_lista_preco_v2
-- ============================================================================
-- Cria uma nova lista de preço com produtos e faixas de comissão
-- ============================================================================

CREATE OR REPLACE FUNCTION create_lista_preco_v2(
  p_nome TEXT,
  p_desconto NUMERIC DEFAULT 0,
  p_ativo BOOLEAN DEFAULT true,
  p_codigo_sequencial TEXT DEFAULT NULL,
  p_produtos JSONB DEFAULT '[]'::JSONB,
  p_tipo_comissao TEXT DEFAULT 'fixa',
  p_percentual_fixo NUMERIC DEFAULT NULL,
  p_faixas_comissao JSONB DEFAULT '[]'::JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_lista_preco_id BIGINT;
  v_result JSON;
  v_produto_item JSONB;
  v_faixa_item JSONB;
BEGIN
  -- Validações
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da lista de preço deve ter pelo menos 3 caracteres';
  END IF;

  IF p_tipo_comissao NOT IN ('fixa', 'conforme_desconto') THEN
    RAISE EXCEPTION 'Tipo de comissão inválido. Use: fixa ou conforme_desconto';
  END IF;

  -- Validar percentual fixo apenas se tipo for fixa
  IF p_tipo_comissao = 'fixa' THEN
    IF p_percentual_fixo IS NULL THEN
      RAISE EXCEPTION 'Percentual fixo é obrigatório quando tipo de comissão é fixa';
    END IF;
    IF p_percentual_fixo < 0 OR p_percentual_fixo > 100 THEN
      RAISE EXCEPTION 'Percentual fixo deve estar entre 0 e 100';
    END IF;
  END IF;

  -- Verificar duplicidade de nome
  IF EXISTS (
    SELECT 1 FROM listas_preco 
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_nome))
  ) THEN
    RAISE EXCEPTION 'Já existe uma lista de preço com este nome';
  END IF;

  -- Criar lista de preço
  INSERT INTO listas_preco (
    nome,
    desconto,
    ativo,
    codigo_sequencial
  ) VALUES (
    TRIM(p_nome),
    COALESCE(p_desconto, 0),
    COALESCE(p_ativo, true),
    p_codigo_sequencial
  )
  RETURNING id INTO v_lista_preco_id;

  -- Inserir produtos
  IF p_produtos IS NOT NULL AND jsonb_array_length(p_produtos) > 0 THEN
    FOR v_produto_item IN SELECT * FROM jsonb_array_elements(p_produtos)
    LOOP
      INSERT INTO produtos_listas_precos (
        lista_preco_id,
        produto_id,
        preco
      ) VALUES (
        v_lista_preco_id,
        (v_produto_item->>'produtoId')::BIGINT,
        (v_produto_item->>'preco')::NUMERIC
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Inserir faixas de comissão (se tipo for conforme_desconto)
  IF p_tipo_comissao = 'conforme_desconto' AND p_faixas_comissao IS NOT NULL AND jsonb_array_length(p_faixas_comissao) > 0 THEN
    FOR v_faixa_item IN SELECT * FROM jsonb_array_elements(p_faixas_comissao)
    LOOP
      INSERT INTO listas_preco_comissionamento (
        lista_preco_id,
        desconto_minimo,
        desconto_maximo,
        comissao
      ) VALUES (
        v_lista_preco_id,
        (v_faixa_item->>'descontoMin')::NUMERIC,
        COALESCE((v_faixa_item->>'descontoMax')::NUMERIC, 999.99),
        (v_faixa_item->>'percentualComissao')::NUMERIC
      );
    END LOOP;
  ELSIF p_tipo_comissao = 'fixa' AND p_percentual_fixo IS NOT NULL THEN
    -- Para comissão fixa, criar uma faixa única de 0 a 100% com o percentual fixo
    INSERT INTO listas_preco_comissionamento (
      lista_preco_id,
      desconto_minimo,
      desconto_maximo,
      comissao
    ) VALUES (
      v_lista_preco_id,
      0,
      100,
      p_percentual_fixo
    );
  END IF;

  -- Retornar lista criada
  SELECT get_lista_preco_v2(v_lista_preco_id) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_lista_preco_v2 IS 
'Cria uma nova lista de preço com produtos e faixas de comissão';

GRANT EXECUTE ON FUNCTION create_lista_preco_v2 TO authenticated;

-- ============================================================================
-- 4. FUNÇÃO: update_lista_preco_v2
-- ============================================================================
-- Atualiza uma lista de preço existente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lista_preco_v2(
  p_lista_preco_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_desconto NUMERIC DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_codigo_sequencial TEXT DEFAULT NULL,
  p_produtos JSONB DEFAULT NULL,
  p_tipo_comissao TEXT DEFAULT NULL,
  p_percentual_fixo NUMERIC DEFAULT NULL,
  p_faixas_comissao JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_produto_item JSONB;
  v_faixa_item JSONB;
BEGIN
  -- Verificar se lista existe
  IF NOT EXISTS (SELECT 1 FROM listas_preco WHERE id = p_lista_preco_id) THEN
    RAISE EXCEPTION 'Lista de preço não encontrada';
  END IF;

  -- Validações
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 3 THEN
    RAISE EXCEPTION 'Nome da lista de preço deve ter pelo menos 3 caracteres';
  END IF;

  -- Verificar duplicidade de nome (se estiver alterando)
  IF p_nome IS NOT NULL AND EXISTS (
    SELECT 1 FROM listas_preco 
    WHERE LOWER(TRIM(nome)) = LOWER(TRIM(p_nome))
    AND id != p_lista_preco_id
  ) THEN
    RAISE EXCEPTION 'Já existe outra lista de preço com este nome';
  END IF;

  -- Atualizar dados da lista
  UPDATE listas_preco
  SET
    nome = COALESCE(TRIM(p_nome), nome),
    desconto = COALESCE(p_desconto, desconto),
    ativo = COALESCE(p_ativo, ativo),
    codigo_sequencial = COALESCE(p_codigo_sequencial, codigo_sequencial)
  WHERE id = p_lista_preco_id;

  -- Atualizar produtos (se fornecido)
  IF p_produtos IS NOT NULL THEN
    -- Remover produtos antigos
    DELETE FROM produtos_listas_precos WHERE lista_preco_id = p_lista_preco_id;
    
    -- Inserir novos produtos
    IF jsonb_array_length(p_produtos) > 0 THEN
      FOR v_produto_item IN SELECT * FROM jsonb_array_elements(p_produtos)
      LOOP
        INSERT INTO produtos_listas_precos (
          lista_preco_id,
          produto_id,
          preco
        ) VALUES (
          p_lista_preco_id,
          (v_produto_item->>'produtoId')::BIGINT,
          (v_produto_item->>'preco')::NUMERIC
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  -- Atualizar faixas de comissão (se fornecido)
  IF p_faixas_comissao IS NOT NULL OR p_tipo_comissao IS NOT NULL THEN
    -- Remover faixas antigas
    DELETE FROM listas_preco_comissionamento WHERE lista_preco_id = p_lista_preco_id;
    
    -- Determinar tipo de comissão e inserir novas faixas
    IF p_tipo_comissao = 'conforme_desconto' AND p_faixas_comissao IS NOT NULL AND jsonb_array_length(p_faixas_comissao) > 0 THEN
      FOR v_faixa_item IN SELECT * FROM jsonb_array_elements(p_faixas_comissao)
      LOOP
        INSERT INTO listas_preco_comissionamento (
          lista_preco_id,
          desconto_minimo,
          desconto_maximo,
          comissao
        ) VALUES (
          p_lista_preco_id,
          (v_faixa_item->>'descontoMin')::NUMERIC,
          COALESCE((v_faixa_item->>'descontoMax')::NUMERIC, 999.99),
          (v_faixa_item->>'percentualComissao')::NUMERIC
        );
      END LOOP;
    ELSIF (p_tipo_comissao = 'fixa' OR (p_tipo_comissao IS NULL AND (p_faixas_comissao IS NULL OR jsonb_array_length(p_faixas_comissao) = 0))) AND p_percentual_fixo IS NOT NULL THEN
      INSERT INTO listas_preco_comissionamento (
        lista_preco_id,
        desconto_minimo,
        desconto_maximo,
        comissao
      ) VALUES (
        p_lista_preco_id,
        0,
        100,
        p_percentual_fixo
      );
    END IF;
  END IF;

  -- Retornar lista atualizada
  SELECT get_lista_preco_v2(p_lista_preco_id) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION update_lista_preco_v2 IS 
'Atualiza uma lista de preço existente com produtos e faixas de comissão';

GRANT EXECUTE ON FUNCTION update_lista_preco_v2 TO authenticated;

-- ============================================================================
-- 5. FUNÇÃO: delete_lista_preco_v2
-- ============================================================================
-- Deleta uma lista de preço (com verificação de dependências)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_lista_preco_v2(p_lista_preco_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_lista_nome TEXT;
BEGIN
  -- Verificar se lista existe
  SELECT nome INTO v_lista_nome
  FROM listas_preco
  WHERE id = p_lista_preco_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista de preço não encontrada';
  END IF;

  -- Verificar se há clientes usando esta lista
  IF EXISTS (
    SELECT 1 FROM cliente 
    WHERE lista_de_preco = p_lista_preco_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir esta lista de preço pois existem clientes associados a ela';
  END IF;

  -- Verificar se há pedidos usando esta lista
  IF EXISTS (
    SELECT 1 FROM pedido_venda 
    WHERE lista_preco_id = p_lista_preco_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir esta lista de preço pois existem pedidos associados a ela';
  END IF;

  -- Verificar se há comissões usando esta lista
  IF EXISTS (
    SELECT 1 FROM vendedor_comissão 
    WHERE lista_preco_id = p_lista_preco_id
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir esta lista de preço pois existem comissões associadas a ela';
  END IF;

  -- Deletar produtos da lista (cascade)
  DELETE FROM produtos_listas_precos WHERE lista_preco_id = p_lista_preco_id;

  -- Deletar faixas de comissão (cascade)
  DELETE FROM listas_preco_comissionamento WHERE lista_preco_id = p_lista_preco_id;

  -- Deletar lista
  DELETE FROM listas_preco WHERE id = p_lista_preco_id;

  RETURN JSON_BUILD_OBJECT(
    'id', p_lista_preco_id,
    'nome', v_lista_nome,
    'deleted', true
  );
END;
$$;

COMMENT ON FUNCTION delete_lista_preco_v2 IS 
'Deleta uma lista de preço com verificação de dependências';

GRANT EXECUTE ON FUNCTION delete_lista_preco_v2 TO authenticated;

