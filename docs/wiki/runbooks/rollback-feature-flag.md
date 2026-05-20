# Runbook — Rollback de feature flag (caso F-001)

> Mecanismo padrão (ADR-001) — env var lida em runtime pelas Edge Functions. Desligar = 1 clique no painel + restart automático.

## Quando usar

- Bug grave em produção causado pela feature flagueada.
- Cliente reporta NF incorreta / dado errado relacionado à feature ligada.
- ReceitaWS instável ao ponto de degradar UX além do fallback.

## Flags ativas hoje

| Flag | Onde | Estado atual | Efeito quando OFF |
|---|---|---|---|
| `FEATURE_SIMPLES_NACIONAL_LOOKUP` | Supabase → Project Settings → Edge Functions → Secrets | `true` (produção) | `create-cliente-v2` não chama ReceitaWS; `tiny-enviar-pedido-venda-v1` não revalida Simples; payload Tiny usa `tiny_valor` (não `tiny_valor_simples`); `optante_simples_nacional` persistido é ignorado para decisão de natureza |

## Passos para desligar

1. Painel Supabase → projeto `xxoiqfraeolsqsmsheue` → **Project Settings** → **Edge Functions** → **Secrets / Environment variables**.
2. Encontrar `FEATURE_SIMPLES_NACIONAL_LOOKUP`.
3. Editar → setar valor para `false` → Save.
4. O Supabase faz **restart automático** das Edge Functions afetadas (`create-cliente-v2`, `tiny-empresa-natureza-operacao-v2`, `tiny-enviar-pedido-venda-v1`). Propagação: **segundos a poucos minutos** — não é instantâneo.
5. **Validar:**
   - Disparar OPTIONS smoke nas 3 funções (ver `deploy-edge-function.md`).
   - Acompanhar logs Supabase → Edge Functions → `tiny-enviar-pedido-venda-v1` → Logs. Eventos `receitaws.lookup` devem parar de aparecer.
6. Registrar 1 linha em `docs/wiki/log.md` tipo `[BUGFIX]` ou `[BLOCKED]` conforme o motivo.

## Passos para religar

1. Mesmo caminho do painel.
2. `FEATURE_SIMPLES_NACIONAL_LOOKUP=true`.
3. Smoke real do fluxo afetado (criar 1 cliente PJ, conferir log `receitaws.lookup outcome=ok`).
4. Linha em `wiki/log.md` tipo `[RELEASE]`.

## Importante

- Desligar a flag **não apaga dados** — `cliente.optante_simples_nacional` persistido fica como está. Só a decisão de natureza Tiny volta a usar `tiny_valor` padrão (RF-006 + CA-008).
- Reativar **não reconsulta** retroativamente — só os próximos pedidos passam pelo fluxo. Para forçar reconsulta de um cliente específico, editar e salvar via UI (gatilha re-validation no próximo envio Tiny).

## Lições registradas

- **INC-002** (2026-04-24/29) — Flag ficou ligada por dias com bug em `receitaws-client.ts` (early-return sem token); decisão **não** foi desligar a flag e sim hotfix do helper. Critério: se a falha está no boundary (rede/token), pode hotfix; se está no comportamento esperado, desligar.

## Referências

- ADR-001 (estratégia de feature flag) · SPEC §1 RF-006 · CA-008.
