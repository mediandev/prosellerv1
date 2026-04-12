-- ============================================================================
-- Migration 074: Add categoria_nome to conta_corrente RPC functions
-- ============================================================================
-- Descrição: Adiciona campo categoria_nome (nome da categoria) nas respostas
--            de todas as funções RPC de conta corrente
-- Data: 2026-02-04
-- ============================================================================

-- ============================================================================
-- 1. ATUALIZAR list_conta_corrente_v2
-- ============================================================================
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
      'categoria', compromisso_completo.categoria_nome,
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
      cat.nome AS categoria_nome,
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
    LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL
    LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id
    GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, 
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
      WHERE (p_status IS NULL OR ccs.status = p_status)
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
'Lista compromissos de conta corrente com filtros, paginação e estatísticas (inclui categoria_id e categoria_nome)';

-- ============================================================================
-- 2. ATUALIZAR get_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS get_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION get_conta_corrente_v2(
  p_id BIGINT,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_compromisso JSON;
  v_pagamentos JSON;
  v_result JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

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

  -- 3. BUSCAR COMPROMISSO
  SELECT JSON_BUILD_OBJECT(
    'id', ccc.id::TEXT,
    'clienteId', ccc.cliente_id::TEXT,
    'clienteNome', COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome'),
    'clienteGrupoRede', gr.nome,
    'vendedorUuid', ccc.vendedor_uuid::TEXT,
    'data', ccc.data,
    'valor', ccc.valor,
    'titulo', ccc.titulo,
    'descricao', ccc.descricao_longa,
    'tipoCompromisso', INITCAP(ccc.tipo_compromisso),
    'categoriaId', CASE WHEN ccc.categoria_id IS NOT NULL THEN ccc.categoria_id::TEXT ELSE NULL END,
    'categoria', cat.nome,
    'arquivosAnexos', COALESCE(ccc.arquivos_anexos, ARRAY[]::TEXT[]),
    'valorPago', COALESCE(SUM(pac.valor_pago), 0),
    'valorPendente', ccc.valor - COALESCE(SUM(pac.valor_pago), 0),
    'status', CASE
      WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente'
      WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente'
      ELSE 'Pago Parcialmente'
    END,
    'dataCriacao', ccc.created_at,
    'criadoPor', 'Sistema'
  )
  INTO v_compromisso
  FROM public.conta_corrente_cliente ccc
  INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
  LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
  LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL
  LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id
  WHERE ccc.id = p_id
  AND (
    v_is_backoffice 
    OR EXISTS (
      SELECT 1 FROM public.cliente_vendedores cv
      WHERE cv.cliente_id = c.cliente_id
      AND cv.vendedor_id = p_requesting_user_id
    )
  )
  GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, 
           ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, 
           ccc.arquivos_anexos, ccc.created_at;

  IF v_compromisso IS NULL THEN
    RAISE EXCEPTION 'Compromisso não encontrado';
  END IF;

  -- 4. BUSCAR PAGAMENTOS RELACIONADOS
  SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', pac.id::TEXT,
      'compromissoId', pac.conta_corrente_id::TEXT,
      'dataPagamento', pac.data_pagamento,
      'formaPagamento', pac.forma_pagamento,
      'valor', pac.valor_pago,
      'categoriaId', CASE WHEN pac.categoria_id IS NOT NULL THEN pac.categoria_id::TEXT ELSE NULL END,
      'categoria', cat_pag.nome,
      'arquivoComprovante', pac.arquivo_comprovante,
      'dataCriacao', pac.created_at,
      'criadoPor', 'Sistema'
    )
    ORDER BY pac.data_pagamento DESC, pac.created_at DESC
  ), '[]'::JSON)
  INTO v_pagamentos
  FROM public.pagamento_acordo_cliente pac
  LEFT JOIN public.categorias_conta_corrente cat_pag ON cat_pag.id = pac.categoria_id AND cat_pag.deleted_at IS NULL
  WHERE pac.conta_corrente_id = p_id;

  -- 5. RETORNAR RESULTADO
  SELECT JSON_BUILD_OBJECT(
    'compromisso', v_compromisso,
    'pagamentos', COALESCE(v_pagamentos, '[]'::JSON)
  )
  INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_conta_corrente_v2 IS 
