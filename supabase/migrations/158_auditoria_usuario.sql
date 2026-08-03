-- Migration 158: AUDITORIA de usuários e permissões.
--
-- É o grupo mais sensível dos que faltavam: quem pode ver comissão, quem pode
-- excluir pedido, quem vira backoffice. Sem registro, uma escalada de permissão
-- é invisível.
--
-- Levantamento (2026-08-03):
--   * `user` já tem `deleted_by` — exclusão já sabe quem foi.
--   * `update_user_v2` já RECEBE `p_updated_by` e o descarta (padrão que se repete
--     em todo o sistema: o dado chega ao banco e morre no último metro).
--   * A troca de PERMISSÕES não passa por essa função: `update-user-v2` grava
--     direto na tabela (`.from('user').update({permissoes})`). Por isso a Edge
--     Function precisa de UMA linha a mais — é a única mudança de código desta
--     entrega, e está no mesmo commit.
--
-- Sem `criado_por`: quem criou o usuário não é gravado hoje por nenhum caminho.
-- A criação fica registrada com autor 'Sistema' até que `create-user-v2` informe.
-- Preferi não inventar: 'Sistema' é honesto, atribuir à pessoa errada não é.

ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES public."user"(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN public."user".atualizado_por IS
  'Quem fez a última alteração neste usuário, inclusive de permissões (migration 158).';

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
    ativo = COALESCE(p_ativo, u.ativo),
    atualizado_por = COALESCE(p_updated_by, u.atualizado_por)
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
;


-- ===================== GATILHO: USUÁRIO E PERMISSÕES =====================
CREATE OR REPLACE FUNCTION public.tg_auditoria_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id     text := COALESCE(NEW.user_id, OLD.user_id)::text;
  v_nome   text := COALESCE(NEW.nome, OLD.nome, NEW.email, OLD.email, v_id);
  v_ganhou text[];
  v_perdeu text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.auditoria_registrar('criou', 'Usuário', v_id, NULL,
      format('criou o usuário %s (%s)', v_nome, NEW.tipo), NULL);
    RETURN NEW;
  END IF;

  -- Exclusão / restauração (soft delete).
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM public.auditoria_registrar('excluiu', 'Usuário', v_id,
      COALESCE(NEW.deleted_by, NEW.atualizado_por),
      format('excluiu o usuário %s', v_nome),
      jsonb_build_object('nome', v_nome, 'email', OLD.email, 'tipo', OLD.tipo));
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    PERFORM public.auditoria_registrar('restaurou', 'Usuário', v_id, NEW.atualizado_por,
      format('restaurou o usuário %s', v_nome), NULL);
    RETURN NEW;
  END IF;

  -- Ativar / desativar: é o corte de acesso, merece verbo próprio.
  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    PERFORM public.auditoria_registrar(
      CASE WHEN NEW.ativo THEN 'reativou' ELSE 'desativou' END,
      'Usuário', v_id, NEW.atualizado_por,
      format('%s o acesso de %s', CASE WHEN NEW.ativo THEN 'reativou' ELSE 'desativou' END, v_nome),
      NULL);
  END IF;

  -- Backoffice <-> vendedor muda o que a pessoa enxerga no sistema inteiro.
  IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    PERFORM public.auditoria_registrar('alterou', 'Usuário', v_id, NEW.atualizado_por,
      format('mudou %s de %s para %s', v_nome, OLD.tipo, NEW.tipo),
      jsonb_build_object('campo', 'tipo', 'de', OLD.tipo, 'para', NEW.tipo));
  END IF;

  -- PERMISSÕES: registra o que foi GANHO e o que foi PERDIDO, não a lista inteira.
  -- Ver "ganhou comissoes.visualizar" responde a pergunta na hora; ver duas listas
  -- de 40 itens e ter que compará-las na mão, não.
  IF NEW.permissoes IS DISTINCT FROM OLD.permissoes THEN
    SELECT array_agg(p) INTO v_ganhou
      FROM (SELECT jsonb_array_elements_text(COALESCE(NEW.permissoes, '[]'::jsonb)) p
            EXCEPT SELECT jsonb_array_elements_text(COALESCE(OLD.permissoes, '[]'::jsonb))) x;
    SELECT array_agg(p) INTO v_perdeu
      FROM (SELECT jsonb_array_elements_text(COALESCE(OLD.permissoes, '[]'::jsonb)) p
            EXCEPT SELECT jsonb_array_elements_text(COALESCE(NEW.permissoes, '[]'::jsonb))) x;

    PERFORM public.auditoria_registrar('alterou', 'Usuário', v_id, NEW.atualizado_por,
      format('alterou as permissões de %s', v_nome),
      jsonb_build_object('ganhou', COALESCE(v_ganhou, ARRAY[]::text[]),
                         'perdeu', COALESCE(v_perdeu, ARRAY[]::text[])));
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auditoria_usuario ON public."user";
CREATE TRIGGER trg_auditoria_usuario
  AFTER INSERT OR UPDATE ON public."user"
  FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_usuario();
