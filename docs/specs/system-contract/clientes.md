# Contrato — Clientes

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Business rules

### Nome obrigatório com tamanho mínimo

**Enunciado:** O `nome` (razão social) do cliente é obrigatório e deve conter pelo menos 2 caracteres. Nomes só com espaços são tratados como vazios (via TRIM/trim). A validação é imposta em dois níveis: frontend/API (`clientes-v2/index.ts`, `if (!nome || String(nome).trim().length < 2)`) e backend/banco (`create_cliente_v2` e `update_cliente_v2`, `IF ... LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION`). Não há caminho de INSERT/UPDATE direto na tabela `cliente` fora dessas RPCs (RLS permite INSERT apenas via RPC SECURITY INVOKER).

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/030_fix_create_cliente_v2_ambiguous_nome.sql:46` — `IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres'`
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:106-107` — `IF p_nome IS NOT NULL AND LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION ...`
- `supabase/functions/clientes-v2/index.ts:332,449` — `if (!nome || String(nome).trim().length < 2) throw new Error(...)`

**Regressão se:** nomes vazios ou só com espaços são aceitos; nomes com menos de 2 caracteres são armazenados; a validação é removida da RPC ou do frontend.

---

### Exclusão de cliente restrita a backoffice (soft delete)

**Enunciado:** `delete_cliente_v2` faz soft delete (define `deleted_at` e `ref_situacao_id` = 'Excluído'). Apenas usuários com `tipo = 'backoffice'` podem invocar a RPC; usuários vendedor são explicitamente bloqueados.

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/007_rpc_clientes_v2.sql:422-425` — `IF v_user_tipo != 'backoffice' THEN RAISE EXCEPTION 'Apenas usuários backoffice podem excluir clientes'`
- `supabase/migrations/007_rpc_clientes_v2.sql:428-433` — soft delete: `UPDATE cliente SET deleted_at = NOW(), ref_situacao_id = (SELECT ... WHERE nome = 'Excluído')`

**Regressão se:** usuários vendedor conseguem excluir clientes; usa-se hard delete no lugar de soft delete; a exclusão não atualiza `ref_situacao_id` para 'Excluído'; usuários backoffice não conseguem excluir.

---

### Simples Nacional cacheado com timestamp de consulta

**Enunciado:** A tabela `cliente` armazena `optante_simples_nacional` (boolean NULL) e `optante_simples_nacional_consultado_em` (timestamptz NULL). O valor vem de consulta CONSOPT na ReceitaWS. NULL significa nunca consultado, cliente PF, ou consulta inconclusiva. A revalidação ocorre a cada envio de pedido ao Tiny (ADR-004) **quando a empresa tem dual-mapping**; caso contrário é pulada. Se a revalidação falhar para empresa dual-mapped, o envio é **BLOQUEADO (D3)** em vez de cair no valor persistido. `create-cliente-v2` faz lookup best-effort (não bloqueante). A coluna só é modificada por lookups ReceitaWS, nunca por `update_cliente_v2`.

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/108_simples_nacional_lookup.sql:10-11` — `ADD COLUMN optante_simples_nacional boolean null, optante_simples_nacional_consultado_em timestamptz null`
- `supabase/migrations/108_simples_nacional_lookup.sql:13-17` — comentários: true = optante (CONSOPT); null = nunca consultado, PF ou inconclusivo; revalidação no envio Tiny
- `supabase/functions/clientes-v2/index.ts:185-186` — `mapClienteCompleto` inclui `optanteSimplesNacional` e `optanteSimplesNacionalConsultadoEm`
- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:453-481` — empresa com dual-mapping (DP-006) e lookup falho (D2) → BLOQUEIA envio (D3) em vez de aceitar NULL

**Regressão se:** o valor de Simples Nacional não é cacheado ou o timestamp não é registrado; o lookup não é disparado no envio ao Tiny; NULL é tratado como false em vez de "ainda não verificado"; a coluna é removida.

---

### Condições de pagamento substituídas por completo no update

**Enunciado:** Quando `p_condicoes_pagamento_ids` é passado a `update_cliente_v2`: (1) DELETE de todas as linhas existentes de `condicoes_cliente` do cliente, (2) INSERT das novas linhas do array. É substituição atômica all-or-nothing, não aditiva. **Ressalva de integridade:** existem dois caminhos que burlam o padrão e não devem ser usados/reintroduzidos — a edge function `update-cliente-v2` chama a RPC sem passar o parâmetro (pulando o DELETE+INSERT), e `add_condicoes_disponiveis` apenas adiciona ao array sem deletar. O frontend em uso (`clientes-v2`) sempre passa `p_condicoes_pagamento_ids`.

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:213-221` — `IF p_condicoes_pagamento_ids IS NOT NULL THEN DELETE all, then INSERT unnest(array)`
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:175-184` — mesmo padrão: DELETE, depois INSERT das linhas
- `supabase/functions/clientes-v2/index.ts:501-517` — frontend extrai o array e passa como `p_condicoes_pagamento_ids`
- Contraexemplo: `supabase/functions/update-cliente-v2/index.ts:170-184` — chama a RPC sem `p_condicoes_pagamento_ids`, pulando o DELETE+INSERT

