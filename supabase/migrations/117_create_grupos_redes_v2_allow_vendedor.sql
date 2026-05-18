-- 115_create_grupos_redes_v2_allow_vendedor.sql
--
-- Permite que usuários do tipo 'vendedor' também criem grupos/redes via RPC.
-- Antes: apenas 'backoffice' passava no gate (linha v_user_tipo != 'backoffice').
-- Depois: 'backoffice' ou 'vendedor' passam; outros tipos seguem bloqueados.
--
-- Motivação: feature de inclusão rápida de Grupo/Rede no cadastro de cliente
-- (botão "+" ao lado do combobox em CustomerFormDadosCadastrais). O vendedor
-- precisa poder criar grupo sem depender de backoffice.
--
-- RLS já permite SELECT/INSERT para qualquer authenticated em grupos_redes
-- (policies "Authenticated can select/insert/update"). O único gate efetivo
-- estava nesta RPC e na Edge Function grupos-redes-v2 (linha 209).
--
-- Backup da versão anterior: 115a_backup_create_grupos_redes_v2_before_vendedor.sql.
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

    IF v_user_tipo NOT IN ('backoffice', 'vendedor') THEN
      RAISE EXCEPTION 'Tipo de usuário inválido para criar grupos/redes';
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
