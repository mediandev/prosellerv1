# F-LOG-2 · Logística — Torre de Controle + Busca + Detalhe do frete

**Risco:** B · **Branch:** `feat/log-crm-R-LOG-2` (futura) · **CI alvo:** N1 + matriz · **Depende de:** F-LOG-1.

> **Esqueleto.** DoR ainda incompleta. Detalhar antes de abrir branch.

## Objetivo

Recriar as 3 telas centrais do Logis Bubble: Dashboard (5 cards de status + lista resumida), Busca (lista paginada com filtros), Detalhe do frete (ocorrências + dados + DACTE + comprovante).

## Definition of Ready

- [ ] CAs por tela.
- [ ] Filtros da Busca: empresa, transportador, cliente, período, status.
- [ ] Decidir paginação (server-side via Edge Function `list_fretes_logistica_v1`).
- [ ] Mapear quais ocorrências SSW são exibidas no Detalhe antes da integração real (R-LOG-4).

## Escopo incluído (provável)

- `list-fretes-logistica-v1` Edge Function (paginada, filtros, search).
- `frete-logistica-v1` GET-by-id retorna ocorrências aninhadas.
- Componentes: `LogisticaDashboardPage`, `LogisticaBuscaPage`, `LogisticaDetalheFretePage`.
- Upload de DACTE + comprovante via Storage Supabase (bucket novo `logistica-comprovantes`).

## Escopo excluído

- Integração SSW (R-LOG-4).
- Indicadores financeiros do Dashboard (R-LOG-5).

## Arquivos prováveis

- `supabase/functions/list-fretes-logistica-v1/index.ts`
- `src/components/logistica/{LogisticaDashboardPage,LogisticaBuscaPage,LogisticaDetalheFretePage}.tsx`
- Bucket Supabase Storage: `logistica-comprovantes` (criar via Cursor MCP — operação D).

## Dependências

- F-LOG-1 (schema + cadastros).
- Decisão sobre bucket Storage (ADR pequeno se necessário).

## Notas para abertura

- Atualizar `VITE_FEATURE_LOG_CRM` para incluir esta tela.
- Considerar deep-link da Busca → Detalhe (sem React Router — `useState<LogisticaView>` interno).
