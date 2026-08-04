# Contrato — Convenções de Dados & Padrões

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

Este contrato documenta convenções de modelagem, RPC e SQL do domínio de dados.
Cada regra reflete o estado **verificado** do código (com correções aplicadas onde o veredito foi parcial).

---

## Invariants

### Padrão Soft-Delete (deleted_at) em Tabelas Principais — com violações conhecidas

**Enunciado.** Soft-delete com `deleted_at TIMESTAMPTZ` está implementado para tabelas principais (cliente, pedido_venda, natureza_operacao, produto, dados_vendedor, frete_logistica, grupos_redes, user, categorias_conta_corrente etc.). Regras verificadas:

1. Queries **não devem** retornar/juntar com registros onde `deleted_at IS NOT NULL`.
2. Delete de entidade principal é feito por `UPDATE ... SET deleted_at = NOW()`, nunca `DELETE FROM`.
3. Tabelas de associação **não** têm `deleted_at` (hard-delete permitido).

**Violações reais existentes (não conformidade parcial):**
- `list_conta_corrente_v2` / `get_conta_corrente_v2` / `update_conta_corrente_v2` fazem INNER/LEFT JOIN com `cliente` **sem** filtrar `c.deleted_at` → clientes soft-deletados aparecem em conta corrente.
- `list_pedido_venda_v2` filtra `pv.deleted_at IS NULL` mas **não** filtra `cliente`/`natureza_operacao` deletados.
- Múltiplos `return` statements em `007_rpc_clientes_v2.sql` (linhas 227, 359, 440, 742, 835) não filtram `deleted_at` (risco semântico baixo: o registro foi validado antes da operação).

**Tipo.** invariant

**Evidência.**
- `supabase/schema_baseline.sql:41,76,210,290,318,374,517` (colunas `deleted_at` em categorias_conta_corrente, cliente, dados_vendedor, frete_logistica, grupos_redes, natureza_operacao, produto)
- `supabase/migrations/025_fix_delete_cliente_v2_ambiguous_cliente_id.sql:52-61` (`UPDATE c SET deleted_at = NOW()`)
- `supabase/migrations/044_rpc_pedido_venda_v2.sql:903-908` (soft-delete de pedido)
- `supabase/migrations/007_rpc_clientes_v2.sql:590-591,630,814-815` (filtro `WHERE c.deleted_at IS NULL`)
- Contraexemplo: `supabase/migrations/067_rpc_conta_corrente_v2.sql:74` (`INNER JOIN public.cliente c ON c.cliente_id = ccc.cliente_id` sem `c.deleted_at IS NULL`)

**Regressão se.** Uma query não filtrar `WHERE deleted_at IS NULL` ou uma entidade principal sofrer hard-delete sem preparação prévia — quebra soft-delete auditável e reativação de clientes.

---

### Padrão UPSERT com COALESCE(NULLIF(TRIM(param), ''), tabela.col) — não uniformemente aplicado

**Enunciado.** `INSERT ... ON CONFLICT DO UPDATE` deve usar `COALESCE(NULLIF(TRIM(param), ''), <alias_tabela>.<coluna>)` para campos nullable/string vazia, preservando valores existentes quando o parâmetro é NULL/vazio. **Nunca** usar `EXCLUDED.<coluna>` como fallback — usar o alias da tabela. Isso evita apagar dados quando um campo não é reenviado.

A regra é válida e comprovada (migration 140 corrigiu perda de dados em ~89 clientes causada por `EXCLUDED.telefone`), **porém a aplicação é incompleta**: 14 arquivos de migration ainda contêm o padrão violador `EXCLUDED.<col>`, alguns criados **depois** da migration 140.

**Tipo.** invariant

**Evidência.**
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:1-8,132-172` (fix do bug `EXCLUDED.telefone`; padrão correto `telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), cliente_contato.telefone)`)
- `supabase/migrations/007_rpc_clientes_v2.sql:450-460` (`NULLIF(TRIM(...), '')` antes de INSERT)
- `supabase/migrations/009_rpc_natureza_operacao_v2.sql:17-20` (`nome = COALESCE(NULLIF(TRIM(p_nome), ''), n.nome)`)
- Contraexemplo: `supabase/migrations/130_fix_update_cliente_missing_fields.sql:183-188` (usa fallback `EXCLUDED.telefone` — viola a regra, criado APÓS a migration 140)

**Regressão se.** `EXCLUDED.<col>` for usado no `ON CONFLICT DO UPDATE` → campos omitidos na requisição são apagados. Se `TRIM` não for aplicado, espaços em branco são salvos como dados válidos.

---

## Business Rules

### Hard-Delete Permitido APENAS em Tabelas de Associação / Componentes de Pedido

**Enunciado.** Tabelas como `pedido_venda_produtos` (componentes de pedido), `pagamento_acordo_cliente` (pagamentos de acordo) e `condições_cliente` (mapeamento de condições) usam `DELETE FROM` sem `deleted_at`. São tabelas de associação, não entidades principais, e são recriadas integralmente ao atualizar o registro pai.

**Tipo.** business-rule

**Evidência.**
- `supabase/migrations/044_rpc_pedido_venda_v2.sql:792-793` (`DELETE FROM public.pedido_venda_produtos pvp WHERE pvp.pedido_venda_id = p_pedido_id` — substituição integral)
- `supabase/migrations/067_rpc_conta_corrente_v2.sql:1138-1139` (hard-delete de `pagamento_acordo_cliente`)
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:176-177` (`DELETE FROM condições_cliente` para limpar e recriar)

