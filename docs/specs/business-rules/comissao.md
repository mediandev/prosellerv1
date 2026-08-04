# Comissão

## Regras de negócio

1. **Pedidos bonificados não geram comissão.** Quando `pedido_venda.natureza_operacao = 'Bonificação'`, `generate_vendedor_comissao` interrompe e retorna status `'bonificacao_sem_comissao'`.
   - *Por quê:* Bonificações são operações de cortesia ou promoção, não representam venda real, então não devem comissionar o vendedor.
   - *Regressão:* Um pedido com `natureza_operacao = 'Bonificação'` gera comissão em `vendedor_comissao`.
   - *Nota (verificação):* A comparação é **case-sensitive e sensível a acento** (migration 143, linha 57: `if v_pedido.natureza_operacao = 'Bonificação'`, sem `LOWER()` nem transliteração). Variações como `'bonificação'` ou `'BONIFICACAO'` contornam a regra. Ver Dúvida 6.

2. **Pedidos excluídos (soft-delete) não geram comissão.** Quando `pedido_venda.deleted_at IS NOT NULL`, `generate_vendedor_comissao` interrompe e retorna `'pedido_deletado_sem_comissao'` (migration 143, linhas 43-46).
   - *Por quê:* Pedido deletado deixou de ser válido para comissionar; evita pagar comissão sobre transações canceladas.
   - *Regressão:* Um pedido com `deleted_at != NULL` gera comissão em `vendedor_comissao`.
   - *Nota (verificação):* Isto impede **criar** comissão nova em pedido já deletado, mas **não reverte** comissões já existentes (ver Regra 11).

3. **Toda comissão deve ter um vendedor associado.** Uma comissão sem `vendedor_uuid` (ou com `pedido_venda.vendedor_uuid` NULL quando a comissão deveria ser gerada) é órfã.
   - *Por quê:* Comissão sem vendedor não pode ser paga nem rastreada; invalida o fluxo de pagamento.
   - *Regressão:* Uma comissão é criada sem `vendedor_uuid`.

4. **Comissão é calculada por faixa de desconto do cliente (Tipo 1) ou alíquota fixa (Tipo 2).** O campo `Comissão` do vendedor define o modelo; valores diferentes de 1 e 2 lançam exceção `'Tipo de comissão inválido'`.
   - *Por quê:* Dois modelos coexistem: clientes premium (desconto variável) pagam comissão por tabela; outros vendedores recebem percentual fixo.
   - *Regressão:* Um vendedor com `Comissão != 1` e `!= 2` gera comissão sem que o sistema lance exceção.

5. **Tipo 1 (por lista): a comissão é buscada em `listas_preco_comissionamento` pela faixa onde `desconto_minimo <= desconto_cliente <= desconto_maximo`.** Quando nenhuma faixa encaixa, o percentual é definido como 0 (migration 143, linhas 94-96: `if v_percentual is null then v_percentual := 0; end if;`).
   - *Por quê:* Permite estruturar incentivos alinhando o interesse do vendedor com a margem.
   - *Regressão:* Desconto do cliente encaixa em uma faixa mas a comissão sai como 0, ou encaixa em faixa errada.
   - *Nota (verificação):* Corrigida a redação original. Percentual = 0 quando não há faixa **não é falha silenciosa**, é o comportamento esperado. Só há degradação problemática quando o motivo do "nenhum match" é dado ausente (lista NULL) — ver Regra 6 e Dúvida 5.

6. **Tipo 1: cliente é obrigatório; lista de preço ausente resulta em percentual 0.** Se o cliente não existir, `generate_vendedor_comissao` lança exceção (migration 143, linhas 76-84). Se `lista_preco_id` do cliente for NULL ou não houver faixas, o percentual resolve para 0 (degradação graceful, sem bloquear o pedido).
   - *Por quê:* Cliente é FK obrigatória; lista ausente não deve bloquear o faturamento.
   - *Regressão:* Cliente inexistente não gera exceção; ou lista ausente bloqueia o pedido em vez de comissionar 0.

7. **Tipo 2: comissão = `aliquotafixa` do vendedor; se NULL, defaulta para 0.**
   - *Por quê:* Modelo simples para vendedores com taxa fixa independente do cliente; NULL é tratado como sem direito a comissão.
   - *Regressão:* Vendedor Tipo 2 com `aliquotafixa = NULL` tem comissão calculada como percentual não-zero.

