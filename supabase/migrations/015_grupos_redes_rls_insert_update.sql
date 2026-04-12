-- ============================================================================
-- Migration 015: RLS INSERT/UPDATE para grupos_redes (authenticated)
-- ============================================================================
-- As funções RPC usam SECURITY INVOKER (executam como o usuário que chama).
-- A Edge Function chama o RPC com o JWT do usuário, então INSERT/UPDATE
-- são executados como role "authenticated". Sem estas políticas, o INSERT falha.
-- A restrição "apenas backoffice" já é aplicada dentro das funções RPC.
-- ============================================================================

-- INSERT: permitir usuários autenticados inserir (quem pode criar é validado no RPC)
CREATE POLICY "Authenticated can insert grupos_redes"
  ON public.grupos_redes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: permitir usuários autenticados atualizar (inclui soft delete; RPC valida backoffice)
CREATE POLICY "Authenticated can update grupos_redes"
  ON public.grupos_redes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
