# Contrato — Comissões

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

Cada bloco documenta uma regra verificada contra o código-fonte. Quando a verificação
apontou imprecisão (`verdict: partial`), o enunciado abaixo já reflete o texto corrigido.

---

## Invariantes (garantidas por constraint/schema)

### Constraint: desconto_minimo <= desconto_maximo em listas_preco_comissionamento
**Enunciado:** Banco rejeita faixas onde `desconto_minimo > desconto_maximo`. `CHECK (desconto_minimo <= desconto_maximo)`. A validação é reforçada em múltiplas camadas: a RPC `upsert_price_list` levanta exceção antes do insert e a REST API (`listas-preco-v2`) valida antes de inserir; a camada de aplicação é ainda mais estrita (rejeita `min == max`), enquanto o banco só exige `min <= max`.
**Tipo:** invariant
**Evidência:**
- `supabase/schema_baseline.sql` (linha 861) — `ADD CONSTRAINT lpc_min_le_max CHECK ((desconto_minimo <= desconto_maximo))`
**Regressão se:** Se a constraint for removida, faixas invertidas podem ser inseridas, levando a comportamento imprevisível de comissão.

### Período aberto por vendedor é único (controle_comissao_periodo)
**Enunciado:** Tabela `controle_comissao_periodo` tem `UNIQUE(vendedor_uuid, periodo)`. A constraint garante que cada combinação (vendedor, período) é única (máximo 1 registro por período por vendedor), prevenindo duplicatas de período para um vendedor. **Porém, não há constraint, trigger ou validação que impeça múltiplos períodos com `status='aberto'` para o mesmo vendedor** (ex.: 2026-01 aberto + 2026-02 aberto é permitido).
**Tipo:** invariant
**Evidência:**
- `supabase/migrations/083_comissoes_gestao.sql` (linha 114) — `UNIQUE(vendedor_uuid, periodo)`
**Regressão se:** Se a constraint for removida, múltiplos registros de período poderiam existir, causando ambiguidade no saldo e status.

### Período armazenado como 'YYYY-MM' (ex: '2025-10')
**Enunciado:** Campo `periodo` em `lancamentos_comissao`, `pagamentos_comissao`, `controle_comissao_periodo` e `vendedor_comissão` é `TEXT`. O formato `YYYY-MM` é documentado como esperado e gerado automaticamente para novos períodos, **mas não há constraint CHECK ou validação que impeça outros formatos TEXT.** A interface `RelatorioPeriodoComissoes` menciona suporte a formato anual (`YYYY`) além do mensal (`YYYY-MM`).
**Tipo:** invariant
**Evidência:**
- `supabase/migrations/083_comissoes_gestao.sql` (linhas 18, 62, 107) — `periodo TEXT NOT NULL -- Formato YYYY-MM`
- `src/types/comissao.ts` (linhas 10, 39, 58, 81) — `periodo: string // "2025-10"` (linha 81 documenta também formato anual `"2025"`)
**Regressão se:** Se o formato mudar (ex: `YYYYMM` ou `YYYY/MM`), queries de filtro por período quebrarão silenciosamente.

---

## Business rules

### Operações de Bonificação não geram comissão
**Enunciado:** Pedidos cuja `natureza_operacao` é exatamente `'Bonificação'` (case-sensitive, com til) retornam status `'bonificacao_sem_comissao'` e não geram registro em `vendedor_comissão`. **Atenção (pitfall):** a verificação é comparação exata sem normalização — variações de caso ou caracteres (ex: `'bonificação'`, `'BONIFICACAO'`) contornam a regra. Uma implementação robusta usaria `LOWER(natureza_operacao) = LOWER('Bonificação')`.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 53-57, esp. linha 54: `if v_pedido.natureza_operacao = 'Bonificação' then` sem normalização)
- `supabase/migrations/122_baseline_prod_functions_20260601.sql` — `get_preview_comissoes` usa `natureza_operacao IS DISTINCT FROM 'Bonificação'`
**Regressão se:** Se uma bonificação começar a gerar comissão (função remove verificação ou tipo de operação for alterado), comissões indevidas serão calculadas.