'Busca compromisso por ID com pagamentos relacionados (inclui categoria_id e categoria_nome)';

-- ============================================================================
-- 3. ATUALIZAR create_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS create_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION create_conta_corrente_v2(
  p_cliente_id BIGINT,
  p_data DATE,
  p_valor NUMERIC,
  p_titulo TEXT,
  p_tipo_compromisso TEXT,
  p_descricao_longa TEXT DEFAULT NULL,
  p_vendedor_uuid UUID DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_arquivos_anexos TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  cliente_id BIGINT,
  cliente_nome TEXT,
  cliente_grupo_rede TEXT,
  vendedor_uuid UUID,
  data DATE,
  valor NUMERIC,
  titulo TEXT,
  descricao_longa TEXT,
  tipo_compromisso TEXT,
  categoria_id UUID,
  categoria_nome TEXT,
  arquivos_anexos TEXT[],
  valor_pago NUMERIC,
  valor_pendente NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_new_id BIGINT;
  v_user_tipo TEXT;
  v_cliente_nome TEXT;
  v_grupo_rede_nome TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'data é obrigatória';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'valor deve ser maior que zero';
  END IF;

  IF p_titulo IS NULL OR LENGTH(TRIM(p_titulo)) < 2 THEN
    RAISE EXCEPTION 'título deve ter pelo menos 2 caracteres';
  END IF;

  IF p_tipo_compromisso IS NULL OR LOWER(p_tipo_compromisso) NOT IN ('investimento', 'ressarcimento') THEN
    RAISE EXCEPTION 'tipo_compromisso deve ser "investimento" ou "ressarcimento"';
  END IF;

  -- 2. VERIFICAR SE CLIENTE EXISTE E OBTER NOME
  SELECT c.nome, c.nome_fantasia, gr.nome
  INTO v_cliente_nome, v_cliente_nome, v_grupo_rede_nome
  FROM public.cliente c
  LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
  WHERE c.cliente_id = p_cliente_id
  AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
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

    -- Vendedores só podem criar compromissos para seus próprios clientes
    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = p_cliente_id
        AND cv.vendedor_id = p_created_by
      ) THEN
        RAISE EXCEPTION 'Vendedor não tem permissão para criar compromisso para este cliente';
      END IF;
    END IF;
  END IF;

  -- 4. CRIAR COMPROMISSO
  INSERT INTO public.conta_corrente_cliente (
    cliente_id,
    vendedor_uuid,
    data,
    valor,
    titulo,
    descricao_longa,
    tipo_compromisso,
    categoria_id,
    arquivos_anexos,
    created_at
  ) VALUES (
    p_cliente_id,
    p_vendedor_uuid,
    p_data,
    p_valor,
    TRIM(p_titulo),
    p_descricao_longa,
    LOWER(p_tipo_compromisso),
    p_categoria_id,
    COALESCE(p_arquivos_anexos, ARRAY[]::TEXT[]),
    NOW()
  )
  RETURNING conta_corrente_cliente.id INTO v_new_id;

  -- 5. RETORNAR DADOS DO COMPROMISSO CRIADO
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.cliente_id,
    COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome') AS cliente_nome,
    gr.nome AS cliente_grupo_rede,
    ccc.vendedor_uuid,
    ccc.data,
    ccc.valor,
    ccc.titulo,
    ccc.descricao_longa,
    INITCAP(ccc.tipo_compromisso) AS tipo_compromisso,
    ccc.categoria_id,
    cat.nome AS categoria_nome,
    COALESCE(ccc.arquivos_anexos, ARRAY[]::TEXT[]) AS arquivos_anexos,
    0::NUMERIC AS valor_pago,
    ccc.valor AS valor_pendente,
    'Pendente'::TEXT AS status,
    ccc.created_at
  FROM public.conta_corrente_cliente ccc
  INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
  LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
  LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL
  WHERE ccc.id = v_new_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_conta_corrente_v2 IS 
