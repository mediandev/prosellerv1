# Changelog

## V 1.16 — 2026-05-26

### Bug Fixes

- **Segmento de cliente não persistia** — Edge functions `create-cliente-v2` e `update-cliente-v2` não enviavam `segmento_id` ao banco. Corrigido para enviar segmento, grupo_id, situação, empresa de faturamento e condições de pagamento.
- **Grupo/Rede não aparecia na busca** — Limite de 100 registros impedia que grupos após a posição 100 (ordem alfabética) fossem carregados. Limite aumentado para 500 na edge function e na RPC.
- **Naturezas de operação não persistiam** — Operações de criar, editar e excluir caíam silenciosamente em fallback local (mock/localStorage) quando a edge function falhava. Removido o fallback — erros agora são exibidos ao usuário.
- **Exclusão de natureza de operação** — Naturezas em uso em pedidos agora são desativadas (soft-delete) ao invés de bloquear a exclusão. Nome recebe sufixo "(Excluído)" para identificação em relatórios.

### Migrations

- `108_fix_segmento_inconsistencies.sql` — Corrige 15 clientes com campos de segmento inconsistentes.
- `109_improve_natureza_operacao_delete.sql` — Soft-delete melhorado para naturezas de operação em uso.
- `110_increase_grupos_redes_limit.sql` — Aumenta limite da RPC de listagem de grupos/redes de 100 para 500.
