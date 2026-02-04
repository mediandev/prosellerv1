-- ============================================================================
-- Migration 071: Add categoria_id to list_conta_corrente_v2
-- ============================================================================
-- Descrição: Adiciona campo categoria_id na resposta da função list_conta_corrente_v2
-- Data: 2026-02-04
-- ============================================================================

-- Atualizar a função list_conta_corrente_v2 para incluir categoria_id
CREATE OR REPLACE FUNCTION list_conta_corrente_v2(
  p_requesting_user_id UUID DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_cliente_id BIGINT DEFAULT NULL,
  p_tipo_compromisso TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_grupo_rede_id UUID DEFAULT NULL,
  p_busca TEXT DEFAULT NULL,
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
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_compromissos JSON;
  v_stats JSON;
  v_result JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100';
  END IF;

  v_offset := (p_page - 1) * p_limit;

  -- 2. VERIFICAR TIPO DE USUÁRIO
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_requesting_user_id
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF FOUND THEN
      v_is_backoffice := (v_user_tipo = 'backoffice');
    ELSE
      v_is_backoffice := FALSE;
    END IF;
  ELSE
    v_is_backoffice := FALSE;
  END IF;

  -- 3. CONTAR TOTAL DE COMPROMISSOS (com filtros)
  SELECT COUNT(DISTINCT ccc.id)
  INTO v_total_count
  FROM public.conta_corrente_cliente ccc
  INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
  LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
  WHERE (
    v_is_backoffice 
    OR EXISTS (
      SELECT 1 FROM public.cliente_vendedores cv
      WHERE cv.cliente_id = c.cliente_id
      AND cv.vendedor_id = p_requesting_user_id
    )
  )
  AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio)
  AND (p_data_fim IS NULL OR ccc.data <= p_data_fim)
  AND (p_cliente_id IS NULL OR ccc.cliente_id = p_cliente_id)
  AND (p_tipo_compromisso IS NULL OR LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso))
  AND (p_grupo_rede_id IS NULL OR c.grupo_id = p_grupo_rede_id)
  AND (p_busca IS NULL OR 
    ccc.titulo ILIKE '%' || p_busca || '%' OR
    ccc.descricao_longa ILIKE '%' || p_busca || '%' OR
    c.nome ILIKE '%' || p_busca || '%' OR
    c.nome_fantasia ILIKE '%' || p_busca || '%' OR
    COALESCE(gr.nome, '') ILIKE '%' || p_busca || '%'
  );

  -- 4. BUSCAR COMPROMISSOS COM PAGINAÇÃO E CÁLCULO DE STATUS
  -- Usar subquery para calcular valor_pago antes de JSON_AGG para evitar agregação aninhada
  SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', compromisso_completo.id::TEXT,
      'clienteId', COALESCE(compromisso_completo.cliente_id::TEXT, ''),
      'clienteNome', COALESCE(compromisso_completo.cliente_nome, 'Cliente sem nome'),
      'clienteGrupoRede', compromisso_completo.cliente_grupo_rede,
      'vendedorUuid', CASE WHEN compromisso_completo.vendedor_uuid IS NOT NULL THEN compromisso_completo.vendedor_uuid::TEXT ELSE NULL END,
      'data', compromisso_completo.data,
      'valor', compromisso_completo.valor,
      'titulo', COALESCE(compromisso_completo.titulo, ''),
      'descricao', compromisso_completo.descricao_longa,
      'tipoCompromisso', INITCAP(COALESCE(compromisso_completo.tipo_compromisso, 'Investimento')),
      'categoriaId', CASE WHEN compromisso_completo.categoria_id IS NOT NULL THEN compromisso_completo.categoria_id::TEXT ELSE NULL END,
      'arquivosAnexos', COALESCE(compromisso_completo.arquivos_anexos, ARRAY[]::TEXT[]),
      'valorPago', compromisso_completo.valor_pago,
      'valorPendente', compromisso_completo.valor - compromisso_completo.valor_pago,
      'status', COALESCE(compromisso_completo.status, 'Pendente'),
      'dataCriacao', compromisso_completo.created_at,
      'criadoPor', 'Sistema'
    )
  ), '[]'::JSON)
  INTO v_compromissos
  FROM (
    SELECT 
      ccc.id,
      ccc.cliente_id,
      ccc.categoria_id,
      COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome') AS cliente_nome,
      gr.nome AS cliente_grupo_rede,
      ccc.vendedor_uuid,
      ccc.data,
      ccc.valor,
      ccc.titulo,
      ccc.descricao_longa,
      ccc.tipo_compromisso,
      ccc.arquivos_anexos,
      ccc.created_at,
      COALESCE(SUM(pac.valor_pago), 0) AS valor_pago,
      CASE
        WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente'
        WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente'
        ELSE 'Pago Parcialmente'
      END AS status
    FROM (
      -- Selecionar IDs dos compromissos filtrados e ordenados
      SELECT ccc.id
      FROM public.conta_corrente_cliente ccc
      INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
      LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
      WHERE (
        v_is_backoffice 
        OR EXISTS (
          SELECT 1 FROM public.cliente_vendedores cv
          WHERE cv.cliente_id = c.cliente_id
          AND cv.vendedor_id = p_requesting_user_id
        )
      )
      AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio)
      AND (p_data_fim IS NULL OR ccc.data <= p_data_fim)
      AND (p_cliente_id IS NULL OR ccc.cliente_id = p_cliente_id)
      AND (p_tipo_compromisso IS NULL OR LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso))
      AND (p_grupo_rede_id IS NULL OR c.grupo_id = p_grupo_rede_id)
      AND (p_busca IS NULL OR 
        ccc.titulo ILIKE '%' || p_busca || '%' OR
        ccc.descricao_longa ILIKE '%' || p_busca || '%' OR
        c.nome ILIKE '%' || p_busca || '%' OR
        c.nome_fantasia ILIKE '%' || p_busca || '%' OR
        COALESCE(gr.nome, '') ILIKE '%' || p_busca || '%'
      )
      ORDER BY ccc.data DESC, ccc.created_at DESC
      LIMIT p_limit
      OFFSET v_offset
    ) AS compromissos_filtrados
    INNER JOIN public.conta_corrente_cliente ccc ON ccc.id = compromissos_filtrados.id
    INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
    LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
    LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id
    GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, 
             ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, 
             ccc.arquivos_anexos, ccc.created_at
    ORDER BY ccc.data DESC, ccc.created_at DESC
  ) AS compromisso_completo;

  -- 5. FILTRAR POR STATUS (se fornecido)
  IF p_status IS NOT NULL THEN
    SELECT COALESCE(JSON_AGG(item), '[]'::JSON)
    INTO v_compromissos
    FROM json_array_elements(v_compromissos) AS item
    WHERE (item->>'status') = p_status;
  END IF;

  -- 6. CALCULAR ESTATÍSTICAS
  WITH compromissos_com_status AS (
    SELECT 
      ccc.id,
      ccc.valor,
      COALESCE(SUM(pac.valor_pago), 0) AS valor_pago,
      CASE
        WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente'
        WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente'
        ELSE 'Pago Parcialmente'
      END AS status
    FROM public.conta_corrente_cliente ccc
    INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
    LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
    LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id
    WHERE (
      v_is_backoffice 
      OR EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = c.cliente_id
        AND cv.vendedor_id = p_requesting_user_id
      )
    )
    AND (p_data_inicio IS NULL OR ccc.data >= p_data_inicio)
    AND (p_data_fim IS NULL OR ccc.data <= p_data_fim)
    AND (p_cliente_id IS NULL OR ccc.cliente_id = p_cliente_id)
    AND (p_tipo_compromisso IS NULL OR LOWER(ccc.tipo_compromisso) = LOWER(p_tipo_compromisso))
    AND (p_grupo_rede_id IS NULL OR c.grupo_id = p_grupo_rede_id)
    AND (p_busca IS NULL OR 
      ccc.titulo ILIKE '%' || p_busca || '%' OR
      ccc.descricao_longa ILIKE '%' || p_busca || '%' OR
      c.nome ILIKE '%' || p_busca || '%' OR
      c.nome_fantasia ILIKE '%' || p_busca || '%' OR
      COALESCE(gr.nome, '') ILIKE '%' || p_busca || '%'
    )
    GROUP BY ccc.id, ccc.valor
  )
  SELECT JSON_BUILD_OBJECT(
    'totalCompromissos', COALESCE(SUM(CASE WHEN p_status IS NULL OR status = p_status THEN valor ELSE 0 END), 0),
    'totalPagamentos', COALESCE(SUM(CASE WHEN p_status IS NULL OR status = p_status THEN valor_pago ELSE 0 END), 0),
    'totalPendente', COALESCE(SUM(CASE WHEN p_status IS NULL OR status = p_status THEN valor - valor_pago ELSE 0 END), 0),
    'quantidadeCompromissos', COUNT(CASE WHEN p_status IS NULL OR status = p_status THEN 1 END),
    'quantidadePagamentos', (
      SELECT COUNT(DISTINCT pac.id)
      FROM public.pagamento_acordo_cliente pac
      INNER JOIN compromissos_com_status ccs ON ccs.id = pac.conta_corrente_id
      WHERE p_status IS NULL OR ccs.status = p_status
    )
  )
  INTO v_stats
  FROM compromissos_com_status;

  -- 7. RETORNAR RESULTADO
  SELECT JSON_BUILD_OBJECT(
    'compromissos', COALESCE(v_compromissos, '[]'::JSON),
    'estatisticas', COALESCE(v_stats, '{}'::JSON),
    'pagination', JSON_BUILD_OBJECT(
      'page', p_page,
      'limit', p_limit,
      'total', v_total_count,
      'total_pages', CEIL(v_total_count::NUMERIC / NULLIF(p_limit, 0))
    )
  )
  INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_conta_corrente_v2 IS 
'Lista compromissos de conta corrente com filtros, paginação e estatísticas (inclui categoria_id)';
