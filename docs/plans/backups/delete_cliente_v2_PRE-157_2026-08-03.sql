CREATE OR REPLACE FUNCTION public.delete_cliente_v2(p_cliente_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(cliente_id bigint, deleted_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_tipo TEXT;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id é obrigatório';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.cliente c
    WHERE c.cliente_id = p_cliente_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cliente não encontrado ou já excluído';
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo
      INTO v_user_tipo
      FROM public.user u
     WHERE u.user_id = p_deleted_by
       AND u.ativo = TRUE
       AND u.deleted_at IS NULL;

    IF v_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    IF v_user_tipo != 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem excluir clientes';
    END IF;
  END IF;

  UPDATE public.cliente c
     SET deleted_at = NOW(),
         ref_situacao_id = COALESCE((
           SELECT rs.ref_situacao_id
           FROM public.ref_situacao rs
           WHERE UPPER(TRIM(rs.nome)) IN ('EXCLUÍDO', 'EXCLUIDO')
           LIMIT 1
         ), c.ref_situacao_id)
   WHERE c.cliente_id = p_cliente_id;

  RETURN QUERY
  SELECT c.cliente_id, c.deleted_at
    FROM public.cliente c
   WHERE c.cliente_id = p_cliente_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_cliente_v2 for cliente %: %', p_cliente_id, SQLERRM;
    RAISE;
END;
$function$