8. **Valor da comissão = `ROUND(valor_total * percentual / 100, 2)`.** (migration 143, linha 104: `v_valor_comissao := round((v_pedido.valor_total::numeric * v_percentual / 100), 2)`).
   - *Por quê:* Precisão monetária em duas casas (centavos) para pagamento e auditoria.
   - *Regressão:* O valor é arredondado com 3+ casas ou truncado, acumulando divergências centavo a centavo.

9. **Quando o pedido é faturado (`status = 'Faturado'`), a comissão é gerada automaticamente.**
   - *Por quê:* Faturamento é o marco de realização da venda, momento em que nasce o direito à comissão.
   - *Regressão:* Pedido muda para `'Faturado'` mas a comissão não aparece em `vendedor_comissao`.

10. **Quando `valor_total` do pedido é alterado para valor > 0, a comissão é recalculada.**
    - *Por quê:* Mudanças no valor da venda devem refletir na comissão em tempo real para manter a auditoria correta.
    - *Regressão:* `valor_total` muda de 100 para 200 mas `valor_comissao` continua calculado sobre 100.

11. **Não há mecanismo automático de reversão/cancelamento de comissão quando `valor_total` vai para 0 ou o pedido é deletado.** A migration 143 impede **criar** comissão nova em pedido já deletado, mas não existe trigger, `ON DELETE CASCADE` ou RPC que **delete ou reverta** comissões já criadas.
    - *Por quê:* Desvio de design conhecido: o sistema registra comissão no lançamento mas não a reversa se o pedido cai.
    - *Regressão:* Pedido é deletado mas a comissão permanece em `vendedor_comissao` com o valor original. (Comportamento **confirmado** pela verificação — este é o estado atual, não um bug corrigível apenas por documentação.)

12. **Quando múltiplas faixas de desconto encaixam, a primeira por `ORDER BY desconto_minimo ASC, id ASC` é usada** (migration 143, linha 91).
    - *Por quê:* Desambiguação determinística: mesmo cenário sempre produz o mesmo cálculo.
    - *Regressão:* O `ORDER BY` é alterado para DESC, ou `id` é removido do critério, mudando comissões entre clientes.

13. **`desconto_minimo <= desconto_maximo` em `listas_preco_comissionamento` (constraint CHECK).**
    - *Por quê:* Valida integridade da faixa; evita faixas invertidas com comportamento imprevisível.
    - *Regressão:* A constraint é removida e faixas com `min > max` são inseridas, causando comissões erráticas.

14. **Período tem formato `YYYY-MM` (ex.: `'2025-10'`) armazenado como TEXT.**
    - *Por quê:* Padrão consistente para filtros e agrupamentos.
    - *Regressão:* Formato muda para `YYYYMM` ou `YYYY/MM` e queries que filtram por `periodo` quebram silenciosamente.
    - *Nota (verificação):* Só o formato **mensal** é implementado. O suporte a período anual (`'2025'`) aparece nos tipos TypeScript mas **não existe** no banco nem nas queries — ver Dúvida 14.

15. **Período de um vendedor é único por mês (`UNIQUE controle_comissao_periodo(vendedor_uuid, periodo)`)** (migration 083, linha 114).
    - *Por quê:* Cada vendedor tem no máximo um registro de controle por período.
    - *Regressão:* A constraint é removida e múltiplos registros por período causam ambiguidade em saldo e status.
    - *Nota (verificação):* Esta constraint **não** impede múltiplos períodos com status `'aberto'` (períodos diferentes) — ver Regra 16 abaixo / Dúvida 3 [RESPONDIDA].

16. **Status de período é um de: `'aberto'`, `'fechado'`, `'pago'` (constraint CHECK).** Não há limite para quantos períodos `'aberto'` um vendedor pode ter ao mesmo tempo.
    - *Por quê:* Estados bem definidos controlam transições e impedem estados inválidos que quebrariam relatórios.
    - *Regressão:* Status muda para valor inválido (ex.: `'aguardando'`) e a constraint falha; ou, se removida, inconsistências propagam.
    - *Nota (verificação):* O status `'pago'` é **lido** em relatórios mas **nunca escrito** por nenhuma função — ver Dúvida 1/12.

