# TODO — ProSeller V1

> Estado vivo do projeto. Único arquivo de controle, junto com `git log`.
> Atualizar ao final de cada sessão.

**Última atualização:** 2026-04-20

---

## 1. Em andamento

_Nenhuma feature em código ativo. Próximo passo: onda de reorganização + PRD/SPEC retroativo antes de abrir F-001._

---

## 2. Backlog — Features priorizadas

### 🔴 F-001 · Consulta Simples Nacional (Alta · Em desenvolvimento na visão do negócio)

**Motivação:** mudanças tributárias em SP exigem identificar clientes optantes do Simples Nacional e ajustar a natureza de operação Tiny conforme o caso.

**Escopo proposto (a ser espec'ado em `docs/specs/SPEC.md` antes de codar):**
- Adicionar campo `optante_simples_nacional` (boolean) no cadastro de cliente.
- Consultar API `https://developers.receitaws.com.br/` para preencher o campo:
  - No momento de criar um cliente novo.
  - No momento de enviar o pedido ao Tiny (para garantir dado atualizado).
- Na tela de **Configurações › Mapeamento Naturezas de Operação (Tiny por Empresa)**, permitir **2 IDs Tiny por cada Operação ProSeller** (toggle/checkbox opt-in; padrão 1:1).
  - Campo 1: ID Tiny quando destinatário **não** é Simples.
  - Campo 2: ID Tiny quando destinatário **é** Simples.
- Ao disparar o pedido para o Tiny, escolher o ID correto baseado no cliente.
- Decisão confirmada (Lucas, 18/abr): usar **ReceitaWS** em vez de SERPRO — ReceitaWS consulta CONSOPT em tempo real, SERPRO é cache.

**Critérios de aceite (rascunho — refinar em SPEC):**
- CA-1: Cliente novo salvo com `optante_simples_nacional` preenchido pela consulta.
- CA-2: Tela de Mapeamento mostra 1 campo ID Tiny por default; ao marcar toggle, abre 2º campo.
- CA-3: Pedido enviado para Tiny usa natureza correta conforme optante/não-optante do cliente.
- CA-4: Falha na ReceitaWS (timeout/quota) não bloqueia criação de cliente — cai em fallback com alerta.
- CA-5: Teste de integração cobrindo os 4 cenários (Simples+ID1, Simples+ID2, Não-Simples+ID1, Não-Simples com fallback).

**Dependências:**
- Migration nova: adicionar `optante_simples_nacional` em tabela de cliente + campo dual ID Tiny em `tiny_empresa_natureza_operacao`.
- Feature flag: `feature_simples_nacional_lookup` até rollout controlado.
- Ligação com Edge Functions: `create-cliente-v2`, `update-cliente-v2`, `tiny-enviar-pedido-venda-v1`, `tiny-empresa-natureza-operacao-v2`.

---

### 🟡 F-002 · Pedidos — Ajustes Manuais (Média · Em análise)

**Motivação:** cobrir casos fora do roteiro padrão — substituição de NF do Tiny, correções diretas no Tiny — para manter sincronia visual entre ProSeller e ERP sem gerar efeito reverso no ERP.

**Escopo proposto:**
- Permitir ajuste manual de **status do pedido** no ProSeller (só efeito local, não replica no Tiny).
- Permitir alterar manualmente o número da **NF do Tiny** vinculada a um pedido ProSeller (só efeito local).
- Ação restrita a usuário **backoffice com permissão específica**.
- Garantir idempotência: pedido com ajuste manual **não pode** gerar repercussão no Tiny em nenhuma sync futura (flag `ajuste_manual: true`).

**Critérios de aceite (rascunho):**
- CA-1: Backoffice com permissão vê botões de "Ajuste manual" na listagem de pedidos.
- CA-2: Usuário sem permissão não vê nem acessa os botões (403 no endpoint).
- CA-3: Pedido com ajuste manual exibe badge visual na listagem.
- CA-4: Sync com Tiny ignora pedidos com `ajuste_manual: true`.
- CA-5: Log de auditoria (quem ajustou, o quê, quando) fica gravado.

**Dependências:**
- Migration: adicionar `ajuste_manual` + `ajuste_manual_log` em tabela de pedido.
- Permissão nova: `pedido.ajustar_manual`.
- Edge Functions afetadas: `pedido-venda-v2` (PATCH de status/NF manual), `tiny-enviar-pedido-venda-v1` (filtro de ignorar).

---

### 🟢 F-000 · Espinha mínima Harness v3 (Concluída, aguardando este commit)

Criação de `AGENTS.md`, `CLAUDE.md`, `TODO.md`, estrutura `docs/`, `packages/`, `tests/`, CI GitHub Actions, scripts npm (`lint`, `typecheck`), correção do `.gitignore`.

---

## 3. Próximas ondas (após as 2 features acima)

### Onda R-1 — Inventário e reorganização de docs/
- Listar os 120+ `.md` atualmente em `docs/front/` (agora versionados) em `docs/plans/inventario.md`.
- Decidir para cada um: `docs/decisions/adr/`, `docs/specs/`, `docs/product/` ou `archive/`.
- Um commit por lote temático (ex.: todos os `CORRECAO_*` viram ADRs retroativos em um PR).

### Onda R-2 — PRD retroativo (`/consultor-prd` modo retroativo)
- Gera `docs/product/PRD.md` curto e honesto, reconhecendo o que já foi construído.
- Inclui seção **Restrições de produção** (tabelas intocáveis, endpoints legados).

### Onda R-3 — SPEC retroativo (`/SDD-avancado` modo retroativo)
- Extrai RFs a partir dos módulos existentes (clientes, vendas, comissões, ERP, conta corrente).
- Anti-SPEC crítica: "não mexemos na tabela X", "não alteramos rota legada Y".
- ADRs retroativos para decisões passadas relevantes (Postgres+Supabase, React+Vite, Tiny, etc.).

### Onda R-4 — Migrar `src/types/` para Zod em `packages/shared/types/`
- Conversão gradual, feature por feature (não big-bang).
- `CONTRACTS.md` passa a espelhar automaticamente.

### Onda R-5 — Introduzir suíte de testes
- Vitest + @testing-library/react para frontend.
- Supertest contra Edge Functions (pode ser em Deno test runner).
- Começar cobertura pelas funções críticas: `tinyERPSync.ts`, `erpAutoSendService.ts`, `clientRiskService.ts`.

---

## 4. Débito técnico identificado

- **`docs/front/` com 120+ arquivos** (CORRECAO_*, TESTE_*, CHANGELOG_*). Tratar em R-1.
- **Imports versionados** no código (`date-fns@4.1.0`, `sonner@2.0.3`, `next-themes@0.4.6`) — não-convencional, quebra typecheck estrito.
- **`App.tsx` com ~45 KB + roteamento manual** por `useState<Page>`. Candidato a React Router — onda dedicada, não oportunista.
- **Mocks convivendo com real:** `src/data/mock*.ts` + `src/services/*.ts`. Plano: deprecate mocks por módulo, à medida que features novas tocam cada módulo.
- **Numeração de migrations com gaps** (031–040, 046–066, 079–080, 092–094, 096–097). Nada a fazer — aceitar como histórico; seguir próxima sequência livre.
- **`_shared` duplicado** em `supabase/functions/` (pasta + arquivo `_shared_helpers.ts`). Consolidar na próxima feature que tocar Edge Functions.
- **`vite-env.d.ts` duplicado** (raiz + `src/`). Resolver junto com próxima feature de frontend.
- **Arquivos soltos na raiz** (`check_braces.js`, `DEPLOY_PRODUTOS_V2.md`, `NETLIFY_DEPLOY.md`). Mover em R-1.
- **Branches `main` e `master` convivendo.** Master está desatualizada; deletar em commit próprio após validação.
- **Sem lint configurado.** Adicionar ESLint + Prettier em onda dedicada (estimativa: 30 min).
- **Sem testes.** Tratado em R-5.
- **Token MCP Supabase hardcoded em `.cursor/MCP.json`** — decisão consciente do dev em manter; arquivo protegido pelo `.gitignore` (case-insensitive agora). Não expor em docs/ADRs públicos.

---

## 5. Bugs abertos

_Nenhum registrado aqui. Quando aparecer, usar formato:_

```
### 🐛 BUG-NNN · <título>
- Reprodução: ...
- Impacto: ...
- Área: <módulo>
- Workaround atual: ...
```

---

## 6. Concluído (referência — últimos 10 commits do git log)

| # | Feature / Commit | SHA | Data |
|---|---|---|---|
| — | fix: destaque do e-mail de comissões + flash de 10 clientes no dashboard | `ccaa811` | (pré-harness) |
| — | feat: enviar PDF como anexo no email de comissões (V 1.18) | `50212af` | (pré-harness) |
| — | fix: endereço/contato no PUT de `clientes-v2` | `217169d` | (pré-harness) |
| — | fix: persistência do vendedor atribuído na edição de clientes | `09748ec` | (pré-harness) |
| — | v1.17: Bloquear edição pós-envio, fix comissões, notificações | `f01d4c1` | (pré-harness) |
| — | Avisos de config ERP no formulário + ícone erro com tooltip | `d6fe4f4` | (pré-harness, branch master) |
| — | Fix envio ao ERP: usar ID do banco em vez de UUID do frontend | `4b7621d` | (pré-harness, branch master) |

_Histórico pré-Harness está no `git log`, não será duplicado aqui._

---

*Fim do TODO. Mantenha curto, honesto, e atualize todo dia.*
