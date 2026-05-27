# ADR-008 — Polling SSW Tracking on-demand com cache 30 min

- **Status:** aceito
- **Data:** 2026-05-26
- **Autor:** Harness Solo (R-LOG-4, decisão Eduardo 2026-05-26)

---

## Contexto

R-LOG-4 integra o ProSeller com a API pública SSW (`POST https://ssw.inf.br/api/trackingdanfe`) para popular a timeline de ocorrências em `frete_logistica_ocorrencia`. Precisávamos decidir a estratégia de polling: on-demand ao abrir detalhe do frete, cron periódico via `pg_cron`, ou híbrido.

O LogCRM Bubble usa on-demand (1 chamada por NFe ao listar), e o Valentim está acostumado com esse modelo. Rate limit SSW é 20 req/s — confortável para on-demand.

## Decisão

**On-demand ao abrir detalhe do frete**, com cache de 30 minutos baseado em `frete_logistica_ocorrencia.created_at`.

Fluxo:
1. Frontend chama `get_with_ocorrencias(id)`.
2. Backend verifica: frete tem `nfe_chave_acesso`? Flag `FEATURE_LOG_CRM_SSW` ligada? Status não é terminal (`Entregue`, `Devolvido - Entregue`)?
3. Se tudo OK e última ocorrência `created_at` > 30 min (ou não há ocorrências) → chama SSW.
4. Resposta SSW → delete+re-insert ocorrências (com fail-safe: se SSW retorna erro ou array vazio, NÃO deleta as existentes).
5. Atualiza `frete_logistica.status_entrega` via mapper.

Sem cron por enquanto. Se necessário, adiciona catch-up diário em onda futura.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Cron periódico (`pg_cron`) | Dados sempre frescos | Custo em req SSW × fretes ativos; complexidade pg_cron; Supabase free não suporta |
| Híbrido (on-demand + cron catch-up) | Melhor dos dois mundos | Complexidade desnecessária neste momento |
| **On-demand + cache 30 min (escolhido)** | Simples; familiar ao Valentim; zero custo quando ninguém consulta | Dados frescos só quando alguém olha |

## Consequências

- Primeira abertura do detalhe de um frete com chave NFe pode levar ~1-2s extra (chamada SSW).
- Fretes com status terminal não geram mais chamadas SSW (otimização).
- Flag `FEATURE_LOG_CRM_SSW` permite desligar polling sem afetar cadastros.
- Se o Valentim pedir dados mais frescos no futuro, cron pode ser adicionado sem refatorar — o mesmo `_shared/ssw-client.ts` serve.
