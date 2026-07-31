# Registro de execução — Lote de ajustes (jul/2026)

> Registro vivo. Uma entrada por item: o que era, o que foi feito, como foi testado, resultado e rollback.
> Ciclo obrigatório por item: **fazer → testar no Playwright em prod → ajustar → finalizar → seguir**.

---

## ✅ Item 0 — Migration 140 · salvar cliente apagava campos

| | |
|---|---|
| **Problema** | UPSERT de `cliente_contato`/`cliente_endereço` usava `EXCLUDED.<col>` no fallback do COALESCE (= o próprio parâmetro vazio) em vez do valor existente → todo save apagava campos não reenviados, principalmente a observação de contato (info fiscal). |
| **Alcance** | 94 clientes desde 2026-03-20 (eram 89 em 25/06 — seguia sangrando). |
| **Correção** | 14 refs `EXCLUDED.<col>` → `cliente_contato.<col>` / `"cliente_endereço".<col>`. INSERT inalterado. Alinha ao padrão que os campos principais já usavam (`c.<col>`). |
| **Pré-check** | Hash SHA256 da função em prod idêntico ao backup (`66554ee1…`, 187 linhas) → ninguém havia alterado. |
| **Backup** | `docs/plans/backups/update_cliente_v2_PRE-140_2026-07-03.sql` |
| **Aplicado** | 2026-07-28 · verificado: `EXCLUDED` = 0 ocorrências |
| **Recuperação** | 121 campos restaurados do histórico (94 observações + 9 email + 5 telefone + 5 tel. adicional + 4 email_nf + 4 website). Verificado: **0 pendentes**. |
| **Teste na tela** | ✅ Playwright em prod: cliente 6157 (ORIGAMI) → Editar → Salvar. Observação, telefone, e-mail e rua **preservados**. |
| **Achado extra** | ⚠️ O teste expôs bug **pré-existente**: CEP perde o hífen e mantém o ponto (`13.345-400` → `13.345400`). 81 registros afetados. **Não causado pela 140** (linha idêntica antes/depois). Registrado como dúvida para o cliente decidir o formato. CEP do cliente de teste restaurado. |
| **Commit** | `df34dce` |
| **Rollback** | reaplicar o arquivo de backup |

---

## ✅ Item 1 — Migration 144 · comissão usa o flag da natureza

| | |
|---|---|
| **Problema** | `generate_vendedor_comissao` comparava o TEXTO `natureza_operacao = 'Bonificação'` — sensível a acento/maiúscula e ignorava outras naturezas marcadas como sem comissão. |
| **Decisão do cliente** | 2026-07-28: *"A operação é escolhida dentre as cadastradas… na configuração das naturezas existem 'gera receita?' e 'gera comissão?'"* → usar o flag `tem_comissao`. |
| **Correção** | Consulta `natureza_operacao.tem_comissao` pelo `natureza_id` do pedido. Fallback permissivo (natureza ausente ⇒ gera) preserva o comportamento atual. |
| **Impacto medido** | 541 pedidos ativos · apenas **2 mudam de critério** (9200 e 9221, "Remessa para troca") · **ambos sem comissão gerada** ⇒ nenhuma comissão existente afetada. |
| **Dry-run (revertido)** | ✅ Bonificação bloqueia · ✅ Venda gera · ✅ Remessa p/ troca bloqueia (correção) · ✅ pedido excluído continua bloqueado (fix 143 intacto) |
| **Backup** | `docs/plans/backups/generate_vendedor_comissao_PRE-144_2026-07-28.sql` |
| **Aplicado** | 2026-07-28 · pré-check OK (função inalterada) · verificado: usa `tem_comissao` = true, compara texto = false |
| **Ao vivo** | ✅ Bonificação → `natureza_sem_comissao` · ✅ Remessa p/ troca → `natureza_sem_comissao` · ✅ excluído → `pedido_deletado_sem_comissao` · 0 comissões indevidas criadas |
| **Teste na tela** | ✅ Playwright em prod: Comissões carrega normal, relatórios por período OK, sem erro |
| **Commit** | `4a2ab19` |
| **Rollback** | reaplicar `docs/plans/backups/generate_vendedor_comissao_PRE-144_2026-07-28.sql` |

