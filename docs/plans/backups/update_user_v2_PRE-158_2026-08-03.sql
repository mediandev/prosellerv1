CREATE OR REPLACE FUNCTION public.update_user_v2(p_user_id uuid, p_nome text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_tipo text DEFAULT NULL::text, p_ref_user_role_id bigint DEFAULT NULL::bigint, p_user_login text DEFAULT NULL::text, p_ativo boolean DEFAULT NULL::boolean, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, nome text, email text, tipo text, ativo boolean, data_cadastro timestamp with time zone, ultimo_acesso timestamp with time zone, ref_user_role_id bigint, user_login text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_tipo TEXT;
  v_is_own_profile BOOLEAN;
BEGIN
  -- 1. VALIDAÇÕES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id é obrigatório';
  END IF;

  -- Verificar se usuário existe
  IF NOT EXISTS (
    SELECT 1 FROM public.user u
    WHERE u.user_id = p_user_id
    AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- 2. VERIFICAR PERMISSÕES
  IF p_updated_by IS NOT NULL THEN
    -- Buscar tipo do usuário que está atualizando
    SELECT u.tipo INTO v_current_user_tipo
    FROM public.user u
    WHERE u.user_id = p_updated_by
    AND u.ativo = TRUE
    AND u.deleted_at IS NULL;

    IF v_current_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuário não autorizado';
    END IF;

    -- Verificar se é o próprio perfil
    v_is_own_profile := (p_updated_by = p_user_id);

    -- Vendedor só pode atualizar próprio perfil (e não pode mudar tipo/ativo)
    IF v_current_user_tipo = 'vendedor' AND NOT v_is_own_profile THEN
      RAISE EXCEPTION 'Vendedores só podem atualizar seu próprio perfil';
    END IF;

    IF v_current_user_tipo = 'vendedor' AND (p_tipo IS NOT NULL OR p_ativo IS NOT NULL) THEN
      RAISE EXCEPTION 'Vendedores não podem alterar tipo ou status ativo';
    END IF;
  END IF;

  -- 3. VALIDAR EMAIL SE FORNECIDO
  IF p_email IS NOT NULL THEN
    IF TRIM(p_email) = '' THEN
      RAISE EXCEPTION 'Email não pode ser vazio';
    END IF;

    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Formato de email inválido';
    END IF;

    -- Verificar email único (exceto para o próprio usuário)
    IF EXISTS (
      SELECT 1 FROM public.user u
      WHERE LOWER(u.email) = LOWER(p_email)
      AND u.user_id != p_user_id
      AND u.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Email já cadastrado para outro usuário';
    END IF;
  END IF;

  -- 4. VALIDAR TIPO SE FORNECIDO
  IF p_tipo IS NOT NULL AND p_tipo NOT IN ('backoffice', 'vendedor') THEN
    RAISE EXCEPTION 'Tipo deve ser "backoffice" ou "vendedor"';
  END IF;

  -- 5. VALIDAR NOME SE FORNECIDO
  IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- 6. ATUALIZAR USUÁRIO (qualificando todas as colunas da tabela)
  UPDATE public.user u
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), u.nome),
    email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), u.email),
    tipo = COALESCE(p_tipo, u.tipo),
    ref_user_role_id = COALESCE(p_ref_user_role_id, u.ref_user_role_id),
    user_login = COALESCE(NULLIF(TRIM(p_user_login), ''), u.user_login),
    ativo = COALESCE(p_ativo, u.ativo)
  WHERE u.user_id = p_user_id;

  -- 7. RETORNAR DADOS ATUALIZADOS
  RETURN QUERY
  SELECT 
    u.user_id,
    u.nome,
    u.email,
    u.tipo,
    u.ativo,
    u.data_cadastro,
    u.ultimo_acesso,
    u.ref_user_role_id,
    u.user_login
  FROM public.user u
  WHERE u.user_id = p_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_user_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$function$
