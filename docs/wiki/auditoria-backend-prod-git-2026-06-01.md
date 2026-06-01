# Auditoria do backend: prod ↔ git + código morto (2026-06-01)

> Documento de **consulta**. Registra a divergência repo↔prod encontrada, o que foi
> recuperado para o git, e os **candidatos a código morto** (NÃO deletar sem verificar).
> Nada aqui deve ser apagado por impulso — ver ressalvas no fim.

## Contexto

O repositório **não era a fonte de verdade do backend**. Edge functions e funções de
banco eram deployadas **manualmente** e muitas nunca foram commitadas. Risco: um deploy
futuro a partir do git regrediria/derrubaria partes do sistema.

Arquitetura de branches (importante):
- **`main`** → frontend; Netlify faz **auto-publish do `main`** (proseller.app.br).
- **`master`** → **edge functions + migrations** (Supabase); **deploy manual** via CLI.
- `main` e `master` divergiram bastante; algumas edges existem só em um dos dois.

Projeto Supabase (prod): `xxoiqfraeolsqsmsheue`.

## Números (snapshot 2026-06-01)

- Edge functions: **52 em prod** | 44 no git (main∪master).
- Funções `public` no banco: **132 em prod** | ~52 não estavam em migration alguma.

## O que foi recuperado para o git (somente versionamento — não mexeu em prod)

- **PR #36** (mergeado) — backport das correções da sessão: RPCs de cliente
  (`create/update_cliente_v2` com `#variable_conflict use_column`, código automático,
  situação ATIVO; `get_cliente_completo_v2`/`list_clientes_v2` com `situacao_nome`) +
  edges `clientes-v2` e `create-user-v2` (com o FIX B de reativação de usuário).
- **PR #37** (baseline) — `migration 117` com **snapshot de 128 funções** de prod
  (`pg_get_functiondef`, idempotente) + **19 edge functions** que estavam só em prod
  ou divergentes.

## ⚠️ Schema NÃO é reproduzível pelo git (achado 2026-06-01, parte 2)

O baseline #37 cobriu **funções**, mas o **schema (tabelas/colunas/triggers)** continua fora:
- **39 das 62 tabelas** sem `CREATE TABLE` em migration nenhuma — inclui core: `produto`,
  `dados_vendedor`, `metas_vendedor`, `listas_preco`, `conta_corrente_cliente`,
  `pedido_venda_produtos`, `cliente_contato`, vários `ref_*`. (Algumas acentuadas podem
  ser falso-negativo; a maioria é real.)
- **Migrations:** 187 registradas em prod (`supabase_migrations.schema_migrations`) × 90
  arquivos no git. Parte é drift de nome (`NNN_nome` vs `nome`), mas muita coisa de schema
  só existe em prod (RLS, create table, triggers, colunas, conta-corrente RPCs).
- Triggers: 10 `create trigger` no git × 12 em prod. RLS: 151 `create policy` no git ×
  130 em prod (RLS razoavelmente coberto; tabelas não).

**Conclusão:** reconstruir o banco só pelo git NÃO reproduz o schema de prod.

**Correção:** dump de schema completo como baseline —
`supabase db dump --schema public -f supabase/schema_baseline.sql` (captura tabelas,
colunas, constraints, índices, RLS, triggers e funções). Pendente de execução (precisa de
conexão direta ao banco; rodar via CLI/Cursor).

## 🪦 Candidatos a CÓDIGO MORTO (não usados) — NÃO deletar sem verificar

Critério: nome **sem nenhuma referência** no front (`main`), nas edges (git + dumps de
prod), nos corpos das funções, nem como handler de trigger.

### Edge functions — alta confiança (legado/superado)
| Função | Por quê |
|---|---|
| `ObterListas`, `ObterProdutos`, `Criar_Vendedor`, `TinyEmitirAPI`, `fetch_clientesSP`, `verificarquantosclientes`, `emitirpedido`, `emitir-pedido-sem-vendedor` | Legado 2024–2025, sem chamada |
| `create-cliente-v2` | Superada pela `clientes-v2` (POST) |
| `list-condicoes-pagamento-v2` | Superada pela `condicoes-pagamento-v2` (`action=list`) |
| `get-price-list-detail` | Sem chamada no front/edges |

### Edge functions — ⚠️ VERIFICAR antes (recentes; podem ser chamadas por cron/webhook/edge→edge)
- `ssw-tracking-v1` — rastreio SSW; a wiki sugere uso on-demand. Confirmar que nada externo chama.
- `tiny-verificar-pedido-v1` — integração Tiny; pode ser acionada por cron/webhook.

### RPCs / funções de banco — candidatas a remover
- `filtrar_produtosBB`, `filtrar_produtosTT` (variantes legadas)

> As ~50 outras funções "fora de migration" da auditoria **estão em uso** (chamadas por
> edges/outras funções/triggers) → entraram no baseline (#37), **não** são mortas.

## Ressalvas
- Edges acionadas por **webhook/cron externo** não aparecem como "chamadas" numa
  varredura de código — daí a coluna "verificar".
- A varredura usou as fontes de edge disponíveis (git + dumps de prod); como nem toda
  edge de prod foi baixada, pode haver subcontagem de uso de RPC. Tratar a lista como
  **candidatos**, não veredito final.
- **Apagar function/edge é ação em produção** — fazer com backup e um de cada vez.

## Como re-rodar a auditoria (manutenção)

1. Edges em prod: `npx supabase functions list --project-ref xxoiqfraeolsqsmsheue`.
2. Funções de banco: `select proname, pg_get_functiondef(oid) ...` (schema `public`,
   `prokind='f'`, excluindo dependências de extensão).
3. Cruzar nomes de prod contra: front (`main/src`), edges (`supabase/functions`),
   corpos das funções e `pg_trigger`. Sem referência em nenhum = candidato a morto.
4. Triggers em uso: `select p.proname from pg_trigger t join pg_proc p on p.oid=t.tgfoid ...`.

## Pendências (“arrumar a casa de vez”)
- Mergear o **PR #37** (baseline).
- Decidir estratégia **main × master** e atualizar o `CLAUDE.md` (hoje diz "ignore master",
  o que é enganoso — `master` é o deploy de edges/migrations).
- Reconciliar as edges baixadas (bundle transpilado) para TS limpo.
- Processo: **commitar antes de deployar** (evita recriar essa divergência).
- Avaliar remoção dos mortos de alta confiança (com backup).
