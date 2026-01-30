-- ============================================================================
-- Migration 025: Estender get_cliente_completo_v2 com condições_cliente e conta_corrente_cliente
-- ============================================================================
-- Inclui na resposta: condições_cliente (condições de pagamento do cliente) e
-- conta_corrente_cliente (compromissos de investimento/ressarcimento).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cliente_completo_v2(
  p_cliente_id BIGINT,
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
  v_cliente_completo JSON;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  -- 2. VERIFICAR PERMISSÕES (mesma lógica de get_cliente_by_id_v2)
  IF p_requesting_user_id IS NOT NULL THEN
    SELECT u.tipo INTO v_user_tipo
    FROM public.user u
    WHERE u.user_id = p_requesting_user_id
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF v_user_tipo = 'vendedor' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.cliente c
        WHERE c.cliente_id = p_cliente_id
        AND c.deleted_at IS NULL
        AND c.status_aprovacao = 'aprovado'
        AND (
          c.criado_por = p_requesting_user_id
          OR p_requesting_user_id = ANY(c.vendedoresatribuidos)
        )
      ) THEN
        RAISE EXCEPTION 'Cliente não encontrado ou sem permissão de acesso';
      END IF;
    END IF;
  END IF;

  -- 3. BUSCAR CLIENTE COMPLETO (cliente, contato, endereco, vendedores, condições_cliente, conta_corrente_cliente)
  SELECT JSON_BUILD_OBJECT(
    'cliente', row_to_json(c.*),
    'contato', (SELECT row_to_json(cc.*) FROM public.cliente_contato cc WHERE cc.cliente_id = c.cliente_id),
    'endereco', (SELECT row_to_json(ce.*) FROM public.cliente_endereço ce WHERE ce.cliente_id = c.cliente_id),
    'vendedores', (
      SELECT COALESCE(JSON_AGG(row_to_json(dv.*)), '[]'::JSON)
      FROM public.dados_vendedor dv
      WHERE dv.user_id = ANY(c.vendedoresatribuidos)
      AND dv.deleted_at IS NULL
    ),
    'condicoes_cliente', (
      SELECT COALESCE(JSON_AGG(row_to_json(cond.*)), '[]'::JSON)
      FROM public.condições_cliente cond
      WHERE cond.ID_cliente = c.cliente_id
    ),
    'conta_corrente_cliente', (
      SELECT COALESCE(JSON_AGG(row_to_json(ccc.*) ORDER BY ccc.data DESC, ccc.id DESC), '[]'::JSON)
      FROM public.conta_corrente_cliente ccc
      WHERE ccc.cliente_id = c.cliente_id
    )
  )
  INTO v_cliente_completo
  FROM public.cliente c
  WHERE c.cliente_id = p_cliente_id
  AND c.deleted_at IS NULL;

  IF v_cliente_completo IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  RETURN v_cliente_completo;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_cliente_completo_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_cliente_completo_v2 IS 
'Busca cliente completo com relacionamentos: contato, endereço, vendedores, condições_cliente e conta_corrente_cliente';
