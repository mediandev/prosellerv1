-- Migration 162: o e-mail da sentinela para de repetir o que já foi avisado.
--
-- Problema observado no uso real (2026-08-04): o e-mail chegava todo dia com os
-- MESMOS alertas em aberto. Alerta repetido vira ruído, e quem recebe aprende a
-- apagar sem ler — que é exatamente o defeito que a sentinela existe para evitar.
--
-- A solução não é verificar menos. A verificação diária é barata e mantém a tela
-- correta; o que precisa mudar é QUANDO vale a pena interromper alguém:
--
--   * apareceu algo NOVO  -> e-mail no mesmo dia
--   * nada novo           -> silêncio
--   * ainda há pendência  -> um lembrete por semana (segunda-feira)
--
-- Assim um problema novo nunca demora, e o que já é conhecido não incomoda todo
-- dia. Esta coluna é o que permite distinguir os dois casos.

ALTER TABLE public.sentinela_alerta
  ADD COLUMN IF NOT EXISTS notificado_em timestamptz;

COMMENT ON COLUMN public.sentinela_alerta.notificado_em IS
  'Quando este alerta já foi enviado por e-mail (migration 162). NULL = ainda não avisado.';

CREATE INDEX IF NOT EXISTS ix_sentinela_alerta_nao_notificado
  ON public.sentinela_alerta (criado_em)
  WHERE resolvido_em IS NULL AND notificado_em IS NULL;