17. **Não é possível adicionar lançamentos manuais via RPC em período com status `'fechado'` ou `'pago'`.** `create_lancamento_comissao_v2` valida o status (migration 084, linhas 118-124).
    - *Por quê:* Período fechado é imutável para auditoria; pagamento liquidado não admite lançamento retroativo.
    - *Regressão:* A RPC passa a permitir inserção em período fechado (validação removida ou `status = NULL`).
    - *Nota (verificação):* Esta proteção é **contornável** pelos endpoints PUT/DELETE de `comissoes-v2`, que operam direto na tabela sem passar pela RPC — ver Dúvida 4 [RESPONDIDA] e Regra 21.

18. **Saldo final = `saldo_anterior + total_comissao + total_creditos - total_debitos - total_pagos`.**
    - *Por quê:* Fórmula contábil: saldo anterior carregado, somado de créditos da venda, deduzido de débitos e pagamentos realizados.
    - *Regressão:* O operador de débito muda para `+` e saldos crescem em vez de diminuir com devoluções.

19. **Novo período herda `saldo_anterior = saldo_final` do período anterior.**
    - *Por quê:* Carryover de saldo; o acúmulo entre períodos reflete débito/crédito contínuo do vendedor.
    - *Regressão:* A herança não acontece, `saldo_anterior` do novo período fica 0 e o histórico acumulado é perdido.

20. **Preview de comissões exclui pedidos que já têm comissão gerada (`NOT EXISTS vendedor_comissao`).**
    - *Por quê:* Evita contar comissões duas vezes; o preview mostra oportunidades futuras, não passadas.
    - *Regressão:* O check `NOT EXISTS` é removido e o preview lista comissões já geradas, confundindo o usuário com duplicatas.

21. **Backoffice é o único que pode criar, editar, deletar lançamentos e pagamentos e fechar períodos.**
    - *Por quê:* Segregação de dever: vendedor vê sua comissão, backoffice gerencia; previne manipulação pelo vendedor.
    - *Regressão:* O role check é removido em endpoints POST/PUT/DELETE e o vendedor cria lançamentos próprios fictícios.

22. **Vendedor vê apenas suas próprias comissões via RLS; backoffice vê todas.**
    - *Por quê:* Isolamento de dados: um vendedor não acessa comissão de colega; backoffice tem visão completa.
    - *Regressão:* A policy RLS é desabilitada ou o filtro removido e o vendedor lê comissões de colegas.
    - *Nota (verificação):* A migration 143 (INSERT em `vendedor_comissao`) **não especifica** a policy RLS de leitura por vendedor; o escopo exato precisa ser confirmado — ver "Nova dúvida 6".

23. **`oc_cliente` (ordem de compra) e `cliente_nome` são gravados (desnormalizados) em cada comissão** (migration 143, linhas 139-140).
    - *Por quê:* Auditoria: o relatório mostra OC e cliente mesmo se forem deletados depois.
    - *Regressão:* Os campos não são populados e o relatório fica em branco para OC e Cliente (como no bug de abr/2026).

24. **Comissão é gerada como INSERT (nova) ou UPDATE (pedido já tem comissão)** (migration 143, linhas 113-123).
    - *Por quê:* Idempotência: múltiplas chamadas de `generate_vendedor_comissao` não criam duplicatas, atualizam a existente.
    - *Regressão:* A lógica de idempotência é removida e a mesma comissão é inserida várias vezes.

### Regra removida

- **~~Faixa de desconto com (min=0, max=0, comissao=0) é automaticamente deletada após INSERT~~** — **REFUTADA pela verificação.** Não existe trigger de autolimpeza. O código apenas **lê e filtra** essas faixas no cálculo; nenhum mecanismo as remove da tabela. A regressão descrita (faixa de zeros absorve `desconto=0` como primeiro match e zera comissões) é um risco **real** justamente porque a limpeza automática não existe — depende de as faixas de zeros não serem inseridas / serem removidas manualmente.

---

## Dúvidas em aberto

As dúvidas abaixo que já têm resposta no código estão marcadas **[RESPONDIDA]**. As sem resposta clara precisam de decisão do cliente ou verificação em ambiente.

1. **Transição `'fechado'` → `'pago'`: é automática (quando `total_pagos >= saldo_final`) ou manual?** — *Resolver via cliente.*
   [RESPONDIDA parcialmente pelo código] `fechar_periodo_comissao_v2` só grava `'fechado'` (migration 084, comentário "Por enquanto apenas registra o pagamento"). O status `'pago'` é **lido** em relatório mas **nunca escrito**. Processo incompleto: falta definir com o cliente o critério e implementar a transição.

