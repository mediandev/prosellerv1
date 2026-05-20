-- Migration 119 · F-LOG-CRM R-LOG-1 — Schema base do módulo Logística
--
-- Cria 4 ENUMs + 7 tabelas + RLS + indexes para suportar:
--   (a) Cadastros de transportador, região destino e origem de frete (lookup).
--   (b) Frete cabeçalho + ocorrências SSW (sem integração nesta onda — R-LOG-4).
--   (c) Fatura transportadora + itens (estrutura apenas; CRUD em R-LOG-6).
--
-- Toda a feature nasce ATRÁS da feature flag FEATURE_LOG_CRM (default OFF nos
-- Edge Functions e em VITE_FEATURE_LOG_CRM no frontend). Migration é
-- idempotente (IF NOT EXISTS / IF EXISTS) e não toca tabelas existentes.
--
-- Ver: docs/wiki/context/F-LOG-CRM.md, docs/plans/feature-contracts/F-LOG-1.md,
--      docs/plans/cursor-brief.md Tarefa 8 (aplicação staging→prod + rollback).

-- ============================================================================
-- 1) ENUMs
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_entrega_frete') THEN
    CREATE TYPE public.status_entrega_frete AS ENUM (
      'Em Separação',
      'Aguardando Coleta',
      'Em Trânsito',
      'Em Trânsito - Reentrega',
      'Entregue',
      'Agendado',
      'Recusado',
      'Devolvido - Trânsito',
      'Devolvido - Entregue'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_ocorrencia_ssw') THEN
    CREATE TYPE public.tipo_ocorrencia_ssw AS ENUM (
      'Cliente',
      'Informativo',
      'Sistema',
      'Operacional'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grupo_transportador') THEN
    CREATE TYPE public.grupo_transportador AS ENUM (
      'ATIVA',
      'BRASSPRESS',
      'TA_AMERICANA',
      'CAMILO',
      'OUTROS'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_fatura_transportadora') THEN
    CREATE TYPE public.status_fatura_transportadora AS ENUM (
      'Aberta',
      'Paga',
      'Em_Analise'
    );
  END IF;
END$$;

-- ============================================================================
-- 2) Tabela: transportador_logistica
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transportador_logistica (
  id                  bigserial PRIMARY KEY,
  razao_social        text NOT NULL,
  nome_fantasia       text NULL,
  cnpj                text NOT NULL,
  inscricao_estadual  text NULL,
  uf                  varchar(2) NULL,
  email               text NULL,
  telefone            text NULL,
  grupo               public.grupo_transportador NOT NULL DEFAULT 'OUTROS',
  ssw_dominio         varchar(8) NULL,
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  criado_por          uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  atualizado_por      uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  CONSTRAINT transportador_logistica_cnpj_digits CHECK (cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT transportador_logistica_cnpj_unique UNIQUE (cnpj)
);

COMMENT ON TABLE public.transportador_logistica IS
  'Transportadoras usadas pelo módulo Logística (F-LOG-CRM R-LOG-1). CNPJ digits-only obrigatório. ssw_dominio é a chave SSW (ex.: FAV/ATV/TEC/BRA/TNT) usada em R-LOG-4.';

COMMENT ON COLUMN public.transportador_logistica.ssw_dominio IS
  'Domínio SSW (3-8 chars) — null se transportador não usa SSW. Decisão definitiva em ADR-006.';

-- ============================================================================
-- 3) Tabela: regiao_destino (lookup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.regiao_destino (
  id          serial PRIMARY KEY,
  nome        text NOT NULL,
  uf          varchar(2) NULL,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regiao_destino_nome_unique UNIQUE (nome)
);

COMMENT ON TABLE public.regiao_destino IS
  'Lookup de regiões de destino (ex.: MG-MATA, RJ-SUL, PARANA, BAHIA). Originado do form Bubble. Seeds opcionais em migration separada.';

-- ============================================================================
-- 4) Tabela: origem_frete (lookup com empresa_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.origem_frete (
  id          serial PRIMARY KEY,
  nome        text NOT NULL,
  uf          varchar(2) NULL,
  empresa_id  bigint NOT NULL REFERENCES public.ref_empresas_subsidiarias(id) ON DELETE RESTRICT,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT origem_frete_nome_empresa_unique UNIQUE (nome, empresa_id)
);

COMMENT ON TABLE public.origem_frete IS
  'Lookup de origens de frete por empresa (ex.: MG-JDF, RJ-RIO, SP-SAO). Empresa_id obrigatório (cada subsidiária pode ter origens diferentes).';

-- ============================================================================
-- 5) Tabela: frete_logistica (cabeçalho do frete)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.frete_logistica (
  id                  bigserial PRIMARY KEY,
  pedido_venda_id     bigint NULL REFERENCES public.pedido_venda("pedido_venda_ID") ON DELETE SET NULL,
  -- FK opcional desde já (ON DELETE SET NULL). R-LOG-3 popula via hook em tiny-enviar-pedido-venda-v1.
  nfe_numero          integer NULL,
  nfe_chave_acesso    text NULL,
  cliente_id          bigint NULL REFERENCES public.cliente(cliente_id) ON DELETE SET NULL,
  empresa_id          bigint NOT NULL REFERENCES public.ref_empresas_subsidiarias(id) ON DELETE RESTRICT,
  vendedor_id         uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  transportador_id    bigint NULL REFERENCES public.transportador_logistica(id) ON DELETE SET NULL,
  regiao_destino_id   integer NULL REFERENCES public.regiao_destino(id) ON DELETE SET NULL,
  origem_frete_id     integer NULL REFERENCES public.origem_frete(id) ON DELETE SET NULL,
  data_emissao        date NULL,
  data_saida          date NULL,
  previsao_entrega    date NULL,
  data_entrega        date NULL,
  valor_produtos      numeric(14,2) NOT NULL DEFAULT 0,
  valor_cotacao       numeric(14,2) NULL,
  volumes             integer NULL,
  numero_expedicao    text NULL,
  numero_coleta       text NULL,
  status_entrega      public.status_entrega_frete NOT NULL DEFAULT 'Em Separação',
  rateio              boolean NOT NULL DEFAULT false,
  reentrega           boolean NOT NULL DEFAULT false,
  dacte_url           text NULL,
  comprovante_entrega_url text NULL,
  observacoes         text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  criado_por          uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  atualizado_por      uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  CONSTRAINT frete_logistica_valor_produtos_pos CHECK (valor_produtos >= 0),
  CONSTRAINT frete_logistica_valor_cotacao_pos CHECK (valor_cotacao IS NULL OR valor_cotacao >= 0),
  CONSTRAINT frete_logistica_volumes_pos CHECK (volumes IS NULL OR volumes >= 0),
  CONSTRAINT frete_logistica_nfe_chave_44 CHECK (nfe_chave_acesso IS NULL OR nfe_chave_acesso ~ '^[0-9]{44}$')
);

COMMENT ON TABLE public.frete_logistica IS
  'Cabeçalho do frete (R-LOG-1, F-LOG-CRM). pedido_venda_id NULLABLE — preenchido por R-LOG-3 quando hook em tiny-enviar-pedido-venda-v1 cria automaticamente. Criação manual em R-LOG-1 permite NULL.';

-- ============================================================================
-- 6) Tabela: frete_logistica_ocorrencia
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.frete_logistica_ocorrencia (
  id              bigserial PRIMARY KEY,
  frete_id        bigint NOT NULL REFERENCES public.frete_logistica(id) ON DELETE CASCADE,
  codigo_ssw      text NOT NULL,
  descricao_ocorrencia text NULL,
  tipo            public.tipo_ocorrencia_ssw NOT NULL DEFAULT 'Informativo',
  data_hora       timestamptz NOT NULL DEFAULT now(),
  dominio         text NULL,
  filial          text NULL,
  cidade          text NULL,
  uf              varchar(2) NULL,
  raw_payload     jsonb NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.frete_logistica_ocorrencia IS
  'Ocorrências SSW por frete (R-LOG-4). Em R-LOG-1 a tabela existe mas só é populada manualmente; integração SSW vem na R-LOG-4.';

-- ============================================================================
-- 7) Tabela: fatura_transportadora (estrutura apenas — CRUD em R-LOG-6)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fatura_transportadora (
  id                  bigserial PRIMARY KEY,
  transportador_id    bigint NOT NULL REFERENCES public.transportador_logistica(id) ON DELETE RESTRICT,
  empresa_id          bigint NOT NULL REFERENCES public.ref_empresas_subsidiarias(id) ON DELETE RESTRICT,
  numero_fatura       text NOT NULL,
  valor_total         numeric(14,2) NOT NULL DEFAULT 0,
  data_emissao        date NULL,
  data_vencimento     date NULL,
  status              public.status_fatura_transportadora NOT NULL DEFAULT 'Aberta',
  arquivo_url         text NULL,
  observacoes         text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  criado_por          uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  atualizado_por      uuid NULL REFERENCES public."user"(user_id) ON DELETE SET NULL,
  CONSTRAINT fatura_transp_valor_pos CHECK (valor_total >= 0),
  CONSTRAINT fatura_transp_unica UNIQUE (transportador_id, numero_fatura)
);

COMMENT ON TABLE public.fatura_transportadora IS
  'Fatura emitida pela transportadora (R-LOG-6). Em R-LOG-1 só estrutura.';

-- ============================================================================
-- 8) Tabela: fatura_transportadora_item
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fatura_transportadora_item (
  id                  bigserial PRIMARY KEY,
  fatura_id           bigint NOT NULL REFERENCES public.fatura_transportadora(id) ON DELETE CASCADE,
  frete_id            bigint NULL REFERENCES public.frete_logistica(id) ON DELETE SET NULL,
  cte_numero          text NULL,
  data_emissao_cte    date NULL,
  nfe_numero          integer NULL,
  destinatario        text NULL,
  valor_mercadoria    numeric(14,2) NULL,
  peso_kg             numeric(10,3) NULL,
  valor_frete_cobrado numeric(14,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fatura_item_valor_pos CHECK (valor_frete_cobrado >= 0),
  CONSTRAINT fatura_item_valor_mercad_pos CHECK (valor_mercadoria IS NULL OR valor_mercadoria >= 0),
  CONSTRAINT fatura_item_peso_pos CHECK (peso_kg IS NULL OR peso_kg >= 0)
);

COMMENT ON TABLE public.fatura_transportadora_item IS
  'Item da fatura transportadora (R-LOG-6). frete_id NULLABLE — fatura pode chegar com NFe ainda não cadastrada em frete_logistica.';

-- ============================================================================
-- 9) Índices
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_frete_logistica_nfe_numero
  ON public.frete_logistica(nfe_numero) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_frete_logistica_chave_acesso
  ON public.frete_logistica(nfe_chave_acesso) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_frete_logistica_empresa
  ON public.frete_logistica(empresa_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_frete_logistica_status
  ON public.frete_logistica(status_entrega) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_frete_logistica_pedido_venda
  ON public.frete_logistica(pedido_venda_id) WHERE pedido_venda_id IS NOT NULL AND deleted_at IS NULL;

-- Idempotência do hook de R-LOG-3: (empresa_id, nfe_numero) é a chave natural
-- usada pelo Tiny ao emitir uma NFe; só permite 1 frete ativo por NFe por empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_frete_logistica_empresa_nfe
  ON public.frete_logistica(empresa_id, nfe_numero)
  WHERE nfe_numero IS NOT NULL AND deleted_at IS NULL;

-- Idempotência adicional: chave de acesso da NFe (44 dígitos) é globalmente única.
CREATE UNIQUE INDEX IF NOT EXISTS uq_frete_logistica_chave_acesso
  ON public.frete_logistica(nfe_chave_acesso)
  WHERE nfe_chave_acesso IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_frete_ocorrencia_frete
  ON public.frete_logistica_ocorrencia(frete_id);

CREATE INDEX IF NOT EXISTS idx_fatura_item_frete
  ON public.fatura_transportadora_item(frete_id) WHERE frete_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transportador_logistica_cnpj
  ON public.transportador_logistica(cnpj) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transportador_logistica_grupo
  ON public.transportador_logistica(grupo) WHERE ativo = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_origem_frete_empresa
  ON public.origem_frete(empresa_id) WHERE ativo = true;

-- ============================================================================
-- 10) RLS — defesa em profundidade
-- ============================================================================
-- Estratégia R-LOG-1: Edge Functions usam SERVICE_ROLE (bypassa RLS) e fazem
-- auth/tenant scoping em código. RLS aqui é defense-in-depth: leitura permitida
-- a usuários autenticados; ESCRITAS bloqueadas no nível do banco para clientes
-- diretos. Reservamos a granularidade fina para R-LOG-2/3 quando fluxos
-- multiempresa amadurecerem.

ALTER TABLE public.transportador_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regiao_destino ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origem_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frete_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frete_logistica_ocorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_transportadora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_transportadora_item ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transportador_logistica',
    'regiao_destino',
    'origem_frete',
    'frete_logistica',
    'frete_logistica_ocorrencia',
    'fatura_transportadora',
    'fatura_transportadora_item'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      t || '_select_authenticated', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_select_authenticated', t
    );
  END LOOP;
END$$;

-- ============================================================================
-- 11) Notas
-- ============================================================================
-- • Seeds (região destino e origem do Cântico) ficam em 119a opcional ou em
--   migration dedicada (não inclusos para manter rollback simples).
-- • Após a aplicação em staging, conferir:
--     SELECT table_name FROM information_schema.tables
--      WHERE table_schema='public' AND table_name LIKE 'frete%' OR table_name LIKE 'fatura_transp%' OR table_name='transportador_logistica' OR table_name='regiao_destino' OR table_name='origem_frete';
--   Esperado: 7 linhas.
-- • Rollback: ver docs/plans/cursor-brief.md Tarefa 8 — DROP TABLE na ordem
--   inversa + DROP TYPE.
