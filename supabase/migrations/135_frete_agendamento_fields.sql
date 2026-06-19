-- migration 135: campos de agendamento de reentrega em frete_logistica
-- Usados pelo endpoint público entrega-publica-v1 (action=reportar_agendamento)
-- e pelo backoffice ao mover frete para status "Aguardando Agendamento" / "Agendado".

ALTER TABLE frete_logistica
  ADD COLUMN IF NOT EXISTS data_agendamento DATE,
  ADD COLUMN IF NOT EXISTS hora_agendamento TEXT,
  ADD COLUMN IF NOT EXISTS obs_agendamento  TEXT;