---

## ✅ Item 2 — Estorno de comissão de pedido excluído · CONCLUÍDO (migration 147, 2026-07-31)

Decisões do cliente (2026-07-31): (a) sem período aberto → **mês corrente** · (b) período aberto → **apagar** · (c) restaurado → **não reverter**.
**Implementado:** trigger `trg_estorno_comissao_on_delete` (dispara na transição para excluído) + função `tg_estorno_comissao_pedido_excluido`. Período sem registro de fechamento = aberto (266 casos). Período fechado: linha do fechamento permanece + **débito** rastreável no período aberto mais recente (ou mês corrente). Valor R$0 fechado: sem débito (ruído).
**Validação:** dry-run 3/3 (aberto apaga · fechado débito 2026-06 · sem aberto débito mês corrente) + teste ao vivo revertido com o trigger real instalado. **Órfã legada limpa** (pedido 395, R$0) → 0 comissões órfãs no sistema.

*Apurado:* excluir pedido é soft delete puro e não toca comissão; triggers atuais só disparam em `valor_total` e status→`Faturado`; saldo = `saldo_anterior + comissão + créditos − débitos` ⇒ estorno é **débito**. Estrago atual irrelevante (1 comissão órfã de R$ 0,00). Desenho pronto: trigger em `deleted_at` → função de estorno.

---

## ✅ Item 3 — Data de entrega = data real da entrega (SSW)

| | |
|---|---|
| **Problema** | Ao fechar automaticamente como "Entregue", o sistema gravava a data do **último** evento da timeline — que pode ser administrativo e posterior (ex.: "ANEXADO COMPROVANTE (70)", dias depois) — em vez da data da entrega real. |
| **Decisão do cliente** | 2026-07-28: *"Sim"* (corrigir para a data da entrega). |
| **Correção** | `_shared/ssw-refresh.ts`: procura o evento que representa a entrega ("MERCADORIA ENTREGUE (01)", via `mapOcorrenciaToStatus`) e usa a data dele; fallback para o último evento se não encontrar. |
| **Impacto medido** | 66 fretes entregues · **2 com data divergente** (NF 6358: 3 dias de erro · NF 6359: 5 dias) · 64 já corretos. |
| **Validação** | ✅ `deno check` · ✅ 23 testes do resolver passando |
| **Backup** | `docs/plans/backups/ssw-refresh_PRE-dataentrega_2026-07-28.ts.bak` |
| **Deploy** | `frete-logistica-v1` + `ssw-sweep-v1` (2026-07-29) |
| **Correção dos dados** | Datas recalculadas a partir do evento registrado (não digitadas): 6358 → 15/06, 6359 → 18/06. **0 divergentes** restantes. |
| **Teste na tela** | ✅ Playwright: Logística carrega (Torre de Controle, Busca) · endpoint do detalhe confirma `dataEntrega` = data do evento de entrega em ambos os fretes |
| **Observação** | ⚠️ O filtro "Nº NFe" da tela de Busca **não estreitou** o resultado (continuou mostrando 236). Possível bug do filtro — anotado para investigar (não relacionado a este item). |

---

## ✅ Itens 4, 5, 6, 8, 9 — lote V 1.72 (commit `4824330`)

| Item | O que foi feito | Impacto medido / cuidado |
|---|---|---|
| **4 · Mix conta pedidos únicos** | `RelatorioMixCliente`: passa a contar pedidos **distintos** por produto (Set), em vez de 1 por linha de item. | Corrige inflação quando o produto repete no mesmo pedido. |
| **5 · Valor mínimo da condição** | `SaleFormPage`: bloqueia salvar quando o total do pedido < mínimo da condição, com aviso do quanto falta. | **Nenhuma das 35 condições tem mínimo hoje** ⇒ validação preventiva, 0 pedidos violando. |
| **6 · Cliente exige ≥1 condição** | `CustomerFormPage`: obrigatório **na criação**. | ⚠️ **Não** aplicado na edição de propósito: **254 dos 965** clientes não têm condição e ficariam travados. |
| **8 · Pagamento acima do compromisso** | Migration **145** remove o `RAISE EXCEPTION` da RPC + `RegistrarPagamentoDialog` pede confirmação mostrando o excedente. | Demais 8 validações da RPC preservadas. Backup: `create_pagamento_conta_corrente_v2_PRE-145_2026-07-29.sql`. |
| **9 · Filtro de produto** | `SolicitadoFaturadoReportPage`: filtro por descrição ou SKU. | Aditivo, sem efeito em dados. |

