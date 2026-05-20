# Runbook — Aplicar migration nova no Supabase

> Sempre via **Cursor Agent + MCP Supabase**, com `docs/plans/cursor-brief.md` preparado e seção **Rollback** obrigatória. Em produção, classe **D**.

## Quando usar

- Adicionar/alterar colunas, índices, RLS, RPCs, triggers.
- Mudar permissões (`security definer`).
- Qualquer DDL que afete tabelas em produção.

## Pré-condições

- [ ] Migration commitada em `supabase/migrations/<NN>_<slug>.sql` (próximo número livre — gaps históricos não preencher).
- [ ] Migration testada em sessão local (`supabase db reset` ou ambiente staging do dev).
- [ ] `docs/plans/cursor-brief.md` atualizado com:
  - **Operação:** o que faz, qual tabela, qual coluna.
  - **Comando MCP exato:** `mcp__supabase__apply_migration` com `name` + `query`.
  - **Pré-condições:** backup CSV se há massa de dados que pode ser perdida (ver `docs/plans/backup_*.csv` como exemplo).
  - **Rollback:** SQL inverso (DROP COLUMN, ALTER, etc.) que volta ao estado pré-migration.
- [ ] Confirmação humana (Eduardo) antes de disparar.
- [ ] Janela operacional adequada (não em horário de alto tráfego, idealmente fora do expediente do cliente).

## Comando MCP

```
mcp__supabase__apply_migration({
  project_id: "xxoiqfraeolsqsmsheue",
  name: "<NN>_<slug>",
  query: "<SQL completo da migration>"
})
```

Em paralelo: confirmar via `mcp__supabase__list_migrations` que o número não foi pulado/duplicado.

## Validação pós-aplicação

1. **Query de validação:**
   ```sql
   -- Exemplo (ajustar por migration):
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = '<tabela>' AND column_name = '<coluna nova>';
   ```
2. Smoke do fluxo afetado (criar 1 cliente, abrir 1 pedido, etc.).
3. Log da operação em `docs/wiki/log.md` tipo `[MIGRATION]`.

## Rollback

- Executar o SQL inverso documentado no `cursor-brief.md`.
- Se houve perda de dado, restaurar do backup CSV/SQL prévio.
- Registrar em `docs/wiki/log.md` tipo `[BLOCKED]` ou `[BUGFIX]` conforme o caso.

## Lições registradas

- **INC-001** (2026-04-24) — Operação relacionada (deploy de função) via MCP publicou stub. Migration em si foi OK; mas o episódio reforçou a regra: **MCP Supabase só para operações de banco, não para deploy de função**. Ver ADR-005.
- **Migration 114** (V 1.29 / INC-012) — UPSERT `ON CONFLICT ON CONSTRAINT user_pkey`. Dry-run via `BEGIN; SELECT create_user_v2(...); ROLLBACK;` antes do COMMIT real. Padrão recomendado para mudanças em RPC com dados existentes.
- **INC-013** (2026-05-07) — Backup CSV em `docs/plans/backup_inc013_montoz_2026-05-07.csv` antes de UPDATE direto via MCP. Padrão recomendado quando há massa de dados afetada.
- **Migration 115** (V 1.31) — unaccent + CNPJ digits + grupo_rede. Backup SQL prévio em `docs/plans/backup_list_clientes_v2_pre_115.sql`.

## Anti-patterns

- ❌ Preencher gaps históricos de numeração (031-040 etc.). Não fazer.
- ❌ Editar migrations já aplicadas (CLAUDE.md proibido). Use nova migration `116`, `117`...
- ❌ Rodar DDL diretamente via `execute_sql` em produção — sempre via `apply_migration` para que fique no histórico de `list_migrations`.

## Referências

- CLAUDE.md "Não mexer em migrations já aplicadas" · `docs/plans/cursor-brief.md` (template inicial e exemplos por tarefa) · TODO §4 (gaps documentados).
