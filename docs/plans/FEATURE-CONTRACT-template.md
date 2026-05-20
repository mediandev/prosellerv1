# Feature Contract — Template (Harness v3.2 §9)

> Obrigatório para classes **B, C, D**. Opcional para **A**.
> Inline no item do `TODO.md` para B. Arquivo separado em `docs/plans/feature-contracts/F-NNN.md` para C/D (típico quando passa de ~40 linhas).

---

## F-NNN · `<nome curto da feature>`

**Risco:** A / B / C / D · **RFs cobertos:** RF-XXX, RF-YYY · **Branch:** `feat|fix|chore/<slug>` · **CI alvo:** N1 / N2 / N3

### Objetivo

Em 1–3 frases: o que essa feature entrega de valor de negócio e por quê. Não descrever solução — descrever resultado esperado.

### Definition of Ready

- [ ] RFs vinculados (ou justificativa clara).
- [ ] CAs claros e testáveis.
- [ ] Escopo **incluído** descrito.
- [ ] Escopo **excluído** descrito.
- [ ] Classificação A/B/C/D confirmada (aplicar desempates).
- [ ] Arquivos prováveis de alteração listados.
- [ ] Testes esperados (unit / integration / contract / e2e / smoke).
- [ ] Contratos Zod necessários (ou decisão de que não precisa).
- [ ] Dependências externas.
- [ ] Impacto em banco.
- [ ] Impacto em produção (staging, rollback, feature flag).

### Critérios de aceite (CAs)

Formato Given/When/Then por CA, amarrado a RF da SPEC.

- **CA-1:** Given <pré-condição>, When <ação>, Then <resultado verificável>.
- **CA-2:** …

### Escopo

**Incluído:**
- …

**Excluído (NÃO faz parte desta feature):**
- …

### Arquivos

**Podem ser alterados:**
- `src/...`
- `supabase/functions/...`
- `packages/shared/types/...`

**NÃO podem ser alterados** (qualquer alteração exige pausa):
- `supabase/migrations/<anteriores>` (regra de ouro).
- `src/App.tsx` componente `SidebarUserInfo` exceto para bump de versão.
- Outros conforme contexto.

### Contratos Zod

A usar / criar / atualizar em `packages/shared/types/`. Sempre **schema primeiro**, código depois.

### Testes obrigatórios (matriz)

| Teste | Tipo | CA coberto | Arquivo |
|---|---|---|---|
| `arquivo.test.ts::caso` | unit / integration / contract / e2e / smoke | CA-N | `tests/<área>/...` |

### Comandos obrigatórios

CI no nível da classe (mínimo):
- **N1:** `npm run typecheck` + `npm run lint` + `npm test` + `npm run build`.
- **N2:** N1 + `npm run test:edge`.
- **N3:** N2 + smoke real em prod (manual) + migration validation (Cursor MCP).

### Infra / Produção (apenas C / D)

- **Migration:** sim/não — qual número, qual brief, qual rollback.
- **Env var nova:** sim/não — qual nome, qual valor default OFF.
- **Feature flag:** sim/não — nome, default OFF.
- **Staging:** procedimento.
- **Rollback plan:** passo a passo executável (sempre escrito ANTES do deploy).

### Anti-SPEC relevante

Itens específicos do `docs/specs/SPEC.md §6` que esta feature precisa respeitar (não duplicar a Anti-SPEC inteira — só o que é relevante).

### Matriz de validação (preenchida no QA — Prompt 3)

| CA | Teste | Tipo | Status | Evidência |
|---|---|---|---|---|
| CA-N | `arquivo.test.ts::caso` | … | passou / falhou | log de `npm test`, link CI, report Playwright, smoke com exit 0 |

### Gate de autonomia

- Posso decidir sozinho: …
- Devo pausar e perguntar: …

---

*Use inline em `TODO.md` para B; arquivo separado em `docs/plans/feature-contracts/F-NNN.md` para C/D.*
