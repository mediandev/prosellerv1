-- ============================================================================
-- Migration 021: Criar Tabela categorias_conta_corrente
-- ============================================================================
-- Descrição: Categorias utilizadas nos compromissos e pagamentos da conta corrente
-- Data: 2026-01-29
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categorias_conta_corrente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT categorias_conta_corrente_nome_check CHECK (LENGTH(TRIM(nome)) >= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_conta_corrente_nome_unique
ON public.categorias_conta_corrente(LOWER(TRIM(nome)))
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_categorias_conta_corrente_ativo
ON public.categorias_conta_corrente(ativo)
WHERE deleted_at IS NULL AND ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_categorias_conta_corrente_created_at
ON public.categorias_conta_corrente(created_at DESC)
WHERE deleted_at IS NULL;

COMMENT ON TABLE public.categorias_conta_corrente IS 'Categorias utilizadas nos compromissos e pagamentos da conta corrente';
COMMENT ON COLUMN public.categorias_conta_corrente.nome IS 'Nome da categoria';
COMMENT ON COLUMN public.categorias_conta_corrente.descricao IS 'Descrição da categoria';
COMMENT ON COLUMN public.categorias_conta_corrente.cor IS 'Cor em hexadecimal para identificação visual';

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.categorias_conta_corrente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select categorias_conta_corrente" ON public.categorias_conta_corrente;
DROP POLICY IF EXISTS "Authenticated can insert categorias_conta_corrente" ON public.categorias_conta_corrente;
DROP POLICY IF EXISTS "Authenticated can update categorias_conta_corrente" ON public.categorias_conta_corrente;
DROP POLICY IF EXISTS "Service role full access categorias_conta_corrente" ON public.categorias_conta_corrente;

CREATE POLICY "Authenticated can select categorias_conta_corrente"
  ON public.categorias_conta_corrente
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can insert categorias_conta_corrente"
  ON public.categorias_conta_corrente
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update categorias_conta_corrente"
  ON public.categorias_conta_corrente
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access categorias_conta_corrente"
  ON public.categorias_conta_corrente
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
