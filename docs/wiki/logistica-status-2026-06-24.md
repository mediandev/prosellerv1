# Logística + Revisão Geral — Status e Handoff (2026-06-24)

> Consolidação do que foi **criado/corrigido**, status dos **bugs do documento de revisão**
> (`2026.06.18_PROSELLER_REVISÃO GERAL.docx`), **decisões do cliente** e **próximos passos**.
> Projeto Supabase: `xxoiqfraeolsqsmsheue`. Branch de produção: **`main`** (Netlify).

---

## 1. O que foi feito nesta rodada (Logística)

### 1.1 Integração Tiny → frete (NF-e)
- **Bug corrigido:** o webhook de nota (`webhook-tiny-atualizacao`) casava a NF-e ao frete por `idPedidoEcommerce`, que vem **vazio** nos pedidos criados pela nossa integração (não-ecommerce) → **0/89 fretes** recebiam nota.
- **Correção:** quando `idPedidoEcommerce` falta, resolve o vínculo via `idNotaFiscalTiny → nota.fiscal.obter → id_venda` (= nosso `id_tiny`), testando a chave da empresa do CNPJ do payload. Reaproveita a nota carregada no enriquecimento.
- **Deploy:** `webhook-tiny-atualizacao` **v31** em prod, `--no-verify-jwt` preservado. Commit `c31f802` no `main`. Backup em `docs/plans/backups/webhook-tiny-atualizacao_2026-06-23_index.ts.bak`.

### 1.2 Backfill das notas existentes
- Script `docs/plans/backfill_notas_tiny.py` (dry-run + `--apply`).
- **88 notas reais** importadas do Tiny (número, chave, peso, volumes). 1 frete sem nota (pedido "Em aberto"). Visível em **Logística → Busca**.

### 1.3 Rastreio SSW (validado, ainda não ligado em prod)
- API pública `https://ssw.inf.br/api/trackingdanfe` (POST `{chave_nfe}`), sem credencial; usa a **chave da NF-e**.
- Integração já existe (`ssw-tracking-v1`, `frete-logistica-v1?action=get_with_ocorrencias`, mapeamento de ocorrência→status, polling **on-demand** por ADR-008). Gate: `FEATURE_LOG_CRM_SSW` (OFF em prod).
- **Cobertura medida** (`docs/plans/ssw_coverage_probe.py`): só transportadoras na rede SSW. Resultado: **37/89** fretes com rastreio → se aplicado, Dashboard mostraria **9 Em Trânsito / 28 Entregue**.

### 1.4 Transportadoras (cadastro + vínculo)
- 6 transportadoras cadastradas (global, não por empresa): **Transclima, Ativa (2 CNPJs), Tecmar, Favorita, Grativol**.
- Script `docs/plans/link_transportadoras.py`: **88 fretes** vinculados por CNPJ. "Transp. não definido" eliminado na Busca.
- **Distribuição:** Transclima 50 · Ativa 33 · Tecmar 3 · Favorita 2 · (sem transp.) 3.
- **SSW por transportadora:** Ativa + Favorita = SSW (35 fretes); Transclima + Tecmar = sem SSW (53) → fluxo manual / "link aberto".

### 1.5 Infra/Git
- **Causa raiz da confusão recorrente "main vs master" resolvida:** o refspec do clone só rastreava `master`. Corrigido para `+refs/heads/*:refs/remotes/origin/*`. `origin/main` sincronizado (`c31f802`). Ver memória `git-branch-main-vs-master`.

---

## 2. Status dos bugs do documento de revisão (2026-06-18)

