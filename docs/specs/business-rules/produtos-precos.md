# Produtos, Listas de Preço & Comissionamento

> Regras de negócio do domínio de produtos, precificação por lista e comissionamento de vendedores.
> Base de código verificada: `supabase/migrations/082_commission_logic_update.sql`, `117_baseline_prod_functions_20260601.sql`, `schema_baseline.sql`, `SaleFormPage.tsx`, `StatusMixSettings.tsx`, `types/listaPreco.ts`, `types/condicaoPagamento.ts`.

## Regras de negócio

1. **Preço do produto por cliente = preço da lista + desconto padrão do cliente.**
   O preço que um cliente vê para um produto é determinado pela lista de preço associada ao cliente, com o desconto padrão do cliente aplicado sobre o `valorUnitario` de cada item (via `percentualDescontoPadrao`).
   *Por quê:* Define a base comercial de cada transação; dois clientes com descontos diferentes veem preços diferentes do mesmo produto.
   *Regressão:* Se o desconto padrão do cliente não for aplicado ao preço da lista, o cliente vê preço cheio; se o preço da lista muda, pedidos já criados continuam referindo-se ao valor gravado no momento (o snapshot é o item do pedido, não a lista viva).

2. **Faixa de desconto para comissão é intervalo `[min, max]` inclusivo em ambas as pontas.**
   A faixa é definida por `(desconto_minimo, desconto_maximo)` em percentual. O match no SQL usa `desconto BETWEEN desconto_minimo AND desconto_maximo` — ou seja, `min <= desconto <= max`, inclusivo dos dois lados (não `min < valor <= max`). `desconto_maximo = null` significa "sem limite superior" (ver Dúvida em aberto DUV_06/DUV_07).
   *Por quê:* Determina qual percentual de comissão o vendedor recebe conforme o desconto do cliente.
   *Regressão:* Se a inclusão das pontas mudar (ex.: passar a `>` ou `<`), um desconto que caía exatamente em `min` ou `max` deixa de casar e a comissão vira 0 silenciosamente.

3. **Uma lista de preço usa exatamente um modelo de comissão: `fixa` OU `conforme_desconto`.**
   O enum `TipoComissao = 'fixa' | 'conforme_desconto'` (`types/listaPreco.ts`) impede simultaneidade no schema. Nunca os dois ao mesmo tempo.
   *Por quê:* Sem exclusividade o cálculo fica ambíguo — qual percentual aplicar se houvesse ambos?
   *Regressão:* Se ambos coexistissem, o cálculo retornaria resultado inconsistente ou quebraria por campo faltando.

4. **Vendedor com `dados_vendedor."Comissão" = 2` (alíquota fixa) recebe percentual constante de `aliquotafixa`.**
   O percentual vem de `dados_vendedor.aliquotafixa` (`coalesce(..., 0)`), independente de desconto, lista ou cliente. Migration 082 aplica o tipo 2 sem consultar lista nem desconto.
   *Por quê:* Simplifica o comercial: vendedor tem percentual fixo em qualquer venda.
   *Regressão:* Se o sistema passar a buscar comissão na lista do cliente mesmo para tipo 2, o vendedor recebe menos que o combinado.

5. **Vendedor com `dados_vendedor."Comissão" = 1` (por lista) recebe o percentual de `listas_preco_comissionamento` casando a lista do cliente + o DESCONTO PADRÃO DO CLIENTE.**
   > **Correção da regra original:** o lookup usa `coalesce(c.desconto, 0)` — o campo `desconto` da tabela `cliente` (desconto padrão do cliente), **não** o desconto do pedido nem o `descontoExtra` da condição de pagamento. O match é `lista_preco_id = cliente.lista_de_preco AND cliente.desconto BETWEEN desconto_minimo AND desconto_maximo`, `ORDER BY desconto_minimo ASC, id ASC LIMIT 1`. Se nenhuma faixa casa, `v_percentual := 0`.
   *Por quê:* Alinha comissão ao desconto do cliente — vendedor ganha menos quando o cliente tem desconto maior.
   *Regressão:* Se o lookup falha (cliente sem lista, sem faixa correspondente, ou `desconto` NULL), a comissão vira 0 **silenciosamente** — sem erro ou aviso ao usuário.

