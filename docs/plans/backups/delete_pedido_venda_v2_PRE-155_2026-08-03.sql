CREATE OR REPLACE FUNCTION public.delete_pedido_venda_v2(p_pedido_id bigint, p_deleted_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_user_tipo TEXT; v_is_backoffice BOOLEAN; v_pedido_owner UUID;
BEGIN
  IF p_pedido_id IS NULL THEN RAISE EXCEPTION 'pedido_id é obrigatório'; END IF;
  SELECT pv.vendedor_uuid INTO v_pedido_owner FROM public.pedido_venda pv WHERE pv."pedido_venda_ID" = p_pedido_id AND pv.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF p_deleted_by IS NOT NULL THEN SELECT u.tipo INTO v_user_tipo FROM public.user u WHERE u.user_id = p_deleted_by AND u.ativo = TRUE AND u.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado ou inativo'; END IF; v_is_backoffice := (v_user_tipo = 'backoffice'); IF NOT v_is_backoffice AND v_pedido_owner != p_deleted_by THEN RAISE EXCEPTION 'Você não tem permissão para excluir este pedido'; END IF; END IF;
  UPDATE public.pedido_venda pv SET deleted_at = NOW(), updated_at = NOW() WHERE pv."pedido_venda_ID" = p_pedido_id;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'Error in delete_pedido_venda_v2 for pedido %: %', p_pedido_id, SQLERRM; RAISE;
END;
$function$