'Cria um novo compromisso de conta corrente com validações (inclui categoria_id e categoria_nome)';

-- ============================================================================
-- 4. ATUALIZAR update_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS update_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION update_conta_corrente_v2(
  p_id BIGINT,
  p_data DATE DEFAULT NULL,
  p_valor NUMERIC DEFAULT NULL,
  p_titulo TEXT DEFAULT NULL,
  p_descricao_longa TEXT DEFAULT NULL,
  p_tipo_compromisso TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_arquivos_anexos TEXT[] DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  cliente_id BIGINT,
  cliente_nome TEXT,
  cliente_grupo_rede TEXT,
  vendedor_uuid UUID,
  data DATE,
  valor NUMERIC,
  titulo TEXT,
  descricao_longa TEXT,
  tipo_compromisso TEXT,
  categoria_id UUID,
  categoria_nome TEXT,
  arquivos_anexos TEXT[],
  valor_pago NUMERIC,
  valor_pendente NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_cliente_id BIGINT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. VERIFICAR SE EXISTE
  SELECT ccc.cliente_id INTO v_cliente_id
  FROM public.conta_corrente_cliente ccc
  WHERE ccc.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compromisso não encontrado';
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

    -- Vendedores só podem atualizar compromissos de seus próprios clientes
    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = v_cliente_id
        AND cv.vendedor_id = p_updated_by
      ) THEN
        RAISE EXCEPTION 'Vendedor não tem permissão para atualizar este compromisso';
      END IF;
    END IF;
  END IF;

  -- 4. VALIDAÇÕES DE DADOS
  IF p_titulo IS NOT NULL AND LENGTH(TRIM(p_titulo)) < 2 THEN
    RAISE EXCEPTION 'título deve ter pelo menos 2 caracteres';
  END IF;

  IF p_valor IS NOT NULL AND p_valor <= 0 THEN
    RAISE EXCEPTION 'valor deve ser maior que zero';
  END IF;

  IF p_tipo_compromisso IS NOT NULL AND LOWER(p_tipo_compromisso) NOT IN ('investimento', 'ressarcimento') THEN
    RAISE EXCEPTION 'tipo_compromisso deve ser "investimento" ou "ressarcimento"';
  END IF;

  -- 5. ATUALIZAR
  UPDATE public.conta_corrente_cliente ccc
  SET
    data = COALESCE(p_data, ccc.data),
    valor = COALESCE(p_valor, ccc.valor),
    titulo = COALESCE(NULLIF(TRIM(p_titulo), ''), ccc.titulo),
    descricao_longa = CASE 
      WHEN p_descricao_longa IS NULL THEN ccc.descricao_longa
      ELSE p_descricao_longa
    END,
    tipo_compromisso = COALESCE(LOWER(p_tipo_compromisso), ccc.tipo_compromisso),
    categoria_id = CASE 
      WHEN p_categoria_id IS NULL THEN ccc.categoria_id
      ELSE p_categoria_id
    END,
    arquivos_anexos = COALESCE(p_arquivos_anexos, ccc.arquivos_anexos)
  WHERE ccc.id = p_id;

  -- 6. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.cliente_id,
    COALESCE(c.nome, c.nome_fantasia, 'Cliente sem nome') AS cliente_nome,
    gr.nome AS cliente_grupo_rede,
    ccc.vendedor_uuid,
    ccc.data,
    ccc.valor,
    ccc.titulo,
    ccc.descricao_longa,
    INITCAP(ccc.tipo_compromisso) AS tipo_compromisso,
    ccc.categoria_id,
    cat.nome AS categoria_nome,
    COALESCE(ccc.arquivos_anexos, ARRAY[]::TEXT[]) AS arquivos_anexos,
    COALESCE(SUM(pac.valor_pago), 0) AS valor_pago,
    ccc.valor - COALESCE(SUM(pac.valor_pago), 0) AS valor_pendente,
    CASE
      WHEN COALESCE(SUM(pac.valor_pago), 0) = 0 THEN 'Pendente'
      WHEN COALESCE(SUM(pac.valor_pago), 0) >= ccc.valor THEN 'Pago Integralmente'
      ELSE 'Pago Parcialmente'
    END AS status,
    ccc.created_at
  FROM public.conta_corrente_cliente ccc
  INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
  LEFT JOIN public.grupos_redes gr ON gr.id = c.grupo_id
  LEFT JOIN public.categorias_conta_corrente cat ON cat.id = ccc.categoria_id AND cat.deleted_at IS NULL
  LEFT JOIN public.pagamento_acordo_cliente pac ON pac.conta_corrente_id = ccc.id
  WHERE ccc.id = p_id
  GROUP BY ccc.id, ccc.cliente_id, ccc.categoria_id, cat.nome, c.nome, c.nome_fantasia, gr.nome, ccc.vendedor_uuid, 
           ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.tipo_compromisso, 
           ccc.arquivos_anexos, ccc.created_at;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_conta_corrente_v2 IS 
