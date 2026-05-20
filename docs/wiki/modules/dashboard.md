# Módulo — Dashboard e Notificações

## Propósito

Tela inicial pós-login com indicadores comerciais resumidos (clientes recentes, pedidos abertos, comissão acumulada do período) e fila de notificações operacionais (aprovações pendentes, falhas de envio Tiny, etc.).

## Edge Functions

- **`dashboard-v2/index.ts`** — agrega indicadores resumidos para a tela inicial. Múltiplas consultas via RPCs.
- **`notificacoes-v2/index.ts`** — CRUD/list de notificações exibidas no Sidebar (sino).

## Tabelas Postgres principais

- `notificacao` (lista de notificações por usuário).
- Tabelas consumidas por leitura: `cliente`, `pedido_venda`, `comissao_*`, `dados_vendedor`.

## Componentes React principais

- Página `dashboard` em `App.tsx` (componente embutido — segue padrão do roteamento manual).
- `Sidebar` (ícone de notificações, contador, dropdown).
- **`SidebarUserInfo`** (~linha 142 de `App.tsx`) — exibe versão (`systemVersion`) e changelog tooltip ✨. **Toda PR que dispara deploy em produção** precisa bumpar essa constante e adicionar bullet em "Novidades em V x.y".
- **`ChangelogPage`** (V 1.23+) — página dedicada para novidades, complementar ao tooltip enxuto.

## Débitos conhecidos do módulo

- **`dashboard-v2` faz muitas RPCs** — não auditado para performance em volume real. Quando R-5 abrir, medir e considerar consolidar em RPC única (out-of-scope hoje).
- **`systemVersion` hardcoded em `App.tsx`** — não é débito, é convenção explícita (cliente cobra ver mudar a cada entrega). Documentado em `runbooks/bump-system-version.md`.

## Incidentes históricos relevantes

- **`ccaa811`** (pré-Harness) — flash de 10 clientes no dashboard ao carregar.

## Referências

- CLAUDE.md "Toda PR que dispara deploy em produção bumpa `systemVersion`".
