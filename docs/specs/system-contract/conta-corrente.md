# Contrato — Conta Corrente

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

Este contrato cobre o domínio **Conta Corrente** (compromissos de `conta_corrente_cliente`, pagamentos de `pagamento_acordo_cliente`, categorias de `categorias_conta_corrente`) e os artefatos correlatos de **Condições/Formas de Pagamento** que alimentam este domínio.

Notação de verdict:
- Regras **confirmed** estão impostas de ponta a ponta.
- Regras **partial** têm o enunciado ajustado para refletir a imposição real (limites/brechas conhecidas). Leia o enunciado corrigido e a nota de brecha antes de assumir garantia total.

---

## Invariants

### Tipo de Compromisso deve ser 'Investimento' ou 'Ressarcimento'

**Tipo:** invariant · **Verdict:** confirmed

Compromissos (`conta_corrente_cliente`) aceitam apenas dois tipos: `'investimento'` ou `'ressarcimento'`. O valor é normalizado para lowercase na criação e validado em tempo de operação. Imposto em múltiplas camadas: RPC (create/update), handler HTTP e `CHECK constraint` no banco (defesa em profundidade — rejeita valor inválido mesmo com RLS permissiva).

**Evidência:**
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:200-202` — `create_conta_corrente_v2`: `IF p_tipo_compromisso IS NULL OR LOWER(p_tipo_compromisso) NOT IN ('investimento', 'ressarcimento')`
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:390-392` — `update_conta_corrente_v2`: mesmo padrão
- `supabase/functions/conta-corrente-v2/index.ts:595-598` — validação no handler HTTP com mensagem específica
- `CHECK constraint` `conta_corrente_cliente_tipo_compromisso_check` (schema_baseline) força `tipo_compromisso = ANY (ARRAY['investimento','ressarcimento'])`

**Regressão se:** o sistema aceitar um tipo diferente (ex.: 'Empréstimo', 'Serviço') ou deixar o tipo NULL em novo compromisso.

---

### Valor do Compromisso deve ser maior que zero

**Tipo:** invariant · **Verdict:** partial

**Enunciado corrigido:** A validação é imposta na CRIAÇÃO de compromissos (SQL rejeita `valor <= 0`). Porém, na ATUALIZAÇÃO, há falha no handler TypeScript: valores iguais a zero são silenciosamente convertidos para NULL ao serem enviados à RPC, contornando a validação. A regra é parcialmente implementada: **criar protegido, atualizar vulnerável a bypass com valor = 0**.

**Evidência:**
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:192-194` — `create_conta_corrente_v2`: `IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION`
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:386-388` — `update_conta_corrente_v2`: `IF p_valor IS NOT NULL AND p_valor <= 0 THEN` (NULL passa)
- `supabase/functions/conta-corrente-v2/index.ts:585-587` — handler valida valor > 0 na criação

**Brecha (contraexemplo):** `supabase/functions/conta-corrente-v2/index.ts:695` — PUT com `valor=0` usa `body.valor ? Number(body.valor) : null`; 0 é falsy → converte para null → contorna a validação da RPC.

**Regressão se:** o sistema permitir criar compromisso com valor=0, negativo ou NULL sem rejeição.

---

### Status de Compromisso é calculado dinamicamente a partir de pagamentos

**Tipo:** invariant · **Verdict:** partial

**Enunciado (usar com ressalva — verificação inconclusiva):** O status de um compromisso (`'Pendente'`, `'Pago Parcialmente'`, `'Pago Integralmente'`) é calculado dinamicamente comparando o valor total com o `valor_pago` atual, não sendo armazenado diretamente na tabela; muda conforme novos pagamentos são adicionados. A verificação automática deste ponto foi inconclusiva — tratar como observado no código, não como garantia end-to-end.

**Evidência:**
- `supabase/migrations/067_rpc_conta_corrente_v2.sql:309-313` — `get_conta_corrente_v2`: `CASE WHEN SUM(pac.valor_pago)=0 THEN 'Pendente' WHEN >=valor THEN 'Pago Integralmente' ELSE 'Pago Parcialmente'`
- `supabase/migrations/067_rpc_conta_corrente_v2.sql:113-117` — `list_conta_corrente_v2` usa a mesma lógica de cálculo dinâmico
- `src/types/contaCorrente.ts:47-52` — interface `StatusCompromisso` define os três valores possíveis

