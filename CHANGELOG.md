# Changelog

## V 1.21 — 2026-06-09

### Permissionamento

- **Permissões agora valem também para usuários backoffice** — Antes, qualquer backoffice tinha acesso total e as permissões marcadas eram ignoradas. Agora o controle de acesso (páginas e ações) respeita as permissões cadastradas para **todos** os tipos de usuário. Salvaguarda: backoffice com `config.geral` (admins legados) mantém acesso total automaticamente, evitando lockout até a reconfiguração.
- **Telas Equipe, Metas e Configurações sujeitas a permissão** — Deixam de ser "somente backoffice" fixo e passam a depender de `equipe.visualizar`, `metas.visualizar` e `configuracoes.visualizar` (com fallback de admin legado).
- **Ações controladas por permissão** — Botões de criar/editar/excluir em Vendas, Produtos, Clientes, Conta Corrente e Comissões passam a respeitar as permissões (`*.criar`, `*.editar`, `*.excluir`), não só o tipo do usuário.
- **Tela de gestão de usuários tipo-aware** — O diálogo "Gerenciar Permissões" mostra o catálogo de administração para backoffice e o subconjunto de vendedor para vendedores, exibindo apenas permissões que têm efeito real. `update-user-v2` teve a allowlist ampliada para aceitar as novas permissões de backoffice.
- **Permissões reais na listagem de usuários** — A edge function `list-users-v2` retornava `permissoes: null`, fazendo a tela de gestão mostrar as permissões default em vez das reais (com risco de sobrescrevê-las ao salvar). Função redeployada em produção com o merge de permissões que já estava no repo.

---

## V 1.20 — 2026-05-27

### Integridade front-backend (continuação)

- **Removidos mock fallbacks de vendas** — `vendas.list()`, `vendas.delete()` e `vendas.getById()` não caem mais em localStorage quando a API falha. Erros agora propagam para o usuário.
- **Aprovação de clientes conectada ao banco** — `clientes.getPendentes/aprovar/rejeitar` operavam 100% em mock (localStorage). Agora usam as edge functions `clientes-v2`, `aprovar-cliente-v2` e `rejeitar-cliente-v2`.
- **Notificações sem mock** — `notificacoes.list()` não retorna mais dados falsos em caso de erro.
- **Listagem de clientes sem mock** — `api.get('clientes')` não cai mais em mock data.
- **Endpoints de referência sem return []** — tipos de pessoa, situações, grupos/redes, tipos de veículo, categorias de conta corrente, empresas, metas e logs de importação agora propagam erros em vez de retornar array vazio silenciosamente.

---

## V 1.19 — 2026-05-27

### Integridade front-backend

- **Removidos todos os mock fallbacks** — 14 pontos no `api.ts` onde erros de API eram silenciosamente engolidos e dados gravados apenas no localStorage. Agora erros propagam para o usuário. Entidades afetadas: produtos (create/update), segmentos (create), listas de preço (create), formas de pagamento (create/update), vendedores (read), condições de pagamento (read), marcas (read), tipos de produto (read), unidades de medida (read).
- **Overloads RPC duplicados removidos** — `create_user_v2` e `generate_vendedor_comissao` tinham versões antigas coexistindo em produção. Versões mortas removidas.

---

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
