# Context Pack — F-LOG-CRM · Migração módulo Logis (LogCRM Bubble → ProSeller V1)

> Memória sintetizada para próximo agente que retomar esta feature. Descartável após conclusão.
> Limite v3.2: 150 linhas.

**Estado atual (2026-05-27):** Ondas **R-LOG-1 (V 1.36) + R-LOG-2 (V 1.38) + R-LOG-4 (V 1.39) EM PRODUÇÃO**. **R-LOG-3 (V 1.41) implementada** — hook em `tiny-enviar-pedido-venda-v1` auto-cria `frete_logistica` após envio ao Tiny. Feature flag `FEATURE_LOG_CRM_AUTO_FRETE` separada (nasce OFF). Migration 121 (UNIQUE INDEX em `pedido_venda_id`). Helper `_shared/frete-auto-create.ts`. Aguardando: merge em `main`, migration 121 via cursor-brief Tarefa 11, deploy via CLI local. **Próxima onda recomendada:** R-LOG-5 (dashboard) ou R-LOG-6 (faturas).

---

## Origem

Sistema **LogCRM** em Bubble (`https://logcrm.bubbleapps.io`) usado pela Cântico Distribuidora hoje. Credenciais de discovery: `valentim@cantico.com.br / 654321`. Plataforma multiempresa coincidente com ProSeller (VK / Tudo / **Cântico** / DAP). Cliente quer migrar módulo por módulo, sem perder o que funciona.

Discovery rodada via Playwright em 2026-05-20. Screenshots em `archive/screenshots/2026-05-20-logcrm/` (12 arquivos).

---

## 5 telas observadas no Bubble (módulo Logis)

1. **Dashboard `/logis_dashboard`** — 5 cards de status (Em Trânsito, Reentrega, Agendados, Devoluções em Trânsito, Recusadas) + 3 KPIs (Média Cotações, Custo Logístico %, Tempo Médio Entrega). Print: Notas R$ 9.482.762,88 · Cotações R$ 576.725,91 · 5,89% em 13–20/05/2026.
2. **Busca `/logis_busca`** — Lista paginada de fretes (cliente, transportadora, status interno, status SSW, data saída, NF) + filtros colapsáveis. Ações: excluir, visualizar, editar.
3. **Novo Frete `/logis_nova-nfe`** — Formulário detalhado: Nº NFe, data emissão, valor produtos, cliente, vendedor, transportador, volumes, expedição, embarcador, origem (4 opções), região destino (19 opções), datas (saída/previsão/entrega), valor cotação, rateio, reentrega, status entrega (9 valores), upload DACTE + comprovante, observações.
4. **Faturas `/logis_faturas-listar` + `/logis_incluir-fatura/<id>`** — Lista + detalhe com itens (NFe, destinatário, valor mercad., emissão, CT-e/RPS/NFS-e, peso, valor frete). Rótulos "Automático..." sugerem parser PDF/EDI.
5. **Auditoria `/adm_auditoria-fretes`** — Comparação `valor_cotacao` × `valor_cobrado` com sinalizador azul/verde/vermelho. Print do cliente.

## ENUMs observados

- **Status Entrega (9):** Em Separação, Aguardando Coleta, Em Trânsito, Em Trânsito - Reentrega, Entregue, Agendado, Recusado, Devolvido - Trânsito, Devolvido - Entregue.
- **Códigos SSW vistos:** 01 (Entregue), 02 (Aguard. agendamento), 67, 71, 80.
- **Grupos transportador:** ATIVA, BRASSPRESS, TA-AMERICANA, CAMILO DOS SANTOS.

## Integrações externas

