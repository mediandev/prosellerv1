# Condições de Pagamento

> Fonte de verdade: `supabase/functions/condicoes-pagamento-v2/index.ts`, `src/types/condicaoPagamento.ts`,
> tabela `Condicao_De_Pagamento`, e as funções de emissão (`emitirpedido`, `emitir-pedido-sem-vendedor`,
> `tiny-enviar-pedido-v1`). As regras abaixo foram conferidas contra o código; onde o spec original divergia
> da implementação, a regra foi corrigida ou marcada como comportamento atual (não como intenção validada).

## Regras de negócio

### R01 — Intervalo de parcelas define os vencimentos
Cada condição de pagamento tem um campo `intervalo_parcela` (array de dias) que define quantos dias após a
data do pedido cada parcela vence. Ele é lido diretamente na emissão do pedido ao Tiny.
*Por quê:* a emissão precisa saber, por parcela, o número de dias de vencimento para gerar as parcelas e o fluxo de caixa correto.
*Regressão:* se `intervalo_parcela` vier vazio/`NULL` na emissão, o `.map()`/`.length` sobre ele gera zero parcelas ou datas erradas.
*Correção vs spec:* **NÃO existe validação** que garanta `intervalo_parcela` não-vazio quando `Quantidade_parcelas > 1`. O CREATE só checa se `prazoPagamento` está vazio (linha 291), não se contém números válidos. Entrada como `'abc/def'` passa na checagem e `processarPrazoPagamento` devolve `intervaloParcela: []` silenciosamente, criando registro inconsistente sem erro. Ver D11 nas dúvidas.

### R02 — Quantidade de parcelas é derivada do array
`Quantidade_parcelas` é sempre `intervalo_parcela.length` — na API v2 os dois são calculados juntos por
`processarPrazoPagamento` a partir do mesmo `prazoPagamento`.
*Por quê:* usado para dividir o valor do pedido entre parcelas e para exibição/filtros.
*Regressão:* se `Quantidade_parcelas` divergir de `intervalo_parcela.length`, a divisão de valor por parcela e os loops de emissão usam contagem incorreta.
*Ressalva:* essa igualdade só é imposta pela **API v2**, não pelo banco (ver R14).

### R03 — `intervalo_parcela` é array de números, não string
`intervalo_parcela` é persistido como array (ex: `[10, 15, 20]`) e consumido diretamente na emissão.
*Por quê:* dados estruturados e reutilizáveis, sem reparse em tempo de emissão.
*Regressão:* se fosse gravado como string `'10/15/20'`, o código de emissão quebraria ao chamar `.map()` / `.length`.
*Observação:* o parser aceita `parseFloat` (linha 99), então valores não-inteiros como `10.5` seriam aceitos apesar do domínio ser "dias".

### R04 — Desconto é percentual aplicado uma vez sobre o total
`Desconto` é um percentual aplicado uma única vez ao valor total: `desconto = valorTotal * (Desconto/100)`.
*Por quê:* cálculo previsível e transparente no faturamento.
*Regressão:* se interpretado como valor fixo em R$, um "10" viraria R$10 em vez de 10%, quebrando pedidos acima de R$100.
*Ressalva:* **não há bounds check** — `Desconto = 150` ou `-10` são aceitos e usados no cálculo sem validação de range (ver D13).

### R05 — `Parcelamento` = (`Quantidade_parcelas` > 1)
`Parcelamento` é `TRUE` quando `Quantidade_parcelas > 1`, `FALSE` caso contrário (à vista / 1 parcela).
*Por quê:* flag booleano para interface e filtros de condições parceladas.
*Regressão:* se ficar `FALSE` para uma condição de 3 parcelas, filtros que usam o flag ignoram a condição incorretamente.
*Ressalva:* recalculado no UPDATE **apenas** quando `prazoPagamento` é enviado (linha 381). Um UPDATE que muda só desconto não recalcula `Parcelamento` — mas como o intervalo também não muda nesse caso, o flag permanece coerente. Inconsistência real só ocorre via escrita SQL direta ou parsing quebrado (ver D02).

### R06 — Descrição automática usa apenas o ÚLTIMO prazo (corrige spec)
Quando a descrição não é fornecida, `gerarDescricao()` a monta como `${forma} - ${prazo} dias - desc extra ${desconto}%`,
usando **apenas o último valor do intervalo** (`prazoPagamento`), não todas as parcelas.
*Por quê:* nomeação consistente e busca na interface.
*Correção vs spec:* o spec afirmava que a descrição inclui todas as parcelas (`10/15/20`). **Isso é falso.** Para entrada `10/15/20`, a descrição gerada é `"PIX - 20 dias - desc extra 0%"` — as parcelas intermediárias (10, 15) ficam ocultas. Se a descrição legível de todas as parcelas for requisito de auditoria, é um gap: só `formatarPrazoPagamento()` (em `condicaoPagamento.ts`) produz o formato `3x (10 / 15 / 20 dias)`, e ele não é usado na geração da descrição salva.

