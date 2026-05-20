# Módulo — Clientes

## Propósito

Cadastro completo de clientes (PJ e PF), incluindo dados fiscais, condição comercial, vendedor atribuído, segmentação por grupo/rede, e fluxo de aprovação por backoffice. É a entrada de dados que alimenta o ciclo de pedidos e a integração Tiny.

## Edge Functions

- **`clientes-v2/index.ts`** — handler unificado GET (list/detail via `get_cliente_completo_v2` + `mapClienteCompleto`), POST (cria via `create_cliente_v2`), PUT (atualiza via `update_cliente_v2`), DELETE. Endpoint principal do módulo.
- **`create-cliente-v2/index.ts`** — fluxo de criação dedicado, com chamada à ReceitaWS para F-001 quando flag ligada.
- **`get-cliente-v2/index.ts`** — leitura individual (legado, ainda usado em alguns pontos do frontend).
- **`update-cliente-v2/index.ts`** — atualização dedicada (segue padrão dos demais `update-*-v2`).
- **`delete-cliente-v2/index.ts`** — soft-delete.
- **`list-clientes-v2/index.ts`** — listagem paginada para a página de clientes. Busca acento-insensível + CNPJ digits-only + filtro por grupo/rede (V 1.31, migration 115). Trata vendedor pendente (V 1.32, migration 118).
- **`aprovar-cliente-v2/index.ts`** + **`rejeitar-cliente-v2/index.ts`** — fluxo de aprovação do cadastro.
- **`segmento-cliente-v2/index.ts`** — segmentação de clientes.
- **`grupos-redes-v2/index.ts`** — CRUD de grupos/redes (V 1.32: inclusão rápida via `QuickCreateGrupoRedeDialog`, migration 117 permite vendedor criar).

## Tabelas Postgres principais

- `cliente` — entidade principal. Campos novos por F-001: `optante_simples_nacional` (boolean nullable), `optante_simples_nacional_consultado_em` (timestamptz nullable). Soft-delete via `deleted_at`. Vendedor atribuído via array `vendedoresatribuidos uuid[]`.
- `grupo_cliente`, `rede_cliente` — segmentação. `grupo_rede` texto livre (V 1.31).
- `cliente_change_logs` — auditoria (migration 106). Trigger em 107.
- `tiny_empresa_natureza_operacao` — mapeamento usado pelo fluxo Tiny (ver módulo `erp-tiny`).

## Componentes React principais

- **`CustomerFormDadosCadastrais.tsx`** — formulário principal de dados cadastrais. Exibe campo Optante Simples Nacional read-only.
- **`CustomerFormCondicaoComercial.tsx`** — aba de condição comercial; vendedoresAtribuidos vem como array de objetos (lição do INC-008 — POST/PUT normalizam para uuid[]).
- **`ClientesListPage`** (em `App.tsx` ou similar) — listagem com busca, filtros, paginação.
- **`ImportCustomersData.tsx`** — importação por planilha (.xlsx) — F-004 entregue em V 1.27. Aplica `COLUMN_MAP` automaticamente no upload.
- **`QuickCreateGrupoRedeDialog.tsx`** — modal de inclusão rápida (V 1.32).

## Features cobertas

- **F-001 · Consulta Simples Nacional** (ATIVA em produção) — `create-cliente-v2` consulta ReceitaWS; `clientes-v2` GET retorna campo via `mapClienteCompleto` (corrigido INC-003).
- **F-004 · Importação via planilha** (V 1.27 — concluída) — wireamento real do `ImportCustomersData` com `api.create('clientes', ...)`.

## Débitos conhecidos do módulo

- **`mapClienteCompleto` sem teste unit** — vive dentro de `clientes-v2/index.ts` (entry point `serve()`). Extrair para `_shared/cliente-mapper.ts` na próxima feature que tocar `clientes-v2` (TODO §4).
- **Normalização de `vendedoresAtribuidos`** duplicada entre POST e PUT no `clientes-v2` — unificar em helper compartilhado (lição do INC-008).
- **F-004 sem upsert** — `ImportCustomersData` falha silenciosamente quando cliente já existe (unique constraint). Próxima feature do import deve detectar conflito ANTES do POST e oferecer toggle "Atualizar existentes" (INC-013).
- **F-004 sem normalização de CEP/CNPJ/fone na entrada** — defesa em duas camadas pendente (INC-011 sanitizou no boundary Tiny, mas import gravou formatado).
- **`findVendedor` no `ImportCustomersData`** falha quando planilha usa razão social no campo Vendedor — aceitar email/user_id literal como alternativa.
- **UUID fantasma `c02341e2-...`** em `vendedoresatribuidos` (INC-013) — pode ter outros clientes ainda apontando para ele; auditoria sob demanda.

## Incidentes históricos relevantes

- **INC-003** (2026-04-29) — `mapClienteCompleto` omitia `optante_simples_nacional` (lição: auditar Edge Functions GET ao adicionar coluna nova).
- **INC-008** (2026-05-06) — POST de `clientes-v2` não normalizava `vendedoresAtribuidos` (V 1.27).
- **INC-009** (2026-05-06) — PUT não enviava `p_desconto` ao RPC (V 1.28).
- **INC-010** (2026-05-06) — PUT só enviava UUID do grupo, não o texto; lookup nome→UUID falhava silencioso (V 1.28).
- **INC-013** (2026-05-07) — 30 clientes da Valéria com UUID de vendedor inexistente; F-004 falhou silenciosamente no import.

## Referências

- SPEC §1 (F-001) · ADR-002, ADR-004 · CONTRACTS §2 · TODO §1, §4, §5.
