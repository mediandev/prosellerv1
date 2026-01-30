-- ============================================================================
-- Migration 023: Ajustar tabela ref_empresas_subsidiarias para Empresas
-- ============================================================================
-- Descrição: Adiciona campos necessários para gerenciamento de empresas
-- (CNPJ, razão social, endereço, contas bancárias, etc.). Mantém id BIGINT
-- por compatibilidade com FK pedido_venda.empresa_faturamento_id.
-- Data: 2026-01-29
-- ============================================================================

-- Novos campos (ADD COLUMN IF NOT EXISTS para não falhar se já existirem)
ALTER TABLE public.ref_empresas_subsidiarias
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS contas_bancarias JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS integracoes_erp JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ref_empresas_subsidiarias.cnpj IS 'CNPJ da empresa (apenas números ou formatado)';
COMMENT ON COLUMN public.ref_empresas_subsidiarias.razao_social IS 'Razão social';
COMMENT ON COLUMN public.ref_empresas_subsidiarias.nome_fantasia IS 'Nome fantasia';
COMMENT ON COLUMN public.ref_empresas_subsidiarias.endereco IS 'Endereço (JSON: cep, logradouro, numero, complemento, bairro, uf, municipio)';
COMMENT ON COLUMN public.ref_empresas_subsidiarias.contas_bancarias IS 'Contas bancárias (array JSON)';
COMMENT ON COLUMN public.ref_empresas_subsidiarias.integracoes_erp IS 'Configurações de integração ERP (array JSON)';

-- Índice para CNPJ único (apenas registros não excluídos; normaliza só dígitos para comparação)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_empresas_subsidiarias_cnpj_unique
  ON public.ref_empresas_subsidiarias (
    (REGEXP_REPLACE(TRIM(COALESCE(cnpj, '')), '\D', '', 'g'))
  )
  WHERE deleted_at IS NULL AND cnpj IS NOT NULL AND TRIM(cnpj) <> '';

-- Índice para listagem por ativo
CREATE INDEX IF NOT EXISTS idx_ref_empresas_subsidiarias_ativo
  ON public.ref_empresas_subsidiarias(ativo)
  WHERE deleted_at IS NULL AND ativo = TRUE;

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_ref_empresas_subsidiarias_created_at
  ON public.ref_empresas_subsidiarias(created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.ref_empresas_subsidiarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias;
DROP POLICY IF EXISTS "Authenticated can insert ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias;
DROP POLICY IF EXISTS "Authenticated can update ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias;
DROP POLICY IF EXISTS "Service role full access ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias;

CREATE POLICY "Authenticated can select ref_empresas_subsidiarias"
  ON public.ref_empresas_subsidiarias
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated can insert ref_empresas_subsidiarias"
  ON public.ref_empresas_subsidiarias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update ref_empresas_subsidiarias"
  ON public.ref_empresas_subsidiarias
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access ref_empresas_subsidiarias"
  ON public.ref_empresas_subsidiarias
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