'Atualiza um compromisso existente com validações (inclui categoria_id e categoria_nome)';

-- ============================================================================
-- 5. ATUALIZAR list_pagamentos_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS list_pagamentos_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION list_pagamentos_conta_corrente_v2(
  p_conta_corrente_id BIGINT,
  p_requesting_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_is_backoffice BOOLEAN;
  v_pagamentos JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_conta_corrente_id IS NULL THEN
    RAISE EXCEPTION 'conta_corrente_id é obrigatório';
  END IF;

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

  -- 3. VERIFICAR PERMISSÃO DE ACESSO AO COMPROMISSO
  IF NOT EXISTS (
    SELECT 1 FROM public.conta_corrente_cliente ccc
    INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id
    WHERE ccc.id = p_conta_corrente_id
    AND (
      v_is_backoffice 
      OR EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = c.cliente_id
        AND cv.vendedor_id = p_requesting_user_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'Compromisso não encontrado ou sem permissão de acesso';
  END IF;

  -- 4. BUSCAR PAGAMENTOS
  SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', pac.id::TEXT,
      'compromissoId', pac.conta_corrente_id::TEXT,
      'dataPagamento', pac.data_pagamento,
      'formaPagamento', pac.forma_pagamento,
      'valor', pac.valor_pago,
      'categoriaId', CASE WHEN pac.categoria_id IS NOT NULL THEN pac.categoria_id::TEXT ELSE NULL END,
      'categoria', cat.nome,
      'arquivoComprovante', pac.arquivo_comprovante,
      'dataCriacao', pac.created_at,
      'criadoPor', 'Sistema'
    )
    ORDER BY pac.data_pagamento DESC, pac.created_at DESC
  ), '[]'::JSON)
  INTO v_pagamentos
  FROM public.pagamento_acordo_cliente pac
  LEFT JOIN public.categorias_conta_corrente cat ON cat.id = pac.categoria_id AND cat.deleted_at IS NULL
  WHERE pac.conta_corrente_id = p_conta_corrente_id;

  RETURN v_pagamentos;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in list_pagamentos_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION list_pagamentos_conta_corrente_v2 IS 
'Lista pagamentos de um compromisso específico (inclui categoria_id e categoria_nome)';