2. **Comissão de pedido soft-deletado permanece órfã ou é removida?** — *Resolver via código.*
   [RESPONDIDA] Permanece órfã. A migration 143 impede criar comissão em pedido deletado, mas não há trigger/`ON DELETE CASCADE` que remova comissões já existentes. Ver Regra 11.

3. **Um vendedor pode ter múltiplos períodos `'aberto'` simultaneamente?** — *Resolver via Playwright/código.*
   [RESPONDIDA] Sim. `UNIQUE(vendedor_uuid, periodo)` só impede dois registros do **mesmo** período; `2026-01` e `2026-02` podem estar `'aberto'` ao mesmo tempo. Ver Regra 16.

4. **PUT/DELETE de lançamentos e pagamentos em `comissoes-v2` validam se o período está `'fechado'`/`'pago'`?** — *Resolver via código.*
   [RESPONDIDA] **Não — vulnerabilidade confirmada.** Os endpoints PUT (linhas ~204-237) e DELETE de `comissoes-v2/index.ts` chamam `.update()`/`.delete()` direto na tabela, sem passar pela RPC `create_lancamento_comissao_v2`, contornando a validação de período. Requer decisão: replicar a validação nos endpoints.

5. **Se `cliente.lista_de_preco` ficar NULL após a comissão já ter sido gerada (Tipo 1), a comissão recalcula para 0 na próxima alteração do pedido?** — *Resolver via código.*
   [RESPONDIDA] Sim, silenciosamente. `generate_vendedor_comissao` faz UPDATE quando a comissão já existe; com lista NULL nenhuma faixa encaixa, percentual = 0, e a comissão preexistente é **sobrescrita para 0** sem erro. Comportamento a validar com o cliente se é desejável.

6. **A verificação de `natureza_operacao = 'Bonificação'` é case-sensitive? Variações contornam a regra?** — *Resolver via cliente.*
   [RESPONDIDA no código, decisão pendente com cliente] É comparação exata (sem `LOWER()`/transliteração). `'bonificação'` ou `'BONIFICACAO'` **geram comissão indevidamente**. Definir com o cliente se o valor é controlado (dropdown fixo) ou livre — se livre, normalizar a comparação.

7. **A omissão de `ORDER BY id` na API `listas-preco-v2` (linha 211) afeta o cálculo de comissão?** — *Resolver via código.*
   [RESPONDIDA — não é vulnerabilidade] O cálculo usa a RPC `generate_vendedor_comissao`, que já ordena por `desconto_minimo ASC, id ASC`. A API só lista faixas para exibição/preview; o impacto é apenas de ordenação na UI, não no valor calculado.

8. **Se backoffice edita `saldo_anterior`/`saldo_final` de um período `'fechado'`, os relatórios recalculam com o novo valor?** — *Resolver via código.*
   [RESPONDIDA] **Sim — vulnerabilidade confirmada.** A RLS de backoffice é `FOR ALL` sobre `controle_comissao_periodo` e não há trigger de imutabilidade; UPDATE em período `'fechado'` é permitido e os relatórios usam o novo valor. Requer decisão: bloquear edição de períodos fechados.

9. **Qual o propósito do campo `debito` (boolean) em `vendedor_comissao`?** — *Resolver via código/cliente.*
   [RESPONDIDA — legado] Sempre inserido como `false` (migration 143), nunca populado dinamicamente. O crédito/débito real fica em `lancamentos_comissao.tipo`. Aparenta ser coluna legada sem uso; confirmar antes de remover.

10. **Pedido com comissão, depois soft-deletado e restaurado (`deleted_at` → NULL): a comissão é recriada?** — *Resolver via cliente.*
    [RESPONDIDA no código, decisão pendente] Não automaticamente. Nenhum trigger chama `generate_vendedor_comissao` na restauração; o pedido pode ficar `'Faturado'` sem comissão. Só uma chamada manual (webhook/RPC) recria. Definir com o cliente o comportamento esperado.

11. **O PUT `/vendas` permite editar `periodo` de uma `vendedor_comissao`, transferindo comissão entre períodos sem revalidar saldos?** — *Resolver via cliente.*
    [RESPONDIDA no código, decisão pendente] Sim (linhas ~417-421 de `comissoes-v2/index.ts`). A troca de período não recalcula saldos do período de origem nem do destino — discrepância contábil silenciosa. Definir se a edição deve ser bloqueada ou disparar recálculo em cascata.