**Regressão se.** Hard-delete for estendido para entidades principais (cliente, pedido_venda), ou se `pedido_venda_produtos` ganhar `deleted_at` sem atualizar a lógica de UPDATE — quebra histórico de pedidos antigos.

---

### Nomes de Coluna com Acentos e Maiúsculas Mistas exigem Quoted Identifiers

**Enunciado.** Identificadores com acentos, caracteres especiais (ã, ç etc.) ou padrão maiúsculas/minúsculas mistas **devem** ser entre aspas duplas em queries. Exemplos: `"Condição_ID"`, `"Descrição"`, `"cliente_endereço"`, `"ref_tipo_endereco_id_FK"`. Isso evita o *identifier folding* do PostgreSQL e garante geração de SQL confiável.

Identificadores lowercase sem caracteres especiais (`cliente_id`, `cep`, `rua`, `numero`) **não** exigem aspas e funcionam corretamente; aspá-los por consistência é opcional. (A regra original dizia "SEMPRE" para todos — impreciso: aplica-se especificamente a identificadores acentuados/especiais/mixed-case.)

**Tipo.** business-rule

**Evidência.**
- `supabase/schema_baseline.sql:20-27` (tabela `Condicao_De_Pagamento`: `"Condição_ID"`, `"Parcelamento"`, `"Condição_de_crédito"`, `"Descrição"`)
- `supabase/schema_baseline.sql:106-116` (tabela `"cliente_endereço"` e coluna `"ref_tipo_endereco_id_FK"`)
- `supabase/migrations/140_fix_update_cliente_v2_excluded_upsert.sql:164-172` (`"cliente_endereço".cep`, `"cliente_endereço".rua` quoted em ON CONFLICT DO UPDATE)
- Contraexemplo: `supabase/schema_baseline.sql:888` (`"cliente_endereço_pkey" PRIMARY KEY (cliente_id)` com `cliente_id` não-quoted funcionando — contradiz o "SEMPRE" universal)

**Regressão se.** Aspas forem omitidas em identificadores acentuados/mixed-case → PostgreSQL faz fold para lowercase e causa erro ou acesso à coluna errada. Se o app construir queries sem respeitar case desses identificadores, falha ao localizar colunas.

---

### numero_pedido é TEXT, não IDENTITY — Geração Externalizada

**Enunciado.** A coluna `numero_pedido` em `pedido_venda` é `TEXT`, não `BIGINT IDENTITY`. O sistema gera números externamente (integração Tiny ERP / sequência customizada), não via AUTO INCREMENT. Valores são strings para permitir prefixos, formatos customizados e integração ERP. O parâmetro `p_numero_pedido TEXT DEFAULT NULL` é inserido diretamente, sem transformação. Nenhum trigger gera `numero_pedido` automaticamente. (Veredito: confirmado.)

**Tipo.** business-rule

**Evidência.**
- `supabase/schema_baseline.sql:429` (`numero_pedido` é TEXT, não IDENTITY)
- `supabase/migrations/044_rpc_pedido_venda_v2.sql:35-36,83-84,97` (`p_numero_pedido TEXT`, atribuído diretamente sem AUTO INCREMENT)

**Regressão se.** A aplicação usar AUTO INCREMENT/SEQUENCE para `numero_pedido` → quebra integração ERP que fornece números externamente. Se queries assumirem `numero_pedido` numérico (`::BIGINT`), falham em valores prefixados.

---

### Numeração de Migrations com Gaps Permitidos (não sequencial)

**Enunciado.** Migrations usam tipicamente o padrão `NNN` (ex.: 001, 007, 044, 067), permitindo gaps históricos (não há exigência de sequência estrita). Gaps podem indicar migrations descartadas ou reserva de blocos. **Duas anomalias violam a uniformidade da regra:**
- Prefixo `025` aparece duplicado em dois arquivos distintos.
- Arquivos com sufixo alfabético (`117a_backup`, `118a_backup`) existem apenas como referência/rollback manual — **não** são migrations aplicadas pelo sistema.

