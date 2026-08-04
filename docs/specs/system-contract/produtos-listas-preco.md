# Contrato — Produtos & Listas de Preço

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Invariantes

### Produto.situacao restrita a três valores

A `situacao` do Produto é restrita aos valores `'Ativo'`, `'Inativo'` ou `'Excluído'` via CHECK constraint no banco de dados. O DELETE soft-deleta corretamente definindo `situacao='Excluído'`. O CREATE no UI padrão e o import validam os valores. Porém, CREATE e UPDATE na função Edge (`produtos-v2`) **não** validam `body.situacao` antes de enviá-lo ao banco, dependendo apenas do constraint de database para rejeitar valores inválidos.

- **Tipo:** invariant
- **Evidência:**
  - `src/types/produto.ts:27` — `SituacaoProduto = 'Ativo' | 'Inativo' | 'Excluído'`
  - `supabase/schema_baseline.sql` (constraint `produto_situacao_check`) — `situacao IN ('Ativo', 'Inativo', 'Excluído')`
  - `supabase/functions/produtos-v2/index.ts:516-517, 722-723` — create seta `situacao='Ativo'`, delete seta `situacao='Excluído'` e `ativo=false`
  - Contraexemplo: `supabase/functions/produtos-v2/index.ts:516` (create sem validação) e `:649` (update sem validação) aceitam `body.situacao` sem verificar se está em `['Ativo','Inativo','Excluído']`
- **Regressão se:** o constraint for removido ou um quarto valor (ex.: `'Cancelado'`) for inserido. Produtos com `situacao` inválida ficam não consultáveis ou causam erro de parsing.

---

### Lista de preço usa exatamente um tipo de comissão: fixa ou conforme_desconto

Cada `ListaPreco.tipoComissao` é `'fixa'` (percentual fixo) ou `'conforme_desconto'` (faixas por desconto). Se `tipoComissao='fixa'`, usa-se `percentualFixo`. Se `tipoComissao='conforme_desconto'`, o array `faixasDesconto` define a comissão por faixa de desconto. Uma lista não pode ter os dois.

- **Tipo:** invariant
- **Evidência:**
  - `src/types/listaPreco.ts:23-31` — `TipoComissao = 'fixa' | 'conforme_desconto'`; campos condicionais `percentualFixo` (fixa) ou `faixasDesconto` (conforme_desconto)
  - `supabase/functions/listas-preco-v2/index.ts:264-276` — validação POST: se `tipoComissao='conforme_desconto'`, `faixasInput.length` deve ser `> 0`
  - `supabase/functions/listas-preco-v2/index.ts:108-109` — `formatListaPreco` determina `tipoComissao` pela presença de linhas de faixas; se existem faixas, o tipo é `'conforme_desconto'`
- **Regressão se:** uma lista for criada com `percentualFixo` e `faixasDesconto` não-vazio simultaneamente. Cálculo de comissão retorna resultados inconsistentes ou quebra por campos ausentes.

---

### Faixas de desconto devem ter descontoMin < descontoMax (ou descontoMax=null aberta)

Para `tipoComissao='conforme_desconto'`, a validação de faixa é imposta **apenas** pela API REST TypeScript (`index.ts:268-275`): rejeita quando `max != null AND max <= min`. Porém, funções SQL alternativas (`create_lista_preco_v2`, `update_lista_preco_v2`) existem em migrations e permitem inserts diretos **sem validação**. O constraint de banco `lpc_min_le_max` permite `desconto_minimo = desconto_maximo` (`<=` não-estrito), contradizendo o requisito de `<` estrito. A normalização null→100 está corretamente implementada em TypeScript, mas `update_lista_preco_v2` usa `999.99` em vez de `100`.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/functions/listas-preco-v2/index.ts:268-275` — validação POST: se `max != null && max <= min`, lança erro `'Faixas de desconto inválidas'`
  - `supabase/functions/listas-preco-v2/index.ts:379-386` — validação PUT: mesmo check
  - `supabase/functions/listas-preco-v2/index.ts:306-316, 429-439` — no insert/update, `max == null ? 100 : Number(max)` normaliza faixas abertas para 100
  - `supabase/schema_baseline.sql` (CHECK `lpc_min_le_max`) — `desconto_minimo <= desconto_maximo`
  - Contraexemplo: `supabase/migrations/122_baseline_prod_functions_20260601.sql:6887-6897` — `update_lista_preco_v2` insere faixas com `COALESCE(..., 999.99)` sem validar `desconto_minimo < desconto_maximo`
- **Regressão se:** a validação for removida. Faixas inválidas com min/max invertidos são persistidas; lookups de comissão retornam percentuais errados ou falham silenciosamente.

---

### Cada par cliente-produto em status_mix é único

A tabela `status_mix` tem constraint UNIQUE em `(cliente_id, produto_id)`. Só existe um registro de status por combinação cliente-produto. Upserts usam esse constraint para atualizar registros existentes.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/migrations/137_status_mix_table.sql:13` — `UNIQUE (cliente_id, produto_id)`
  - `src/components/CustomerMixTab.tsx:149-152` — upsert com `onConflict: 'cliente_id,produto_id'`
  - `supabase/functions/status-mix-v2/index.ts:98-101` — endpoint PUT faz upsert com `onConflict: 'cliente_id,produto_id'`
