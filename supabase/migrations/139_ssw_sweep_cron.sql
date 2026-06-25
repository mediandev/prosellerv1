-- Migration 139: agenda a varredura horária de rastreio SSW (R-LOG-4).
-- Chama a Edge Function ssw-sweep-v1 a cada hora via pg_cron + pg_net.
--
-- PRÉ-REQUISITOS (aplicar ANTES, ver cursor-brief.md):
--   1. Secret SSW_SWEEP_SECRET configurado na Edge Function ssw-sweep-v1.
--   2. O MESMO valor substituído no placeholder <SSW_SWEEP_SECRET> abaixo.
--   3. Extensões pg_cron e pg_net habilitadas no projeto.
--
-- ATENÇÃO: este arquivo contém um secret após o preenchimento — não commitar
-- a versão preenchida. Aplicar via editor SQL do Supabase (não versionar o valor).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior (idempotência ao reaplicar).
select cron.unschedule('ssw-sweep-hourly')
where exists (select 1 from cron.job where jobname = 'ssw-sweep-hourly');

-- Agenda no minuto 0 de cada hora.
select cron.schedule(
  'ssw-sweep-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1/ssw-sweep-v1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sweep-secret', '<SSW_SWEEP_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
