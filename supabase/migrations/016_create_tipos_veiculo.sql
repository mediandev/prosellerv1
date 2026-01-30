-- ============================================================================
-- Migration 016: Criar Tabela tipos_veiculo
-- ============================================================================
-- Descrição: Cria tabela para gerenciar tipos de veículo (requisitos logísticos)
-- Data: 2026-01-29
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tipos_veiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT tipos_veiculo_nome_check CHECK (LENGTH(TRIM(nome)) >= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tipos_veiculo_nome_unique
ON public.tipos_veiculo(LOWER(TRIM(nome)))
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tipos_veiculo_ativo
ON public.tipos_veiculo(ativo)
WHERE deleted_at IS NULL AND ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_tipos_veiculo_created_at
ON public.tipos_veiculo(created_at DESC)
WHERE deleted_at IS NULL;

COMMENT ON TABLE public.tipos_veiculo IS 'Tabela de tipos de veículo para requisitos logísticos';
COMMENT ON COLUMN public.tipos_veiculo.nome IS 'Nome do tipo de veículo';
COMMENT ON COLUMN public.tipos_veiculo.descricao IS 'Descrição do tipo de veículo';

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.tipos_veiculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can select tipos_veiculo"
  ON public.tipos_veiculo
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can insert tipos_veiculo"
  ON public.tipos_veiculo
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update tipos_veiculo"
  ON public.tipos_veiculo
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access tipos_veiculo"
  ON public.tipos_veiculo
  TO service_role
  USING (true)
  WITH CHECK (true);
