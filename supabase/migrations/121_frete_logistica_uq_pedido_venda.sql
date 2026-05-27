-- Migration 121: R-LOG-3 — unique partial index on pedido_venda_id
-- Garante idempotência no auto-create de frete: retry do mesmo pedido não duplica.
-- DDL aditivo puro (CREATE INDEX). Rollback: DROP INDEX uq_frete_logistica_pedido_venda;

CREATE UNIQUE INDEX IF NOT EXISTS uq_frete_logistica_pedido_venda
  ON frete_logistica (pedido_venda_id)
  WHERE pedido_venda_id IS NOT NULL AND deleted_at IS NULL;