### Vendedor possui exatamente dois modelos de comissão possíveis
**Enunciado:** Todo vendedor (`dados_vendedor.Comissão`) usa modelo 1 (conforme lista de preço e desconto do cliente) ou modelo 2 (alíquota fixa). O sistema rejeita outros valores via `ELSE RAISE EXCEPTION` em `generate_vendedor_comissao`, além de FK para `dados_comissao`, RLS restringindo modificações a backoffice e validação TypeScript (`'aliquota_fixa'`→2 / `'lista_preco'`→1).
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 69-98) — `IF v_tipo_comissao = 2 ... ELSIF = 1 ... ELSE RAISE EXCEPTION`
- `supabase/migrations/122_baseline_prod_functions_20260601.sql` — `get_preview_comissoes` CASE `WHEN dv.Comissão = 2 ... WHEN dv.Comissão = 1`
**Regressão se:** Se vendedor tiver `Comissão != 1 AND != 2`, o sistema lança exceção 'Tipo de comissão inválido'.

### Tipo 1 (por lista): comissão derivada de lista_de_preco + desconto do cliente
**Enunciado:** Para vendedores com modelo 1, a comissão é buscada em `listas_preco_comissionamento` pelo `lista_de_preco` do cliente (se definido) e seu desconto (desconto entre `desconto_minimo` e `desconto_maximo`). Se nenhuma faixa for encontrada, **OU se `lista_de_preco` for NULL, OU se não houver faixas na tabela, a comissão = 0** (fallback silencioso).
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 72-93) — `SELECT lpc.comissao WHERE lista_preco_id = ... AND desconto BETWEEN min AND max`; fallback `NULL -> 0`
- `supabase/schema_baseline.sql` (linhas 339-345) — `listas_preco_comissionamento(id, lista_preco_id, desconto_minimo, desconto_maximo, comissao)`; FK cliente com `ON DELETE SET NULL` (linha 875)
**Regressão se:** Se `cliente.desconto` ficar NULL ou `listas_preco_comissionamento` for deletada, a comissão cai para 0 silenciosamente.

### Tipo 2 (alíquota fixa): comissão é percentual fixo do vendedor
**Enunciado:** Para vendedores com modelo 2, `comissao_percentual = dados_vendedor.aliquotafixa` (constante por vendedor). Não há rota alternativa: em todos os caminhos de cálculo o percentual vem exclusivamente de `coalesce(aliquotafixa, 0)`.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 69-70) — `IF v_tipo_comissao = 2 THEN v_percentual := coalesce(v_aliquota_fixa, 0)`
- `supabase/schema_baseline.sql` (linhas 176-212) — `dados_vendedor.aliquotafixa NUMERIC`
**Regressão se:** Se `aliquotafixa` for NULL, o sistema defaulta para 0 (sem comissão).

### Valor de comissão = valor_total * percentual / 100, arredondado a 2 casas
**Enunciado:** Cálculo: `ROUND((valor_total_pedido::numeric * percentual / 100), 2)`. Acumulação, saldo final e pagamentos usam `NUMERIC(15,2)`.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 100-101) — `v_valor_comissao := round((v_pedido.valor_total::numeric * v_percentual / 100), 2)`
- `supabase/schema_baseline.sql` (linhas 320-329, 339-345, 412-422) — tabelas de comissão em `NUMERIC(15, 2)`
**Regressão se:** Se o arredondamento mudar (ex: 3 casas decimais), saldos desviarão centavo a centavo.

### Pedido sem vendedor_uuid não gera comissão
**Enunciado:** Se `pedido.vendedor_uuid IS NULL`, a geração de comissão falha com exceção `'Pedido % sem vendedor_uuid'`. Todos os pontos de entrada (trigger `trigger_comissao_faturado`, edge function `comissoes-v2`, RPC) passam obrigatoriamente por `generate_vendedor_comissao` (`SECURITY DEFINER`), que valida antes de qualquer insert.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 45-46) — `IF v_pedido.vendedor_uuid IS NULL THEN RAISE EXCEPTION`
**Regressão se:** Se a verificação de NULL for removida, pedidos órfãos gerarão comissão sem dono (FK falhará ou criará inconsistência).

