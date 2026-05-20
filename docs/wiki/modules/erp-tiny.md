# Módulo — Integração Tiny ERP

## Propósito

Camada que traduz pedidos ProSeller em chamadas ao Tiny ERP via API HTTP. Cobre o mapeamento `empresa × natureza de operação ProSeller → valor Tiny` (com suporte a dual-ID por Simples Nacional, F-001) e o envio de pedido propriamente dito.

## Edge Functions

- **`tiny-empresa-natureza-operacao-v2/index.ts`** — CRUD do mapeamento empresa × natureza → ID Tiny. Aceita `tinyValor` + `tinyValorSimples` (ambos string ou null). Validação RF-004 / DP-003: `tinyValor` vazio + `tinyValorSimples` não-vazio → 400 `NATUREZA_MAPEAMENTO_INCOMPLETO`.
- **`natureza-operacao-v2/index.ts`** — CRUD das naturezas de operação ProSeller (campo de domínio antes do mapeamento Tiny).
- **`tiny-enviar-pedido-venda-v1/index.ts`** — monta payload Tiny. Usa `_shared/natureza-resolver.ts` para escolher entre `tiny_valor` e `tiny_valor_simples` conforme `cliente.optante_simples_nacional`. Emite `natureza.resolvida` em log estruturado.
- **`_shared/receitaws-client.ts`** — cliente HTTP da ReceitaWS, timeout 5s, sem token = API Pública (default), com token = Bearer (API Comercial).

## Tabelas Postgres principais

- `tiny_empresa_natureza_operacao` — `(empresa_id, natureza_operacao_id) UNIQUE`, com `tiny_valor` NOT NULL (migration 085) + `tiny_valor_simples` NULL (migration 108, F-001).
- `natureza_operacao` — naturezas ProSeller (cadastro de domínio).
- `empresa` — empresas/subsidiárias com vínculo ao Tiny.

## Componentes React principais

- **Tela "Configurações › Mapeamento Naturezas Tiny"** (linha por empresa × natureza). Toggle "Habilitar natureza para Simples Nacional" abre o 2º campo `tinyValorSimples`. Quando ON, ambos campos obrigatórios. Quando OFF, apenas `tinyValor`.

## Fluxo de envio (resumo)

1. Carrega pedido + empresa + cliente.
2. Probe **DP-006**: se a empresa não tem nenhum mapeamento ativo com `tiny_valor_simples` preenchido → pula ReceitaWS, usa `tiny_valor` padrão direto, log `fallbackUsed="no_dual_company"`.
3. Caso contrário e cliente PJ + flag ligada → chama ReceitaWS (timeout 5s). Sucesso = atualiza `cliente.optante_simples_nacional`; falha = mantém valor persistido.
4. `_shared/natureza-resolver.ts` escolhe `tiny_valor_escolhido` (RF-005, 5 cenários A/B/C/D + E).
5. Sanitiza CEP/CNPJ/fone via `digitsOnly()` (INC-011).
6. Monta payload com `id_vendedor` (sem `nome_vendedor` — INC-014).
7. POST ao Tiny.

## Anti-SPEC viva específica do Tiny

- NÃO alterar linhas existentes de `tiny_empresa_natureza_operacao` na migration (só ADD COLUMN nullable).
- NÃO aplicar dual-ID a outros campos do payload (CFOP, transportadora) — só `natureza_operacao`.
- NÃO duplicar a lógica de escolha de natureza no frontend — é decisão 100% backend.
- NÃO usar ReceitaWS como fonte de verdade para outros dados do cliente (razão social, endereço).
- NÃO persistir resposta bruta da ReceitaWS (PII).
- NÃO logar CNPJ completo (mascarar — preservar 4 primeiros + 4 últimos dígitos).
- NÃO enviar campos redundantes ao Tiny (lição INC-014 — só ID, não nome).

## Débitos conhecidos do módulo

- **Suíte de testes** dos 5 sub-casos de CA-007 ainda parcial (`tests/edge/simples-nacional.test.ts` cobre alguns; falta cobrir Cenário E / DP-006).
- **Quota ReceitaWS API Pública 3/min** — monitorar logs `receitaws.lookup.rate_limited`; migrar para plano Comercial se recorrente (TODO §4).
- **Sem cache de respostas ReceitaWS** — decisão tributária (ADR-004); monitorar quota no primeiro mês de produção.
- **Deploy de Edge Function manual via CLI** (ADR-005) — automatizar via GitHub Action quando R-5 abrir.

## Incidentes históricos relevantes

- **INC-001** (2026-04-24) — Cursor MCP publicou stub `// test` em `create-cliente-v2`. Origem do ADR-005.
- **INC-002** (2026-04-24/29) — ReceitaWS client fazia early-return sem token; clientes optantes do Simples enviaram pedidos com natureza errada por dias até PR #5 corrigir.
- **INC-011** (2026-05-06, V 1.29) — Tiny rejeitava CEP/CNPJ/fone com formatação.
- **INC-014** (2026-05-13, V 1.31) — `nome_vendedor` redundante no payload causava rejeição.

## Referências

- SPEC §1 RF-004, RF-005 · §4 CA-007 · §6 Anti-SPEC · §11.b DP-006.
- ADR-002 (ReceitaWS), ADR-003 (dual-ID modelagem), ADR-004 (revalidação por pedido), ADR-005 (deploy CLI).
- CONTRACTS §2, §4 (logs estruturados).