**Regressão se:** o status for armazenado em coluna separada sem sincronização com pagamentos, ou o cálculo não comparar corretamente valor vs valor_pago.

---

### Soma de pagamentos não pode exceder valor do compromisso

**Tipo:** invariant · **Verdict:** partial

**Enunciado corrigido:** A regra é imposta APENAS via funções RPC e código de aplicação, não via constraints/triggers de banco. A validação (soma de todos os pagamentos + novo não pode ultrapassar o valor do compromisso) pode ser contornada com INSERT direto na tabela. Uma implementação robusta exigiria CONSTRAINT CHECK ou TRIGGER BEFORE INSERT/UPDATE replicando a lógica.

**Evidência:**
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:631-639` — `create_pagamento_conta_corrente_v2`: `SELECT SUM(valor_pago)` e `IF (total + novo) > valor THEN RAISE`
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:781-791` — `update_pagamento_conta_corrente_v2`: mesmo comportamento, excluindo o pagamento atual do cálculo

**Brecha (contraexemplo):** `supabase/migrations/068_rls_conta_corrente.sql:77-81` — policy `pagamento_acordo_cliente_insert_policy` permite INSERT direto via Supabase SDK sem passar pela RPC; não há trigger que reforce a validação no banco.

**Regressão se:** o sistema criar pagamento cuja soma ultrapasse o valor do compromisso (overpayment).

---

### Nomes de categorias devem ser únicos (case-insensitive) entre categorias ativas

**Tipo:** invariant · **Verdict:** partial

**Enunciado corrigido:** O índice UNIQUE existe e força a unicidade em nível de banco (`LOWER(TRIM(nome)) WHERE deleted_at IS NULL`), e as RPCs validam antes de inserir. Porém, a RLS policy de INSERT usa `WITH CHECK (true)`, permitindo inserções diretas que contornam a validação de negócio da RPC — embora o índice ainda impeça duplicatas de fato, a camada de aplicação não garante que toda inserção passe pela validação.

**Evidência:**
- `supabase/migrations/021_create_categorias_conta_corrente.sql:21-23` — `CREATE UNIQUE INDEX idx_categorias_conta_corrente_nome_unique ON LOWER(TRIM(nome)) WHERE deleted_at IS NULL`

**Brecha (contraexemplo):** `supabase/migrations/021_create_categorias_conta_corrente.sql:55-59` — RLS de INSERT com `WITH CHECK (true)` permite `supabase.from('categorias_conta_corrente').insert({...})` direto, contornando `create_categorias_conta_corrente_v2`.

**Regressão se:** o sistema criar duas categorias ativas com o mesmo nome (ou diferindo só em case) sem erro de constraint.

---

### Flag Parcelamento é 'true' se quantidade de parcelas > 1

**Tipo:** invariant · **Verdict:** partial

**Enunciado corrigido:** Na tabela `Condicao_De_Pagamento`, o campo `Parcelamento` é NOT NULL BOOLEAN: `false` para à vista (1 parcela, prazo=0) e `true` quando há 2+ parcelas. É calculado automaticamente APENAS em create e quando `prazoPagamento` é fornecido em update. Updates que modificam outros campos (`condicaoCredito`, `descontoExtra`, `valorMinimo`) sem fornecer `prazoPagamento` deixam `Parcelamento` desatualizado.

**Evidência:**
- `supabase/functions/condicoes-pagamento-v2/index.ts:304-336` — create: `Parcelamento = quantidadeParcelas > 1`
- `supabase/functions/condicoes-pagamento-v2/index.ts:387-391` — update: recalcula após parse

**Brecha (contraexemplo):** `supabase/functions/condicoes-pagamento-v2/index.ts:386-392` — `Parcelamento` só recalcula se `body.prazoPagamento !== undefined`; update de apenas `{id, condicaoCredito}` não recalcula.

**Regressão se:** `Parcelamento` for setado manualmente para false com 2 parcelas, ou vice-versa.

---

### Todo compromisso deve estar vinculado a um cliente válido

**Tipo:** invariant · **Verdict:** partial

