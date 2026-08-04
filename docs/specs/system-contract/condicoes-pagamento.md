# Contrato — Condições de Pagamento

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Invariantes

### intervalo_parcela é o source-of-truth para emissão de pedidos

- **Tipo:** invariant
- **Enunciado:** Ao emitir um pedido ao Tiny (ou qualquer processo de faturamento), o array `intervalo_parcela` é sempre a fonte de verdade para gerar as parcelas. NÃO use `Prazo_pagamento` (scalar) nem `Quantidade_parcelas` para construir intervalos em tempo de emissão — sempre leia `intervalo_parcela`. Quando `intervalo_parcela` está vazio, o fallback é `[0]` (à vista).
- **Evidência:**
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:551-580` — linhas 562-568 extraem e normalizam `intervalo_parcela` de `Condicao_De_Pagamento`, alimentando a construção de parcelas (linhas 582-591).
  - `supabase/functions/emitir-pedido-sem-vendedor/index.ts:132-159` — processa `intervalosRaw`, converte para array e mapeia para objeto parcela com dias e valor.
  - `supabase/functions/emitirpedido/index.ts:129-140` — extrai `intervalo_parcela`, mapeia cada `dias` para parcela, divide valor total igualmente entre as parcelas.
- **Regressão se:** o código usar `Prazo_pagamento` ou `Quantidade_parcelas` para gerar intervalos no Tiny — parcelamentos complexos (10/15/20) degenerarão em parcelas erradas; o Tiny receberia um único prazo final ou ordem incorreta de vencimentos.

### Quantidade_parcelas é sempre o comprimento do intervalo_parcela (imposto apenas na API v2)

- **Tipo:** invariant
- **Enunciado:** A regra `Quantidade_parcelas == intervalo_parcela.length` é imposta apenas pela API TypeScript v2 (`condicoes-pagamento-v2/index.ts`), via `processarPrazoPagamento`, que sincroniza os campos em CREATE e UPDATE. Para '10/15/20', `Quantidade_parcelas = 3`; à vista = 1 (ou 0 se intervalo vazio). Existe uma rota SQL alternativa (`rpc_insert_condicao_pagamento`) que NÃO impõe a sincronização, permitindo violações (ex: `quantidade_parcelas=3` com `intervalo_parcela=[10,20]`). Recomendação: adicionar validação no banco (CHECK constraint ou trigger) ou deprecar a RPC antiga em favor da API v2.
- **Evidência:**
  - `supabase/functions/condicoes-pagamento-v2/index.ts:86-111` — `processarPrazoPagamento()`: linha 106 `quantidadeParcelas = valores.length`.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:332` — INSERT: `Quantidade_parcelas: quantidadeParcelas`.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:389` — UPDATE: `Quantidade_parcelas = quantidadeParcelas`.
  - `supabase/migrations/122_baseline_prod_functions_20260601.sql` — `rpc_insert_condicao_pagamento` aceita `p_quantidade_parcelas` e `p_intervalo_parcela` como parâmetros independentes sem sincronização.
- **Regressão se:** `Quantidade_parcelas` divergir de `intervalo_parcela.length` — loops de geração de parcelas no Tiny receberão comprimento errado; divisão de valor por parcela será matematicamente errada.

### Descrição contém TODAS as parcelas (imposto apenas no caminho automático)

- **Tipo:** invariant
- **Enunciado:** A regra é aplicada apenas no caminho automático de geração: quando `descricao` NÃO é fornecida, `gerarDescricao()` constrói o nome incluindo TODOS os intervalos de parcela separados por '/' (ex: 'PIX - 10/15/20 dias - desc extra 0%'), não apenas o último valor. Porém, em create (linha 319) e update (linha 407), se o cliente enviar `body.descricao`, a descrição é inserida/atualizada diretamente sem validação, permitindo contornar a regra.
- **Evidência:**
  - `supabase/functions/condicoes-pagamento-v2/index.ts:119-129` — comentário explícito: 'Mantém TODAS as parcelas no nome (ex.: "10/15/20 dias"). Antes usava só o último prazo, gerando nomes errados ("20 dias") para condições parceladas.'
  - `supabase/functions/condicoes-pagamento-v2/index.ts:126-129` — `gerarDescricao()`, linha 128 constrói `${intervaloParcela.join('/')} dias` — junta TODOS os intervalos com '/'.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:319` (create) e `:407-408` (update) — caminho que aceita `body.descricao` arbitrária sem validação (contorno da regra).
- **Regressão se:** apenas o último prazo for incluído no nome (ex: 'PIX - 20 dias' para 10/15/20) — usuários não saberão que existem parcelas intermediárias; auditoria do sistema ficará confusa sobre quais intervalos foram realmente utilizados.

---

## Regras de Negócio

### Parcelamento é TRUE se Quantidade_parcelas > 1 (condicional no UPDATE)

