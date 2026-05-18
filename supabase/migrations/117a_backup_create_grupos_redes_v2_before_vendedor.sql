-- 115a_backup_create_grupos_redes_v2_before_vendedor.sql
--
-- BACKUP da definição atual de create_grupos_redes_v2, capturada do banco em
-- 2026-05-18 via pg_get_functiondef antes de aplicar a migration 115 que
-- relaxa o gate de tipo para aceitar vendedor.
--
-- NÃO APLICAR EM CONDIÇÕES NORMAIS — este arquivo serve apenas como
-- referência/rollback. Caso a migration 115 cause problema, rodar este
-- arquivo restaura o comportamento anterior (apenas backoffice cria grupo).
--
-- Refs: feat/inclusao-rapida-grupo-rede.

CREATE OR REPLACE FUNCTION public.create_grupos_redes_v2(
  p_nome text,
  p_descricao text DEFAULT NULL::text,
  p_created_by uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid,
  nome text,
  descricao text,
  ativo boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_grupo_id UUID;
  v_user_tipo TEXT;
BEGIN
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.grupos_redes gr
    WHERE LOWER(TRIM(gr.nome)) = LOWER(TRIM(p_nome))
      AND gr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Grupo/rede com este nome já existe';
  END IF;

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
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar grupos/redes';
    END IF;
  END IF;

  INSERT INTO public.grupos_redes (
    nome, descricao, ativo, created_at, updated_at
  ) VALUES (
    TRIM(p_nome),
    NULLIF(TRIM(p_descricao), ''),
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING grupos_redes.id INTO v_grupo_id;

  RETURN QUERY
  SELECT g.id, g.nome, g.descricao, g.ativo, g.created_at, g.updated_at
  FROM public.grupos_redes g
  WHERE g.id = v_grupo_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_grupos_redes_v2: %', SQLERRM;
    RAISE;
END;
$function$;
