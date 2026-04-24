# ADR-005 — Deploy de Edge Functions exclusivamente via Supabase CLI

- **Status:** aceito
- **Data:** 2026-04-24
- **Autor:** Harness Solo (pós INC-001)

---

## Contexto

Durante o deploy de F-001 (Consulta Simples Nacional) em 2026-04-24, logo após o merge do PR #4 em `main` (merge commit `4a770bb`), o Cursor Agent foi usado como canal de deploy das Edge Functions. O agente invocou `deploy_edge_function` via MCP Supabase com um payload minimalista de validação (stub contendo apenas `// test`) e acabou sobrescrevendo a versão de produção da função `create-cliente-v2`.

Por alguns minutos, `create-cliente-v2` retornou o stub `// test` em produção. Nenhum cliente afetado confirmado (janela curta, backoffice não estava cadastrando clientes naquele momento), mas o incidente expôs dois problemas:

1. **O canal MCP aceita deploy com payload arbitrário**, sem comparar conteúdo com o repositório versionado. Não há garantia de que o código publicado corresponde ao commit em `main`.
2. **O deploy foi disparado sem passo intermediário de verificação** — o agente executou a tool como parte de um fluxo de validação, não como etapa explícita de publicação.

A recuperação foi feita via `npx supabase functions deploy create-cliente-v2 --project-ref xxoiqfraeolsqsmsheue` rodando localmente contra o código em `main` pós-merge, e as outras duas Edge Functions alteradas pela F-001 (`tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`) foram redeployadas pelo mesmo canal para garantir consistência.

O incidente ficou registrado como **INC-001** no TODO.md §5.

## Decisão

**Edge Functions do Supabase são deployadas EXCLUSIVAMENTE via `supabase functions deploy` CLI**, rodado a partir do código em `main` (localmente por enquanto; em GitHub Action no futuro).

**O MCP Cursor NÃO é canal válido para deploy de Edge Functions.** A tool `deploy_edge_function` é considerada proibida pelo fluxo, independente do payload.

Operações administrativas permitidas via MCP Cursor permanecem: aplicar migrations em staging, testar RPC, gerenciar roles/buckets/secrets. Apenas o deploy de código fonte de função sai desse canal.

## Consequências

### Positivas
- **Garantia de correspondência código ↔ produção.** `supabase functions deploy` lê do working tree; rodando a partir de `main` limpa, temos certeza de que o publicado é o commitado.
- **Elimina risco de payload truncado / stub.** Não existe mais o caminho em que o agente compõe um payload manual e envia.
- **Auditoria mais simples.** Um deploy = um comando shell = um registro em histórico local / CI. Não precisa decifrar logs de MCP.

### Negativas / trade-offs
- **Passo manual pós-merge até a Action existir.** Hoje o deploy depende do desenvolvedor rodar o comando localmente após o merge do PR. Mitigação: automatizar em GitHub Action (débito técnico registrado no TODO §4 — "Automatizar deploy de Edge Functions em GitHub Action ao mergear main").
- **Depende do Supabase CLI instalado localmente.** Aceitável — já é dependência do projeto para gerar migrations.

### Neutras
- A feature flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` permanece o mecanismo de contenção runtime. Mesmo que um deploy ruim passe pela CLI, a flag OFF neutraliza o efeito em produção até validação.

## Alternativas descartadas

- **A — Deploy via MCP Cursor (`deploy_edge_function`):** é o canal que causou INC-001. Aceita payload arbitrário, sem verificação contra `main`, sem revisão humana do que será publicado. Descartado.
- **B — Deploy via painel Web do Supabase (copy/paste do editor):** sujeito a erro humano em copy/paste (perder imports, quebrar caracteres especiais, esquecer arquivos auxiliares de `_shared/`). Também não versiona o deploy. Descartado.
- **C — Deploy via webhook do GitHub direto ao Supabase:** Supabase não oferece essa integração nativa hoje. Descartado por inexistência.

A opção escolhida (`supabase functions deploy` CLI) é a única que lê código do repositório versionado, suporta automação futura via Action, e mantém o deploy reproduzível.

## Quando substituir este ADR

Substituir por novo ADR quando **qualquer uma** destas acontecer:
1. GitHub Action de deploy automático ao mergear `main` for implementada — o ADR-005 continua válido em espírito (canal é CLI), mas a rotina operacional muda.
2. Supabase oferecer mecanismo oficial de deploy reproduzível a partir de commit SHA (ex.: integração com GitHub Releases) — pode substituir a CLI como canal primário.
3. MCP Cursor ganhar modo read-only para `deploy_edge_function` (só verifica, não publica) — aí a tool volta a ser útil em fluxo de validação, mas ainda assim não como canal de deploy.

## Referências

- TODO.md §5 · INC-001 (registro do incidente que motivou este ADR)
- TODO.md §4 · Débito técnico "Automatizar deploy de Edge Functions em GitHub Action"
- CLAUDE.md · "Quando o Cursor Agent entra" (escopo de uso do MCP Cursor)
- PR #4 (merge commit `4a770bb`) — contexto de F-001
