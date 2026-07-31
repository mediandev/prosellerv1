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

## ⏸️ Item 2 — Estorno de comissão de pedido excluído · INVESTIGADO, aguardando decisão

Investigação completa em 2026-07-28. **Não implementado** — 3 pontos precisam de decisão do cliente (registrados em `docs/specs/business-rules/comissao.md`):
1. Vendedor **sem período aberto** (3 casos em prod): lançar no mês corrente ou criar o período?
2. Período ainda **aberto**: apagar a linha de comissão ou manter zerada?
3. Pedido **restaurado**: reverter o estorno automaticamente?

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

## 🔍 Achados a investigar (fora do lote)

1. **Filtro "Nº NFe" da Busca de Fretes não filtra** — continuou exibindo todos os 236 registros.
2. **Solicitado × Faturado não listado** na tela de Relatórios — verificar se está acessível ao usuário.
3. **`src/services/tinyERPSync_temp.ts` tem erro de sintaxe** (pré-existente, aparece no typecheck) — arquivo `_temp`, provável resíduo a remover.

---

## ❓ Consolidado — aguardando decisão do cliente

| # | Assunto | Pergunta |
|---|---|---|
| 1 | **CEP** | Guardar só dígitos (`13345400`) ou com máscara (`13.345-400`)? 81 registros a normalizar. |
| 2 | **Condição de crédito** | Campo salvo mas não usado em lugar nenhum; o cliente não o conhece — remover da tela? |
| 3 | **Estorno de comissão** | (a) vendedor sem período aberto: lançar no mês corrente ou criar período? (b) período aberto: apagar a linha ou manter zerada? (c) pedido restaurado: reverter o estorno? |

## ❓ Aguardando decisão do cliente
- **Formato do CEP:** só dígitos (`13345400`) ou com máscara (`13.345-400`)? 81 registros a normalizar.
- **Campo "condição de crédito":** o cliente não conhece; é salvo mas não usado em lugar nenhum — remover da tela?
