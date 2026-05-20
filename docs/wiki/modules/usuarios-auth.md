# Módulo — Usuários e Autenticação

## Propósito

Gestão de usuários do ProSeller (vendedor / backoffice / admin), com integração ao `auth.users` do Supabase. Inclui criação por convite, atualização de dados pessoais, exclusão soft, e regras de permissão por tipo de usuário.

## Edge Functions

- **`create-user-v2/index.ts`** — convite via `supabaseAdmin.auth.admin.inviteUserByEmail` + insert em `public."user"` via `create_user_v2` RPC. Trata reativação de soft-deletes (V 1.29 / migration 114 — UPSERT `ON CONFLICT ON CONSTRAINT user_pkey`).
- **`update-user-v2/index.ts`** — atualização dos dados do usuário em `public."user"`.
- **`delete-user-v2/index.ts`** — soft-delete em `public."user"` (não toca `auth.users` por design — preserva auditoria). Preflight CORS corrigido em V 1.24.
- **`list-users-v2/index.ts`** — listagem para a tela de gestão.
- **`get-user-v2/index.ts`** — leitura individual.
- **`get-vendedor-completo-v2/index.ts`** — perfil completo de vendedor (dados pessoais + `dados_vendedor`).

## Tabelas Postgres principais

- `auth.users` (Supabase) — autenticação. **Não tocada por soft-delete** (preserva histórico).
- `public."user"` — perfil do usuário no app. Campos: `ativo`, `deleted_at`, `deleted_by`, `tipo` (`vendedor` | `backoffice` | `admin`).
- `dados_vendedor` — informações específicas de vendedor (FK para `public."user"` via `user_id`; `idtiny` obrigatório para envio Tiny).

## RPCs relacionadas

- `create_user_v2` (7-args, RETURNS TABLE com `user_id uuid` — usa `ON CONFLICT ON CONSTRAINT user_pkey` para evitar colisão com bare reference).
- `update_user_v2`, `delete_user_v2` — refs qualificadas com alias (lição da V 1.25 / migration 113).
- `update_dados_vendedor_v2` — migration 111 corrigiu ambiguidade de `user_id`.

## Componentes React principais

- Página de **Configurações › Usuários** (lista, criar, editar, excluir).
- Formulário de vendedor (campos: nome, e-mail, telefone, dados Tiny `idtiny`, comissões etc.).

## Débitos conhecidos do módulo

- **Reativação silenciosa de soft-deletes** — V 1.29 (migration 114) introduziu o UPSERT. Documentar para futuros agentes: quem excluir e recriar um usuário com mesmo e-mail recupera o `user_id` antigo (FKs históricas preservadas), `ativo=TRUE`, `deleted_at=NULL`. Não é bug, é design.

## Incidentes históricos relevantes

- **BUG-006 / BUG-007 → INC-012** (2026-05-06) — Recriar usuário com mesmo e-mail após exclusão estourava `duplicate key value violates unique constraint user_pkey`. Causa: `inviteUserByEmail` devolveu o mesmo `auth_user_id` da row soft-deleted; `INSERT` original colidia com a PK. Resolução: migration 114 troca para `INSERT ... ON CONFLICT ON CONSTRAINT user_pkey DO UPDATE` (reativa).
- **V 1.25** (migration 113) — Refs de `user_id` no RPC `delete_user_v2` eram ambíguas com a coluna OUT.
- **V 1.24** — `delete-user-v2` faltava preflight CORS DELETE.

## Referências

- Migrations 111, 113, 114 · TODO §5 INC-012 · TODO §6 V 1.24, V 1.25, V 1.29.