**Enunciado corrigido:** `cliente_id` é obrigatório em `conta_corrente_cliente` e, QUANDO CRIADO VIA RPC (`create_conta_corrente_v2`), deve referenciar um cliente existente com `deleted_at IS NULL`. Porém, a validação de `deleted_at IS NULL` está APENAS na RPC, não na tabela. Inserts diretos via RLS podem passar com cliente `deleted_at IS NOT NULL` desde que o `cliente_id` exista (a FK só valida existência).

**Evidência:**
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:184-214` — `create_conta_corrente_v2`: `IF p_cliente_id IS NULL` + `SELECT ... WHERE cliente_id = p_cliente_id` + `IF NOT FOUND RAISE`
- `supabase/functions/conta-corrente-v2/index.ts:579-581` — handler: `IF !clienteId RAISE`

**Brecha (contraexemplo):** `supabase/migrations/068_rls_conta_corrente.sql:28-33` — RLS de INSERT com `WITH CHECK (true)`; INSERT direto com `cliente_id` de cliente deletado é aceito pela FK.

**Regressão se:** o sistema criar compromisso sem `cliente_id` ou com `cliente_id` inexistente em `cliente`.

---

## Business rules

### Título do Compromisso é obrigatório e tem mínimo de 2 caracteres

**Tipo:** business-rule · **Verdict:** partial

**Enunciado corrigido:** A regra é imposta apenas via camada de aplicação (RPC e handler HTTP), mas não está protegida a nível de banco. Pode ser contornada por INSERT/UPDATE direto na tabela, pois as RLS usam `WITH CHECK (true)` e a tabela `conta_corrente_cliente` não tem CHECK constraint sobre `titulo`.

**Evidência:**
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:196-198` — `create_conta_corrente_v2`: `IF p_titulo IS NULL OR LENGTH(TRIM(p_titulo)) < 2`
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:382-384` — `update_conta_corrente_v2`: mesma validação
- `supabase/functions/conta-corrente-v2/index.ts:588-590` — handler: `titulo` obrigatório

**Brecha (contraexemplo):** `supabase/migrations/068_rls_conta_corrente.sql:29-33` — INSERT com `WITH CHECK (true)`; tabela sem CHECK em `titulo`.

**Regressão se:** o sistema permitir criar compromisso sem título ou com título vazio/único caractere.

---

### Forma de Pagamento é obrigatória para pagamentos

**Tipo:** business-rule · **Verdict:** partial

**Enunciado corrigido:** Pagamentos (`pagamento_acordo_cliente`) requerem, na CRIAÇÃO: `forma_pagamento` (texto com mín. 2 chars) OU `forma_pagamento_id` (ID válido em `ref_forma_pagamento`) — pelo menos um, validado na RPC. Na ATUALIZAÇÃO, ambos podem ser omitidos, mantendo valores anteriores sem revalidação obrigatória de tamanho. A coluna `forma_pagamento` é NOT NULL na tabela; `forma_pagamento_id` é nullable.

**Evidência:**
- `supabase/migrations/075_add_forma_pagamento_id_to_pagamentos_rpc.sql:57-81` — `create_pagamento_conta_corrente_v2`: se `forma_pagamento_id`, busca nome; senão `forma_pagamento` obrigatório
- `supabase/functions/conta-corrente-v2/index.ts:247-248` — handler rejeita se ambos vazios

**Brecha (contraexemplo):** `supabase/migrations/075_add_forma_pagamento_id_to_pagamentos_rpc.sql:268-289` — `update_pagamento_conta_corrente_v2` permite UPDATE sem forçar validação se ambos forem null/undefined.

**Regressão se:** o sistema criar pagamento sem `forma_pagamento` e sem `forma_pagamento_id` válido.

---

### Categoria é campo opcional em compromissos e pagamentos

**Tipo:** business-rule · **Verdict:** confirmed

Tanto compromissos quanto pagamentos podem ser criados/atualizados sem categoria (`categoria_id` pode ser NULL). Quando fornecida, deve ser UUID válido referenciando `categorias_conta_corrente` — validado por FK (`ON DELETE SET NULL`) no banco. Colunas nullable em ambas as tabelas; RPCs declaram `p_categoria_id UUID DEFAULT NULL`.

**Evidência:**
- `supabase/migrations/075_add_forma_pagamento_id_to_pagamentos_rpc.sql:20-21` — `p_categoria_id UUID DEFAULT NULL` em `create_pagamento_conta_corrente_v2`
- `src/types/contaCorrente.ts:44,63` — `categoriaId` opcional em `Compromisso` e `Pagamento`
- `supabase/migrations/073_fix_categoria_id_type_to_uuid.sql:1-10` — categoria migrada para UUID (não BIGINT)

**Regressão se:** o sistema forçar categoria obrigatória ou rejeitar NULL, ou aceitar UUID inexistente sem validação de FK.

---

### Nome de categoria deve ter no mínimo 2 caracteres

**Tipo:** business-rule · **Verdict:** partial

**Enunciado corrigido:** Ao criar categoria (`categorias_conta_corrente`), o nome deve ter no mínimo 2 caracteres não-vazios, garantido por: validação HTTP (POST), validação RPC (SECURITY DEFINER) e `CHECK constraint` no PostgreSQL. Porém, a RLS não valida (`WITH CHECK (true)`) — apenas o CHECK constraint protege contra INSERT/UPDATE diretos via cliente autenticado.

**Evidência:**
- `supabase/migrations/021_create_categorias_conta_corrente.sql:18-19` — `CONSTRAINT categorias_conta_corrente_nome_check CHECK (LENGTH(TRIM(nome)) >= 2)`
- `supabase/functions/categorias-conta-corrente-v2/index.ts:171-173` — handler: `IF (!body.nome || body.nome.trim().length < 2)`

**Brecha (contraexemplo):** `supabase/migrations/021_create_categorias_conta_corrente.sql:55-59` — RLS de INSERT com `WITH CHECK (true)`; proteção real depende do CHECK constraint.

**Regressão se:** o sistema criar categoria com nome vazio ou único caractere.

---

### Intervalo de parcelas é gerado dinamicamente a partir de string de prazos

**Tipo:** business-rule · **Verdict:** partial

**Enunciado corrigido:** Em condições de pagamento, o `intervalo_parcela` é calculado parseando a string `prazoPagamento` (formato '10/20/30'): quantidade de parcelas = quantidade de números; `prazo_pagamento` = último número. A descrição regenera automaticamente quando parcelas/prazos mudam, EXCETO se um campo `descricao` for explicitamente fornecido no payload de update (override manual tem prioridade). No frontend padrão, `descricao` não é enviada em updates, então a regeneração funciona na prática.

**Evidência:**
- `supabase/functions/condicoes-pagamento-v2/index.ts:86-111` — `processarPrazoPagamento`: split por '/', parse floats, `quantidadeParcelas=length`, prazo=último
- `supabase/functions/condicoes-pagamento-v2/index.ts:114-133` — `gerarDescricao`: usa `intervaloParcela.join('/')`, ex.: '10/15/20 dias'
- `supabase/functions/condicoes-pagamento-v2/index.ts:406-440` — update: regenera descrição se `prazoPagamento` muda

**Brecha (contraexemplo):** `supabase/functions/condicoes-pagamento-v2/index.ts:407-408` — PUT com `{id, prazoPagamento, descricao: "override"}` congela a descrição; updates subsequentes sem reenviar `descricao` não regeneram.

**Regressão se:** o sistema não regenerar a descrição quando o `intervalo_parcela` muda, gerando descrições desincronizadas.

---

### Data do compromisso é obrigatória

**Tipo:** business-rule · **Verdict:** confirmed

Ao criar compromisso, `data` (DATE) é obrigatória e não pode ser NULL. Imposto em 3 camadas: handler HTTP, RPC `create_conta_corrente_v2` e coluna `data date NOT NULL` na tabela. Única via de criação é POST `/conta-corrente-v2`, que passa por todas as validações.

**Evidência:**
- `supabase/migrations/072_add_categoria_id_to_all_conta_corrente_rpc.sql:188-190` — `create_conta_corrente_v2`: `IF p_data IS NULL THEN RAISE`
- `supabase/functions/conta-corrente-v2/index.ts:582-584` — handler: `data`/`dataCompromisso`/`data_compromisso` obrigatória

**Regressão se:** o sistema criar compromisso sem data.

---

### Data de pagamento é obrigatória

**Tipo:** business-rule · **Verdict:** partial

**Enunciado corrigido:** Para pagamentos de CONTA CORRENTE (`pagamento_acordo_cliente`): `data_pagamento` é obrigatória e validada na RPC e no handler. Para pagamentos de COMISSÃO (`pagamentos_comissao`): `data_pagamento` é preenchida automaticamente com `CURRENT_DATE`, não sendo obrigatório fornecê-la na criação. A regra vale para conta corrente, não para pagamentos em geral.

**Evidência:**
- `supabase/migrations/075_add_forma_pagamento_id_to_pagamentos_rpc.sql:53-55` — `create_pagamento`: `IF p_data_pagamento IS NULL THEN RAISE`
- `supabase/functions/conta-corrente-v2/index.ts:244-246` — handler: `dataPagamento` obrigatória

**Brecha (contraexemplo):** `supabase/migrations/084_comissoes_rpc.sql` — `create_pagamento_comissao_v2` não recebe `data_pagamento`; usa `CURRENT_DATE`.

**Regressão se:** o sistema criar pagamento de conta corrente sem `data_pagamento`.

---

## Arch decisions

### Forma de pagamento não pode ser deletada se tem condições vinculadas

**Tipo:** arch-decision · **Verdict:** confirmed

Ao deletar uma `forma_pagamento` (`ref_forma_pagamento`), o sistema verifica se há `Condicao_De_Pagamento` usando essa forma; havendo qualquer vínculo, a deleção é rejeitada. Proteção dupla: (1) SELECT no código antes do DELETE; (2) FK sem `ON DELETE CASCADE` (padrão RESTRICT) no banco.

**Evidência:**
- `supabase/functions/formas-pagamento-v2/index.ts:271-285` — delete: `SELECT Condicao_De_Pagamento WHERE forma_pagamento_id = id LIMIT 1`; se encontrar, nega
- FK `Condicao_De_Pagamento_forma_pagamento_id_fkey` (schema) sem `ON DELETE CASCADE` → banco rejeita o DELETE

**Regressão se:** o sistema deletar `forma_pagamento` em uso em alguma `Condicao_De_Pagamento`.

---

### Categorias usam soft delete (deleted_at)

**Tipo:** arch-decision · **Verdict:** partial

**Enunciado corrigido:** Categorias em `categorias_conta_corrente` são soft-deleted via UPDATE (`SET deleted_at = NOW()`) por RPCs `SECURITY DEFINER`. Não há policy RLS explícita para DELETE — operações DELETE são bloqueadas por padrão (deny implícito). Índices e queries filtram por `deleted_at IS NULL`. A proteção não vem de uma DELETE policy com `deleted_at`, mas da AUSÊNCIA de DELETE policy combinada ao uso exclusivo de UPDATE para soft-delete.

**Evidência:**
- `supabase/migrations/021_create_categorias_conta_corrente.sql:16,22,25,27` — coluna `deleted_at TIMESTAMPTZ`; índices filtram `WHERE deleted_at IS NULL`
- `supabase/migrations/021_create_categorias_conta_corrente.sql:53` — SELECT policy `USING (deleted_at IS NULL)`
- Soft-delete via UPDATE em `022_rpc_categorias_conta_corrente_v2.sql` (`SET deleted_at = NOW()`)

**Ressalva (contraexemplo):** `supabase/migrations/021_create_categorias_conta_corrente.sql:44-73` — não há `CREATE POLICY FOR DELETE`; a ausência de policy é a proteção.

**Regressão se:** categorias forem fisicamente deletadas em vez de soft delete, perdendo histórico.

---

### Apenas backoffice pode criar/atualizar/deletar categorias

**Tipo:** arch-decision · **Verdict:** confirmed

Operações de escrita (POST/PUT/DELETE) em `categorias-conta-corrente-v2` rejeitam usuários com `tipo='vendedor'`; apenas backoffice gerencia categorias. Validação `if (user.tipo !== 'backoffice') throw` ocorre ANTES de qualquer RPC; `user.tipo` vem de `validateJWT()` (consulta tabela `user`), sem bypass. GET não é restrito por tipo (coerente — regra é sobre escrita).

**Evidência:**
- `supabase/functions/categorias-conta-corrente-v2/index.ts:168-170` — POST create: `IF user.tipo !== 'backoffice' THEN RAISE`
- `supabase/functions/categorias-conta-corrente-v2/index.ts:193-195` — PUT update: mesma checagem
- `supabase/functions/categorias-conta-corrente-v2/index.ts:216-218` — DELETE: mesma checagem

**Regressão se:** um vendedor conseguir criar/editar/deletar categorias.
