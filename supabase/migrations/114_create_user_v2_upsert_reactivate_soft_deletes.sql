-- 114_create_user_v2_upsert_reactivate_soft_deletes.sql
--
-- INC-012 (BUG-006/007): recriar usuário com mesmo e-mail após exclusão
-- estourava "duplicate key value violates unique constraint user_pkey".
--
-- Cadeia do bug:
--   1. delete_user_v2 faz só soft-delete em public."user"
--      (UPDATE ... SET ativo=false, deleted_at=NOW()).
--   2. delete_user_v2 NÃO toca em auth.users — a row do auth permanece viva.
--   3. Na recriação, create-user-v2 (Edge Function) chama
--      supabaseAdmin.auth.admin.inviteUserByEmail(email). Como o auth.user
--      ainda existe, o Supabase devolve o MESMO auth_user_id antigo.
--   4. create_user_v2 (7-args) recebe esse auth_user_id e tentava
--      INSERT INTO public."user"(user_id, ...) — colidindo com a PK da
--      row soft-deleted que ainda guarda aquele user_id.
--
-- Correção: trocar o INSERT por INSERT ... ON CONFLICT (user_id) DO UPDATE,
-- reativando a row soft-deleted (preserva user_id → FKs históricas
-- continuam apontando: dados_vendedor.user_id, deleted_by, audit_logs etc.).
-- delete_user_v2 segue como soft-delete por design (preserva auditoria).
--
-- Refs: TODO.md §5 INC-012, BUG-006/007.

CREATE OR REPLACE FUNCTION public.create_user_v2(
  p_email text,
  p_nome text,
  p_tipo text,
  p_ref_user_role_id bigint DEFAULT NULL::bigint,
  p_user_login text DEFAULT NULL::text,
  p_created_by uuid DEFAULT NULL::uuid,
  p_auth_user_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  tipo text,
  ativo boolean,
  data_cadastro timestamp with time zone,
  ref_user_role_id bigint,
  user_login text
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_email_exists BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email é obrigatório';
  END IF;

  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('backoffice', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo deve ser "backoffice" ou "vendedor"';
  END IF;

  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- 2. EMAIL ÚNICO ENTRE ATIVOS
  -- Soft-deletes não bloqueiam — o ON CONFLICT abaixo reativa a row antiga.
  SELECT EXISTS(
    SELECT 1 FROM public."user" u2
    WHERE LOWER(u2.email) = LOWER(p_email)
      AND u2.deleted_at IS NULL
  ) INTO v_email_exists;

  IF v_email_exists THEN
    RAISE EXCEPTION 'Email já cadastrado';
  END IF;

  -- 3. PERMISSÕES (se created_by informado)
  IF p_created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public."user" u3
      WHERE u3.user_id = p_created_by
        AND u3.tipo = 'backoffice'
        AND u3.ativo = TRUE
        AND u3.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Apenas usuários backoffice podem criar usuários';
    END IF;
  END IF;

  -- 4. UPSERT: cria ou reativa (caso user_id já exista soft-deleted)
  INSERT INTO public."user" (
    user_id,
    email,
    nome,
    tipo,
    ref_user_role_id,
    user_login,
    ativo,
    data_cadastro,
    deleted_at,
    deleted_by,
    permissoes
  ) VALUES (
    COALESCE(p_auth_user_id, gen_random_uuid()),
    LOWER(TRIM(p_email)),
    TRIM(p_nome),
    p_tipo,
    p_ref_user_role_id,
    COALESCE(p_user_login, LOWER(TRIM(p_email))),
    TRUE,
    NOW(),
    NULL,
    NULL,
    '[]'::jsonb
  )
  -- ON CONFLICT ON CONSTRAINT (não ON CONFLICT (user_id)) porque a função
  -- declara `user_id uuid` no RETURNS TABLE — referência bare colide com
  -- a variável OUT (mesmo padrão que V 1.25 fixou em delete_user_v2).
  ON CONFLICT ON CONSTRAINT user_pkey DO UPDATE SET
    email            = EXCLUDED.email,
    nome             = EXCLUDED.nome,
    tipo             = EXCLUDED.tipo,
    ref_user_role_id = EXCLUDED.ref_user_role_id,
    user_login       = EXCLUDED.user_login,
    ativo            = TRUE,
    data_cadastro    = NOW(),
    deleted_at       = NULL,
    deleted_by       = NULL,
    permissoes       = '[]'::jsonb
  RETURNING public."user".user_id INTO v_user_id;

  -- 5. RETORNO
  RETURN QUERY
  SELECT
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ref_user_role_id,
    u.user_login
  FROM public."user" u
  WHERE u.user_id = v_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in create_user_v2: %', SQLERRM;
    RAISE;
END;
$function$;
