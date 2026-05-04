-- Migration 112 — Auditoria de envio Tiny no pedido_venda (F-001 INC-006)
-- Data: 2026-05-04
-- Motivacao: precisamos provar via SQL exatamente qual tinyValor cada pedido
-- enviou ao Tiny no momento do envio, sem depender dos logs do Logflare ou
-- do painel do Tiny. Isso fecha o ciclo de observabilidade do F-001 e
-- permite auditoria contabil/regulatoria sobre escolha de natureza.
--
-- 3 colunas, todas nullable para nao quebrar pedidos antigos:
--   - tiny_natureza_enviada (text):    valor exato passado em
--                                       payload.pedido.natureza_operacao
--   - tiny_optante_aplicado (boolean): valor de optanteSimples no momento
--                                       da escolha (null se feature off
--                                       ou cliente nao-PJ)
--   - tiny_fallback_used (text):       enum FallbackUsed do helper
--                                       (none/no_dual/no_dual_company/
--                                       null_optante/revalidation_failed)
--
-- Sem default. Sem backfill — pedidos antigos ficam null. Os pedidos
-- enviados a partir do deploy desta versao da Edge Function passarao a
-- gravar.

ALTER TABLE public.pedido_venda
  ADD COLUMN IF NOT EXISTS tiny_natureza_enviada text NULL,
  ADD COLUMN IF NOT EXISTS tiny_optante_aplicado boolean NULL,
  ADD COLUMN IF NOT EXISTS tiny_fallback_used text NULL;

COMMENT ON COLUMN public.pedido_venda.tiny_natureza_enviada IS
  'F-001 INC-006: tinyValor exato (codigo natureza Tiny) que foi enviado em pedido.natureza_operacao no momento do envio. Auditoria.';
COMMENT ON COLUMN public.pedido_venda.tiny_optante_aplicado IS
  'F-001 INC-006: optanteSimples aplicado pelo resolver. true=Simples, false=Nao-Simples, null=feature off ou cliente nao-PJ.';
COMMENT ON COLUMN public.pedido_venda.tiny_fallback_used IS
  'F-001 INC-006: razao da escolha registrada pelo resolver. Valores: none, no_dual, no_dual_company, null_optante, revalidation_failed.';