- **Regressão se:** linhas `(cliente_id, produto_id)` duplicadas forem inseridas. UI mostra status conflitantes ou erro de integridade no upsert.

---

### Denormalização de Marca, Tipo e Unidade no produto (parcial no UPDATE)

O produto armazena cópias denormalizadas de `marca.nome`, `ref_tipo_produto.nome` e `ref_unidade_medida.sigla` em `nome_marca`, `nome_tipo_produto` e `sigla_unidade`. A action de update em `produtos-v2` **tenta** buscar e atualizar esses campos, mas só o faz se a query de lookup tiver sucesso e encontrar o registro. Se o ID for inválido ou o lookup falhar, os campos denormalizados são silenciosamente não atualizados, podendo deixar dados obsoletos no banco (embora constraints FK eventualmente rejeitem a operação inteira). O CREATE valida a existência antes de prosseguir; o UPDATE não valida.

- **Tipo:** invariant
- **Evidência:**
  - `supabase/functions/produtos-v2/index.ts:593-630` — update: se `marcaId/tipoProdutoId/unidadeId` muda, busca da tabela de lookup e atualiza `nome_marca/nome_tipo_produto/sigla_unidade`
  - `supabase/functions/produtos-v2/index.ts:519-521` — create: busca nomes das tabelas de lookup e armazena nos campos denormalizados
  - `supabase/schema_baseline.sql` (tabela produto) — `marca` (FK)/`nome_marca` (text); `tipo_id` (FK)/`nome_tipo_produto` (text); `unidade_id` (FK)/`sigla_unidade` (text)
  - Contraexemplo: `supabase/functions/produtos-v2/index.ts:593-604` — ao atualizar `marcaId`, faz `if (marca) { updateData.nome_marca = marca.nome }` sem `else`/erro se `marca` for NULL; compare com CREATE (`:483-485`) que faz `if (!marca) throw Error()`
- **Regressão se:** a lógica de update pular a atualização dos campos denormalizados. Produtos mostram marca/tipo/unidade desatualizados após a tabela de lookup ser modificada.

---

## Regras de negócio

### Produto elegível para venda: preco > 0 AND disponivel=true AND ativo=true

Ao selecionar produtos para um pedido de venda (`SaleFormPage`), só produtos com `preco > 0 AND disponivel !== false AND ativo !== false` aparecem no combobox seletor. O filtro aplica-se aos produtos vindos de `lista_preco_produtos` (registros master `produto` juntados via RPC). Porém: (1) o filtro é **frontend-only**, aplicado ao renderizar `produtosDisponiveisParaPedido`; (2) `ativo` e `disponivel` são flags globais da tabela `produto`, não específicas por lista; (3) itens de vendas existentes **não** são refiltrados retroativamente; (4) um produto pode ser `ativo=true` mas indisponível a todos os vendedores via `disponivel=false` — não é mecanismo por-vendedor ou por-lista.

- **Tipo:** business-rule
- **Evidência:**
  - `src/components/SaleFormPage.tsx:317` — `.filter(pp => pp.preco > 0 && pp.disponivel !== false && pp.ativo !== false)`
  - `src/types/listaPreco.ts:1-14` — `ProdutoPreco` inclui `preco`, `ativo`, `disponivel`
  - `src/data/mockProdutos.ts` (dados de exemplo) — `ativo=true/disponivel=true` (normal); `ativo=true/disponivel=false` (oculto); `situacao='Excluído'` (soft-deletado)
  - Contraexemplo: `src/components/SaleFormPage.tsx:642-645` — carrega e exibe itens de venda existentes sem reaplicar o filtro, permitindo produtos com `disponivel=false` ou `ativo=false` se adicionados antes da flag mudar
- **Regressão se:** um produto com `preco=0` ou `disponivel=false` for vendido; ou um produto for removido de uma lista sem removê-lo de pedidos já criados com essa lista.

---