### Cliente (tipo 1) ausente ou com lista_de_preco NULL
**Enunciado:** Se o cliente **não existir**, o sistema **lança exceção `'Cliente % não encontrado'`** e não processa comissão (não defaulta para 0). Se o cliente existir MAS `lista_de_preco` for NULL, ou nenhuma faixa de comissionamento corresponder ao desconto, o sistema defaulta percentual para 0, resultando em `valor_comissao = 0`.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 79-81) — `if not found then raise exception 'Cliente % não encontrado.'`; (linhas 82-93) `v_lista_preco_id` NULL ⇒ query sem match ⇒ `v_percentual` forçado a 0 na linha 92
**Regressão se:** Se o cliente for deletado após o pedido, a comissão será recalculada para 0 ao atualizar o pedido.

### Faixa de desconto: primeiro match é usado
**Enunciado:** Busca em `generate_vendedor_comissao`: `ORDER BY desconto_minimo ASC, id ASC LIMIT 1`. Se `cliente.desconto` se encaixa em múltiplas faixas com `desconto_minimo` idênticos, a de menor `id` é usada como desempate. **Nota (pitfall):** a leitura em TypeScript (`listas-preco-v2`) omite o `id ASC`, afetando apenas exibição, não o cálculo de comissão.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 83-89) — `... ORDER BY lpc.desconto_minimo ASC, lpc.id ASC LIMIT 1`
- `supabase/functions/listas-preco-v2/index.ts` (linhas 211, 349) — `.order('desconto_minimo', { ascending: true })` sem critério de desempate `id`
**Regressão se:** Se o `ORDER BY` for alterado (ex: DESC), a faixa de maior desconto seria usada, invertendo a comissão.

### Faixa com (min=0, max=0, comissao=0) é automaticamente deletada
**Enunciado:** O trigger `after_insert_delete_zero_discount` existe e remove linhas com `desconto_minimo=0`, `desconto_maximo=0` e `comissao=0` imediatamente após INSERT. **Porém**, a API TypeScript (`listas-preco-v2`) defaulta `desconto_maximo` para 100 quando não fornecido, então em fluxos normais faixas são inseridas como `{0, 100, 0}` e o trigger NÃO é disparado. O trigger é efetivo apenas para inserções diretas (RPC/SQL) que especifiquem os três campos como 0.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/122_baseline_prod_functions_20260601.sql` — `delete_zero_discount_rows`: `IF NEW.desconto_minimo = 0 AND NEW.desconto_maximo = 0 AND NEW.comissao = 0 THEN DELETE`
- `supabase/schema_baseline.sql` — `CREATE TRIGGER after_insert_delete_zero_discount ... EXECUTE FUNCTION delete_zero_discount_rows()`
- `supabase/functions/listas-preco-v2/index.ts` (linhas 312, 435) — `max == null ? 100 : Number(max)`
**Regressão se:** Se o trigger for desabilitado, faixas nulas se acumularão e o primeiro match (min=0) absorverá desconto=0, zerando comissões inesperadamente.

### Status de período é um de: 'aberto', 'fechado', 'pago'
**Enunciado:** Coluna `status` em `controle_comissao_periodo` tem `CHECK (status IN ('aberto', 'fechado', 'pago'))`. Estado inicial `DEFAULT 'aberto'`. As RPCs (084, 122) inserem apenas valores válidos.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/083_comissoes_gestao.sql` (linha 108) — `CHECK (status IN ('aberto', 'fechado', 'pago'))` e `DEFAULT 'aberto'`
- `supabase/schema_baseline.sql` (linhas 164, 849) — confirmam a definição
**Regressão se:** Se um status diferente (ex: `'aguardando'`) for inserido, a constraint falhará; se removida, inconsistências aparecem.

