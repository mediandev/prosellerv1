# Changelog

## V 1.18 — 2026-05-27

### Bug Fixes

- **Desconto comercial e condição padrão não persistiam na edição** — A RPC `update_cliente_v2` não possuía os parâmetros `p_desconto` e `p_condicao_padrao`. Campos eram coletados pelo formulário mas nunca gravados no banco ao editar um cliente.
- **Campos faltantes no PUT do clientes-v2** — Edge function não enviava `email_nf`, campos de endereço e `observacao_contato` para a RPC na atualização. Corrigido para enviar todos os campos do formulário.

### Migrations

- `115_fix_update_cliente_missing_fields.sql` — Recria `update_cliente_v2` com `p_desconto` e `p_condicao_padrao`, além de dropar overloads legados.

---

## V 1.17 — 2026-05-26

### Ajustes de dados (produção)

- **Vendedores corrigidos** — 186 clientes reatribuídos ao vendedor correto conforme auditoria. 17 cadastros indevidos removidos (soft-delete).
- **Razão social limpa** — Removido código antigo entre parênteses do nome de ~480 clientes.
- **Códigos de cliente resetados** — Todos os códigos antigos (Tiny) zerados. Novos códigos sequenciais gerados (1, 2, 3...) por ordem alfabética. Tabela de conciliação `cliente_codigo_depara` criada para referência.
- **Geração automática sem zeros** — Novos clientes cadastrados recebem código sequencial sem zero à esquerda.

### Migrations

- `111_apply_vendedor_adjustments.sql` — Ajuste de vendedores + soft-delete de 17 cadastros.
- `112_clean_razao_social_codes.sql` — Limpeza de nomes (remove códigos entre parênteses).
- `113_reset_sequential_client_codes.sql` — Reset de códigos + geração sequencial + tabela de-para.

---

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
