# F-LOG-7 · Parser PDF/EDI de faturas

**Risco:** **D** · **Branch:** `feat/log-crm-R-LOG-7` (futura) · **CI alvo:** N3 · **Depende de:** F-LOG-6.

> **Esqueleto.** Integração com biblioteca/serviço externo, env vars, eventual custo recorrente. ADR-007 obrigatório.

## Objetivo

Receber upload do PDF/EDI da fatura da transportadora e preencher automaticamente os campos "Automático..." (visto no Bubble): valor total, número da fatura, datas, e itens (NFe, valor mercadoria, peso, CTe, valor frete). Por transportadora (formatos divergem entre ATIVA/BRASSPRESS/TA-AMERICANA/CAMILO).

## Definition of Ready

- [ ] **ADR-007** decidido: parser próprio (`pdf-parse` por transportadora) vs. serviço externo (Documind / Mindee / Azure Document AI).
- [ ] Amostras de PDF/EDI de cada transportadora coletadas (≥ 3 por transportadora).
- [ ] Fallback: se parser falhar, manter modo manual de F-LOG-6.
- [ ] Estimativa de custo recorrente (se serviço externo).

## Escopo incluído

- Edge Function `fatura-pdf-parser-v1` — recebe PDF, retorna JSON estruturado.
- Roteador por `transportador_id.grupo` (ATIVA/BRASSPRESS/...) escolhe estratégia de parsing.
- UI de F-LOG-6 ganha botão "Parse PDF" antes de salvar.

## Escopo excluído

- Treinamento de modelo customizado (custo proibitivo no MVP).
- EDI fora de PDF — assumir só PDF nesta onda.

## Bloqueadores

- ADR-007 pendente.
- Amostras de PDFs precisam estar disponíveis.
