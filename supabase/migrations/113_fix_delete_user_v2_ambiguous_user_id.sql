-- ============================================================================
-- Migration 113: Fix delete_user_v2 — column reference "user_id" is ambiguous
-- ============================================================================
-- Bug: a funcao delete_user_v2 (criada na migration 005) define OUT params
--      `user_id`, `deleted_at` em RETURNS TABLE. Como os SELECT EXISTS, o
--      SELECT INTO do tipo do usuario, e o UPDATE referenciavam essas
--      colunas sem qualificar com alias da tabela, o Postgres ficava em
--      ambiguidade entre a coluna real de public.user e o OUT param da
--      funcao, e levantava EXCEPTION. O edge function delete-user-v2
--      capturava o erro e retornava HTTP 500 com mensagem
--      "Database operation failed: column reference 'user_id' is ambiguous".
--      Resultado visivel ao usuario final: ao tentar excluir um usuario em
--      Configuracoes -> Cadastros -> Usuarios, a UI mostrava toast de erro
--      e o usuario permanecia na listagem.
--
-- Fix: alias `u` em todos os FROM/UPDATE de public.user, com referencias
--      qualificadas em todos os WHERE / SET. Mesmo padrao do fix da
--      migration 111 para update_dados_vendedor_v2.
--      Assinatura e RETURNS TABLE mantidos identicos para nao quebrar o
--      edge function delete-user-v2 que chama essa RPC.
--
-- Descoberto: 2026-05-05 ao validar via Playwright o fix INC-008 (CORS
--             preflight DELETE em delete-user-v2, PR #14). Apos o CORS ser
--             corrigido, a request DELETE atravessou o preflight e o servidor
--             passou a responder com HTTP 500 expondo este segundo bug.
-- Data: 2026-05-05
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_v2(
  p_user_id UUID,
  p_deleted_by UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_current_user_tipo TEXT;
BEGIN
  -- 1. VALIDACOES
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id e obrigatorio';
  END IF;

  -- Verificar se usuario existe
  IF NOT EXISTS (
    SELECT 1
    FROM public.user u
    WHERE u.user_id = p_user_id
      AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Usuario nao encontrado ou ja excluido';
  END IF;

  -- 2. VERIFICAR PERMISSOES
  IF p_deleted_by IS NOT NULL THEN
    SELECT u.tipo INTO v_current_user_tipo
    FROM public.user u
    WHERE u.user_id = p_deleted_by
      AND u.ativo = TRUE
      AND u.deleted_at IS NULL;

    IF v_current_user_tipo IS NULL THEN
      RAISE EXCEPTION 'Usuario nao autorizado';
    END IF;

    IF v_current_user_tipo <> 'backoffice' THEN
      RAISE EXCEPTION 'Apenas usuarios backoffice podem excluir usuarios';
    END IF;
  END IF;

  -- 3. SOFT DELETE
  UPDATE public.user AS u
  SET
    ativo      = FALSE,
    deleted_at = NOW()
  WHERE u.user_id = p_user_id;

  -- 4. RETORNAR DADOS
  RETURN QUERY
  SELECT
    u.user_id,
    u.deleted_at
  FROM public.user u
  WHERE u.user_id = p_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in delete_user_v2 for user %: %', p_user_id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.delete_user_v2 IS
'Realiza soft delete de um usuario (apenas backoffice). v113: corrige column reference ambiguous user_id qualificando todas as referencias de public.user com alias u.';

GRANT EXECUTE ON FUNCTION public.delete_user_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user_v2 FROM anon;
