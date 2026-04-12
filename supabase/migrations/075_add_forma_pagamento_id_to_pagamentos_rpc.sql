-- ============================================================================
-- Migration 075: Add forma_pagamento_id to pagamentos RPC functions
-- ============================================================================
-- Descrição: Adiciona suporte para forma_pagamento_id (BIGINT) nas funções RPC
--            de criação e atualização de pagamentos
-- Data: 2026-02-04
-- ============================================================================

-- ============================================================================
-- 1. ATUALIZAR create_pagamento_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS create_pagamento_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION create_pagamento_conta_corrente_v2(
  p_conta_corrente_id BIGINT,
  p_data_pagamento DATE,
  p_forma_pagamento TEXT,
  p_valor_pago NUMERIC,
  p_arquivo_comprovante TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_forma_pagamento_id BIGINT DEFAULT NULL,
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
  v_forma_pagamento_nome TEXT;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_conta_corrente_id IS NULL THEN
    RAISE EXCEPTION 'conta_corrente_id é obrigatório';
  END IF;

  IF p_data_pagamento IS NULL THEN
    RAISE EXCEPTION 'data_pagamento é obrigatória';
  END IF;

  -- Se forma_pagamento_id foi fornecido, buscar o nome da forma de pagamento
  IF p_forma_pagamento_id IS NOT NULL THEN
    SELECT nome INTO v_forma_pagamento_nome
    FROM public.ref_forma_pagamento
    WHERE id = p_forma_pagamento_id
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Forma de pagamento não encontrada';
    END IF;
    
    -- Usar o nome encontrado se forma_pagamento não foi fornecido ou está vazio
    IF p_forma_pagamento IS NULL OR LENGTH(TRIM(p_forma_pagamento)) = 0 THEN
      -- p_forma_pagamento será atualizado com o nome encontrado
    ELSE
      -- Manter o valor fornecido em p_forma_pagamento
      v_forma_pagamento_nome := p_forma_pagamento;
    END IF;
  ELSE
    -- Se não tem forma_pagamento_id, forma_pagamento é obrigatório
    IF p_forma_pagamento IS NULL OR LENGTH(TRIM(p_forma_pagamento)) < 2 THEN
      RAISE EXCEPTION 'forma_pagamento é obrigatória e deve ter pelo menos 2 caracteres';
    END IF;
    v_forma_pagamento_nome := TRIM(p_forma_pagamento);
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
    forma_pagamento_id,
    valor_pago,
    categoria_id,
    arquivo_comprovante,
    created_at
  ) VALUES (
    p_conta_corrente_id,
    p_data_pagamento,
    v_forma_pagamento_nome,
    p_forma_pagamento_id,
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
'Cria um novo pagamento vinculado a um compromisso (inclui forma_pagamento_id)';

-- ============================================================================
-- 2. ATUALIZAR update_pagamento_conta_corrente_v2
-- ============================================================================
DROP FUNCTION IF EXISTS update_pagamento_conta_corrente_v2 CASCADE;

CREATE OR REPLACE FUNCTION update_pagamento_conta_corrente_v2(
  p_id BIGINT,
  p_data_pagamento DATE DEFAULT NULL,
  p_forma_pagamento TEXT DEFAULT NULL,
  p_valor_pago NUMERIC DEFAULT NULL,
  p_arquivo_comprovante TEXT DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_forma_pagamento_id BIGINT DEFAULT NULL,
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
  v_forma_pagamento_nome TEXT;
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

  -- 5. PROCESSAR forma_pagamento_id
  IF p_forma_pagamento_id IS NOT NULL THEN
    SELECT nome INTO v_forma_pagamento_nome
    FROM public.ref_forma_pagamento
    WHERE id = p_forma_pagamento_id
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Forma de pagamento não encontrada';
    END IF;
  ELSIF p_forma_pagamento IS NOT NULL THEN
    v_forma_pagamento_nome := TRIM(p_forma_pagamento);
  END IF;

  -- 6. VALIDAÇÕES DE DADOS
  IF p_valor_pago IS NOT NULL AND p_valor_pago <= 0 THEN
    RAISE EXCEPTION 'valor_pago deve ser maior que zero';
  END IF;

  IF v_forma_pagamento_nome IS NOT NULL AND LENGTH(v_forma_pagamento_nome) < 2 THEN
    RAISE EXCEPTION 'forma_pagamento deve ter pelo menos 2 caracteres';
  END IF;

  -- 7. VERIFICAR SE VALOR TOTAL PAGO NÃO EXCEDE VALOR DO COMPROMISSO (se valor está sendo alterado)
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

  -- 8. ATUALIZAR
  UPDATE public.pagamento_acordo_cliente pac
  SET
    data_pagamento = COALESCE(p_data_pagamento, pac.data_pagamento),
    forma_pagamento = COALESCE(v_forma_pagamento_nome, pac.forma_pagamento),
    forma_pagamento_id = CASE 
      WHEN p_forma_pagamento_id IS NULL THEN pac.forma_pagamento_id
      ELSE p_forma_pagamento_id
    END,
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

  -- 9. RETORNAR DADOS ATUALIZADOS
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
'Atualiza um pagamento existente com validações (inclui forma_pagamento_id)';