**Regressão se:** novas condições são adicionadas às existentes em vez de substituí-las; permitem-se updates parciais; updates só-de-array deixam linhas órfãs; algum caminho acessa a RPC sem o parâmetro ou usa operação aditiva.

---

### Validação de tipo de pessoa (Física/Jurídica)

**Enunciado:** `cliente.ref_tipo_pessoa_id_FK` (camelCase no nome da coluna) é protegido por: (1) constraint FOREIGN KEY no schema (`schema_baseline.sql:881`) que rejeita IDs inválidos em INSERT e UPDATE; (2) validação PL/pgSQL explícita em `update_cliente_v2` (checa existência antes do update); (3) **nenhuma** validação explícita em `create_cliente_v2`, que depende só da constraint FK. NULL é permitido em todos os casos (tipo não determinado).

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:110-117` — `IF p_ref_tipo_pessoa_id_fk IS NOT NULL THEN check SELECT 1 FROM ref_tipo_pessoa WHERE id = p_ref_tipo_pessoa_id_fk`
- `supabase/migrations/030_fix_create_cliente_v2_ambiguous_nome.sql:68` — INSERT usa nome citado `"ref_tipo_pessoa_id_FK"` (sufixo FK preservado)
- `supabase/functions/clientes-v2/index.ts:359-372` — frontend aceita `tipoPessoa` como objeto/string/number, resolve para `p_ref_tipo_pessoa_id_fk`
- Contraexemplo: `supabase/migrations/129_fix_create_cliente_missing_fields.sql:107` — `create_cliente_v2` aceita o parâmetro mas não valida; confia só na constraint FK

**Regressão se:** IDs inválidos de `ref_tipo_pessoa` são aceitos; a validação é removida; o tipo de pessoa é armazenado como string em vez de FK; a constraint FK não é imposta.

---

### Empresa de faturamento opcional (CASE WHEN)

**Enunciado:** `cliente.empresaFaturamento` é nullable. No UPDATE, só é definido se `p_empresa_faturamento_id IS NOT NULL`; caso contrário preserva o valor atual (CASE WHEN). A integridade é imposta por constraint FOREIGN KEY (`ON DELETE SET NULL`, referencia `ref_empresas_subsidiarias`), mas — diferente de `ref_tipo_pessoa_id_fk` — **não** há validação explícita em nível de aplicação (IF EXISTS + RAISE EXCEPTION) em `update_cliente_v2`; apenas a validação em nível de banco (FK).

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:146` — `"empresaFaturamento" = CASE WHEN p_empresa_faturamento_id IS NOT NULL THEN p_empresa_faturamento_id ELSE c."empresaFaturamento" END`
- `supabase/functions/clientes-v2/index.ts:374-386` — frontend extrai `empresaFaturamento` como objeto ou ID numérico, resolve para `p_empresa_faturamento_id` (ou NULL)

**Regressão se:** empresa vira NOT NULL; adiciona-se validação de integridade referencial em app quando não deveria mudar o mecanismo; CASE WHEN é trocado por COALESCE; uma empresa default é atribuída quando não especificada.

---

### Campos numéricos (desconto/pedido mínimo) com default 0

**Enunciado:** Para `desconto_financeiro` e `pedido_minimo` há dois mecanismos complementares. No INSERT: o frontend converte para 0 (se null) antes do SQL, e o SQL ainda protege com `COALESCE(p_value, 0)`. No UPDATE: valores null são enviados ao backend e `COALESCE(p_value, valor_atual)` preserva o valor existente. Ou seja: INSERT sempre garante 0; UPDATE preserva.

**Tipo:** business-rule

