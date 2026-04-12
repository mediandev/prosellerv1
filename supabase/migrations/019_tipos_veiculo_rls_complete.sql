-- ============================================================================
-- Migration 019: RLS completo para tipos_veiculo
-- ============================================================================
-- Configura todas as políticas RLS necessárias para a tabela tipos_veiculo.
-- As funções RPC usam SECURITY INVOKER (executam como o usuário que chama).
-- A Edge Function chama os RPCs com JWT do usuário → role authenticated.
-- ============================================================================

-- Garantir que RLS está ativo
ALTER TABLE public.tipos_veiculo ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (evita duplicatas ao reaplicar)
DROP POLICY IF EXISTS "Authenticated can select tipos_veiculo" ON public.tipos_veiculo;
DROP POLICY IF EXISTS "Authenticated can insert tipos_veiculo" ON public.tipos_veiculo;
DROP POLICY IF EXISTS "Authenticated can update tipos_veiculo" ON public.tipos_veiculo;
DROP POLICY IF EXISTS "Service role full access tipos_veiculo" ON public.tipos_veiculo;

-- ----------------------------------------------------------------------------
-- SELECT: usuários autenticados veem apenas registros não excluídos
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated can select tipos_veiculo"
  ON public.tipos_veiculo
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- ----------------------------------------------------------------------------
-- INSERT: usuários autenticados podem inserir (quem pode criar é validado no RPC)
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated can insert tipos_veiculo"
  ON public.tipos_veiculo
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- UPDATE: usuários autenticados podem atualizar (edição e soft delete)
-- USING: permite atualizar qualquer linha existente
-- WITH CHECK: permite qualquer valor na nova linha (incl. deleted_at preenchido)
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated can update tipos_veiculo"
  ON public.tipos_veiculo
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Service role: acesso total (Edge Function com service key, jobs, etc.)
-- ----------------------------------------------------------------------------
CREATE POLICY "Service role full access tipos_veiculo"
  ON public.tipos_veiculo
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
