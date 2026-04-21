# ADR-001 — Feature flag via env var como MVP

- **Status:** aceito
- **Data:** 2026-04-20
- **Autor:** Harness Solo (sessão de SPEC de F-001)
- **Substitui:** —

---

## Contexto

F-001 · Consulta Simples Nacional exige um mecanismo de feature flag para permitir ligar/desligar a consulta à ReceitaWS em ambiente de produção sem redeploy de código (e sobretudo sem bloquear o roteiro atual de criação de clientes caso a API externa esteja instável).

O projeto **não possui hoje** nenhum sistema de feature flag:
- Sem tabela `feature_flag`.
- Sem serviço externo (LaunchDarkly, Unleash, etc.).
- Sem nenhuma variável de ambiente dedicada a feature toggle.

Como F-001 é a primeira feature a precisar desse padrão, a decisão que tomarmos aqui vira o **padrão de referência** para features futuras.

## Decisão

Adotar **env var lida em runtime pela Edge Function** como mecanismo de feature flag para F-001 e features imediatamente subsequentes:

```
FEATURE_SIMPLES_NACIONAL_LOOKUP = "true" | "false" | (ausente = false)
```

A variável é consumida via `Deno.env.get(...)` dentro das Edge Functions `create-cliente-v2`, `update-cliente-v2` (se vier a revalidar) e `tiny-enviar-pedido-venda-v1`. Nenhum valor é persistido em banco.

**Convenção de nomenclatura:** `FEATURE_<SCREAMING_SNAKE_CASE>` (prefixo obrigatório `FEATURE_`).

## Alternativas consideradas

- **A — Tabela `feature_flag` no Postgres:**
  - Prós: granular (por empresa, por usuário), auditável, mudança sem redeploy de infra.
  - Contras: +1 RPC em cada request (latência), overhead de migration e UI de admin, solução pesada para um caso com 1 flag só.
  - Motivo de não escolher: nenhuma feature atual precisa de granularidade; criar infra antes da demanda é violação do princípio "resolver com o mínimo".

- **B — Serviço externo (LaunchDarkly, Unleash, GrowthBook):**
  - Prós: UI pronta, targeting avançado, audit log.
  - Contras: custo, SDK novo no bundle, latência de rede, complexidade.
  - Motivo de não escolher: overkill total para o estágio atual.

- **C — Flag hardcoded (constante no código):**
  - Prós: zero infra.
  - Contras: exige redeploy para ligar/desligar; se a feature causar problema em prod, rollback é lento.
  - Motivo de não escolher: falha o requisito de "desligar sem redeploy", que é o ponto da flag.

## Consequências

### Positivas
- Zero infra nova: Supabase já gerencia secrets de Edge Functions via dashboard.
- Ligar/desligar é **1 clique** no painel Supabase + restart das funções afetadas (automático).
- Padrão reusável pelas próximas features sem precisar re-decidir.

### Negativas / trade-offs
- **Granularidade zero:** flag é global (liga para todos os clientes ou ninguém). Se precisarmos "ligar só para empresa X", esse ADR terá de ser substituído.
- **Sem UI de admin:** ligar a flag exige acesso ao painel Supabase (só devs). Não é ruim para MVP mas limita rollout gradual por cliente.
- **Não auditável:** mudanças na env var não geram histórico — quem ligou/desligou quando só aparece no log de deploy do Supabase.

### Neutras
- Feature flag **desligada** é o estado default (env var ausente). Deploy inicial da feature vai com flag `false`; ligar é operação consciente.
- Consumidores (Edge Functions) devem tratar flag ausente como `false` defensivamente.

## Padrão de uso (template)

```typescript
// Dentro da Edge Function
const featureEnabled = (Deno.env.get("FEATURE_SIMPLES_NACIONAL_LOOKUP") || "").toLowerCase() === "true";

if (featureEnabled) {
  // caminho novo (F-001)
} else {
  // caminho antigo preservado
}
```

**Nunca** usar `!!Deno.env.get(...)` — string `"false"` é truthy em JS e passaria no check.

## Quando substituir este ADR

Substituir por novo ADR quando **qualquer uma** destas acontecer:
1. Necessidade de flag por empresa/tenant.
2. Mais de ~5 features ativas com flag simultaneamente (gerenciar env vars vira bagunça).
3. Requisito de audit log de mudanças de flag.
4. Necessidade de rollout percentual (5% dos clientes → 50% → 100%).

## Referências

- SPEC §1 · RF-006 · Feature flag `feature_simples_nacional_lookup`
- SPEC §11 · Decisões pendentes: nenhuma DP depende deste ADR
- CLAUDE.md · "Feature flag para contrato público"