-- ============================================================================
-- 6. ATUALIZAR create_pagamento_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS create_pagamento_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION create_pagamento_conta_corrente_v2(
  p_conta_corrente_id BIGINT,
  p_data_pagamento DATE,
  p_forma_pagamento TEXT,
  p_valor_pago NUMERIC,
  p_arquivo_comprovante TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  conta_corrente_id BIGINT,
  data_pagamento DATE,
  forma_pagamento TEXT,
  valor_pago NUMERIC,
  categoria_id UUID,
  categoria_nome TEXT,
  arquivo_comprovante TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_new_id BIGINT;
  v_user_tipo TEXT;
  v_cliente_id BIGINT;
  v_valor_compromisso NUMERIC;
  v_valor_total_pago NUMERIC;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_conta_corrente_id IS NULL THEN
    RAISE EXCEPTION 'conta_corrente_id é obrigatório';
  END IF;

  IF p_data_pagamento IS NULL THEN
    RAISE EXCEPTION 'data_pagamento é obrigatória';
  END IF;

  IF p_forma_pagamento IS NULL OR LENGTH(TRIM(p_forma_pagamento)) < 2 THEN
    RAISE EXCEPTION 'forma_pagamento é obrigatória e deve ter pelo menos 2 caracteres';
  END IF;

  IF p_valor_pago IS NULL OR p_valor_pago <= 0 THEN
    RAISE EXCEPTION 'valor_pago deve ser maior que zero';
  END IF;

  -- 2. VERIFICAR SE COMPROMISSO EXISTE E OBTER DADOS
  SELECT ccc.cliente_id, ccc.valor
  INTO v_cliente_id, v_valor_compromisso
  FROM public.conta_corrente_cliente ccc
  WHERE ccc.id = p_conta_corrente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compromisso não encontrado';
  END IF;

  -- 3. VERIFICAR PERMISSÕES
  IF p_created_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    -- Vendedores só podem criar pagamentos para compromissos de seus próprios clientes
    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = v_cliente_id
        AND cv.vendedor_id = p_created_by
      ) THEN
        RAISE EXCEPTION 'Vendedor não tem permissão para criar pagamento para este compromisso';
      END IF;
    END IF;
  END IF;

  -- 4. VERIFICAR SE VALOR TOTAL PAGO NÃO EXCEDE VALOR DO COMPROMISSO
  SELECT COALESCE(SUM(pac.valor_pago), 0)
  INTO v_valor_total_pago
  FROM public.pagamento_acordo_cliente pac
  WHERE pac.conta_corrente_id = p_conta_corrente_id;

  IF (v_valor_total_pago + p_valor_pago) > v_valor_compromisso THEN
    RAISE EXCEPTION 'Valor total pago não pode exceder o valor do compromisso';
  END IF;

  -- 5. CRIAR PAGAMENTO
  INSERT INTO public.pagamento_acordo_cliente (
    conta_corrente_id,
    data_pagamento,
    forma_pagamento,
    valor_pago,
    categoria_id,
    arquivo_comprovante,
    created_at
  ) VALUES (
    p_conta_corrente_id,
    p_data_pagamento,
    TRIM(p_forma_pagamento),
    p_valor_pago,
    p_categoria_id,
    p_arquivo_comprovante,
    NOW()
  )
  RETURNING pagamento_acordo_cliente.id INTO v_new_id;

  -- 6. RETORNAR DADOS DO PAGAMENTO CRIADO
  RETURN QUERY
  SELECT 
    pac.id,
    pac.conta_corrente_id,
    pac.data_pagamento,
    pac.forma_pagamento,
    pac.valor_pago,
    pac.categoria_id,
    cat.nome AS categoria_nome,
    pac.arquivo_comprovante,
    pac.created_at
  FROM public.pagamento_acordo_cliente pac
  LEFT JOIN public.categorias_conta_corrente cat ON cat.id = pac.categoria_id AND cat.deleted_at IS NULL
  WHERE pac.id = v_new_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_pagamento_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION create_pagamento_conta_corrente_v2 IS 
'Cria um novo pagamento vinculado a um compromisso (inclui categoria_id e categoria_nome)';