*Percalço registrado:* a 1ª versão da migration 145 falhou por sintaxe — a função é **uma linha só**, e o comentário `--` inseriu-se no meio dela comentando o resto. Corrigido com comentário de bloco `/* */`. **A função em prod não foi alterada na tentativa falha** (verificado).

---

## ⏸️ Itens 7 e 10 — adiados (efeito cascata / escopo grande)

- **7 · Forçar consulta do Simples** (cadastro + **todo** envio ao ERP): mexe no core da emissão e a ReceitaWS tem limite de **3 req/min** no tier público — forçar em toda emissão pode **travar envios**. Precisa de análise de rate limit/cache antes.
- **10 · Auditoria de ações sensíveis**: feature nova de porte (tabela + captura + tela). Escopo grande.

---

## 🧪 Teste na tela — V 1.72 (2026-07-29)

- ✅ **V 1.72 publicada** e confirmada no Sidebar.
- ✅ Telas carregam sem erro após as mudanças: Dashboards, Relatórios, **Mix de Produtos por Cliente**, Comissões, Logística, Clientes.
- ✅ Migration 145 verificada direto na RPC (excesso não bloqueia mais; 8 validações intactas).
- ⚠️ **Não validado numericamente na tela:** a contagem do Mix (item 4) exigiria um cliente com o mesmo produto repetido em linhas do mesmo pedido; a lógica foi validada por código/typecheck. O filtro de produto (item 9) fica no relatório Solicitado × Faturado, que **não aparece na tela de Relatórios** — acessar por outra rota para conferir.

---

## ✅ Achados — resolvidos em V 1.73 (commit `2f68286`)

1. **Filtro "Nº NFe" — CORRIGIDO.** Causa: a edge usava `nfe_numero::text` + `ilike`, que o PostgREST não interpreta como cast → Postgres respondia **500** ("operator does not exist: integer ~~*") e a tela engolia o erro mantendo a lista anterior (parecia "não filtrar"). Fix: busca **exata** pelo número (coluna é INTEGER); entrada não numérica → vazio explícito; label "contém"→"exato". **Invariante anti falso-sucesso no front:** em erro de busca, limpa a lista e mostra o erro (nunca exibe resultado antigo como novo). Backup: `frete-logistica-v1_PRE-filtronfe_2026-07-31.ts.bak`. Testado: backend 4/4 cenários (6359→1 · 999999→0 · "abc"→0 sem 500 · sem filtro→244) + tela em prod ("Mostrando 1 de 1", NFe 6359).
2. **Solicitado × Faturado fora do menu — É INTENCIONAL** (comentado no `ReportsPage` com nota: *"Problema: Relatório não exibe dados faturados corretamente"*). ⚠️ Consequência: o item 9 do lote (filtro por produto) está entregue **num relatório inacessível**. Virou decisão do cliente (nº 5 do consolidado).
3. **`tinyERPSync_temp.ts` — REMOVIDO.** Rascunho residual sem nenhum import; typecheck limpo (0 ocorrências).

---

## ✅ Consolidado — decisões do cliente (respondidas em 2026-07-31)

| # | Assunto | Decisão |
|---|---|---|
| 1 | **CEP** | Guardar **só números, preservando zeros à esquerda** (nunca converter para número). Exibir com **máscara ponto + hífen** (`13.345-400`). Normalizar a base. |
| 2 | **Condição de crédito** | **Deixar como está** (precaução). Nenhuma ação. |
| 3 | **Estorno de comissão** | (a) sem período aberto → **lançar no mês corrente** · (b) período aberto → **apagar** a comissão · (c) pedido restaurado → **não reverter** automaticamente. |
| 4 | **Clientes sem condição** | Exigir **só na criação** daqui em diante. **Não regularizar** os 254 (provavelmente inativos). Nenhuma ação extra. |
| 5 | **Solicitado × Faturado** | **Corrigir o cálculo e reativar** o relatório. |

