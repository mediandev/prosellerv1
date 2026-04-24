# ADR-004 — Revalidação do optante Simples Nacional a cada envio de pedido Tiny

- **Status:** aceito
- **Data:** 2026-04-22
- **Autor:** Valentim Nunes (decisão do cliente) + Eduardo Sousa (formalização)
- **Substitui:** — (complementa RF-003 da SPEC v0.2; obsoletou o default de 30 dias da SPEC v0.1)

---

## Contexto

A SPEC v0.1 de F-001 (Consulta Simples Nacional) deixava em aberto **DP-001 — Janela de revalidação**: após quantos dias desde a última consulta à ReceitaWS o sistema deveria reconsultar o optante antes de enviar um pedido ao Tiny. O default assumido para destravar a SPEC era **30 dias**.

Em call com o cliente em 2026-04-22, surgiu a seguinte restrição tributária concreta:

- A condição de "optante do Simples Nacional" tem janelas anuais formais para inclusão/exclusão por iniciativa do contribuinte.
- Porém, **uma empresa optante pode ser excluída do Simples a qualquer momento do ano** se passar a exercer atividade econômica não-permitida pelo regime (lista CNAE vedada).
- Mudanças tributárias recentes em São Paulo aumentaram a fiscalização desse tipo de exclusão.
- Consequência prática: uma janela de revalidação de 30 dias pode significar **até 30 dias emitindo NFs com regime fiscal errado** para um cliente que foi excluído do Simples.

O volume de pedidos esperado é moderado (~50–100 envios/dia), e o plano pago da ReceitaWS (ADR-002) tem rate limit generoso — o custo de quota adicional é aceitável frente ao risco tributário.

## Decisão

**Revalidar `optante_simples_nacional` via ReceitaWS a cada envio de pedido ao Tiny**, para cliente PJ, quando a feature flag `FEATURE_SIMPLES_NACIONAL_LOOKUP` estiver ligada. Sem cache. Sem janela de tempo. Sem cron job.

A lógica de fallback permanece: se a revalidação falhar (timeout, rate-limit, resposta inválida), o envio usa o `optante_simples_nacional` persistido (mesmo antigo) ou, se persistido também for `null`, cai em `tiny_valor` (CB-002).

## Alternativas consideradas

- **A — Janela fixa de 30 dias (default da SPEC v0.1):**
  - Prós: consumo reduzido de quota ReceitaWS (~70% menos consultas).
  - Contras: até 30 dias com regime fiscal incorreto se o cliente perder o Simples no meio do mês. Risco tributário real segundo o cliente.
  - Motivo de não escolher: viola o requisito de negócio exposto pelo cliente na call.

- **B — Cache com TTL mais curto (7 dias):**
  - Prós: compromisso entre quota e frescor.
  - Contras: ainda aceita até 7 dias de NF errada; complexidade adicional (lógica de TTL, timestamp comparison, testes de borda).
  - Motivo de não escolher: ganho marginal sobre 30 dias em troca de complexidade; cliente pediu "sempre atualizado".

- **C — Cron job diário revalidando todos os clientes PJ:**
  - Prós: mantém cache quente fora do caminho crítico do envio.
  - Contras: (1) infra nova (scheduler); (2) quota consumida para clientes que nunca vão receber pedido naquele dia; (3) ainda tem janela (clientes novos do dia); (4) Anti-SPEC §6 proíbe cron job de varredura.
  - Motivo de não escolher: viola Anti-SPEC e é over-engineering.

- **D — Sincronização por webhook da ReceitaWS:**
  - Prós: reativo; zero polling.
  - Contras: ReceitaWS não oferece webhooks para mudança de optante.
  - Motivo de não escolher: infraestrutura inexistente.

## Consequências

### Positivas
- **Regime fiscal sempre atualizado no momento do envio** — elimina a janela de NF errada.
- **Implementação simples** — remove a lógica de comparação de timestamp do fluxo F-2 da SPEC; uma chamada a `fetch` por envio.
- **Sem cron job, sem scheduler, sem tabela de cache** — aderente ao princípio "resolver com o mínimo".
- **Fallback já existente** cobre falhas da ReceitaWS sem bloquear envios.

### Negativas / trade-offs
- **Maior consumo de quota ReceitaWS.** Estimativa: ~50–100 consultas/dia a mais na revalidação (uma por pedido PJ enviado, contra ~7–10 na janela de 30d). Dentro do plano pago; monitorar no primeiro mês de produção (débito técnico registrado no TODO §4).
- **Latência adicional no envio de pedido:** até 5s de timeout quando ReceitaWS estiver lenta. Aceitável porque envio ao Tiny não é fluxo síncrono-UX-crítico (backoffice clica "Enviar", espera resposta).
- **Dependência operacional da ReceitaWS:** se a ReceitaWS cair, todo envio PJ cai no fallback (`optante_simples_nacional` antigo). Aceitável — fallback já especificado em CB-002.

### Neutras
- A coluna `optante_simples_nacional_consultado_em` continua existindo (migration 108 já define). Ela agora apenas documenta "última vez que conseguimos consultar com sucesso" — não participa de decisão de fluxo. Útil para auditoria e debug.
- O campo `optante_simples_nacional` persistido vira essencialmente **cache best-effort do último sucesso**, usado só como fallback quando a revalidação síncrona falha.

## Implementação

Na Edge Function `tiny-enviar-pedido-venda-v1`:

```typescript
// Após carregar pedido + empresa + cliente
const featureEnabled = (Deno.env.get("FEATURE_SIMPLES_NACIONAL_LOOKUP") || "").toLowerCase() === "true";
const cpfCnpj = digitsOnly(cliente.cpf_cnpj ?? "");
const ehPJ = cpfCnpj.length === 14;

let optanteSimples: boolean | null = cliente.optante_simples_nacional ?? null;

if (featureEnabled && ehPJ) {
  const lookup = await consultarSimplesNacional(cpfCnpj); // timeout 5s
  if (lookup.status === "ok") {
    optanteSimples = lookup.optante;
    await supabase.from("cliente")
      .update({
        optante_simples_nacional: lookup.optante,
        optante_simples_nacional_consultado_em: lookup.consultadoEm,
      })
      .eq("cliente_id", cliente.cliente_id);
  }
  // status "failed" / "inconclusive": mantém o valor persistido; log já foi emitido pelo client.
}

// Passa `optanteSimples` para resolveNaturezaTiny()
```

## Quando substituir este ADR

Substituir por novo ADR quando **qualquer uma** destas acontecer:
1. Quota ReceitaWS apertar (plano pago deixar de suportar o volume observado) — re-introduzir cache com TTL curto.
2. Cliente mudar a restrição tributária (ex.: aceitar janela de 24h porque a fiscalização relaxou).
3. ReceitaWS oferecer webhook de mudança de optante (elimina a necessidade de polling).
4. Volume de pedidos PJ/dia ultrapassar 500 (ponto onde cache + revalidação seletiva passa a fazer sentido econômico).

## Referências

- SPEC §1 · RF-003 (revalidação por pedido, não por janela)
- SPEC §4 · CA-005 (atualizado em v0.2 para refletir esta decisão)
- SPEC §11.b · DP-001 resolvida (ref. a este ADR)
- ADR-002 · ReceitaWS como fornecedor (plano pago)
- TODO.md §4 · Débito técnico "monitorar quota ReceitaWS no primeiro mês"
- Call cliente 2026-04-22: Valentim Nunes + Eduardo Sousa