12. **Qual o passo a passo esperado do backoffice para declarar um período totalmente pago? Existe botão "Marcar como Pago"?** — *Resolver via cliente.*
    [RESPONDIDA parcialmente] A transição para `'pago'` não é invocada em lugar nenhum. Provavelmente o status é documentado mas não usado na prática. Confirmar com o cliente o fluxo desejado (relacionado à Dúvida 1).

13. **Lançamento com `descricao` string vazia (`""`) é validado?** — *Resolver via código.*
    [RESPONDIDA] Não. A RPC `create_lancamento_comissao_v2` não valida vazio; a API só checa presença (`!descricao`), que passa para `""`. Validação fraca — decidir se string vazia deve ser rejeitada.

14. **Como os filtros se comportam com período anual (`'2025'`) mencionado nos tipos TypeScript?** — *Resolver via código.*
    [RESPONDIDA] Suporte anual **não implementado**. O banco armazena TEXT sem validação e as queries filtram por literal `YYYY-MM`; um `'2025'` inserido não é encontrado por filtros mensais. Apenas mensal funciona. Ver Regra 14.

### Novas dúvidas levantadas pela verificação (sem resposta definitiva)

- **Recálculo em cascata ao mover comissão de período:** ao editar o `periodo` de uma comissão (Dúvida 11), os saldos de origem e destino não são reajustados. Confirmar com o cliente se isso deve gerar recálculo automático. *(cliente)*
- **Naturezas além de "Bonificação" que não deveriam comissionar:** só há check explícito para `'Bonificação'`. Naturezas como `'Devolução'`/`'Cancelamento'`, se existirem, não são tratadas. Precisa da lista válida de `natureza_operacao`. *(cliente)*
- **Campo `efetivada` sempre `true`** (migration 143): nunca é `false` nem consultado. Confirmar se é legado antes de remover. *(código/cliente)*
- **`fechar_periodo_comissao_v2` chamado duas vezes** para o mesmo `(vendedor, periodo)`: o `ON CONFLICT DO UPDATE` recalcula `saldo_final` com o novo `total_pagos`, causando volatilidade. Confirmar se é intencional. *(código/cliente)*
- **Escopo RLS de `vendedor_comissao`:** a migration 143 não especifica a policy de leitura por vendedor. Verificar se existe policy separada isolando cada vendedor às suas comissões (base da Regra 22). *(código)*
- **Propósito de `oc_cliente`/`cliente_nome` desnormalizados** convivendo com a FK para `pedido_venda`: presume-se auditoria (cliente pode ser deletado), mas não há documentação. *(cliente)*

---

## Dúvidas — Estorno de comissão de pedido excluído (investigação 2026-07-28)

O cliente decidiu: *"Sim, deve ser estornada automaticamente. Se o período já está fechado, criar automaticamente um lançamento negativo no período aberto mais recente."* A implementação levantou **3 pontos que precisam de decisão**:

1. **[⚠️ DECIDIR] Vendedor sem período aberto.** Medido em prod: **3 vendedores** têm comissão mas nenhum período com status `aberto`. Se um pedido deles for excluído e o período estiver fechado, não existe "período aberto mais recente" para receber o lançamento negativo.
   - *Proposta:* lançar no **mês corrente** (o lançamento em `lancamentos_comissao` não exige registro prévio em `controle_comissao_periodo`).
   - *Alternativa:* criar o período automaticamente.

2. **[⚠️ DECIDIR] Período ainda ABERTO: apagar ou marcar?** Quando o pedido é excluído e o período dele ainda não fechou, o estorno pode remover a linha de comissão (some da apuração) ou mantê-la zerada/marcada.
   - *Proposta:* **apagar** — é o que "estornar" significa antes do fechamento.
   - *Alternativa (mais conservadora):* manter a linha com valor zerado, preservando rastro.

3. **[⚠️ DECIDIR] Pedido restaurado.** Se um pedido excluído for "desexcluído", o estorno deveria ser revertido automaticamente?
   - *Proposta:* não tratar automaticamente (caso raro); registrar como limitação conhecida.

**Contexto técnico apurado:** excluir pedido hoje é soft delete puro e **não** toca em comissão; os 2 triggers existentes disparam em `valor_total` e em status→`Faturado`, nenhum no soft delete. Saldo do relatório = `saldo_anterior + comissão + créditos − débitos` ⇒ o estorno é um **débito**. Estrago atual: apenas 1 comissão órfã (pedido 395, R$ 0,00).
