# Módulo — Comissões

## Propósito

Cálculo e fechamento de comissão por vendedor a partir dos pedidos enviados ao Tiny. Inclui metas de vendedor, geração de relatório PDF, e envio do relatório por e-mail.

## Edge Functions

- **`comissoes-v2/index.ts`** — cálculo + listagem de comissões. Inclui saldo anterior, totalizadores, suporte a fechamento de período (V 1.22).
- **`enviar-email-comissoes/index.ts`** — dispara e-mail com PDF de comissão em anexo (V 1.18). PDF agora renderiza caracteres especiais com encoding Latin-1 fix (V 1.33).
- **`metas-vendedor-v2/index.ts`** — CRUD de metas por vendedor (usado no cálculo de comissão progressiva).

## Tabelas Postgres principais

- `comissao_periodo` (e tabelas relacionadas de período fechado/aberto).
- `meta_vendedor`.
- `dados_vendedor` — informações de vendedor que alimentam o cálculo.
- `pedido_venda` (lido para somar valores enviados ao Tiny no período).

## Componentes React principais

- **`CommissionReportPage.tsx`** — página de relatório, listagem por período, totalizadores, exportação PDF, envio por e-mail. Suporta acentos no PDF a partir de V 1.33 (commit `4529103`).
- Página de metas (em `App.tsx`).

## Débitos conhecidos do módulo

- **Cálculo de comissão sem testes de regressão.** Risco: mudanças tributárias ou regra nova podem quebrar silenciosamente cálculos passados. Quando R-5 abrir, priorizar testes de integração do `comissoes-v2`.
- **PDF com `jspdf` + `jspdf-autotable`** sem versão pinada em `package.json` (`*`). Atualizações silenciosas podem quebrar layout — observar.

## Incidentes históricos relevantes

- **Fix V 1.33** (commit `4529103`) — caracteres especiais no PDF do relatório de comissão renderizavam errado (encoding Latin-1).
- **Fix pré-Harness** (`ccaa811`) — destaque do e-mail de comissões + flash de 10 clientes no dashboard.
- **V 1.18** — envio de PDF como anexo no e-mail de comissões (commit `50212af`).
- **V 1.17** (`f01d4c1`) — bloquear edição pós-envio + fix comissões + notificações.

## Referências

- TODO §6 (concluído — release V 1.22 saldo anterior + totalizadores + acentos + fechar período, V 1.33 PDF Latin-1).
