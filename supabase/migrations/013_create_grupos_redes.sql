-- ============================================================================
-- Migration 013: Criar Tabela grupos_redes
-- ============================================================================
-- Descrição: Cria tabela para gerenciar grupos/redes de clientes do sistema
-- Data: 2026-01-29
-- ============================================================================

-- Habilitar extensão uuid-ossp se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela grupos_redes
CREATE TABLE IF NOT EXISTS public.grupos_redes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT grupos_redes_nome_check CHECK (LENGTH(TRIM(nome)) >= 2)
);

-- Índice único para nome (case-insensitive, excluindo soft deletes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_grupos_redes_nome_unique
ON public.grupos_redes(LOWER(TRIM(nome)))
WHERE deleted_at IS NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_grupos_redes_ativo
ON public.grupos_redes(ativo)
WHERE deleted_at IS NULL AND ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_grupos_redes_created_at
ON public.grupos_redes(created_at DESC)
WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON TABLE public.grupos_redes IS 'Tabela de grupos/redes de clientes do sistema';
COMMENT ON COLUMN public.grupos_redes.nome IS 'Nome do grupo/rede';
COMMENT ON COLUMN public.grupos_redes.descricao IS 'Descrição detalhada do grupo/rede';
COMMENT ON COLUMN public.grupos_redes.ativo IS 'Indica se o grupo/rede está ativo no sistema';
COMMENT ON COLUMN public.grupos_redes.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.grupos_redes.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN public.grupos_redes.deleted_at IS 'Data de exclusão (soft delete)';

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.grupos_redes ENABLE ROW LEVEL SECURITY;

-- SELECT: usuários autenticados podem listar e ver grupos/redes ativos
CREATE POLICY "Authenticated can select grupos_redes"
  ON public.grupos_redes
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- INSERT/UPDATE/DELETE: apenas via RPC (service_role usado pela Edge Function)
CREATE POLICY "Service role full access grupos_redes"
  ON public.grupos_redes
  TO service_role
  USING (true)
  WITH CHECK (true);