### R07 — Forma de pagamento obrigatória; meio de pagamento opcional
`forma_pagamento_id` é obrigatório no CREATE (linhas 287–289); `meio_pagamento` é opcional e mais granular (instituição).
*Por quê:* forma define a categoria ampla (PIX vs transferência); meio detalha a instituição.
*Regressão:* sem `forma_pagamento_id`, a emissão não determina o método de pagamento.
*Ressalva:* no UPDATE não há como **limpar** `forma_pagamento_id` (omitir mantém o valor; não existe caminho para setar `NULL`). Assimetria CREATE/UPDATE (ver D14).

### R08 — Valor mínimo é apenas metadado (não enforçado na emissão)
`valor_minimo` é o valor total mínimo do pedido para a condição ser válida.
*Por quê:* condições de prazo longo (30/60/90) podem exigir um piso de pedido.
*Correção vs spec:* **nenhuma função de emissão valida `valor_minimo`.** `emitirpedido` e `emitir-pedido-sem-vendedor` só selecionam `intervalo_parcela, Desconto` da condição — não leem `valor_minimo`. Não há `if (valorPedido < condicao.valor_minimo) throw`. Hoje o campo é informativo (eventual enforcement só existiria em UI/RLS/trigger — não confirmado). Ver D05.

### R09 — Condição de crédito é apenas metadado (não enforçada na emissão)
`Condição_de_crédito` (boolean) marca condições que, por regra de negócio, exigiriam aprovação de crédito.
*Por quê:* vendas parceladas podem demandar análise adicional.
*Correção vs spec:* **nenhuma função de emissão bloqueia** quando `Condição_de_crédito = true`. O campo é salvo e retornado pela API, mas não dispara validação de score no código de emissão. Hoje é metadado. Ver D07.

### R10 — Prazo é processado em array no CREATE, mas conteúdo não é validado
No CREATE/UPDATE, `prazoPagamento` (string) é convertido por `processarPrazoPagamento`: `'30/60/90'` → `[30, 60, 90]`;
`''` → `[]` (à vista, 1 parcela, prazo 0).
*Por quê:* estrutura os dados de entrada em array processável na escrita.
*Correção vs spec:* a validação de **conteúdo numérico não é aplicada** na API v2. O validador com regex (`validarPrazoPagamento` em `condicaoPagamento.ts`, que rejeita `abc` e exige ordem crescente) **existe mas não é chamado** pela edge function. Só a checagem de string vazia (linha 291) roda. Logo `'abc/def'` passa e vira `intervaloParcela: []`. Ver D11.

### R11 — Descrição regenerada no UPDATE mistura valores novos (body) + antigos (banco pré-UPDATE)
Se o UPDATE altera `formaPagamentoId`, `prazoPagamento` ou `descontoExtra` **sem** fornecer `descricao`, a descrição
é regenerada. Para cada componente **não** enviado no body, o valor é buscado no banco **antes** de aplicar o UPDATE.
*Por quê:* mantém a descrição sincronizada sem exigir reenvio de todos os campos.
*Regressão / comportamento contra-intuitivo:* `gerarDescricao` recebe uma mistura — ex: novo prazo (do body) + desconto antigo (buscado do banco pré-UPDATE, linhas 416–426). O resultado reflete o estado pós-update dos campos enviados, mas o estado pré-update dos campos omitidos. Quando prazo e desconto mudam juntos mas só um vem no body, a descrição pode não bater com o estado final da linha.

### R12 — `Prazo_pagamento` (escalar) = último valor do intervalo
`Prazo_pagamento` é sempre o último elemento de `intervalo_parcela` (ex: `10/15/20` → `20`).
*Por quê:* simplifica consultas que só precisam do prazo máximo (ex: política de crédito por dias máximos).
*Regressão:* se não acompanhar o último intervalo, análises de prazo ficam incorretas. Mantido em sincronia por `processarPrazoPagamento` no CREATE/UPDATE.

### R13 — Divisão de parcelas com ajuste na última (fechamento do total)
O valor total é dividido igualmente entre os intervalos, com a última parcela ajustada para fechar o total (arredondamento).
*Por quê:* garante soma das parcelas = valor total, sem centavos perdidos.
*Regressão:* sem ajuste na última, a soma poderia divergir do total em centavos.
*Nota:* a lógica de emissão vive nas funções `emitir*`, não na `condicoes-pagamento-v2`; confirmar o cálculo exato ao mexer nessas funções.

