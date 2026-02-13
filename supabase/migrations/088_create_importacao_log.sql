CREATE TABLE IF NOT EXISTS public.importacao_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('vendas', 'clientes', 'produtos', 'vendedores')),
  nome_arquivo TEXT NOT NULL,
  total_linhas INTEGER NOT NULL DEFAULT 0,
  sucessos INTEGER NOT NULL DEFAULT 0,
  erros INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'sucesso_parcial', 'erro')),
  detalhes_erros JSONB NOT NULL DEFAULT '[]'::jsonb,
  usuario_uuid UUID NULL,
  usuario_nome TEXT NOT NULL DEFAULT 'Usuário',
  can_undo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_importacao_log_created_at
  ON public.importacao_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_importacao_log_tipo
  ON public.importacao_log (tipo);