### Não é permitido adicionar lançamentos em período fechado ou pago
**Enunciado:** A função `create_lancamento_comissao_v2` verifica `IF status IN ('fechado', 'pago') THEN RAISE EXCEPTION`. **Atenção (pitfall):** a proteção é incompleta — (a) se não existir registro em `controle_comissao_periodo`, `status` retorna NULL e `NULL IN (...)` é FALSE, permitindo inserção; (b) PUT/DELETE de lançamentos em `/comissoes-v2` não validam o status do período, contornando a RPC inteiramente.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/084_comissoes_rpc.sql` (linhas 117-124) — `SELECT status INTO v_status_periodo; IF v_status_periodo IN ('fechado', 'pago') THEN RAISE EXCEPTION`
- `supabase/functions/comissoes-v2/index.ts` (linhas 228-244 PUT sem validação; 249-262 DELETE sem validação)
**Regressão se:** Se a verificação for removida, lançamentos retroativos poderiam ser adicionados após fechamento, alterando saldos fechados.

### Saldo final = saldo_anterior + comissão + créditos − débitos − pagos
**Enunciado:** Em `fechar_periodo_comissao_v2`: `v_saldo_final := v_saldo_anterior + v_total_comissao + v_total_creditos - v_total_debitos - v_total_pagos`. **Escopo:** no relatório (`get_relatorio_comissoes_v2`), períodos com status `'fechado'` ou `'pago'` retornam `cp.saldo_final` armazenado; outros períodos usam a fórmula recalculada.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/084_comissoes_rpc.sql` (linha 244) — fórmula do saldo final
- `supabase/migrations/084_comissoes_rpc.sql` (linhas 85-88) — CASE do relatório: se `status = 'fechado' OR 'pago'` retorna `saldo_final`, senão recalcula
**Regressão se:** Se o operador de débito for `+` ao invés de `−`, saldos crescerão ao invés de diminuir com devoluções.

### Novo período herda saldo_anterior = saldo_final do período anterior
**Enunciado:** Ao fechar período, `fechar_periodo_comissao_v2` cria automaticamente o próximo mês com `saldo_anterior = saldo_final` deste mês (via `ON CONFLICT DO UPDATE`). **Atenção (pitfall):** essa relação não é protegida por constraint ou trigger — usuários backoffice podem contornar via UPDATE direto na tabela (permitido pela RLS policy "Backoffice pode gerenciar controle de periodos").
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/084_comissoes_rpc.sql` (linhas 269-293) — calcula próximo período; `INSERT controle_comissao_periodo` com `saldo_anterior = v_saldo_final` (linha 291)
- `supabase/migrations/083_comissoes_gestao.sql` — RLS policy "Backoffice pode gerenciar controle de periodos" (`FOR ALL`)
**Regressão se:** Se a lógica de herança for removida, `saldo_anterior` sempre será 0, perdendo carryover e saldos acumulados.

### Preview de comissões exclui pedidos que já têm comissão gerada
**Enunciado:** `get_preview_comissoes` retorna apenas pedidos com `status IN ('Em aberto', 'Aprovado', 'Preparando envio', 'Pronto para envio', 'Enviado')`, COM `natureza_operacao IS DISTINCT FROM 'Bonificação'`, E sem registro em `vendedor_comissão` (`NOT EXISTS`).
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/122_baseline_prod_functions_20260601.sql` (linhas 148-163) — WHERE clause com 3 condições (status, natureza_operacao, NOT EXISTS)
**Regressão se:** Se a verificação `NOT EXISTS` for removida, o preview contará comissões já geradas duas vezes.

### Comissão é recalculada quando valor_total do pedido é atualizado
**Enunciado:** O trigger `pedido_venda_au_generate_comissao` gera/atualiza comissão APENAS se (1) `valor_total` mudar E for > 0, E (2) `natureza_operacao <> 'Bonificação'`. Comissões também são geradas/atualizadas por: trigger `trg_comissao_on_faturado` (quando `status='Faturado'`) e pela rota API `POST /calcular-pendentes` (sem validação de `valor_total > 0`). **Não há** mecanismo automático de cancelamento de comissões quando `valor_total` é reduzido para 0 ou quando pedidos são cancelados.
**Tipo:** business-rule
**Evidência:**
- `supabase/schema_baseline.sql` — trigger `pedido_venda_au_generate_comissao`: `AFTER UPDATE OF valor_total ... WHEN (new.valor_total IS DISTINCT FROM old.valor_total AND new.valor_total > 0)`
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 110-122) — `IF v_existente_id IS NOT NULL THEN UPDATE`; (linhas 53-57) bloqueio de Bonificação
**Regressão se:** Se o trigger for desabilitado, alterações de valor não atualizarão a comissão existente, deixando dados stale.