6. **Valor da comissão = `round(valor_total_pedido * percentual / 100, 2)` — sempre 2 casas.**
   Arredondamento contábil a 2 casas via `round(..., 2)` em migration 082. (Nota: no `SaleFormPage` a função de UI `truncarPara2Casas()` **trunca** 2 casas para exibição — o valor gravado de comissão é o `round` do banco.)
   *Por quê:* Define precisão contábil; arredondar em posição errada acumula centavos em grande volume.
   *Regressão:* Se mudar para 3 casas ou 0, saldos divergem centavo a centavo ao longo do tempo.

7. **Pedido com `natureza_operacao = 'Bonificação'` (exato, case-sensitive, com til) não gera comissão; status = `bonificacao_sem_comissao`.**
   A checagem é `if v_pedido.natureza_operacao = 'Bonificação'` sem `LOWER()`. Variações de caixa (`bonificação`, `BONIFICACAO`, sem til) NÃO acionam a regra.
   *Por quê:* Bonificação é operação sem margem; nunca deve gerar comissão.
   *Regressão:* Se a bonificação gerar comissão, o vendedor ganha sobre venda de custo zero; qualquer variação de grafia contorna a regra.

8. **Constraint de faixa no banco é frouxa (`<=`); não há validação estrita no TypeScript.**
   > **Correção da regra original:** a constraint em `schema_baseline.sql` é `desconto_minimo <= desconto_maximo` (`<=`, permite `min == max`). **Não existe** validação estrita (`<`) no TypeScript — `types/listaPreco.ts` não valida faixa. Portanto faixas degeneradas como `[10, 10]` são aceitáveis pela constraint.
   *Por quê:* A intenção é garantir intervalo válido, mas hoje só o banco valida, e de forma permissiva.
   *Regressão:* Faixas `[10,10]` são inseríveis; sem validação de aplicação, faixas invertidas `[20,15]` só são barradas pela constraint do banco (que rejeita porque `20 <= 15` é falso).

9. **Produto aparece no seletor de venda se `preco > 0 AND disponivel !== false AND ativo !== false` — filtro só no frontend.**
   Filtro em `SaleFormPage.tsx` (`produtosDisponiveisParaPedido`). Não é imposto na API.
   *Por quê:* Impede vender produto sem preço ou descontinuado.
   *Regressão:* Um produto marcado `disponivel=false` some de novos pedidos, mas pedidos já abertos continuam referenciando-o; a API não bloqueia, então é contornável fora da UI.

10. **Aba Mix exibe só produtos "principais" — filtro client-side por tipo.**
    `StatusMixSettings.tsx` filtra no cliente, excluindo produtos ativados manualmente e (conforme a regra de produto) tipos promocionais/brindes. O filtro é client-side.
    *Por quê:* Foca o mix em produtos principais; promocionais e brindes são pontuais.
    *Regressão:* Se o filtro for removido, brindes aparecem como produtos preferidos e poluem os dados de mix.

11. **Apenas usuários `tipo = backoffice` podem criar/atualizar/deletar listas de preço; GET é liberado para autenticados.**
    A validação backoffice-only está na Edge Function (`listas-preco-v2`), não no cliente. O cliente valida `backoffice` em `App.tsx` / `SaleFormPage.tsx` para UI.
    *Por quê:* Preço é decisão estratégica; vendedor não muda lista sozinho.
    *Regressão:* Se a validação server-side for removida, um vendedor altera a lista e quebra a comissão de outros vendedores. (Ver DUV: a proteção real depende da Edge Function, não da UI.)