### Fila de execução decorrente
- ✅ **A · CEP — CONCLUÍDO (V 1.74, commit `83420cf`, migration 146).** RPCs `create/update_cliente_v2` passam a guardar só dígitos (`regexp_replace('\D')` — antes só removia o hífen, origem do "13.345400"). Base normalizada: **936/936 endereços com 8 dígitos, 0 símbolos, 498 zeros à esquerda preservados** (coluna TEXT — nunca converter p/ número). Front: máscara `NN.NNN-NNN` na exibição/digitação (form principal + endereço de entrega). Compatível com a emissão (tiny-enviar já usa digitsOnly). Dry-run 4/4 + **teste na tela em prod**: exibe `13.345-400`, salva, banco mantém `13345400`, observação preservada (regra 140 intacta). Backups: `create/update_cliente_v2_PRE-146_2026-07-31.sql`.
- **B · Estorno de comissão** — trigger no soft delete + função (decisões a/b/c acima).
- **C · Solicitado × Faturado** — investigar por que "não exibe faturados corretamente", corrigir, reativar no menu.

---

## 🛡️ Estrutura anti-regressão — Camada 2: SENTINELA (migration 148, 2026-07-31)

| | |
|---|---|
| **O que é** | Verificação diária automática (pg_cron `sentinela-diaria`, 6h BRT) de **7 invariantes do contrato** direto no banco. Violações entram em `sentinela_alerta` (dedup por chave) e **auto-resolvem** quando a condição some. Alerta aberto = violação ativa agora. |
| **Regras** | 1· comissão de pedido excluído · 2· pedido "Em aberto/Enviado" sem ID Tiny · 3· frete com entrega registrada preso em status não-terminal · 4· CEP fora do padrão (dígitos, 8 posições) · 5· observação de contato apagada nas últimas 24h · 6· cliente novo sem condição de pagamento · 7· condição parcelada com nome divergente |
| **Baseline** | 7/7 regras com **ZERO** violações na ativação (sistema limpo) |
| **Dry-run** | Ciclo completo provado revertido: forjada violação de CEP → alerta criado com detalhe → consertada → **auto-resolvido** |
| **Consulta** | `select * from sentinela_alerta where resolvido_em is null;` |
| **Rollback** | `cron.unschedule('sentinela-diaria')` + drop function/table |

## ✅ Item B aplicado — estorno (147) confirmado em prod: trigger ativo, teste ao vivo revertido OK, 0 comissões órfãs.

## ⏳ Próximos
- **Camada 1:** testes automatizados das invariantes puras (expandir o padrão dos 23 testes do SSW).
- **C · Solicitado × Faturado:** investigar cálculo, corrigir, reativar no menu.
- 7 (Simples c/ cache) e 10 (auditoria) na sequência.

---

## 🔍 Achado da camada de testes (2026-07-31) — ENUM de status de frete divergente (efeito cascata, adiado)

A suíte expôs **migração pela metade** (intencional no front, nunca aplicada no banco): o front/zod trocou `Em Trânsito - Reentrega` por `Aguardando Agendamento` (changelog V1.5x), mas o **enum do banco** (`status_entrega_frete`) segue com Reentrega e **sem** Aguardando Agendamento.

**Consequências reais hoje:** arrastar um frete para a coluna "Aguardando Agendamento" do Kanban é **rejeitado pelo banco**; o resolver SSW ainda pode gravar "Em Trânsito - Reentrega", que o front não sabe exibir (0 fretes nesses status no momento).

**Correção completa (adiada por cascata):** `ALTER TYPE ... ADD VALUE 'Aguardando Agendamento'` + decidir destino de Reentrega no resolver/buckets + alinhar zod/Kanban/badge. Requer decisão: manter os dois status ou concluir a troca?
