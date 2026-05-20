# Validation Matrix — Template (Harness v3.2 §10)

> Obrigatória no Prompt 3 (QA) para classes **B, C, D**.
> Sem evidência objetiva em algum CA → `MUDANÇAS_SOLICITADAS`. Nunca `APROVADO`.

---

## Como preencher

Para cada CA da feature, uma linha mostrando o teste que cobre, seu tipo, status, e a evidência objetiva.

| CA | Teste | Tipo | Status | Evidência |
|---|---|---|---|---|
| CA-001 | `arquivo.test.ts::happy_path` | integration | passou | log de `npm test -- arquivo.test` em `<link/anexo>` |
| CA-002 | `arquivo.test.ts::edge_case_X` | integration | passou | idem |
| CA-003 | `endpoint.spec.ts::403_unauthenticated` | e2e | passou | Playwright report `<link>` |
| CA-004 | N/A | não coberto | falhou | criar teste antes do merge |

---

## O que **conta** como evidência

- Saída de `npm test` (ou `npm run test:edge` para Deno) com o teste **nomeado** e marcador `✔` ou `PASS`.
- Report do Playwright (HTML ou JSON).
- Log do GitHub Actions / CI com `✔ passed` ou job verde no nível da classe.
- Migration aplicada em staging com `SELECT` de validação documentado.
- Script de smoke com `exit code 0` + log do que foi verificado.
- Para classe D em produção: cliente / Valentim respondendo "OK" no smoke real (registrado em `wiki/log.md` tipo `[VALIDATION]`).

## O que **NÃO conta** como evidência

- Afirmação do agente ("rodei mentalmente", "deve funcionar").
- "O código parece correto."
- Teste com `.skip`, `.only`, ou `xtest`.
- Cobertura genérica (% de cobertura) sem amarração ao CA específico.
- `console.log` deixado no código como prova.
- Screenshot sem timestamp / sem contexto da PR.
- "Testei localmente" sem comando reproduzível.

---

## Retornos possíveis do QA

- **APROVADO** — toda linha com `Status: passou` e evidência amarrada.
- **MUDANÇAS_SOLICITADAS** — falta evidência em alguma linha; faltou cobrir CA; arquivo alterado fora da lista permitida; Anti-SPEC ferida; matriz incompleta.
- **BLOQUEADO** — DoR incompleta em domínio sensível, contrato Zod não criado, migration sem rollback, segredo/token em código, feature cresceu além do escopo.

---

*Não duplique a matriz em vários lugares — mantenha junto do Feature Contract da feature (inline no TODO ou em `docs/plans/feature-contracts/F-NNN.md`).*