A ordem de execução pelo Supabase CLI **não está documentada** no projeto como numérica vs. por filename (é suposição, não validada).

**Tipo.** business-rule

**Evidência.**
- `supabase/migrations/` (sequência real com gaps: 001–005, pula 006, 007–030, 041–045, 067–087, 089+; gaps em 031–040, 046–066, 088)
- Contraexemplo: `supabase/migrations/025_cliente_completo_condicoes_conta.sql` e `025_fix_delete_cliente_v2_ambiguous_cliente_id.sql` (prefixo 025 duplicado); `117a_backup_create_grupos_redes_v2_before_vendedor.sql` com comentário "NÃO APLICAR EM CONDIÇÕES NORMAIS"

**Regressão se.** O sistema assumir migrations estritamente sequenciais (001, 002, 003...) → tool de migrate pode parar ao ver 006 faltando. Se a aplicação depender de ordem assumida vs. numérica → inversão de ordem de execução.

---

## Arch Decisions

### Colunas Mapper com Sufixo '_nome' — desnormalização (padrão não uniforme)

**Enunciado.** Colunas de referência denormalizadas (`nome_cliente`, `nome_vendedor`, `nome_natureza_operacao`, `nome_empresa_faturamento`, `nome_condicao_pagamento`, `nome_marca`, `nome_tipo_produto`) são read-only para performance de SELECT. A desnormalização segue **múltiplos padrões, não uniformemente imposta**:

1. **pedido_venda:** via RPCs (`create_pedido_venda_v2`, `update_pedido_venda_v2`) que buscam nomes por LEFT JOIN **antes** de INSERT/UPDATE (segue a intenção da regra).
2. **produto:** INSERT/UPDATE direto na tabela com nomes buscados em SELECTs separados via TypeScript (**viola** o padrão — LEFT JOIN fora do banco).
3. **vendedor/comissão:** via trigger `BEFORE INSERT`.

**Tipo.** arch-decision

**Evidência.**
- `supabase/schema_baseline.sql:442-451` (pedido_venda: `nome_cliente`, `nome_vendedor`, `nome_natureza_operacao`, `nome_empresa_faturamento`, `nome_condicao_pagamento`)
- `supabase/migrations/044_rpc_pedido_venda_v2.sql:457-462,480-498` (`create_pedido_venda_v2` busca `v_vendedor_nome` via LEFT JOIN antes do INSERT)
- `supabase/migrations/025_cliente_completo_condicoes_conta.sql:56-60` (`get_cliente_completo_v2` retorna `vendedores` via JSON_AGG de LEFT JOIN)
- `supabase/schema_baseline.sql:518-521` (produto: `nome_marca`, `nome_tipo_produto`)
- Contraexemplo: `supabase/functions/produtos-v2/index.ts:519-520` (INSERT com `nome_marca`/`nome_tipo_produto` via LEFT JOIN em TypeScript), linhas 602, 615 (UPDATE idem)

**Regressão se.** A aplicação tentar atualizar `nome_cliente` diretamente em vez de `cliente.nome` → mudança ignorada (read-only no RPC). Se a RPC não preencher `_nome` → NULL em pedidos antigos.

---

### Índices Partial sobre deleted_at IS NULL para Performance — aplicação inconsistente

**Enunciado.** Índices em colunas frequently-searched incluem `WHERE deleted_at IS NULL` para criar índices partial (reduz tamanho e melhora query planning para soft-deletes). O projeto implementa isso em ~58% dos índices (57 de 99), especialmente em colunas core (cliente, pedido_venda, produto, dados_vendedor). **A aplicação é inconsistente:** índices em colunas frequently-searched nem sempre incluem a cláusula. A regra não é universalmente imposta.

**Tipo.** arch-decision

**Evidência.**
- `supabase/migrations/003_add_indices.sql:1-30` (`CREATE UNIQUE INDEX idx_grupos_redes_nome_unique ... WHERE (deleted_at IS NULL)`)
- `supabase/schema_baseline.sql:1061+` (índices com `WHERE deleted_at IS NULL` em todo o baseline)
- Contraexemplo: `supabase/schema_baseline.sql:1032` (`CREATE INDEX idx_cliente_situacao ON public.cliente USING btree (ref_situacao_id)` — sem `WHERE deleted_at IS NULL`, violando a convenção numa coluna frequently-searched)

**Regressão se.** Índices forem dropados/recriados sem a cláusula `WHERE` → queries que filtram `deleted_at IS NULL` passam a full table scan; performance de listagem de clientes ativos degrada.
