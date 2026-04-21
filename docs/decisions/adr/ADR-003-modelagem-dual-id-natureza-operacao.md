# ADR-003 — Modelagem dual-ID em `tiny_empresa_natureza_operacao`

- **Status:** aceito
- **Data:** 2026-04-20
- **Autor:** Harness Solo (sessão de SPEC de F-001)
- **Substitui:** —

---

## Contexto

F-001 exige que o mapeamento empresa × natureza de operação → valor Tiny aceite **dois valores Tiny** para o mesmo par `(empresa_id, natureza_operacao_id)`:

1. `tiny_valor` — quando cliente destinatário **não** é optante do Simples Nacional (ou quando essa informação é desconhecida).
2. `tiny_valor_simples` — quando cliente destinatário **é** optante do Simples Nacional.

A configuração é opt-in: a UI de Configurações mostra o segundo campo apenas se o backoffice marcar um toggle. Para a maioria das naturezas (venda simples, retorno de mercadoria, etc.) o 2º campo nunca será preenchido, e o sistema usa `tiny_valor` para todos os clientes — preservando o comportamento pré-F-001.

A tabela existe desde a migration 085 (2025) com unique index `(empresa_id, natureza_operacao_id)`. Tem dados ativos em produção que **não podem ser alterados** — apenas estendidos (CLAUDE.md: "não mexer em migrations já aplicadas").

## Decisão

Adicionar **uma coluna nova nullable** à tabela existente:

```sql
ALTER TABLE public.tiny_empresa_natureza_operacao
  ADD COLUMN tiny_valor_simples text NULL;
```

- `NULL` = mapeamento usa apenas `tiny_valor` (comportamento pré-F-001 preservado).
- Texto não vazio = ativa dual-ID; envio Tiny seleciona entre `tiny_valor` e `tiny_valor_simples` conforme `cliente.optante_simples_nacional`.

O unique index existente `uq_tiny_empresa_natureza_operacao_empresa_natureza` permanece válido (continua sendo um registro por par empresa/natureza).

## Alternativas consideradas

- **A — Segunda linha com coluna discriminadora (`para_simples BOOLEAN`):**
  - Estrutura: duas linhas para mesmo par (empresa, natureza) — uma com `para_simples=false`, outra com `para_simples=true`.
  - Prós: modelagem "relacional pura"; futura extensibilidade para mais regimes (MEI, Lucro Presumido, etc.) só precisa adicionar valor no discriminador.
  - Contras:
    1. **Quebra unique index existente** — exige migrar o índice para `(empresa_id, natureza_operacao_id, para_simples)`, operação irreversível em produção.
    2. **Quebra semântica das queries atuais** — todo `SELECT` em `tiny_empresa_natureza_operacao` precisaria ser revisado para filtrar o discriminador. Hoje há exatamente 1 query em `tiny-enviar-pedido-venda-v1` (linhas 328-346), mas pode haver consumidores invisíveis.
    3. **Migração de dados existentes** — as ~N linhas atuais precisariam ganhar um `para_simples=false` explícito; esquecer um consumidor pode fazer ele ler registro errado.
  - Motivo de não escolher: viola CLAUDE.md ("não mexer em migrations já aplicadas"), exige migração de dados em produção com risco operacional, e ganha flexibilidade que **não temos demanda** (SPEC Anti-SPEC §6: "NÃO aplicar dual-ID a outros campos").

- **B — Tabela separada `tiny_empresa_natureza_operacao_simples` (1-para-1):**
  - Estrutura: tabela paralela com FK para `tiny_empresa_natureza_operacao.id`, armazenando apenas o `tiny_valor_simples`.
  - Prós: isolamento total do schema antigo; rollback trivial (só drop da tabela nova).
  - Contras:
    1. Toda leitura vira `JOIN LEFT` — código mais complexo por ganho zero.
    2. Duplicação de concerns administrativos (RLS, soft-delete, auditoria) em 2 tabelas.
    3. UI de configuração precisaria fazer 2 requests ou uma view agregadora.
  - Motivo de não escolher: overhead sem benefício — o acoplamento 1-para-1 torna a separação cerimonial.

- **C — Campo JSONB com map de regimes:**
  - Estrutura: coluna `tiny_valores_por_regime JSONB` do tipo `{ "padrao": "1001", "simples": "2002" }`.
  - Prós: máxima flexibilidade para regimes futuros.
  - Contras:
    1. Postgres trata JSONB opaco — validação de schema vira responsabilidade do app.
    2. Queries ficam feias (`data->>'simples'`).
    3. Não temos demanda para mais de 2 regimes (Anti-SPEC §6).
  - Motivo de não escolher: complexidade desproporcional ao requisito.