### Aba Mix só mostra produtos Ativos e de tipo não-promocional

Ao carregar produtos para a aba Mix do cliente (`CustomerMixTab`), só produtos com `situacao='Ativo'` E cujo nome de tipo **não** contém `'promo'` nem `'brinde'` são incluídos. Tipo vazio ou tipo contendo `'revenda'` são permitidos. Este é um filtro client-side, não imposto na API.

- **Tipo:** business-rule
- **Evidência:**
  - `src/components/CustomerMixTab.tsx:36-49` — filtro: `tipoNome.includes('revenda') || (!includes('promo') && !includes('brinde'))`; aplica-se a produtos com `situacao='Ativo'`
  - `src/types/statusMix.ts:1-17` — `StatusMix` liga um produto a um cliente com status `'ativo'` ou `'inativo'`
- **Regressão se:** o filtro de tipo for removido. Produtos promocionais e brindes aparecem no mix do cliente, causando classificação errada das preferências.

---

### Auto-ativação de produto no mix por pedido (detecção invertida)

O sistema tenta proteger produtos desativados manualmente contra reativação automática ao carregar o mix do cliente (`CustomerMixTab`), MAS a detecção de "manualmente desativado" está **invertida**: procura por `ativadoManualmente=false & status='inativo'` em vez de `ativadoManualmente=true & status='inativo'`. Quando um usuário reativa um produto (toggle para ativo), o campo `ativado_manualmente` deveria ser resetado para `false` no mesmo upsert, mas não é. Assim, um produto pode ser reativado pelo usuário mas ficar marcado com `ativado_manualmente=true` — inversão semântica da intenção.

- **Tipo:** business-rule (pitfall)
- **Evidência:**
  - `src/components/CustomerMixTab.tsx:114-146` — lógica de auto-ativação: verifica se produto aparece em vendas, pula se `foiManualmenteDesativado`
  - `src/components/CustomerMixTab.tsx:191-207` — toggle manual: seta `ativado_manualmente=true` ao desativar, `false` ao ativar
  - `src/types/statusMix.ts:12` — `StatusMix.ativadoManualmente`: flag booleana de override manual
  - Contraexemplo: `src/components/CustomerMixTab.tsx:125-126` — condição procura `!sm.ativadoManualmente && sm.status === 'inativo'` (`ativadoManualmente=FALSE`), oposto da regra descrita; e `:191-207` não reseta `ativado_manualmente` para `false` no toggle para 'ativo'
- **Regressão se:** a lógica da flag `ativadoManualmente` for revertida ou removida. Produtos desativados manualmente reativam no próximo carregamento de pedido; preferências do cliente são sobrescritas.

---

### Somente usuários backoffice criam, atualizam ou deletam listas de preço

A função edge `listas-preco-v2` verifica `user.tipo === 'backoffice'` para POST, PUT e DELETE. Vendedores não podem executar essas operações. GET é permitido para todos os usuários autenticados.

- **Tipo:** business-rule
- **Evidência:**
  - `supabase/functions/listas-preco-v2/index.ts:255, 367, 474` — POST/PUT/DELETE: `if (user.tipo !== 'backoffice') throw error`; GET (`:173-251`) sem check de tipo
- **Regressão se:** o check de role for removido. Vendedores modificam listas de preço, causando corrupção de dados e cálculos de comissão inconsistentes.

---

## Decisões de arquitetura

### Fotos de produto fora do endpoint de lista, carregadas sob demanda com cache em memória

