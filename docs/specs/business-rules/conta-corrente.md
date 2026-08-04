# Conta Corrente

Domínio que registra **compromissos financeiros** com clientes (investimentos e ressarcimentos), os **pagamentos** que os quitam, as **categorias** de classificação e as **formas de pagamento**. O saldo/estado é sempre derivado dos pagamentos, nunca armazenado.

Fontes principais:
- RPC compromissos/pagamentos: `supabase/migrations/067_rpc_conta_corrente_v2.sql`
- RPC categorias: `supabase/migrations/022_rpc_categorias_conta_corrente_v2.sql`
- RLS: `supabase/migrations/068_rls_conta_corrente.sql`
- Migrations de `categoria_id` / `categoria_nome`: `072_*`, `074_*`
- Handlers: `supabase/functions/conta-corrente-v2/index.ts`, `categorias-conta-corrente-v2/index.ts`, `formas-pagamento-v2/index.ts`

## Regras de negócio

1. **Tipo do compromisso deve ser `investimento` ou `ressarcimento`.** Na criação, `tipo_compromisso` é validado como obrigatório e restrito a esses dois valores (case-insensitive): `IF p_tipo_compromisso IS NULL OR LOWER(p_tipo_compromisso) NOT IN ('investimento', 'ressarcimento') THEN RAISE EXCEPTION` (067, ~linha 440).
   *Por quê:* segregar tipos de obrigação financeira (investimento em produto/serviço vs. ressarcimento de valor devido) para análise e relatórios por tipo.
   *Regressão:* aceitar tipo diferente (ex. "Empréstimo") ou NULL deixaria os dados inconsistentes e os relatórios por tipo ambíguos.
   *Ressalva:* a validação existe apenas na RPC. A tabela `conta_corrente_cliente` não é criada neste repositório e **não há constraint `CHECK`/`NOT NULL` conhecido** no schema; inserção direta via RLS (`WITH CHECK (true)`) contorna a regra (ver CCR-013 abaixo).

2. **Valor do compromisso deve ser maior que zero na criação.** `IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'valor deve ser maior que zero'` (067, ~linha 433).
   *Por quê:* evitar compromissos sem valor ou negativos, que invalidariam saldo e cálculo de pagamentos.
   *Regressão:* compromisso com valor 0/negativo/NULL torna o cálculo de pendência inválido.
   *Ressalva (bug conhecido):* no UPDATE, o handler faz `body.valor ? Number(body.valor) : null` — `valor = 0` vira `null` silenciosamente e a RPC de update aceita NULL. Ver Dúvidas em aberto (DUV-001).

3. **Título do compromisso é obrigatório e deve ter no mínimo 2 caracteres.** `IF p_titulo IS NULL OR LENGTH(TRIM(p_titulo)) < 2 THEN RAISE EXCEPTION` (067, ~linha 437).
   *Por quê:* garantir identificação clara do compromisso para auditoria, relatórios e comunicação com o cliente.
   *Regressão:* título vazio/1 caractere/NULL impede identificar o que é o compromisso.

4. **Data do compromisso é obrigatória.** `IF p_data IS NULL THEN RAISE EXCEPTION 'data é obrigatória'` (067, ~linha 429).
   *Por quê:* estabelecer data de criação/vencimento para controlar o fluxo temporal de obrigações e pagamentos.
   *Regressão:* sem data é impossível ordenar/filtrar por período; relatórios ficam inválidos.

5. **Status do compromisso é calculado dinamicamente, nunca armazenado.** A cada consulta: soma dos pagamentos = 0 → **Pendente**; soma ≥ valor → **Pago Integralmente**; caso contrário (1–99%) → **Pago Parcialmente**. `CASE WHEN COALESCE(SUM(pac.valor_pago),0) = 0 THEN 'Pendente' WHEN ... >= ccc.valor THEN 'Pago Integralmente' ELSE 'Pago Parcialmente' END` (067, ~linhas 113–117).
   *Por quê:* refletir em tempo real o estado do pagamento sem coluna duplicada sujeita a dessincronização.
   *Regressão:* status persistido sem sincronização mostraria estado desatualizado após pagamento.
   *Nota:* como é derivado, **deletar um pagamento recalcula o status na próxima consulta** automaticamente (ver DUV-006, RESPONDIDA). O valor `Cancelado` existe no type `StatusCompromisso` mas **nunca é gerado** por nenhuma RPC/fluxo (ver DUV-005).

6. **A soma dos pagamentos de um compromisso não pode exceder o valor total.** `IF (v_valor_total_pago + p_valor_pago) > v_valor_compromisso THEN RAISE EXCEPTION 'Valor total pago não pode exceder o valor do compromisso'` (067, ~linhas 884–886).
   *Por quê:* evitar overpayment e manter o equilíbrio financeiro.
   *Regressão:* soma > valor geraria crédito indevido ou fatura errada.
   *Comportamento (DUV-008, RESPONDIDA):* retorna HTTP **400** com a mensagem acima (handler mapeia keywords de validação para 400).