**Evidência:**
- `supabase/migrations/030_fix_create_cliente_v2_ambiguous_nome.sql:95-96` — INSERT: `COALESCE(p_desconto_financeiro, 0), COALESCE(p_pedido_minimo, 0)`
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:139-140` — UPDATE: `desconto_financeiro = COALESCE(p_desconto_financeiro, c.desconto_financeiro)`
- `supabase/functions/clientes-v2/index.ts:410-411` — frontend (INSERT): `p_desconto_financeiro: body.descontoFinanceiro ?? body.desconto_financeiro ?? 0`

**Regressão se:** NULL é armazenado em vez de 0; COALESCE é removido do INSERT; UPDATE usa NULL direto em vez de COALESCE com o valor existente; comparações numéricas falham em campos NULL.

---

## Invariants

### Status de aprovação restrito a três valores

**Enunciado:** `cliente.status_aprovacao` deve ser um de: 'aprovado', 'pendente' ou 'rejeitado'. A constraint CHECK impõe corretamente esses valores. **Débito conhecido:** a lógica de workflow está quebrada — `create_cliente_v2` (migrations 129/131) sempre atribui 'aprovado' independentemente do tipo de usuário, quando deveria atribuir 'pendente' para vendedor e 'aprovado' para backoffice (como estava correto na migration 105/081).

**Tipo:** invariant

**Evidência:**
- `supabase/migrations/001_fix_campos_obrigatorios.sql:67` — `CHECK (status_aprovacao IN ('aprovado', 'pendente', 'rejeitado')) DEFAULT 'pendente'`
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:120-127` — `IF v_status_aprovacao NOT IN ('aprovado', 'pendente', 'rejeitado') THEN RAISE EXCEPTION`
- Contraexemplo: `supabase/migrations/131_session_20260601_cliente_fixes.sql:29-38` — lógica sempre resulta em 'aprovado', violando o controle de workflow por tipo de usuário

**Regressão se:** outros valores são inseridos em `status_aprovacao`; a constraint CHECK é removida; transições de status não impõem valores válidos do enum.

---

### UPSERT em contato/endereço preserva dados existentes quando novo valor é NULL

**Enunciado:** No `ON CONFLICT DO UPDATE` de `cliente_contato` e `cliente_endereço`, cada campo usa `COALESCE(NULLIF(new_value), tabela.campo_existente)` (referência à tabela, **não** a EXCLUDED) para impedir que updates com NULL apaguem dados existentes. O padrão está imposto no HEAD: em `create_cliente_v2` desde a migration 131 e em `update_cliente_v2` desde a migration 140. **Histórico:** a migration 131 (backport de prod, 2026-06-22) reintroduziu o padrão bugado `EXCLUDED` em `update_cliente_v2`, causando perda de dados em ~89 clientes, até ser corrigido pela migration 140 (2026-06-25).

**Tipo:** invariant

**Evidência:**
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:133-138` — `telefone = COALESCE(NULLIF(trim(p_telefone), ''), cliente_contato.telefone)` (usa valor da tabela, não EXCLUDED)
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:1-8` — comentário de bug: migrations anteriores usavam `EXCLUDED.<col>` (== NULL quando campo não enviado), causando perda de dados
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:165-172` — `cliente_endereço` segue o mesmo padrão: `cep = COALESCE(...cliente_endereço.cep)`

**Regressão se:** o UPSERT volta ao fallback `EXCLUDED.column`; o COALESCE é removido; campos são definidos direto dos parâmetros sem NULL-safety; parâmetros NULL apagam valores existentes.

---

## Arch decisions

### Grupo/Rede usa grupo_id (UUID FK) e grupo_rede (nome texto)

**Enunciado:** A tabela `cliente` possui ambos os campos: `grupo_id` (UUID) e `grupo_rede` (TEXT legado). A implementação é **inconsistente**: (1) no UPDATE, o RPC prioriza `grupo_id` via CASE WHEN quando definido; (2) no CREATE, ambos são inseridos diretamente sem lógica de priorização; (3) não há constraint FOREIGN KEY em `grupo_id` nem validação de integridade referencial; (4) o frontend tenta anular `grupo_rede` ao enviar `grupo_id`, mas `create_cliente_v2` não respeita esse padrão. `get_cliente_completo_v2` inclui `grupo_rede_nome` via JOIN para display.

**Tipo:** arch-decision

**Evidência:**
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:136-137` — `grupo_rede = COALESCE(NULLIF(TRIM(p_grupo_rede), ''), c.grupo_rede), grupo_id = CASE WHEN p_grupo_id IS NOT NULL THEN p_grupo_id ELSE c.grupo_id END`
- `supabase/functions/clientes-v2/index.ts:334-357` — frontend resolve grupoRede/grupoId para UUID; verifica formato UUID; fallback por nome via `grupos_redes`; envia `p_grupo_id` (ou NULL)
- `supabase/migrations/141_get_cliente_completo_grupo_nome.sql:52` — `get_cliente_completo_v2` inclui `grupo_rede_nome` via JOIN: `SELECT gr.nome FROM grupos_redes gr WHERE gr.id = c.grupo_id`
- Contraexemplo: `supabase/migrations/129_fix_create_cliente_missing_fields.sql:85-112` — `create_cliente_v2` insere `grupo_rede` e `grupo_id` sem CASE WHEN ou validação

