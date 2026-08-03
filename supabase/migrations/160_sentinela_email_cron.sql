-- Migration 160: agenda o e-mail da sentinela.
--
-- Fecha o ciclo que a migration 148 abriu: a verificação diária encontrava as
-- violações e as gravava numa tabela que ninguém abria. Detector de fumaça sem
-- bateria. Agora o resultado chega em alguém.
--
-- Horário: 9h15 UTC = 6h15 de Brasília — 15 minutos DEPOIS da verificação
-- (`sentinela-diaria`, 9h UTC), para o e-mail refletir o resultado do dia e não
-- o da véspera.
--
-- Silêncio quando está tudo certo é intencional (a Edge Function decide isso):
-- alarme que apita todos os dias vira ruído, e a pessoa aprende a ignorar — que
-- é exatamente o defeito que a sentinela existe para evitar.
--
-- Destinatário: `SENTINELA_EMAIL_DESTINO` (secret da Edge Function); sem ele,
-- cai no padrão lucas.carmo@flowcode.cc. Trocar o destinatário é só trocar o
-- secret — não exige mexer em código nem reagendar nada.

SELECT cron.unschedule('sentinela-email-diaria')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sentinela-email-diaria');

SELECT cron.schedule(
  'sentinela-email-diaria',
  '15 9 * * *',
  $cron$
  SELECT net.http_post(
    url     := 'https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1/sentinela-email-v1',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb,
    -- pg_net expira em ~5s por padrão; o envio pode passar disso e o log
    -- registraria falha num envio que deu certo (lição do cron do SSW).
    timeout_milliseconds := 60000
  );
  $cron$
);