7. **Categoria é opcional em compromissos e pagamentos.** A RPC de criação **não valida categoria obrigatória**; o handler passa `p_categoria_id` podendo ser `null`. Não há FK obrigatória conhecida em `conta_corrente_cliente`.
   *Por quê:* permitir categorização flexível (infraestrutura, garantia, etc.) sem forçar o preenchimento.
   *Regressão:* tornar categoria obrigatória bloquearia fluxos legítimos sem categorização.
   *Ressalva:* a verificação apontou incerteza sobre o tipo real de `categoria_id` na tabela (migrations 072/074 tratam como UUID no SELECT, handler manipula como string trimada). Ver Dúvidas em aberto.

8. **Nome de categoria: mínimo 2 caracteres e único case-insensitive entre categorias ativas.** `IF LENGTH(TRIM(p_nome)) < 2 THEN RAISE EXCEPTION` e `IF EXISTS (... WHERE LOWER(TRIM(c.nome)) = LOWER(TRIM(p_nome)) AND c.deleted_at IS NULL) THEN RAISE EXCEPTION` (022, ~linhas 33 e 37–42).
   *Por quê:* evitar categorias vazias/genéricas e prevenir duplicatas que confundem relatórios.
   *Regressão:* duas categorias com mesmo nome (ou nome curto) tornam a análise por categoria ambígua.

9. **Forma de pagamento é obrigatória em pagamentos — via *nome* (`p_forma_pagamento`), não por ID.** A RPC valida `IF p_forma_pagamento IS NULL OR LENGTH(TRIM(p_forma_pagamento)) < 2 THEN RAISE EXCEPTION` (067, ~linha 836). O handler exige que ao menos um dos campos (`formaPagamento`/`forma_pagamento`/`formaPagamentoId`/`forma_pagamento_id`) esteja presente (~linhas 247–248).
   *Por quê:* rastrear como foi pago (dinheiro, cheque, TED, PIX...) para auditoria e conciliação.
   *Regressão:* pagamento sem forma impede saber como foi realizado.
   *Bug conhecido:* se o cliente enviar **apenas `formaPagamentoId` (numérico) sem `formaPagamento` (texto)**, o handler não busca o nome da forma antes de chamar a RPC, e `p_forma_pagamento` chega NULL — a RPC **falha** exigindo texto ≥ 2 caracteres. A regra é "obrigatória por nome"; o caminho por ID puro está quebrado.

10. **Data de pagamento é obrigatória.** `IF p_data_pagamento IS NULL THEN RAISE EXCEPTION 'data_pagamento é obrigatória'` (067, ~linha 832).
    *Por quê:* registrar quando o pagamento ocorreu para fluxo de caixa e vencimentos.
    *Regressão:* pagamento sem data invalida relatórios de fluxo temporal.

11. **Cliente vinculado ao compromisso deve existir e não estar deletado (soft delete).** `SELECT ... FROM public.cliente c WHERE c.cliente_id = p_cliente_id AND c.deleted_at IS NULL; IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'` (067, ~linhas 446–454).
    *Por quê:* integridade referencial — evitar compromissos órfãos de clientes inexistentes/desativados.
    *Regressão:* compromisso com `cliente_id` inválido/deletado quebra consultas e relatórios.

12. **Vendedor só cria/atualiza/deleta compromissos e pagamentos dos SEUS clientes; backoffice vê tudo.** Para compromissos: `IF v_user_tipo = 'vendedor' THEN IF NOT EXISTS (SELECT 1 FROM cliente_vendedores cv WHERE cv.cliente_id = p_cliente_id AND cv.vendedor_id = p_created_by) THEN RAISE EXCEPTION` (067, ~linhas 470–477). Para pagamentos há check equivalente com mensagem "Vendedor não tem permissão para criar pagamento para este compromisso" (~linhas 867–874). Backoffice ignora o check.
    *Por quê:* segurança — vendedor não acessa dados de clientes de outros vendedores.
    *Regressão:* vazamento — vendedor veria/editaria/deletaria compromissos de cliente alheio.
    *Nota (DUV-004, RESPONDIDA):* a validação vive só na RPC; o handler apenas repassa `p_created_by`. O erro chega ao usuário como HTTP 400 com a mensagem da RPC.

13. **Apenas backoffice cria/atualiza/deleta categorias; vendedores apenas leem (read-permissive, write-restrictive).** Handler rejeita POST/PUT/DELETE de não-backoffice: `IF user.tipo !== 'backoffice' THEN throw` (categorias-conta-corrente-v2, ~linhas 168–169). GET **não** filtra por tipo — vendedores listam normalmente (~linhas 126–164; RPC `list_categorias_conta_corrente_v2` não filtra por usuário). A RPC de criação também valida backoffice (022, ~linhas 54–56).
    *Por quê:* centralizar a gestão de categorias e evitar duplicatas/lixo criados por vendedores.
    *Regressão:* vendedor com escrita fragmentaria e desorganizaria as categorias.