12. **Deletar lista de preço remove `produtos_listas_precos` e `listas_preco_comissionamento` antes do master.**
    Migration 117 deleta em ordem (produtos e comissionamento antes do registro-mestre), com CASCADE FK de fallback. **Débito conhecido:** políticas RLS `allow_all` em prod permitem DELETE direto, contornando a ordem manual (ver MEMORY: `rls-allow-all-pendente`).
    *Por quê:* Garante integridade referencial; sem ordem, sobram registros órfãos.
    *Regressão:* Se o DELETE manual for pulado e o CASCADE não cobrir, produtos e faixas órfãs consomem storage e geram consultas inconsistentes.

13. **Lista de produtos ordena por `descricao ASC` (alfabética).**
    Migration 117 usa `ORDER BY p.descricao` (alfabético). A ordenação por `created_at DESC` foi substituída por motivo de performance. (O `LIMIT 2000` citado na regra original **não foi confirmado** no SQL lido — ver Dúvida em aberto.)
    *Por quê:* Ordenação alfabética é determinística e barata; evita timeout de statement no Postgres.
    *Regressão:* Se a ordenação mudar para colunas não indexadas ou pesadas, a query pode voltar a estourar `statement_timeout`.

14. **Cliente tem `pedido_minimo`; a validação é APENAS frontend.**
    > **Correção da regra original:** o mínimo é validado só em `SaleFormPage.tsx` (filtro de condições). **A API não valida** `pedido_minimo` nem rejeita com 400 — é contornável via chamada direta.
    *Por quê:* Protege o vendedor de pedidos não viáveis; o cliente exige quantidade mínima.
    *Regressão:* Como não há hard-block na API, um pedido abaixo do mínimo pode ser criado fora da UI.

15. **Produto soft-deleted (`situacao = 'Excluído'`) mantém a linha; pedidos antigos continuam válidos por referência histórica.**
    Soft-delete preserva a row; queries de listagem filtram `.is('deleted_at', null)` (ou `situacao <> 'Excluído'`), então o produto some de listas futuras mas o pedido já criado continua referenciando `produto_id`. O item do pedido não guarda snapshot de foto/nome além do que já foi gravado.
    *Por quê:* Preserva histórico; um pedido antigo não deve quebrar porque o produto foi descontinuado.
    *Regressão:* Se o soft-delete virar hard-delete, pedidos antigos perdem a referência e quebram exibição/relatórios.

16. **`descontoExtra` da condição de pagamento é armazenado mas NUNCA aplicado ao preço nem à comissão.**
    > **Regra refutada/reescrita (originais 16 e 17 da entrada):** `condicaoPagamento.descontoExtra` existe em `types/condicaoPagamento.ts`, porém **não é lido** em `SaleFormPage.tsx` nem somado em migration 082. O cálculo de comissão usa apenas `cliente.desconto`. O `percentualDescontoExtra` do **pedido** (campo próprio do formulário) é subtraído do total na UI, mas isso é distinto do `descontoExtra` da condição de pagamento.
    *Por quê:* Documentado para transparência: o campo existe no modelo mas está inerte no fluxo atual.
    *Regressão:* Se algum código passar a somar o `descontoExtra` da condição ao desconto do cliente, a faixa de comissão (tipo 1) muda e o vendedor passa a ganhar mais/menos que hoje. Se a intenção era somar, isto é um bug latente (ver DUV).

17. **Denormalização de `nome_marca`, `nome_tipo_produto`, `sigla_unidade` no produto: CREATE valida, UPDATE não.**
    O CREATE busca e valida os nomes das tabelas de lookup; o UPDATE tenta buscar mas não valida, podendo deixar valores obsoletos se o lookup falhar.
    *Por quê:* Denormalização evita JOINs caros e acelera leitura.
    *Regressão:* Se o UPDATE não rebuscar os nomes, o produto exibe marca/tipo desatualizado após mudança na tabela de origem.

