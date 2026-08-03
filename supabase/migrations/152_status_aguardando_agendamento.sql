-- Migration 152: conclui a troca de status de frete "Em Trânsito - Reentrega"
--                 -> "Aguardando Agendamento".
--
-- Contexto: a troca foi feita no FRONT (changelog V1.5x) mas nunca no banco. O
-- Kanban, o badge e a tela de detalhe já exibem a coluna "Aguardando Agendamento",
-- só que o tipo `status_entrega_frete` nunca recebeu esse valor. Consequência real
-- em produção HOJE: arrastar um frete para essa coluna é rejeitado pelo banco.
--
-- Decisão do cliente (2026-08-03): *"Utilizamos o aguardando agendamento, precisa
-- concluir a troca para manter 'aguardando agendamento'."*
--
-- Segurança da troca, medida em prod em 2026-08-03:
--   * ZERO fretes com 'Em Trânsito - Reentrega' -> nenhuma linha a migrar.
--   * A única coluna que usa o tipo é frete_logistica.status_entrega.
--
-- 'Em Trânsito - Reentrega' PERMANECE no tipo. Remover valor de enum no Postgres
-- exige recriar o tipo e todas as dependências — risco desproporcional para um
-- valor que ninguém mais grava. Fica como legado inerte: o mapeador do SSW deixa
-- de produzi-lo (ver _shared/frete-logistica-helpers.ts nesta mesma entrega).
--
-- Posição: logo após 'Em Trânsito', para a ordem do tipo espelhar a ordem das
-- colunas do Kanban (Em Trânsito -> Aguardando Agendamento -> Agendado).

ALTER TYPE public.status_entrega_frete
  ADD VALUE IF NOT EXISTS 'Aguardando Agendamento' AFTER 'Em Trânsito';
