-- ============================================================================
-- Migration 018: Corrigir RLS UPDATE para tipos_veiculo
-- ============================================================================
-- Descrição: Garante que a política de UPDATE permita soft delete
--            (UPDATE que seta deleted_at)
-- Data: 2026-01-29
-- ============================================================================

-- Recriar política de UPDATE para garantir que permite soft delete
-- O USING permite atualizar linhas existentes (deleted_at IS NULL ou não)
-- O WITH CHECK permite qualquer valor na nova linha (incluindo deleted_at preenchido)
DROP POLICY IF EXISTS "Authenticated can update tipos_veiculo" ON public.tipos_veiculo;

CREATE POLICY "Authenticated can update tipos_veiculo"
  ON public.tipos_veiculo
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL OR deleted_at IS NOT NULL)
  WITH CHECK (true);