### Comissão é gerada quando status do pedido muda para 'Faturado'
**Enunciado:** A geração de comissão é disparada por DOIS mecanismos independentes: (1) trigger `trg_comissao_on_faturado` detecta mudança de status para `'Faturado'` (`OLD.status <> NEW.status`) e chama `generate_vendedor_comissao`; (2) trigger `pedido_venda_au_generate_comissao` detecta mudanças em `valor_total` (distinct AND > 0) e chama `generate_vendedor_comissao` independente de status. Adicionalmente, `generate_vendedor_comissao` pode ser chamada manualmente via `POST /calcular-pendentes`.
**Tipo:** business-rule
**Evidência:**
- `supabase/schema_baseline.sql` — trigger `trg_comissao_on_faturado`: `AFTER UPDATE OF status ... WHEN (new.status = 'Faturado')`; (linha 1286) trigger `pedido_venda_au_generate_comissao`
- `supabase/migrations/122_baseline_prod_functions_20260601.sql` — `trigger_comissao_faturado`: `IF NEW.status = 'Faturado' AND (OLD.status IS NULL OR OLD.status <> 'Faturado')`
**Regressão se:** Se o trigger for desabilitado, pedidos faturados não geram comissão automaticamente; devem ser processados manualmente.

### Apenas backoffice cria/edita/deleta lançamentos, pagamentos e fecha períodos
**Enunciado:** Endpoints POST/PUT/DELETE em `comissoes-v2` verificam `IF user.tipo !== 'backoffice' THEN THROW ERROR`. Todos os 10 endpoints de escrita são cobertos e a autenticação JWT é mandatória antes de qualquer processamento.
**Tipo:** business-rule
**Evidência:**
- `supabase/functions/comissoes-v2/index.ts` (linhas 201, 229, 250, 289, 318, 339, 357, 382; e 481, 523 para /vendas) — `IF user.tipo !== 'backoffice' THEN THROW 'Apenas backoffice...'`
**Regressão se:** Se os checks de role forem removidos, vendedores poderiam manipular comissões próprias.

### Vendedor pode visualizar apenas suas próprias comissões (RLS)
**Enunciado:** RLS policies em `lancamentos_comissao`, `pagamentos_comissao`, `controle_comissao_periodo` têm DUAS camadas: (1) vendedores veem apenas suas próprias linhas (`USING auth.uid() = vendedor_uuid`); (2) backoffice vê TODAS as linhas de TODOS os vendedores (`USING EXISTS(... tipo='backoffice')`). A restrição por `vendedor_uuid` aplica-se apenas a vendedores, não globalmente.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/083_comissoes_gestao.sql` (linhas 31-33, 80-81, 127-128) — `USING (auth.uid() = vendedor_uuid)`; (linhas 82-90) policy "Backoffice pode ver todos pagamentos" sem restrição a `vendedor_uuid`
- `supabase/functions/comissoes-v2/index.ts` (linhas 135-139, 159-163, 188-190, 276-278, 468-470) — filtro na aplicação: `IF user.tipo === 'vendedor' THEN restrict by user.id`
**Regressão se:** Se a RLS for desabilitada ou filtros removidos, vendedores verão comissões de colegas.

### Campos oc_cliente e cliente_nome são gravados e auditados em cada comissão
**Enunciado:** A função `generate_vendedor_comissao` foi corrigida em migration 132 para carregar `pedido.ordem_cliente` e `pedido.nome_cliente` e gravá-los em `vendedor_comissão.oc_cliente` e `.cliente_nome` em ambos INSERT e UPDATE. Esta correção era necessária porque as migrações 082 e 122 não o faziam. **Atenção (pitfall):** o trigger `preencher_cliente_nome_vendedor_comissao` preenche apenas `cliente_nome` a partir de `cliente_id`, deixando `oc_cliente` sem preenchimento automático em INSERTs diretos.
**Tipo:** business-rule
**Evidência:**
- `supabase/migrations/132_fix_generate_comissao_cliente_oc.sql` (linhas 28-36 carrega; 115-118 UPDATE; 136-137 INSERT)
- `supabase/schema_baseline.sql` — `vendedor_comissão: oc_cliente TEXT, cliente_id BIGINT, cliente_nome TEXT` (desnormalizado para auditoria)
- Contraexemplo histórico: `supabase/migrations/082_commission_logic_update.sql` (linhas 119-139 INSERT / 109-114 UPDATE omitem os campos)
**Regressão se:** Se a gravação for removida, o relatório não conseguirá mostrar OC e Cliente (ficará em branco, como no bug de abr/2026).