### R14 — Sincronização `Quantidade_parcelas === intervalo_parcela.length` só na API v2
A API v2 sempre calcula ambos os campos juntos a partir de `prazoPagamento`, garantindo a igualdade em CREATE e em UPDATE
que envia `prazoPagamento`.
*Por quê:* evita divergência entre os dois campos que descrevem a mesma coisa.
*Correção vs spec / ressalva:* **não há CHECK CONSTRAINT no banco** e a RPC alternativa (`rpc_insert_condicao_pagamento`)
aceita `quantidade_parcelas` e `intervalo_parcela` como parâmetros **independentes**, permitindo violação
(ex: `quantidade_parcelas=3` com `intervalo=[10,20]`). Escritas SQL diretas também escapam da sincronização. A garantia é só a nível de código da v2.

## Dúvidas em aberto

As dúvidas cujo comportamento já está claro no código foram absorvidas nas regras acima e marcadas [RESPONDIDA].
Permanecem abertas as que dependem de decisão de negócio ou verificação em ambiente.

### D04 — Semântica de "à vista": `[0]` vs `[]` — resolver com o cliente
`prazoPagamento='0'` produz `{quantidadeParcelas:1, prazoPagamento:0, intervaloParcela:[0]}`, enquanto `''` produz
`intervaloParcela:[]`. Ambos representam "à vista", mas geram arrays diferentes.
**Como resolver:** decisão de negócio (**cliente**). Definir qual é a forma canônica de "à vista" e, se necessário, normalizar no `processarPrazoPagamento`.

### D05 — `valor_minimo` deveria ser enforçado na emissão? — verificar em ambiente
[Parcialmente RESPONDIDA no código] Confirmado que **nenhuma função de emissão valida** `valor_minimo` (ver R08).
Aberto: é intencional (campo puramente informativo) ou falta enforcement?
**Como resolver:** **Playwright** — tentar emitir um pedido abaixo do `valor_minimo` de uma condição e observar se algo (UI/RLS/trigger) bloqueia. Se nada bloquear, confirmar com o cliente se deveria bloquear.

### D07 — `Condição_de_crédito` deveria bloquear emissão sem aprovação? — verificar em ambiente
[Parcialmente RESPONDIDA no código] Confirmado que **nenhuma emissão bloqueia** por esse flag (ver R09).
Aberto: é metadado por design ou deveria disparar validação de score/aprovação?
**Como resolver:** **Playwright** — emitir pedido usando condição com `Condição_de_crédito=true` sem aprovação prévia e observar se é bloqueado. Confirmar intenção com o cliente.

### D11 — CREATE deveria usar `validarPrazoPagamento` (regex + ordem crescente)? — decisão de negócio/código
O validador robusto existe em `condicaoPagamento.ts` mas **não é chamado** pela edge function; só a checagem de
string vazia roda, permitindo `'abc/def'` → `intervalo_parcela: []` sem erro.
**Como resolver:** **código** — decidir se a v2 deve chamar `validarPrazoPagamento` antes de `processarPrazoPagamento` (rejeitando formato inválido e ordem não-crescente). Envolve decisão de negócio sobre rejeitar vs normalizar.

### D12 — Registro "quebrado por parsing" x "à vista real" — decisão de negócio
Entrada inválida (`'abc'`) resulta em `quantidadeParcelas=1`, `Parcelamento=FALSE`, `intervalo_parcela=[]` — indistinguível
de uma condição à vista legítima, embora seja falha de parsing.
**Como resolver:** ligada a D11. Se D11 for resolvida com validação de conteúdo, D12 desaparece. Requer decisão do cliente sobre o tratamento.

### D13 — `Desconto` sem validação de range (0–100) — decisão de negócio/código
`Desconto=150` ou `-10` são aceitos e entram no cálculo `valorTotal * (Desconto/100)` sem bounds check.
**Como resolver:** **código** — adicionar validação de faixa `0 <= Desconto <= 100`, se o negócio confirmar que esse é o intervalo válido.

### D14 — Não é possível limpar `forma_pagamento_id`/campos via UPDATE — decisão de design
UPDATE só altera campos presentes no body; não há caminho para setar `forma_pagamento_id` como `NULL`.
Como `forma_pagamento_id` é obrigatório (R07), na prática isso não é um problema para esse campo, mas a assimetria
existe para campos opcionais (ex: `meio_pagamento`).
**Como resolver:** **código/design** — decidir se UPDATE deve suportar limpar campos opcionais explicitamente (ex: enviar `null`).

### D15 — Divergência entre rotas de escrita (API v2 x RPC x SQL direto) — decisão de arquitetura
A API v2 sincroniza `Quantidade_parcelas` e `intervalo_parcela`; a RPC `rpc_insert_condicao_pagamento` e SQL direto não.
Sem CHECK CONSTRAINT, o banco não protege a invariante.
**Como resolver:** **código/banco** — avaliar adicionar CHECK CONSTRAINT (`array_length(intervalo_parcela,1) = Quantidade_parcelas`) ou eliminar/ajustar a RPC para forçar a mesma sincronização. Decisão de arquitetura sobre qual rota é canônica.