-- ============================================================================
-- 7. ATUALIZAR update_pagamento_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS update_pagamento_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION update_pagamento_conta_corrente_v2(
  p_id BIGINT,
  p_data_pagamento DATE DEFAULT NULL,
  p_forma_pagamento TEXT DEFAULT NULL,
  p_valor_pago NUMERIC DEFAULT NULL,
  p_arquivo_comprovante TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  conta_corrente_id BIGINT,
  data_pagamento DATE,
  forma_pagamento TEXT,
  valor_pago NUMERIC,
  categoria_id UUID,
  categoria_nome TEXT,
  arquivo_comprovante TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user_tipo TEXT;
  v_conta_corrente_id BIGINT;
  v_cliente_id BIGINT;
  v_valor_compromisso NUMERIC;
  v_valor_total_pago NUMERIC;
  v_valor_pagamento_atual NUMERIC;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- 2. VERIFICAR SE EXISTE E OBTER DADOS
  SELECT pac.conta_corrente_id, pac.valor_pago
  INTO v_conta_corrente_id, v_valor_pagamento_atual
  FROM public.pagamento_acordo_cliente pac
  WHERE pac.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  -- 3. OBTER DADOS DO COMPROMISSO
  SELECT ccc.cliente_id, ccc.valor
  INTO v_cliente_id, v_valor_compromisso
  FROM public.conta_corrente_cliente ccc
  WHERE ccc.id = v_conta_corrente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compromisso não encontrado';
  END IF;

  -- 4. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    -- Vendedores só podem atualizar pagamentos de compromissos de seus próprios clientes
    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente_vendedores cv
        WHERE cv.cliente_id = v_cliente_id
        AND cv.vendedor_id = p_updated_by
      ) THEN
        RAISE EXCEPTION 'Vendedor não tem permissão para atualizar este pagamento';
      END IF;
    END IF;
  END IF;

  -- 5. VALIDAÇÕES DE DADOS
  IF p_valor_pago IS NOT NULL AND p_valor_pago <= 0 THEN
    RAISE EXCEPTION 'valor_pago deve ser maior que zero';
  END IF;

  IF p_forma_pagamento IS NOT NULL AND LENGTH(TRIM(p_forma_pagamento)) < 2 THEN
    RAISE EXCEPTION 'forma_pagamento deve ter pelo menos 2 caracteres';
  END IF;

  -- 6. VERIFICAR SE VALOR TOTAL PAGO NÃO EXCEDE VALOR DO COMPROMISSO (se valor está sendo alterado)
  IF p_valor_pago IS NOT NULL THEN
    SELECT COALESCE(SUM(pac2.valor_pago), 0)
    INTO v_valor_total_pago
    FROM public.pagamento_acordo_cliente pac2
    WHERE pac2.conta_corrente_id = v_conta_corrente_id
    AND pac2.id != p_id;

    IF (v_valor_total_pago + p_valor_pago) > v_valor_compromisso THEN
      RAISE EXCEPTION 'Valor total pago não pode exceder o valor do compromisso';
    END IF;
  END IF;

  -- 7. ATUALIZAR
  UPDATE public.pagamento_acordo_cliente pac
  SET
    data_pagamento = COALESCE(p_data_pagamento, pac.data_pagamento),
    forma_pagamento = COALESCE(NULLIF(TRIM(p_forma_pagamento), ''), pac.forma_pagamento),
    valor_pago = COALESCE(p_valor_pago, pac.valor_pago),
    categoria_id = CASE 
      WHEN p_categoria_id IS NULL THEN pac.categoria_id
      ELSE p_categoria_id
    END,
    arquivo_comprovante = CASE 
      WHEN p_arquivo_comprovante IS NULL THEN pac.arquivo_comprovante
      ELSE p_arquivo_comprovante
    END
  WHERE pac.id = p_id;

  -- 8. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    pac.id,
    pac.conta_corrente_id,
    pac.data_pagamento,
    pac.forma_pagamento,
    pac.valor_pago,
    pac.categoria_id,
    cat.nome AS categoria_nome,
    pac.arquivo_comprovante,
    pac.created_at
  FROM public.pagamento_acordo_cliente pac
  LEFT JOIN public.categorias_conta_corrente cat ON cat.id = pac.categoria_id AND cat.deleted_at IS NULL
  WHERE pac.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_pagamento_conta_corrente_v2: %', SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION update_pagamento_conta_corrente_v2 IS 
'Atualiza um pagamento existente com validações (inclui categoria_id e categoria_nome)';
