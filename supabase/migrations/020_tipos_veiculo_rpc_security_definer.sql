-- ============================================================================
-- Migration 020: RPCs tipos_veiculo com SECURITY DEFINER
-- ============================================================================
-- As funções que fazem INSERT/UPDATE na tabela tipos_veiculo passam a rodar
-- com privilégios do dono (bypass RLS). A validação de backoffice permanece
-- dentro das funções (p_created_by, p_updated_by, p_deleted_by).
-- Assim evita-se o erro "new row violates row-level security policy".
-- ============================================================================

ALTER FUNCTION create_tipos_veiculo_v2(TEXT, TEXT, UUID) SECURITY DEFINER;
ALTER FUNCTION update_tipos_veiculo_v2(UUID, TEXT, TEXT, BOOLEAN, UUID) SECURITY DEFINER;
ALTER FUNCTION delete_tipos_veiculo_v2(UUID, UUID) SECURITY DEFINER;
