-- Migration 109: Improve natureza_operacao delete behavior
-- Instead of blocking deletion when in use, soft-delete + deactivate
-- Also fix the "in use" check to use natureza_id FK instead of name string match

CREATE OR REPLACE FUNCTION delete_natureza_operacao_v2(
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
  v_nome_atual TEXT;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'ID é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.natureza_operacao
    WHERE id = p_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Natureza de operação não encontrada';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT tipo INTO v_user_tipo
    FROM public."user"
    WHERE user_id = p_deleted_by
    AND ativo = TRUE
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado ou inativo';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir naturezas de operação';
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.pedido_venda
    WHERE natureza_id = p_id
    AND deleted_at IS NULL
  ) INTO v_em_uso;

  SELECT nome INTO v_nome_atual
  FROM public.natureza_operacao WHERE id = p_id;

  IF v_em_uso THEN
    UPDATE public.natureza_operacao
    SET
      ativo = FALSE,
      nome = CASE
        WHEN nome NOT LIKE '%(Excluído)' THEN nome || ' (Excluído)'
        ELSE nome
      END,
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = p_id;
  ELSE
    UPDATE public.natureza_operacao
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = p_id;
  END IF;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_natureza_operacao_v2: %', SQLERRM;
    RAISE;
END;
$$;
