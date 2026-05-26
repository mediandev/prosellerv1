-- Migration 120 · F-LOG-CRM R-LOG-4 — Ajustes para integração SSW Tracking
--
-- DDL aditivo puro (ADD VALUE + ADD COLUMN IF NOT EXISTS). Seguro para aplicar
-- em produção sem staging (mesmo racional da 119).
--
-- 1) Adiciona valor 'Entrega' ao ENUM tipo_ocorrencia_ssw — SSW retorna esse
--    tipo para eventos de entrega final, que a migration 119 não previa.
-- 2) Adiciona 3 colunas em frete_logistica_ocorrencia para campos da resposta
--    SSW que não cabiam no schema original:
--    - nome_recebedor: quem recebeu (preenchido só em eventos de entrega)
--    - nro_doc_recebedor: documento do recebedor
--    - data_hora_efetiva: timestamp efetivo do evento (distinto do data_hora)

-- ============================================================================
-- 1) ENUM: adicionar 'Entrega' a tipo_ocorrencia_ssw
-- ============================================================================
-- ALTER TYPE ... ADD VALUE é idempotente a partir do PG 12 com IF NOT EXISTS.

ALTER TYPE public.tipo_ocorrencia_ssw ADD VALUE IF NOT EXISTS 'Entrega';

-- ============================================================================
-- 2) Colunas adicionais em frete_logistica_ocorrencia
-- ============================================================================

ALTER TABLE public.frete_logistica_ocorrencia
  ADD COLUMN IF NOT EXISTS nome_recebedor text NULL;

ALTER TABLE public.frete_logistica_ocorrencia
  ADD COLUMN IF NOT EXISTS nro_doc_recebedor text NULL;

ALTER TABLE public.frete_logistica_ocorrencia
  ADD COLUMN IF NOT EXISTS data_hora_efetiva timestamptz NULL;