- **SSW Tracking — CONFIRMADO PÚBLICO, SEM AUTH** (2026-05-20, doc oficial `ssw.inf.br/ajuda/trackingdanfe.html` + curl real). Endpoint `POST https://ssw.inf.br/api/trackingdanfe`. Body: `{"chave_nfe": "<44 dígitos>"}`. Content-Type `application/json` → resposta JSON; `application/x-www-form-urlencoded` → resposta XML. **Sem autenticação** (`Authentication: None or self-handled` no API connector do Bubble — confirmado por Valentim 2026-05-20 com print do API Connector). Rate limit oficial: **20 req/s** ("Todas as chamadas para APIs e Webservices tem um limite de 20 requisições por segundo"). Schema resposta: `{success: bool, message: string, ...}`. Erros mapeados: `"Chave da DANFE deve possuir 44 digitos."` / `"Chave da DANFE invalida."` / `"Nenhum documento localizado"` / `"Method not allowed"`. Falta apenas confirmar campos extras do `success=true` com chave NFe ativa (pendente Valentim, sem urgência).
- **Webservices SSW para Embarcadores** (descobertas bônus 2026-05-20, podem substituir parcial ou totalmente o parser PDF/EDI em R-LOG-7):
  - `webserviceXmlCteBase64.html` — SSW envia XML do CT-e ao Embarcador.
  - `webservicesEnvioFatura.html` / `…Liquidadas.html` / `…Cancelada.html` — SSW envia eventos de fatura emitida/paga/cancelada estruturados.
  - `notfis.html` — padrão EDI NF.
- **Parser PDF/EDI** das faturas — implementação fechada do Bubble. **Pode não ser necessário** se os webservices acima cobrirem o caso. Reavaliar em ADR-007.

---

## Modelo de dados (migration 119 — proposto)

7 tabelas + 4 ENUMs:
- `transportador_logistica` (razão_social, cnpj, nome_fantasia, IE, UF, email, telefone, grupo enum, ssw_dominio).
- `regiao_destino` (lookup: nome, uf).
- `origem_frete` (lookup: nome, uf, empresa_id).
- `frete_logistica` (NFe, cliente_id, empresa_id, vendedor_id→`user`, transportador_id, regiao_destino_id, origem_frete_id, datas, valores, status_entrega, rateio, reentrega, DACTE, comprovante; `pedido_venda_id` NULLABLE).
- `frete_logistica_ocorrencia` (frete_id, código SSW, tipo, data/hora, descrição, raw_payload jsonb).
- `fatura_transportadora` (transportador, empresa, número, valores, status enum, arquivo_url).
- `fatura_transportadora_item` (fatura_id, frete_id NULLABLE, CTe, valor mercadoria, peso, valor frete cobrado).

RLS tenant-scoped por `empresa_id` (replica padrão de `cliente`/`pedido_venda`).

---

## Plano em 8 ondas (esqueletos em `docs/plans/feature-contracts/F-LOG-{1..8}.md`)

| Onda | Nome | Classe | CI | Status |
|---|---|---|---|---|
| **R-LOG-1** | Schema base + cadastros lookup + Novo Frete manual | **B** | N1+matriz | **EM PRODUÇÃO desde 2026-05-21 com flag LIGADA (V 1.36).** |
| **R-LOG-2** | Torre Controle + Busca + Detalhe + bloco Entrega no Pedido | **B** | N1+matriz | **IMPLEMENTADA (V 1.38, branch `feat/log-crm-R-LOG-2`)** — aguardando push/deploy autorizado pelo humano. |
| **R-LOG-3** | Hook em tiny-enviar-pedido-venda-v1 (auto-cria frete) | **C** | N2 | **IMPLEMENTADA (V 1.41)** — aguardando merge + migration 121 + deploy (cursor-brief Tarefa 11). Flag `FEATURE_LOG_CRM_AUTO_FRETE` nasce OFF. |
| **R-LOG-4** | Integração SSW Tracking | **D** | N3 | **EM PRODUÇÃO (V 1.39)** — SSW Tracking on-demand com cache 30 min (ADR-008). |
| R-LOG-5 | Indicadores financeiros do Dashboard | B | N1+matriz | backlog — adiado por decisão Valentim 2026-05-21 (urgência é trazer o que tem para desligar Bubble em 1ºJun) |
| R-LOG-6 | Faturas — CRUD manual | B | N1+matriz | backlog |
| R-LOG-7 | Parser PDF/EDI | **D** | N3 | backlog — ADR-007 antes; pode simplificar com WS SSW |
| R-LOG-8 | Auditoria Cotado × Cobrado | **C** | N2 | backlog |

---

## Decisões pendentes (registradas em DECISIONS_LOG)

