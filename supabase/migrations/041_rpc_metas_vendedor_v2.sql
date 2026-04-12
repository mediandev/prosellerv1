-- ============================================================================
-- Migration 041: Funções RPC para Metas de Vendedor (v2)
-- ============================================================================
-- Descrição: Cria funções RPC para gerenciamento de metas de vendedor
--            seguindo padrão arquitetural com validações e auditoria
-- Data: 2026-02-03
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO: create_meta_vendedor_v2
-- ============================================================================
-- Cria uma nova meta de vendedor com validações completas
-- ============================================================================

CREATE OR REPLACE FUNCTION create_meta_vendedor_v2(
  p_vendedor_id UUID,
  p_ano INTEGER,
  p_mes INTEGER,
  p_meta_valor NUMERIC,
  p_meta_percentual_crescimento NUMERIC DEFAULT NULL,
  p_periodo_referencia TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  vendedor_id UUID,
  vendedor_nome TEXT,
  ano INTEGER,
  mes INTEGER,
  meta_valor NUMERIC,
  meta_percentual_crescimento NUMERIC,
  periodo_referencia TEXT,
  data_criacao TIMESTAMPTZ,
  data_atualizacao TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_meta_id INTEGER;
  v_user_tipo TEXT;
  v_vendedor_nome TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_vendedor_id IS NULL THEN
    RAISE EXCEPTION 'vendedor_id é obrigatório';
  END IF;

  IF p_ano IS NULL OR p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido (deve ser entre 2000 e 2100)';
  END IF;

  IF p_mes IS NULL OR p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês inválido (deve ser entre 1 e 12)';
  END IF;

  IF p_meta_valor IS NULL OR p_meta_valor < 0 THEN
    RAISE EXCEPTION 'meta_valor deve ser um número maior ou igual a 0';
  END IF;

  -- 2. VERIFICAR SE VENDEDOR EXISTE E OBTER NOME
  SELECT dv.nome, u.tipo INTO v_vendedor_nome, v_user_tipo
  FROM public.dados_vendedor dv
  INNER JOIN public.user u ON u.user_id = dv.user_id
  WHERE dv.user_id = p_vendedor_id
  AND u.ativo = TRUE
  AND u.deleted_at IS NULL
  AND dv.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendedor não encontrado ou inativo';
  END IF;

  -- 3. VERIFICAR PERMISSÕES (se created_by fornecido)
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar metas';
    END IF;
  END IF;

  -- 4. VERIFICAR UNICIDADE (vendedor_id + ano + mês)
  IF EXISTS (
    SELECT 1 FROM public.metas_vendedor m
    WHERE m.vendedor_id = p_vendedor_id
    AND m.ano = p_ano
    AND m.mes = p_mes
  ) THEN
    RAISE EXCEPTION 'Já existe uma meta para este vendedor no período especificado';
  END IF;

  -- 5. CRIAR META
  INSERT INTO public.metas_vendedor (
    vendedor_id,
    ano,
    mes,
    meta_valor,
    meta_percentual_crescimento,
    periodo_referencia,
    data_criacao,
    data_atualizacao
  ) VALUES (
    p_vendedor_id,
    p_ano,
    p_mes,
    p_meta_valor,
    p_meta_percentual_crescimento,
    p_periodo_referencia,
    NOW(),
    NOW()
  )
  RETURNING metas_vendedor.id INTO v_meta_id;

  -- 6. RETORNAR DADOS DA META CRIADA
  RETURN QUERY
  SELECT 
    m.id,
    m.vendedor_id,
    COALESCE(dv.nome, u.nome, '') AS vendedor_nome,
    m.ano,
    m.mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    m.data_criacao,
    m.data_atualizacao
  FROM public.metas_vendedor m
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
  LEFT JOIN public.user u ON u.user_id = m.vendedor_id
  WHERE m.id = v_meta_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_meta_vendedor_v2 IS 
'Cria uma nova meta de vendedor com validações de unicidade (vendedor_id + ano + mês)';

GRANT EXECUTE ON FUNCTION create_meta_vendedor_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_meta_vendedor_v2 FROM anon;

-- ============================================================================
-- 2. FUNÇÃO: get_meta_vendedor_v2
-- ============================================================================
-- Busca uma meta por ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_meta_vendedor_v2(
  p_id INTEGER
)
RETURNS TABLE (
  id INTEGER,
  vendedor_id UUID,
  vendedor_nome TEXT,
  ano INTEGER,
  mes INTEGER,
  meta_valor NUMERIC,
  meta_percentual_crescimento NUMERIC,
  periodo_referencia TEXT,
  data_criacao TIMESTAMPTZ,
  data_atualizacao TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. BUSCAR E RETORNAR
  RETURN QUERY
  SELECT 
    m.id,
    m.vendedor_id,
    COALESCE(dv.nome, u.nome, '') AS vendedor_nome,
    m.ano,
    m.mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    m.data_criacao,
    m.data_atualizacao
  FROM public.metas_vendedor m
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
  LEFT JOIN public.user u ON u.user_id = m.vendedor_id
  WHERE m.id = p_id;

  -- 3. VERIFICAR SE ENCONTROU
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_meta_vendedor_v2 IS 
'Busca uma meta por ID';

GRANT EXECUTE ON FUNCTION get_meta_vendedor_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_meta_vendedor_v2 TO anon;

-- ============================================================================
-- 3. FUNÇÃO: list_metas_vendedor_v2
-- ============================================================================
-- Lista metas com filtros e paginação
-- ============================================================================

CREATE OR REPLACE FUNCTION list_metas_vendedor_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_ano INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count INTEGER;
  v_metas JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. CONTAR TOTAL (com filtros)
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.metas_vendedor m
  WHERE (p_ano IS NULL OR m.ano = p_ano)
  AND (p_mes IS NULL OR m.mes = p_mes)
  AND (p_vendedor_id IS NULL OR m.vendedor_id = p_vendedor_id);

  -- 3. BUSCAR METAS (com paginação)
  SELECT JSON_BUILD_OBJECT(
    'metas', COALESCE(JSON_AGG(meta_data), '[]'::JSON),
    'total', v_total_count,
    'page', p_page,
    'limit', p_limit,
    'total_pages', CEIL(v_total_count::NUMERIC / p_limit)
  )
  INTO v_metas
  FROM (
    SELECT JSON_BUILD_OBJECT(
      'id', m.id,
      'vendedor_id', m.vendedor_id,
      'vendedor_nome', COALESCE(dv.nome, u.nome, ''),
      'ano', m.ano,
      'mes', m.mes,
      'meta_valor', m.meta_valor,
      'meta_percentual_crescimento', m.meta_percentual_crescimento,
      'periodo_referencia', m.periodo_referencia,
      'data_criacao', m.data_criacao,
      'data_atualizacao', m.data_atualizacao
    ) AS meta_data
    FROM public.metas_vendedor m
    LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
    LEFT JOIN public.user u ON u.user_id = m.vendedor_id
    WHERE (p_ano IS NULL OR m.ano = p_ano)
    AND (p_mes IS NULL OR m.mes = p_mes)
    AND (p_vendedor_id IS NULL OR m.vendedor_id = p_vendedor_id)
    ORDER BY m.ano DESC, m.mes DESC, m.vendedor_id
    LIMIT p_limit
    OFFSET v_offset
  ) AS metas_subquery;

  -- 4. RETORNAR
  RETURN v_metas;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_metas_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_metas_vendedor_v2 IS 
'Lista metas com filtros de ano, mês e vendedor, com paginação';

GRANT EXECUTE ON FUNCTION list_metas_vendedor_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION list_metas_vendedor_v2 TO anon;

-- ============================================================================
-- 4. FUNÇÃO: update_meta_vendedor_v2
-- ============================================================================
-- Atualiza uma meta existente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_meta_vendedor_v2(
  p_id INTEGER,
  p_vendedor_id UUID DEFAULT NULL,
  p_ano INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_meta_valor NUMERIC DEFAULT NULL,
  p_meta_percentual_crescimento NUMERIC DEFAULT NULL,
  p_periodo_referencia TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  vendedor_id UUID,
  vendedor_nome TEXT,
  ano INTEGER,
  mes INTEGER,
  meta_valor NUMERIC,
  meta_percentual_crescimento NUMERIC,
  periodo_referencia TEXT,
  data_criacao TIMESTAMPTZ,
  data_atualizacao TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. VERIFICAR SE EXISTE
  IF NOT EXISTS (
    SELECT 1 FROM public.metas_vendedor m
    WHERE m.id = p_id
  ) THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar metas';
    END IF;
  END IF;

  -- 4. VALIDAÇÕES DE VALORES
  IF p_ano IS NOT NULL AND (p_ano < 2000 OR p_ano > 2100) THEN
    RAISE EXCEPTION 'Ano inválido (deve ser entre 2000 e 2100)';
  END IF;

  IF p_mes IS NOT NULL AND (p_mes < 1 OR p_mes > 12) THEN
    RAISE EXCEPTION 'Mês inválido (deve ser entre 1 e 12)';
  END IF;

  IF p_meta_valor IS NOT NULL AND p_meta_valor < 0 THEN
    RAISE EXCEPTION 'meta_valor deve ser um número maior ou igual a 0';
  END IF;

  -- 5. VERIFICAR UNICIDADE (se ano/mês/vendedor_id estiver sendo alterado)
  IF (p_vendedor_id IS NOT NULL OR p_ano IS NOT NULL OR p_mes IS NOT NULL) THEN
    DECLARE
      v_current_vendedor_id UUID;
      v_current_ano INTEGER;
      v_current_mes INTEGER;
    BEGIN
      SELECT m.vendedor_id, m.ano, m.mes
      INTO v_current_vendedor_id, v_current_ano, v_current_mes
      FROM public.metas_vendedor m
      WHERE m.id = p_id;

      IF EXISTS (
        SELECT 1 FROM public.metas_vendedor m
        WHERE m.id != p_id
        AND m.vendedor_id = COALESCE(p_vendedor_id, v_current_vendedor_id)
        AND m.ano = COALESCE(p_ano, v_current_ano)
        AND m.mes = COALESCE(p_mes, v_current_mes)
      ) THEN
        RAISE EXCEPTION 'Já existe outra meta para este vendedor no período especificado';
      END IF;
    END;
  END IF;

  -- 6. ATUALIZAR
  UPDATE public.metas_vendedor m
  SET
    vendedor_id = COALESCE(p_vendedor_id, m.vendedor_id),
    ano = COALESCE(p_ano, m.ano),
    mes = COALESCE(p_mes, m.mes),
    meta_valor = COALESCE(p_meta_valor, m.meta_valor),
    meta_percentual_crescimento = CASE 
      WHEN p_meta_percentual_crescimento IS NOT NULL THEN p_meta_percentual_crescimento
      ELSE m.meta_percentual_crescimento
    END,
    periodo_referencia = CASE 
      WHEN p_periodo_referencia IS NOT NULL THEN NULLIF(TRIM(p_periodo_referencia), '')
      ELSE m.periodo_referencia
    END,
    data_atualizacao = NOW()
  WHERE m.id = p_id;

  -- 7. RETORNAR
  RETURN QUERY
  SELECT 
    m.id,
    m.vendedor_id,
    COALESCE(dv.nome, u.nome, '') AS vendedor_nome,
    m.ano,
    m.mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    m.data_criacao,
    m.data_atualizacao
  FROM public.metas_vendedor m
  LEFT JOIN public.dados_vendedor dv ON dv.user_id = m.vendedor_id
  LEFT JOIN public.user u ON u.user_id = m.vendedor_id
  WHERE m.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_meta_vendedor_v2 IS 
'Atualiza uma meta existente com validações de unicidade';

GRANT EXECUTE ON FUNCTION update_meta_vendedor_v2 TO authenticated;

-- ============================================================================
-- 5. FUNÇÃO: delete_meta_vendedor_v2
-- ============================================================================
-- Exclui uma meta (hard delete, pois não há deleted_at na tabela)
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_meta_vendedor_v2(
  p_id INTEGER,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. VERIFICAR SE EXISTE
  IF NOT EXISTS (
    SELECT 1 FROM public.metas_vendedor m
    WHERE m.id = p_id
  ) THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir metas';
    END IF;
  END IF;

  -- 4. EXCLUIR (hard delete)
  DELETE FROM public.metas_vendedor m
  WHERE m.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_meta_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION delete_meta_vendedor_v2 IS 
'Exclui uma meta (hard delete)';

GRANT EXECUTE ON FUNCTION delete_meta_vendedor_v2 TO authenticated;

-- ============================================================================
-- 6. FUNÇÃO: copiar_metas_vendedor_v2
-- ============================================================================
-- Copia metas de um período para outro
-- ============================================================================

CREATE OR REPLACE FUNCTION copiar_metas_vendedor_v2(
  p_de_ano INTEGER,
  p_de_mes INTEGER,
  p_para_ano INTEGER,
  p_para_mes INTEGER,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  copied_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_copied_count INTEGER := 0;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_de_ano IS NULL OR p_de_ano < 2000 OR p_de_ano > 2100 THEN
    RAISE EXCEPTION 'Ano de origem inválido';
  END IF;

  IF p_de_mes IS NULL OR p_de_mes < 1 OR p_de_mes > 12 THEN
    RAISE EXCEPTION 'Mês de origem inválido';
  END IF;

  IF p_para_ano IS NULL OR p_para_ano < 2000 OR p_para_ano > 2100 THEN
    RAISE EXCEPTION 'Ano de destino inválido';
  END IF;

  IF p_para_mes IS NULL OR p_para_mes < 1 OR p_para_mes > 12 THEN
    RAISE EXCEPTION 'Mês de destino inválido';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem copiar metas';
    END IF;
  END IF;

  -- 3. COPIAR METAS (usando INSERT ... SELECT com ON CONFLICT DO NOTHING)
  INSERT INTO public.metas_vendedor (
    vendedor_id,
    ano,
    mes,
    meta_valor,
    meta_percentual_crescimento,
    periodo_referencia,
    data_criacao,
    data_atualizacao
  )
  SELECT 
    m.vendedor_id,
    p_para_ano,
    p_para_mes,
    m.meta_valor,
    m.meta_percentual_crescimento,
    m.periodo_referencia,
    NOW(),
    NOW()
  FROM public.metas_vendedor m
  WHERE m.ano = p_de_ano
  AND m.mes = p_de_mes
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_copied_count = ROW_COUNT;

  -- 4. RETORNAR
  RETURN QUERY
  SELECT v_copied_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in copiar_metas_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION copiar_metas_vendedor_v2 IS 
'Copia metas de um período (ano/mês) para outro, ignorando duplicatas';

GRANT EXECUTE ON FUNCTION copiar_metas_vendedor_v2 TO authenticated;

-- ============================================================================
-- 7. FUNÇÃO: get_meta_total_vendedor_v2
-- ============================================================================
-- Calcula o total de metas por período
-- ============================================================================

CREATE OR REPLACE FUNCTION get_meta_total_vendedor_v2(
  p_ano INTEGER,
  p_mes INTEGER
)
RETURNS TABLE (
  total NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_ano IS NULL OR p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido';
  END IF;

  IF p_mes IS NULL OR p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês inválido';
  END IF;

  -- 2. CALCULAR TOTAL
  SELECT COALESCE(SUM(m.meta_valor), 0)
  INTO v_total
  FROM public.metas_vendedor m
  WHERE m.ano = p_ano
  AND m.mes = p_mes;

  -- 3. RETORNAR
  RETURN QUERY
  SELECT v_total;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_meta_total_vendedor_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_meta_total_vendedor_v2 IS 
'Calcula o total de metas (soma de meta_valor) para um período específico';

GRANT EXECUTE ON FUNCTION get_meta_total_vendedor_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_meta_total_vendedor_v2 TO anon;

-- ============================================================================
-- 8. CRIAR ÍNDICE ÚNICO PARA GARANTIR UNICIDADE
-- ============================================================================
-- Cria índice único para evitar duplicatas de vendedor_id + ano + mês
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_metas_vendedor_unique_periodo
ON public.metas_vendedor(vendedor_id, ano, mes);

COMMENT ON INDEX idx_metas_vendedor_unique_periodo IS 
'Garante unicidade de meta por vendedor em cada período (ano/mês)';