- **Tipo:** business-rule
- **Enunciado:** A regra `Parcelamento = (Quantidade_parcelas > 1)` é implementada apenas CONDICIONALMENTE em `condicoes-pagamento-v2`: é respeitada em CREATE sempre (linha 335), mas em UPDATE (linhas 386-392) apenas quando `prazoPagamento` é definido explicitamente. Se um UPDATE alterar apenas outros campos (ex: `descontoExtra`, `valorMinimo`, `condicaoCredito`) sem tocar `prazoPagamento`, o `Parcelamento` fica desatualizado. Não há constraint de banco que force a regra, e a RPC `rpc_insert_condicao_pagamento` aceita `p_parcelamento` sem validação.
- **Evidência:**
  - `supabase/functions/condicoes-pagamento-v2/index.ts:335` — INSERT: `Parcelamento: quantidadeParcelas > 1`.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:390` — UPDATE: `Parcelamento = quantidadeParcelas > 1` (só quando `prazoPagamento` fornecido).
  - `supabase/functions/condicoes-pagamento-v2/index.ts:386-392` — UPDATE parcial sem `prazoPagamento` não recalcula `Parcelamento`.
  - `supabase/migrations/122_baseline_prod_functions_20260601.sql:5824-5844` — `rpc_insert_condicao_pagamento` aceita `p_parcelamento` sem validação.
- **Regressão se:** `Parcelamento` ficar FALSE para uma condição com 3 parcelas — filtros e consultas que usam esse flag ignorarão errado a condição; análises de parcelamentos estarão incompletas.

### intervalo_parcela é gerado ao informar prazoPagamento (mas pode ficar vazio)

- **Tipo:** business-rule
- **Enunciado:** Ao criar uma Condição de Pagamento com `prazoPagamento` (ex: '30/60/90'), o processamento TENTA gerar um `intervalo_parcela` correspondente, mas o `intervalo_parcela` pode ficar vazio (array `[]`) se a string `prazoPagamento` não contiver valores numéricos válidos (ex: 'abc/def/xyz' passa na validação de não-vazio mas resulta em array vazio após `parseFloat`). A inserção sempre ocorre com `intervalo_parcela`, mas seu conteúdo não é garantido. A validação só checa se `prazoPagamento` é vazio/null — não valida se contém valores numéricos.
- **Evidência:**
  - `supabase/functions/condicoes-pagamento-v2/index.ts:300-305` — validação: se `prazoPagamento` vazio, erro. Senão, `processarPrazoPagamento()` é chamado.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:95-103` — `filter` remove todos os NaN, podendo resultar em array vazio.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:337` — INSERT: `intervalo_parcela: intervaloParcela`.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:386` — UPDATE não valida que `prazoPagamento` seja não-vazio.
- **Regressão se:** `intervalo_parcela` for NULL/vazio apesar de `Quantidade_parcelas > 1` — a emissão do pedido será impossível (length undefined); `processarPrazoPagamento` na emissão tentará iterar sobre undefined/null e falhará.

### Desconto é percentual simples do valor total

- **Tipo:** business-rule
- **Enunciado:** O campo `Desconto` é um percentual (0-100). Aplicado ao `valor_total` do pedido na emissão UMA ÚNICA VEZ: `descontoExtra = valor_total * (Desconto/100)` e `valor_com_desconto = valor_total - descontoExtra`. Não é percentual cumulativo com outros descontos — descontos padrão e extra ficam em colunas separadas (`percentual_desconto_padrao` vs `percentual_desconto_extra`) e são aplicados independentemente.
- **Evidência:**
  - `supabase/functions/emitirpedido/index.ts:122-124` — `descontoExtra = valorTotalPedido * (condicaoPagamento.Desconto / 100)`.
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:597` — `Desconto` extraído do pedido_venda como `valor_desconto_extra` e enviado ao Tiny.
- **Regressão se:** `Desconto` for interpretado como desconto fixo (em R$) em vez de percentual — valores serão severamente incorretos; um desconto de '10' (10%) seria aplicado como R$10 fixo, quebrando pedidos acima de R$100.

### Descrição é regenerada automaticamente quando componentes mudam (com valores mistos)

- **Tipo:** business-rule
- **Enunciado:** Durante UPDATE, se algum de (`formaPagamentoId`, `prazoPagamento`, `descontoExtra`) for modificado mas `descricao` não for fornecido, a função chama `gerarDescricao()` usando: (a) a forma de pagamento fornecida ou atual no BD, (b) o prazo fornecido ou atual no BD, (c) o desconto fornecido ou atual no BD. Assim, se apenas `formaPagamentoId` for modificado, `descricao` será regenerada usando a NOVA forma de pagamento mas os ANTIGOS prazo e desconto (valores mistos, não necessariamente "os novos valores").
- **Evidência:**
  - `supabase/functions/condicoes-pagamento-v2/index.ts:407-440` — UPDATE: linhas 407-409 checam se `descricao` foi fornecido; se não, mas algum componente foi atualizado, chama `gerarDescricao()`.
  - `supabase/functions/condicoes-pagamento-v2/index.ts:425-435` — quando `body.prazoPagamento` e `body.descontoExtra` são undefined, `prazoInput` e `desconto` são buscados do BD (atuais), não dos novos valores do request.
- **Regressão se:** Descrição não fosse regenerada após mudança de `prazoPagamento` — um admin alteraria '30 dias' para '30/60/90' mas o nome continuaria '30 dias', enganando usuários sobre o parcelamento real.

---

## Decisões de Arquitetura

### intervalo_parcela é um array bigint[] no banco

- **Tipo:** arch-decision
- **Enunciado:** O campo `intervalo_parcela` na tabela `Condicao_De_Pagamento` é do tipo `bigint[]` (array de inteiros). A aplicação processa valores como números (`parseFloat`, podendo incluir decimais), mas o PostgreSQL os converte implicitamente para `bigint[]` na inserção. Armazena `[10, 15, 20]` para parcelamento 10/15/20 dias. Pode ser NULL ou array vazio para condições à vista. Todas as operações SELECT, INSERT e UPDATE o tratam consistentemente como array.
- **Evidência:**
  - `supabase/functions/condicoes-pagamento-v2/index.ts:199,279` — SELECT e INSERT/UPDATE tratam `intervalo_parcela` como array; linhas 337, 391 inserem/atualizam array diretamente.
  - `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts:562-568` — `Array.isArray(cond.intervalo_parcela)` check e `map` dos elementos.
- **Regressão se:** `intervalo_parcela` for armazenado como string '10/15/20' em vez de array `[10, 15, 20]` — parsing na emissão falharia; conversão de string para array seria necessária, quebrando o contrato da API.
