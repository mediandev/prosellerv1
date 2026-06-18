-- Migration 135: campos de agendamento de entrega em frete_logistica.
-- Usados pela EntregaPublicaPage quando motorista reporta agendamento.

ALTER TABLE frete_logistica
  ADD COLUMN IF NOT EXISTS data_agendamento   DATE,
  ADD COLUMN IF NOT EXISTS hora_agendamento   TEXT,
  ADD COLUMN IF NOT EXISTS obs_agendamento    TEXT;