## Consequências

### Positivas
- **Zero impacto em dados existentes** — ~N linhas em produção continuam válidas sem conversão; `tiny_valor_simples = NULL` é o default automático da nova coluna.
- **Zero impacto em queries existentes** — `SELECT tiny_valor ... WHERE empresa_id = X AND natureza_operacao_id = Y` continua retornando a mesma coisa. Apenas `tiny-enviar-pedido-venda-v1` precisa ler a coluna nova e rodar a lógica de escolha.
- **Rollback trivial** — `ALTER TABLE DROP COLUMN tiny_valor_simples` sem perda de dado antigo (se feito antes de qualquer linha usar o campo).
- **Invariante natural:** `tiny_valor` continua NOT NULL (pela migration 085), então "só tiny_valor_simples preenchido" é um estado inválido detectável no app (CB-003 da SPEC).

### Negativas / trade-offs
- **Inflexibilidade para regimes futuros:** se daqui a 1 ano surgir necessidade de um 3º valor (ex.: MEI), precisaremos substituir este ADR (ir para alternativa A ou C). Aceitamos esse risco por YAGNI.
- **Acoplamento semântico ao domínio fiscal BR:** o nome da coluna embute conceito específico (`simples`). Se a feature evoluir para outras jurisdições (improvável — sistema é BR-only), nome vira dívida.
- **CB-003 precisa ser enforçado no app** — o banco aceita `tiny_valor_simples` preenchido sem `tiny_valor`, porque `tiny_valor` tem NOT NULL mas cadastros antigos poderiam perder `tiny_valor` se alguém fizer UPDATE. Mitigação: Edge Function valida na entrada (ver DP-003).

### Neutras
- A coluna nova **não precisa de índice** — busca sempre acontece via `(empresa_id, natureza_operacao_id)` que já tem unique index.
- Nome `tiny_valor_simples` espelha `tiny_valor`. Não usar `tiny_valor_simples_nacional` (longo) nem `tiny_valor_sn` (opaco).

## Migration a ser criada

`supabase/migrations/108_add_tiny_valor_simples_to_empresa_natureza.sql`:

```sql
-- 108: Dual-ID por optante Simples Nacional (F-001)
-- Adiciona coluna opcional que, quando preenchida, permite ao envio Tiny
-- escolher natureza_operacao distinta para clientes optantes do Simples.
-- NULL = comportamento pré-F-001 (usa tiny_valor para todos os clientes).

alter table public.tiny_empresa_natureza_operacao
  add column if not exists tiny_valor_simples text null;

comment on column public.tiny_empresa_natureza_operacao.tiny_valor_simples is
  'Valor natureza_operacao Tiny usado quando cliente destinatário é optante do Simples Nacional. NULL = usa tiny_valor para todos (comportamento padrão pré-F-001).';
```

Simultaneamente, migration das duas colunas novas em `cliente` (mesma migration ou separada, decisão no momento da execução — recomendação: **mesma migration 108**, rollback único):

```sql
alter table public.cliente
  add column if not exists optante_simples_nacional boolean null,
  add column if not exists optante_simples_nacional_consultado_em timestamptz null;
```

**Rollback:**

```sql
alter table public.tiny_empresa_natureza_operacao drop column if exists tiny_valor_simples;
alter table public.cliente
  drop column if exists optante_simples_nacional_consultado_em,
  drop column if exists optante_simples_nacional;
```

Rollback é seguro se feito antes de qualquer dado real chegar nessas colunas. Após produção, rollback significa perder a informação coletada — aceitável no MVP.

## Quando substituir este ADR

- Demanda concreta por mais de 2 valores Tiny por natureza (ex.: MEI, Lucro Presumido precisam valores distintos).
- Expansão do sistema para outras jurisdições fiscais.
- Mudança tributária que exija dual-ID em outros campos (CFOP, transportadora, etc.) — indício que JSONB/tabela paralela vira melhor ideia.

## Referências

- SPEC §1 · RF-004, RF-005
- SPEC §5 · CB-003 (mapeamento incompleto)
- SPEC §7 · Modelo de dados
- SPEC §11 · DP-003 (DP ainda em aberto — pode ajustar a validação descrita aqui)
- Migration 085 (existente): `supabase/migrations/085_create_tiny_empresa_natureza_operacao.sql`
- CLAUDE.md · "Não mexer em migrations já aplicadas"