O endpoint de lista (`action=list`) omite a coluna `foto` do SELECT no banco e explicitamente seta `foto: undefined` na resposta. Fotos são carregadas sob demanda apenas quando o componente `ProductThumbnail` entra no viewport (via IntersectionObserver), chamando `api.getById('produtos', id)`. O `fotoCache` (Map) evita re-fetch. Porém, `ProductsListPage.tsx:498-506` contém código morto que testa `produto.foto`, que nunca será verdadeiro, pois o campo é sempre `undefined` na resposta da lista.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/functions/produtos-v2/index.ts:167-171` — SELECT omite a coluna `foto`; comentário: 'fotos são base64 inline e o payload chegava a ~31MB / ~19s'
  - `src/components/ProductsListPage.tsx:36-73` — `ProductThumbnail`: `fotoCache` Map, IntersectionObserver com `rootMargin` 150px, chama `api.getById('produtos', id)` na interseção
  - `src/components/ProductsListPage.tsx:304` — action de list explicitamente seta `foto: undefined` na resposta
  - Contraexemplo (código morto): `src/components/ProductsListPage.tsx:498-506` — testa `{produto.foto ? ...}` como se `foto` pudesse ser truthy na resposta de lista; sempre cai para `ProductThumbnail`
- **Regressão se:** a coluna `foto` for incluída na query de lista ou o IntersectionObserver removido. Resposta da lista explode para 31MB+, causando timeouts de browser e fallback a mock.

---

### Deleção de produto é soft-delete (parcial no domínio)

A action de delete em `produtos-v2` (tabela `produto`) corretamente **não** remove linhas; usa soft-delete com `deleted_at` timestamp, `situacao='Excluído'` e `ativo=false`, filtrando com `.is('deleted_at', null)`. Porém, a regra **não** é universalmente aplicada no domínio: `listas-preco-v2` usa hard-delete `.delete()` em `listas_preco`, `produtos_listas_precos` e `listas_preco_comissionamento` (nas operações POST, PUT e DELETE), pois essas tabelas não possuem coluna `deleted_at`.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/functions/produtos-v2/index.ts:712-737` — delete: `.update({ deleted_at, situacao: 'Excluído', ativo: false })`; sem `.delete()`
  - `supabase/functions/produtos-v2/index.ts:196, 368` — queries de list/get: `.is('deleted_at', null)` filtra soft-deletados
  - `supabase/functions/status-mix-v2/index.ts:37-38` — tabela de usuário também usa soft-delete: `.is('deleted_at', null)`
  - Contraexemplo: `supabase/functions/listas-preco-v2/index.ts:479-481` (DELETE) — usa `.delete()` direto em `listas_preco`, não soft-delete
- **Regressão se:** hard-delete for usado no lugar. Dados históricos de pedido referenciam IDs de produto inexistentes; trilha de auditoria é perdida.

---

### Deleção de lista de preço faz cascade para produtos e faixas de comissão

Ao deletar uma lista via a função edge `listas-preco-v2`, as linhas em `produtos_listas_precos` e `listas_preco_comissionamento` são deletadas manualmente pela edge function (`:479-480`) antes de deletar o registro master, e constraints FK com `ON DELETE CASCADE` dão proteção de fallback. Porém, RLS policies (`listas_preco allow_all`, `listas_preco_comissionamento allow_all`, `produtos_listas_precos allow_all`) permitem que qualquer usuário autenticado faça DELETE dessas tabelas diretamente, contornando a edge function e sua ordem de deleção manual.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/schema_baseline.sql` (FK constraints) — `fk_listas_preco: ON DELETE CASCADE`; `produtos_listas_precos_lista_preco_id_fkey: ON DELETE CASCADE`
  - `supabase/functions/listas-preco-v2/index.ts:479-481` — DELETE: deleta manualmente `produtos_listas_precos`, `listas_preco_comissionamento`, depois `listas_preco`
  - Contraexemplo: `supabase/schema_baseline.sql:1183, 1184, 1235` — RLS policies `allow_all` permitem DELETE direto contornando a edge function
- **Regressão se:** o cascade for desabilitado ou os deletes manuais forem pulados. Registros órfãos de produto-lista e faixas permanecem, consumindo storage e quebrando integridade referencial.

---

### Query de lista de produtos limitada a 2000 linhas (para evitar statement_timeout)

O endpoint de lista de produtos (`action='list'`) aplica `LIMIT 2000` para evitar `statement_timeout` (60s) do Postgres em produção. O endpoint retorna até 2000 produtos ordenados por `descricao` (ascendente). Esta ordenação é alfabética, não cronológica (não por `created_at`). A UI assume que todos os produtos cabem em 2000 ou implementa filtragem client-side. A query original usava `ORDER BY created_at DESC` e causava timeouts; foi substituída por `ORDER BY descricao` ascendente.

- **Tipo:** arch-decision
- **Evidência:**
  - `supabase/functions/produtos-v2/index.ts:167-198` — comentário: 'LIMIT 2000 + ORDER BY descricao: a query original (SELECT * sem LIMIT + ORDER BY created_at DESC) estava estourando o statement_timeout de 60s'; aplica `.limit(2000)`
  - `supabase/functions/produtos-v2/index.ts:166-171` — comentário do sintoma: 'dropdown de produtos no PriceListFormPage caía em fallback mock silencioso'
  - Contraexemplo: `supabase/functions/produtos-v2/index.ts:776-818` (action `list_import_logs`) usa `limit` variável (1-1000) de query params, provando que o padrão `LIMIT 2000` fixo não é uniforme entre todas as actions do endpoint
- **Regressão se:** o LIMIT for removido. Query retorna >2000 linhas, excede o `statement_timeout`, e cai em mock silenciosamente, ocultando produtos reais.
