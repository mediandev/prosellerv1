# ADR-002 — ReceitaWS como fornecedor da consulta Simples Nacional

- **Status:** aceito
- **Data:** 2026-04-20 (retroativo — decisão original foi tomada em conversa com Lucas em 2026-04-18)
- **Autor:** Lucas (cliente) — documentação retroativa pelo Harness Solo
- **Substitui:** —

---

## Contexto

F-001 precisa determinar, com base no CNPJ do cliente, se a empresa destinatária é **optante do Simples Nacional**. Isso é informação pública disponível em múltiplas fontes, cada uma com suas características:

| Fonte | Atualização | API pública | Custo | Notas |
|---|---|---|---|---|
| ReceitaWS | Real-time (consulta CONSOPT ao vivo) | Sim | Grátis com rate limit 3/min; plano pago sem limit | Campo `simples.optante` só no plano comercial |
| SERPRO | Cache diário | Sim | Pago (por consulta) | Oficial da Receita Federal |
| Consulta manual no CONSOPT | — | — | — | Não automatizável em escala |
| Scraping da própria Receita | Real-time | Não | — | Risco operacional (CAPTCHA, mudança de HTML) |

O volume esperado é baixo-moderado: ~10–30 consultas por dia na criação de clientes + ~50–100 consultas por dia nos envios de pedido com revalidação (janela de 30 dias — ver DP-001).

## Decisão

Usar **ReceitaWS** (`https://www.receitaws.com.br/v1/cnpj/<CNPJ>`) como fornecedor único da informação `optante do Simples Nacional`.

O plano pago da ReceitaWS retorna o objeto `simples` com o campo `optante` em tempo real (consultando CONSOPT ao vivo). O plano gratuito também pode ser usado como ponto de partida, mas o campo `simples` **pode estar ausente** — tratar como inconclusivo (CB-001 da SPEC).

## Alternativas consideradas

- **A — SERPRO:**
  - Prós: fonte oficial da Receita Federal, SLA contratado, documentação robusta.
  - Contras:
    1. **Cache diário** — pode estar desatualizado na janela de opção/exclusão do Simples (começo de ano).
    2. Contrato e integração B2B mais complexos.
    3. Custo por consulta sem economia em volume baixo.
  - Motivo de não escolher: cache diário falha o requisito de "dado atualizado no momento do envio do pedido" (RF-003).

- **B — Scraping CONSOPT direto:**
  - Prós: fonte primária, zero custo de API.
  - Contras: legal questionável, quebra a qualquer mudança de HTML, CAPTCHA, sem SLA, risco de bloqueio de IP.
  - Motivo de não escolher: não é uma solução profissional para um sistema em produção.

- **C — Híbrido ReceitaWS (principal) + SERPRO (fallback):**
  - Prós: resiliência se ReceitaWS cair.
  - Contras: duplica complexidade, contrato B2B duplo, 2x superfície de falha a monitorar.
  - Motivo de não escolher: com o fallback arquitetônico já definido (campo `null` + `tiny_valor` padrão — ver RF-005), a resiliência via segundo provedor é marginal.

## Consequências

### Positivas
- **Dado sempre fresco:** consulta CONSOPT ao vivo (plano pago).
- **Integração simples:** HTTP GET com CNPJ na URL, resposta JSON.
- **Rate limit generoso** no plano pago.
- **Compatível com fallback arquitetônico:** se falhar, campo fica `null` e pedido vai como "não-simples" (comportamento pré-F-001 preservado — Anti-SPEC §6).

### Negativas / trade-offs
- **Dependência de fornecedor privado** — se a ReceitaWS encerrar serviço ou quebrar contrato, precisamos de plano B (substituir este ADR).
- **Plano pago necessário** para ter o campo `simples.optante` confiavelmente. Plano gratuito não retorna esse campo — será tratado como inconclusivo.
- **PII de sócios na resposta** — a ReceitaWS retorna dados completos do CNPJ (razão social, quadro societário, endereço). Anti-SPEC §6 proíbe persistir a resposta bruta — só extraímos `simples.optante`.

### Neutras
- Rate limit: no plano gratuito (3/min) a feature funcionaria em volume de testes mas não em produção. Plano comercial necessário antes de ligar a flag em produção.
- Endpoint não tem concept de webhook/push — a consulta é sempre pull sob demanda.

## Token e configuração

- Token (plano pago) vive em secret do Supabase: `RECEITAWS_TOKEN`.
- Ausência do token → a Edge Function deve tratar como ReceitaWS indisponível (cair no fallback, não tentar chamada sem auth).

## Quando substituir este ADR

Substituir por novo ADR quando:
1. ReceitaWS mudar contrato de forma que `simples.optante` não esteja mais disponível.
2. Volume ultrapassar o rate limit do plano pago (improvável no curto prazo).
3. Surgir requisito de usar fonte oficial (SERPRO) por exigência regulatória.
4. Aparecer fornecedor brasileiro significativamente melhor (preço/qualidade).

## Referências

- SPEC §1 · RF-002, RF-003 · Consulta ReceitaWS
- SPEC §5 · CB-001 (plano gratuito sem campo `simples`)
- SPEC §6 · Anti-SPEC (não persistir resposta bruta)
- TODO.md §2 · F-001 · "Decisão confirmada (Lucas, 18/abr): usar ReceitaWS em vez de SERPRO"
- Documentação: https://developers.receitaws.com.br/
