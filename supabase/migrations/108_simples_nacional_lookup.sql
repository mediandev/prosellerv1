-- 108: F-001 Consulta Simples Nacional
-- Adiciona (a) flag optante + timestamp da consulta no cliente
--         (b) valor Tiny dual por natureza/empresa (dual-ID ADR-003).
-- Todas as colunas sao NULL-safe para preservar dados e comportamento atuais.
-- Ver: docs/specs/SPEC.md §7, docs/decisions/adr/ADR-003*.md, ADR-004*.md,
--      docs/plans/cursor-brief.md §Tarefa 1.

-- 108.a) cliente: flag Simples Nacional + timestamp
alter table public.cliente
  add column if not exists optante_simples_nacional boolean null,
  add column if not exists optante_simples_nacional_consultado_em timestamptz null;

comment on column public.cliente.optante_simples_nacional is
  'true = cliente optante do Simples Nacional (CONSOPT via ReceitaWS). null = nunca consultado, cliente PF, ou consulta inconclusiva. Ver SPEC §1 RF-001.';

comment on column public.cliente.optante_simples_nacional_consultado_em is
  'Timestamp da ultima consulta ReceitaWS que produziu valor definitivo. Revalidacao acontece a cada envio de pedido Tiny (ADR-004). Ver SPEC §1 RF-003.';

-- 108.b) tiny_empresa_natureza_operacao: natureza distinta para optantes
alter table public.tiny_empresa_natureza_operacao
  add column if not exists tiny_valor_simples text null;

comment on column public.tiny_empresa_natureza_operacao.tiny_valor_simples is
  'Valor natureza_operacao Tiny usado quando cliente destinatario e optante do Simples Nacional. NULL = usa tiny_valor para todos (comportamento pre-F-001). Invariante: se NOT NULL, tiny_valor tambem precisa estar NOT NULL. Ver ADR-003.';