| # | Item (DOCX) | Status |
|---|---|---|
| Produtos | Imagens não aparecem | ✅ **V1.65** — lazy-load sob demanda (PR #71) |
| ABC Clientes | Filtro status "pendentes" | ✅ já existia (Todas/Concluídas/Pendentes) |
| Naturezas | Descrição não salva | ✅ já resolvido (testado: persiste) |
| ABC Clientes | Agrupar Grupo/Rede + pluralização | ✅ V1.63/V1.64 |
| ABC Clientes | Filtro Grupo/Rede buscável | ✅ V1.63 |
| ABC Clientes | "Cliente Desconhecido" + Grupo/CNPJ/UF | ✅ |
| ABC Produtos / Mix / ROI | Não funcionavam | ✅ V1.62 (auth Supabase) |
| Clientes em Risco | Inativos mostrava só 3 | ✅ carrega todos |
| Relatório de Vendas | Agrupamento Grupo/Rede | ✅ |
| Conta Corrente | Anexos não abriam | ✅ V1.61 |
| Conta Corrente | Data com "sobra" + ações no Visualizar | ✅ V1.64 |
| Condições pgto | Layout janela nova condição | ✅ V1.64 |
| Usuários | Badge Vendedor/Backoffice | ✅ V1.58 |
| ABC Clientes | Filtro Natureza (valor "bate"?) | 🔶 a validar com cliente |
| Clientes em Risco | Redução compras / promissores | 🔶 a validar |
| **Aba Mix** | Item vendido vira ativo no mix | ⏳ depende migration `status_mix` (137) NÃO aplicada |
| Aba Mix | Duplicados em "mostrar todos" + só revenda ativo | ⏳ pendente |
| Aba Mix | Data última compra + ícone p/ venda | ⏳ pendente |
| Conta Corrente | Anexo em **pagamentos** | ⏳ pendente |
| Conta Corrente | Melhorias visuais janelas | ⏳ pendente |
| Condições pgto | Nomes legados fora do padrão | ⏳ limpeza de dados |
| **Listas de Preço** | Import/export Excel | ⏳ feature grande |
| Geral | Padronizar seletor de período | ⏳ transversal |
| Geral | Importação dados anteriores | ⏳ (cliente: não precisa p/ logística) |
| Geral | Exportação completa | ⏳ |

---

## 3. Decisões do cliente (logística)

- **Emissão de nota:** só **DAP e CANTICO** (FLOWCODE é teste). Habilitar evento "notas fiscais autorizadas" no Tiny dessas 2 contas (webhook).
- **Transportadoras:** cadastro **global** (não por empresa). SSW: **Ativa, Favorita**. Sem SSW: Transclima, Tecmar, Grativol.
- **Status (Tiny→frete):** Enviado = Em Trânsito; Entregue = Entregue.
- **Dashboard/Torre:** mostrar **Em Separação, Em Trânsito, Aguardando Agendamento, Entregue**; cards **ordenados por tempo em trânsito (maior→menor)** com **realce de cor** por gravidade. Reentrega/Recusa/Devolução: **não** como card próprio — "em trânsito" com **ícone + filtro**.
- **Rastreio SSW:** deve atualizar **automaticamente** (afeta status na torre e no kanban).
- **SLA:** prazo = data de **coleta (romaneio)** × data de **entrega** (manual / link aberto / SSW).
- **Romaneio:** **PRIORIDADE / primeira etapa.** Hoje usam no Tiny; migrarão para o ProSeller. Gerar romaneio → frete vai para **"em trânsito"** + gera **data de coleta**.
- **Kanban + Busca:** querem usar (não usavam por causa da NF-e, agora resolvida — vão testar).
- **Frete manual (Novo Frete):** manter (uso raro).
- **Comprovante de entrega:** sim (anexar/visualizar).
- **Custo de frete (Q11):** ver §4. Transclima: **preenchimento manual por enquanto** (prioridade é rodar a logística).
- **Notificação cliente final (Q18):** e-mail automático, opt-in, por mudança de status. Evoluir p/ WhatsApp depois.
- **Permissões:** telas de logística **restritas**; vendedor vê a logística do **próprio pedido** (timeline na tela do pedido).
- **Fora de escopo:** cadastro de Regiões/Origens; importação de histórico.

---

## 4. Regras de negócio — custo de frete (Q11)

Dois modelos:
1. **Cotação:** valor negociado previamente → **informar manualmente** o valor da cotação no frete.
2. **Transclima (% sobre valor da NF conforme rapidez):**
   - Faixas por rapidez (percentuais a confirmar com Vinicyus Baumgratz).
   - **Exceção interior:** até 4 dias permanece na **primeira faixa (5,5%)**.
   - **Agendadas:** sempre contam pela primeira faixa, mas o prazo é em relação ao **agendamento** (considera o dia em que o agendamento é feito — em geral mesmo dia da coleta ou seguinte), **independente de ser interior**.
- **Decisão atual:** preencher Transclima manualmente; conferência automática de fatura fica para depois.

---

## 5. Romaneio — pedidos do cliente (próxima etapa)

- 🐞 **Bug:** ao gerar romaneio **não aparece nenhuma nota/pedido** (a investigar).
- Melhoria: na escolha de transportador, **agrupar por grupo** (cada transportador tem vários CNPJs/filiais).
- Melhoria: **dropdown buscável/digitável** de transportador.
- Melhoria: **ajuste fino no input de data** do romaneio.
- Comportamento esperado: **gerar romaneio → frete "em trânsito"**; depois status atualiza automático (SSW) ou manual / via "link aberto" (agendado, entregue).

---

## 6. Próximos passos (ondas propostas)

1. **Romaneio (PRIORIDADE)** — corrigir "não mostra notas/pedidos"; agrupar transportador por grupo; dropdown buscável; input de data; gerar romaneio → "em trânsito" + data de coleta.
2. **SSW automático** — ligar `FEATURE_LOG_CRM_SSW`, agendador periódico; popular o painel.
3. **Dashboard reformulado** — buckets novos, ordenação por tempo em trânsito, realce por gravidade, ícone/filtro para reentrega/recusa/devolução.
4. **Link aberto ao transportador** (Transclima/Tecmar/Grativol) — agendamento + entrega; **SLA** (coleta × entrega).
5. **Comprovante de entrega** (anexo no frete).
6. **Notificação ao cliente final** (e-mail por status, opt-in).
7. **Permissões + timeline no pedido** (vendedor).
8. **Custo/conferência de fatura** (cotação manual; Transclima manual; automático depois).

---

## 7. PRs / deploy

- `c31f802` (webhook NF-e) — no `main` + **deployado** (v31).
- **PR #70** (V1.64) — merged.
- **PR #71** (V1.65 imagens) — aberto.
- Quick wins (transportadoras/backfill) — dados no banco; scripts em `docs/plans/`.

---

## 8. Como habilitar o webhook de NF-e no Tiny (resposta Q1)

Em **cada conta (DAP e CANTICO)**:
1. Menu → **Loja de extensões** → abrir **"Integração com API do ERP"** (ou WebHook).
2. Aba **Notificações**.
3. Marcar **"Receber notificações de notas fiscais autorizadas"** (manter a de pedidos).
4. URL (a mesma já usada para pedidos):
   `https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1/webhook-tiny-atualizacao`
5. Salvar. Teste: emitir/reemitir uma nota de pedido recente.
