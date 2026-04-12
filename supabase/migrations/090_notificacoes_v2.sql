-- 090_notificacoes_v2.sql
-- Cria estrutura de notificacoes v2 com RLS e funcoes utilitarias.

CREATE TABLE IF NOT EXISTS public.notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  link TEXT NULL,
  status TEXT NOT NULL DEFAULT 'nao_lida' CHECK (status IN ('nao_lida', 'lida', 'arquivada')),
  usuario_id UUID NOT NULL REFERENCES public."user"(user_id) ON DELETE CASCADE,
  criado_por UUID NULL REFERENCES public."user"(user_id),
  dados_adicionais JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_leitura TIMESTAMPTZ NULL,
  arquivada_em TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacao_usuario_data
  ON public.notificacao (usuario_id, data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_usuario_status
  ON public.notificacao (usuario_id, status);

ALTER TABLE public.notificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificacao_select_own ON public.notificacao;
CREATE POLICY notificacao_select_own
  ON public.notificacao
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS notificacao_update_own ON public.notificacao;
CREATE POLICY notificacao_update_own
  ON public.notificacao
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

DROP FUNCTION IF EXISTS public.list_notificacoes_v2(UUID, TEXT, INTEGER, INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION public.list_notificacoes_v2(
  p_usuario_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_incluir_arquivadas BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  tipo TEXT,
  titulo TEXT,
  mensagem TEXT,
  link TEXT,
  status TEXT,
  usuario_id UUID,
  data_criacao TIMESTAMPTZ,
  data_leitura TIMESTAMPTZ,
  dados_adicionais JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.tipo,
    n.titulo,
    n.mensagem,
    n.link,
    n.status,
    n.usuario_id,
    n.data_criacao,
    n.data_leitura,
    n.dados_adicionais
  FROM public.notificacao n
  WHERE n.usuario_id = p_usuario_id
    AND (p_status IS NULL OR n.status = p_status)
    AND (p_incluir_arquivadas OR n.status <> 'arquivada')
  ORDER BY n.data_criacao DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_notificacoes_v2(UUID, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