**Regressão se:** `grupo_id` é removido ou não populado; `grupo_rede` é tratado como fonte da verdade em vez de campo de lookup; o CASE WHEN vira COALESCE nos dois campos (apagaria `grupo_id` quando NULL é passado).

---

### Contato e endereço como relacionamentos singleton opcionais

**Enunciado:** Cada cliente tem no máximo um `cliente_contato` e um `cliente_endereço` (identificados por `cliente_id` PK). São criados/atualizados via UPSERT na mesma RPC do update do registro principal. Se nenhum campo de contato/endereço é fornecido, as tabelas auxiliares não são tocadas (sem DELETE; NULLs preservados). Enforcement: PRIMARY KEY (`cliente_id`) força uma linha por cliente; INSERT ... ON CONFLICT DO UPDATE; condicional IF pula tabelas auxiliares se nada é fornecido; COALESCE com valores existentes (fix da migration 140); não existe rota de DELETE direto.

**Tipo:** arch-decision

**Evidência:**
- `supabase/migrations/030_fix_create_cliente_v2_ambiguous_nome.sql:109-119` — se campos de contato fornecidos: `INSERT ... ON CONFLICT DO UPDATE`; senão pula por completo
- `supabase/migrations/104_unify_update_cliente_v2_with_status.sql:151-177` — `IF p_telefone OR p_email OR ... THEN INSERT ON CONFLICT`; senão nenhuma operação em `cliente_contato`
- `supabase/functions/clientes-v2/index.ts:109-118` — frontend mapeia objetos aninhados contato/endereco em parâmetros flat passados à RPC

**Regressão se:** cliente passa a ter múltiplos registros de contato ou endereço; DELETE é chamado quando campos são NULL; tabelas auxiliares não são atualizadas na mesma transação; endpoints separados passam a gerenciar contato/endereço.

---

### Segmento via FK opcional (nullable)

**Enunciado:** `cliente.segmento_id` é BIGINT FK nullable para `segmento_cliente.id`. Um cliente pode não ter segmento (NULL). `get_cliente_completo_v2` inclui `segmento_nome` via LEFT JOIN apenas para display (retorna NULL se não houver segmento).

**Tipo:** arch-decision

**Evidência:**
- `supabase/migrations/001_fix_campos_obrigatorios.sql:79` — campo `segmento_id` adicionado à tabela `cliente`
- `supabase/migrations/141_get_cliente_completo_grupo_nome.sql:99-101` — `LEFT JOIN segmento_cliente sc ON sc.id = c.segmento_id AND sc.deleted_at IS NULL`
- `supabase/functions/clientes-v2/index.ts:189-190` — `mapClienteCompleto` mapeia `segmento_nome` do resultado da RPC

**Regressão se:** `segmento_id` vira NOT NULL; constraint FK torna segmento obrigatório; `segmento_nome` não é incluído em `get_cliente_completo_v2`; segmento passa a ser armazenado como texto em vez de ID.

---

### Mappers do frontend usam cadeias de fallback

**Enunciado:** `mapClienteCompleto` e `mapClienteListItem` usam cadeias `??` (nullish coalescing) para lidar com variações de nome de campo (snake_case do DB, camelCase da API, nomes legados). Ex.: `grupo_rede_nome ?? grupo_rede ?? grupoRede ?? ''`. Permite compatibilidade retrógrada, mas pode esconder mismatches (o bug histórico de `grupo_rede_nome` ausente fazia o campo aparecer vazio ao usuário até a migration 141).

**Tipo:** arch-decision

**Evidência:**
- `supabase/functions/clientes-v2/index.ts:103-127` — `mapClienteListItem`: `grupoRede: row.grupo_rede_nome ?? row.grupo_rede ?? row.grupoRede ?? ''`
- `supabase/functions/clientes-v2/index.ts:160-246` — `mapClienteCompleto`: cadeias de fallback extensas para todos os campos
- `supabase/migrations/141_get_cliente_completo_grupo_nome.sql:1-5` — bug: versão anterior não retornava `grupo_rede_nome`, mapper caía em `grupo_rede` (texto), campo aparecia vazio

**Regressão se:** cadeias de fallback são removidas; apenas um nome de campo é checado; variações de nome não são antecipadas; mappers não extraem objetos aninhados como `contato.email`.
