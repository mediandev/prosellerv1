# F-LOG-5 · Indicadores financeiros do Dashboard Logística

**Risco:** B · **Branch:** `feat/log-crm-R-LOG-5` (futura) · **CI alvo:** N1 + matriz · **Depende de:** F-LOG-2.

> **Esqueleto.** Cálculo agregado por período. Sem mudança em tabelas — só queries.

## Objetivo

Renderizar no Dashboard de Logística os 3 indicadores do Bubble: Média das Cotações de Transporte, Custo Logístico Realizado (sobre valor das notas), Tempo Médio de Entrega. Filtro por período (default últimos 30 dias). Valores observados no print: Valor Notas R$9.482.762,88, Valor Cotações R$576.725,91, Percentual 5,89%.

## Definition of Ready

- [ ] Definição exata de "Custo Logístico Realizado" — usa `fatura_transportadora_item.valor_frete_cobrado` ou `frete_logistica.valor_cotacao`?
- [ ] Tempo Médio de Entrega: diferença `data_entrega - data_saida` em dias úteis ou corridos?
- [ ] Cache (vista materializada) ou cálculo on-the-fly?

## Escopo incluído

- Edge Function `logistica-dashboard-v1` (GET) retorna JSON com `mediaCotacoes`, `custoLogisticoRealizado`, `tempoMedioEntrega`, contagens dos 5 status.
- Componente React em `LogisticaDashboardPage` consome.

## Escopo excluído

- Drill-down em cada indicador (futura R-LOG-5a).
- Comparação com período anterior.

## Dependências

- F-LOG-1 (tabelas).
- F-LOG-6 ideal (faturas) para "Custo Logístico Realizado" — caso contrário usa `valor_cotacao` como aproximação.