- ~~**ADR-006**~~ — **CANCELADA 2026-05-20.** Validação direta com SSW: integração pública por chave NFe, sem autenticação por transportadora. Doc oficial `ssw.inf.br/ajuda/trackingdanfe.html` + curl real comprovaram. Coluna `transportador_logistica.ssw_dominio` permanece como informativa (filtro de dashboard), sem uso técnico.
- **ADR-007** — Parser PDF/EDI: próprio (`pdf-parse`) vs. serviço externo (Documind/Mindee) **vs. consumir webservices SSW para Embarcadores** (`webservicesEnvioFatura.html` etc — descoberta bônus). Aguardar 2-3 PDFs reais do Valentim para decidir.
- **ADR-008** — Polling SSW: cron Supabase vs. on-demand. Bubble parece on-demand (1 chamada/NFe ao listar). Com rate limit 20 req/s confirmado, on-demand + cache 30-60 min em `frete_logistica_ocorrencia` é viável.
- **ADR-009** — Fonte de `valor_cotacao`: manual (como Bubble) vs. integração tabela fretes Tiny. **MVP: manual.**

---

## Restrições para esta sessão (R-LOG-1)

**NÃO faço:**
- Aplicar migration em produção (fica no repo aguardando brief Tarefa 8 do cursor-brief).
- Deployar Edge Functions.
- Push automático.
- Implementar R-LOG-2..8.
- Mexer em `pedido_venda`, `clientes-v2`, `tiny-enviar-pedido-venda-v1` (R-LOG-3).
- Ativar `FEATURE_LOG_CRM=true` em qualquer ambiente.
- Bumpar para V 1.35.

**FAÇO:**
- Branch `feat/log-crm-R-LOG-1`.
- 8 Feature Contracts.
- Migration 119 + cursor-brief Tarefa 8.
- 4 schemas Zod.
- 4 Edge Functions (lendo `FEATURE_LOG_CRM`, default OFF → 503).
- 5 componentes React + service.
- Page `'logistica'` em App.tsx (backofficeOnly + flag).
- `vite-env.d.ts` adiciona `VITE_FEATURE_LOG_CRM`.
- 2 testes (unit Zod + integration Deno).
- Bump V 1.34.
- Wiki: log, modules/logistica, architecture.

---

## Smoke E2E manual pós-aplicação em staging (R-LOG-1)

1. Aplicar migration 119 via Cursor MCP em staging (cursor-brief Tarefa 8).
2. Confirmar `select count(*) from transportador_logistica, regiao_destino, origem_frete, frete_logistica, frete_logistica_ocorrencia, fatura_transportadora, fatura_transportadora_item;` → todas as 7 tabelas existem com 0 linhas.
3. Cadastrar 1 secret `FEATURE_LOG_CRM='true'` em staging.
4. Deployar as 4 Edge Functions via CLI.
5. UI staging com `VITE_FEATURE_LOG_CRM=true` (env Netlify preview): criar 1 transportador, 1 região, 1 origem, 1 frete manual.
6. Confirmar `select count(*) from frete_logistica` = 1 em staging.
7. Smoke OFF: setar flag para `'false'`, confirmar 503 em todas as 4 endpoints + UI mostra placeholder.

---

## Próximos passos concretos

- **Humano:** aplicar migration 119 via Cursor MCP (`apply_migration`, não `execute_sql` — runbook v3.2) em staging (cursor-brief Tarefa 8) → smoke 5 queries → deploy 4 Edge Functions via `npx supabase functions deploy` local (ADR-005 proíbe MCP `deploy_edge_function`) → smoke OPTIONS → janela 24-48h → repetir em prod com flag `false`.
- **Pendente Valentim (sem urgência):** 1 chave NFe ativa para confirmar campos extras do `success=true` da SSW (refinar schema Zod `OcorrenciaSSW`). 2-3 PDFs de fatura para ADR-007.
- **Próxima sessão de feature:** R-LOG-2 (Torre de Controle + Busca + Detalhe) — Feature Contract detalhado e branch nova. R-LOG-4 também destravada caso o Valentim demore com chave NFe (podemos usar chave de exemplo da doc para mock + Zod parcial).

---

## Handoff

- **Última ação (2026-05-20):** PR #22 mergeada em main com bump V 1.34 → V 1.36 (V 1.35 foi tomada por INC-016 enquanto a PR esperava). SSW endpoint validado público sem auth. Context Pack atualizado com achados.
- **O que NÃO fiz e o próximo deveria evitar:** aplicar migration 119 em qualquer ambiente (aguarda Tarefa 8 cursor-brief), deploy de Edge Functions, ativação de `FEATURE_LOG_CRM=true` em prod. **Não tocar** ADR-007/008/009 sem confirmação humana.
