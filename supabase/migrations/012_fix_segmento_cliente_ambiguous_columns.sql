-- ============================================================================
-- Migration 012: Correção de colunas ambíguas em funções de segmento_cliente
-- ============================================================================
-- Descrição: Corrige referências ambíguas à coluna "nome" nas funções RPC
--            de segmentos de cliente, qualificando todas as referências
-- Data: 2026-01-28
-- ============================================================================

-- ============================================================================
-- 1. CORRIGIR: create_segmento_cliente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION create_segmento_cliente_v2(
  p_nome TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  descricao TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_segmento_id BIGINT;
  v_user_tipo TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Verificar se nome já existe (case-insensitive) - CORRIGIDO: qualificado com alias
  IF EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE LOWER(TRIM(sc.nome)) = LOWER(TRIM(p_nome))
    AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente com este nome já existe';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se created_by fornecido)
  IF p_created_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_created_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar segmentos de cliente';
    END IF;
  END IF;

  -- 3. CRIAR SEGMENTO DE CLIENTE
  INSERT INTO public.segmento_cliente (
    nome,
    descricao,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING segmento_cliente.id INTO v_segmento_id;

  -- 4. RETORNAR DADOS DO SEGMENTO CRIADO
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = v_segmento_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

-- ============================================================================
-- 2. CORRIGIR: update_segmento_cliente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION update_segmento_cliente_v2(
  p_id BIGINT,
  p_nome TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  nome TEXT,
  descricao TEXT,
  ativo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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

  -- Verificar se segmento existe - CORRIGIDO: qualificado com alias
  IF NOT EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE sc.id = p_id AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

  -- Validar nome se fornecido
  IF p_nome IS NOT NULL THEN
    IF LENGTH(TRIM(p_nome)) < 2 THEN
      RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
    END IF;

    -- Verificar se nome já existe em outro registro - CORRIGIDO: qualificado com alias
    IF EXISTS (
      SELECT 1 FROM public.segmento_cliente sc
      WHERE LOWER(TRIM(sc.nome)) = LOWER(TRIM(p_nome))
      AND sc.id != p_id
      AND sc.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Segmento de cliente com este nome já existe';
    END IF;
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se updated_by fornecido)
  IF p_updated_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem atualizar segmentos de cliente';
    END IF;
  END IF;

  -- 3. ATUALIZAR SEGMENTO
  UPDATE public.segmento_cliente
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), public.segmento_cliente.nome),
    descricao = CASE 
      WHEN p_descricao IS NULL THEN public.segmento_cliente.descricao
      WHEN TRIM(p_descricao) = '' THEN NULL
      ELSE TRIM(p_descricao)
    END,
    ativo = COALESCE(p_ativo, public.segmento_cliente.ativo),
    updated_at = NOW()
  WHERE public.segmento_cliente.id = p_id;

  -- 4. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    s.id,
    s.nome,
    s.descricao,
    s.ativo,
    s.created_at,
    s.updated_at
  FROM public.segmento_cliente s
  WHERE s.id = p_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;

-- ============================================================================
-- 3. CORRIGIR: delete_segmento_cliente_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_segmento_cliente_v2(
  p_id BIGINT,
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
  v_em_uso BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  -- Verificar se segmento existe - CORRIGIDO: qualificado com alias
  IF NOT EXISTS (
    SELECT 1 FROM public.segmento_cliente sc
    WHERE sc.id = p_id AND sc.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Segmento de cliente não encontrado';
  END IF;

  -- Verificar se está em uso em clientes - CORRIGIDO: usando coluna correta tipo_segmento
  SELECT EXISTS(
    SELECT 1 FROM public.cliente c
    WHERE c.tipo_segmento = (
      SELECT sc2.nome FROM public.segmento_cliente sc2 WHERE sc2.id = p_id
    )
    AND c.deleted_at IS NULL
  ) INTO v_em_uso;

  IF v_em_uso THEN
    RAISE EXCEPTION 'Segmento de cliente está em uso e não pode ser excluído';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (se deleted_by fornecido)
  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir segmentos de cliente';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.segmento_cliente
  SET
    deleted_at = NOW(),
    ativo = FALSE,
    updated_at = NOW()
  WHERE public.segmento_cliente.id = p_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_segmento_cliente_v2: %', SQLERRM;
    RAISE;
END;
$$;