14. **Forma de pagamento não pode ser deletada se tiver condições de pagamento vinculadas.** `IF condicoes && condicoes.length > 0 THEN throw new Error('Não é possível excluir...')` (formas-pagamento-v2, ~linhas 283–285).
    *Por quê:* integridade referencial — evitar condições de pagamento órfãs.
    *Regressão:* deletar forma em uso deixaria condições com referência inválida.

15. **Categorias usam soft delete (`deleted_at IS NOT NULL` = deletada).** `UPDATE public.categorias_conta_corrente SET deleted_at = NOW() ...` (022, ~linhas 336–338). A unicidade de nome (CCR-008) e as listagens consideram `deleted_at IS NULL`.
    *Por quê:* preservar histórico e auditoria — o registro não some fisicamente.
    *Regressão:* delete físico perderia histórico e quebraria relatórios antigos.
    *Contraste importante:* **compromissos NÃO têm soft delete** — a tabela `conta_corrente_cliente` não possui coluna `deleted_at`. O handler bloqueia DELETE com "Exclusão de compromisso não está implementada. A tabela não possui campo deleted_at." (conta-corrente-v2, ~linha 722), embora a RLS tecnicamente permita DELETE (ver DUV-002).

## Dúvidas em aberto

- **DUV-001 — Valor 0 no UPDATE vira NULL:** No update de compromisso, `body.valor ? Number(body.valor) : null` (handler ~linha 695) converte `valor = 0` para `null`, e a RPC de update aceita NULL — contornando a validação `> 0`. **[PARCIALMENTE RESPONDIDA]** É uma brecha/bug confirmado no código: a RPC não distingue "usuário passou 0" de "usuário não passou valor". Falta confirmar com o **cliente** se manter o valor anterior ao omitir/enviar 0 é intencional ou deve ser rejeitado. *Resolver via: cliente.*

- **DUV-002 — Delete físico de compromisso:** A RLS permite `DELETE` a `authenticated` (`WITH CHECK (true)`, 068 ~linhas 46–50), mas o handler bloqueia intencionalmente (a tabela não tem `deleted_at`). **[RESPONDIDA]** Pela aplicação, compromisso **não é deletável** hoje. Falta decisão de produto: implementar soft delete (exigiria coluna + filtros `deleted_at IS NULL` em todas as queries) ou manter bloqueio. *Resolver via: cliente.*

- **DUV-005 — Status `Cancelado`:** O type `StatusCompromisso` (contaCorrente.ts ~linha 4) inclui `Cancelado`, mas nenhuma RPC/migration/endpoint o gera. **[RESPONDIDA]** Não existe fluxo de cancelamento — o type está dessincronizado da implementação. Falta decidir com o **cliente** se cancelamento é um requisito (criar fluxo) ou se o valor deve ser removido do type. *Resolver via: cliente.*

- **DUV-010 — RLS `WITH CHECK (true)` permite burlar as validações de negócio:** Todas as policies de INSERT/UPDATE/DELETE usam `WITH CHECK (true)` sem validação (068 ~linhas 33, 41, 50). Escrita direta na tabela (service_role/backoffice) ignora as RPCs e injeta dados inválidos (tipo fora do domínio, valor ≤ 0, soma > valor, etc.). **[RESPONDIDA — débito de segurança]** Confirmado; severidade alta. Falta alinhar com o **cliente** se as validações devem migrar para constraints/triggers na tabela (defesa em profundidade) além das RPCs. *Resolver via: cliente.*

- **Tipo real de `categoria_id`:** Migrations 072/074 tratam `categoria_id` como UUID no SELECT, mas o handler o manipula como string trimada (~linha 625). Se a coluna for UUID, uma string malformada pode falhar silenciosamente ou virar NULL. Confirmar o tipo real da coluna em `conta_corrente_cliente` (schema não está neste repositório). *Resolver via: código/banco (inspecionar a tabela em produção).*

- **DUV-007 — Flag `Parcelamento` desatualizado em condição de pagamento:** No UPDATE, `Parcelamento`/`intervaloParcela` só é recalculado se `body.prazoPagamento !== undefined` (condicoes-pagamento-v2 ~linhas 377–392). Um UPDATE parcial que muda só `descontoExtra` sem reenviar `prazoPagamento` deixa a flag desatualizada. **[RESPONDIDA — falha conhecida]** Confirmado no código. Falta decidir se o handler deve recalcular sempre a partir do estado persistido. *Resolver via: código.*

- **DUV-009 — `intervalo_parcela` vazio em prazos inválidos:** O parser (`processarPrazoPagamento`) filtra vazios e não-numéricos; `'0/0/0'` → `[0,0,0]` (válido), mas `'////'` → `[]` (retorno `{ quantidadeParcelas: 1, prazoPagamento: 0, intervaloParcela: [] }`). **[RESPONDIDA — risco baixo]** O parser é defensivo; o risco recai em consumidores que assumem `.length > 0` (ex. `tiny-enviar-pedido`, não analisado aqui). Falta verificar o comportamento na emissão de pedido. *Resolver via: código (auditar `tiny-enviar-pedido`).*