## Dúvidas em aberto

Apenas as que a verificação considerou realmente ambíguas. As demais viraram regras acima.

- **DUV_06 / DUV_07 — Semântica de `desconto_maximo = null` na faixa de comissão.**
  `desconto_maximo` NULL semanticamente significa "sem limite superior". **Porém**, no SQL, `desconto BETWEEN desconto_minimo AND NULL` avalia como `NULL` (falso lógico), então uma faixa com `max = NULL` **nunca casaria** via `BETWEEN`. Não foi localizado tratamento especial (ex.: `coalesce(desconto_maximo, 100)` ou `desconto_maximo IS NULL OR desconto <= desconto_maximo`) em migration 082. O TypeScript normaliza `null -> 100` ao enviar, o que evitaria o problema no fluxo normal, mas linhas gravadas direto no banco com `max = NULL` seriam invisíveis ao match.
  *Como resolver:* código (grep no `BETWEEN`/lookup de comissão) para confirmar se há normalização; confirmar com o cliente a intenção ("sem limite" vs "até 100%").

- **DUV_08 — Por que `ORDER BY descricao` e não `created_at`/última modificação?**
  Confirmado que a ordenação é alfabética por performance, mas se isso é a UX desejada (usuário espera ver produtos recém-alterados no topo?) é decisão de produto.
  *Como resolver:* cliente.

- **DUV_09 — Estados virtuais do Mix (`ativo` / `inativo` / `sem_cadastro`).**
  A tabela `status_mix` não foi localizada em `schema_baseline.sql`; o código menciona os estados mas a implementação (como `sem_cadastro` = ausência de row é diferenciado de `inativo`, e como a flag "ativado manualmente" é setada/resetada) não está clara. A regra original sobre `UNIQUE(cliente_id, produto_id)` e sobre a detecção invertida de reativação manual **não pôde ser confirmada** no schema lido.
  *Como resolver:* código (localizar a definição de `status_mix` e a lógica de ativação manual em `StatusMixSettings.tsx`).

- **DUV_11 — Atribuir lista inativa (`listas_preco.ativo = false`) a cliente novo.**
  A coluna `ativo` existe em `listas_preco`, mas não foi encontrada validação que impeça atribuir uma lista inativa a um cliente. Não está claro se é bloqueio ou apenas ocultação na UI.
  *Como resolver:* código (procurar validação de `ativo` no fluxo de atribuição de lista ao cliente).

- **DUV (nova) — Comportamento quando `dados_vendedor."Comissão"` é NULL.**
  Se o tipo de comissão do vendedor é NULL (não setado), migration 082 cai no `ELSE` e faz `RAISE EXCEPTION 'Tipo de comissão inválido'`. Não está claro se esse erro é capturado no frontend ou se o pedido salva e a geração de comissão falha silenciosamente/quebra.
  *Como resolver:* código (rastrear o call-site de `generate_vendedor_comissao` e tratamento de erro).

- **DUV (nova) — `LIMIT 2000` na lista de produtos.**
  A regra original menciona `LIMIT 2000` para evitar `statement_timeout`, mas o SQL de migration 117 mostra `ORDER BY descricao` sem `LIMIT`. Não confirmado se o LIMIT existe em outra camada (Edge Function/api.ts) ou se foi removido.
  *Como resolver:* código (grep `2000` / `.limit(` no caminho de listagem de produtos).

- **DUV (nova) — Foto do produto: lazy-load via IntersectionObserver.**
  A regra original afirma lazy-load de fotos por `IntersectionObserver` com fotos setadas `undefined` no SELECT de lista. **Não foi encontrada** evidência disso em `SaleFormPage`. Não confirmado se o lazy-load está em outro componente de listagem ou se a regra é obsoleta.
  *Como resolver:* código (grep `IntersectionObserver` / carregamento de foto sob demanda).
