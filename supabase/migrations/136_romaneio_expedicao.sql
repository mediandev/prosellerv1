-- Migration 136: Romaneio de Expedição + peso_bruto em frete_logistica
-- Romaneio agrupa fretes por transportadora/data para geração de PDF de manifesto.
-- Numeração sequencial por empresa (começa em 1).

-- 1) peso_bruto em frete_logistica
ALTER TABLE public.frete_logistica
  ADD COLUMN IF NOT EXISTS peso_bruto NUMERIC(10,3);

-- 2) Tabela de romaneios
CREATE TABLE IF NOT EXISTS public.romaneio_expedicao (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          INTEGER NOT NULL,
  empresa_id      BIGINT NOT NULL REFERENCES public.ref_empresas_subsidiarias(id) ON DELETE RESTRICT,
  transportador_id BIGINT REFERENCES public.transportador_logistica(id) ON DELETE SET NULL,
  data_romaneio   DATE NOT NULL,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public."user"(user_id) ON DELETE SET NULL,
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT romaneio_expedicao_empresa_numero_uq UNIQUE (empresa_id, numero)
);

-- 3) Junção romaneio ↔ frete (cada frete em no máximo um romaneio ativo)
CREATE TABLE IF NOT EXISTS public.romaneio_frete (
  romaneio_id UUID   NOT NULL REFERENCES public.romaneio_expedicao(id) ON DELETE CASCADE,
  frete_id    BIGINT NOT NULL REFERENCES public.frete_logistica(id) ON DELETE RESTRICT,
  PRIMARY KEY (romaneio_id, frete_id)
);

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_romaneio_expedicao_empresa
  ON public.romaneio_expedicao(empresa_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_romaneio_expedicao_transportador
  ON public.romaneio_expedicao(transportador_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_romaneio_frete_frete_id
  ON public.romaneio_frete(frete_id);

-- 5) RLS permissiva (herda da política das demais tabelas de logística)
ALTER TABLE public.romaneio_expedicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.romaneio_frete     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "romaneio_expedicao_allow_all" ON public.romaneio_expedicao
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "romaneio_frete_allow_all" ON public.romaneio_frete
  FOR ALL USING (true) WITH CHECK (true);
