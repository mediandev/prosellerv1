# Contrato — Relatórios

> Regras e invariantes verificadas no código. Não editar sem cotejar impacto.

---

## Business rules

### Classificação ABC baseada em acumulado anterior

A classificação de clientes/produtos em Curva A/B/C é determinada pelo percentual acumulado **ANTERIOR** à entrada do cliente, não posterior. Curva A: acumulado anterior < 80%; Curva B: 80% ≤ acumulado anterior < 95%; Curva C: acumulado anterior ≥ 95%.

- **Tipo:** business-rule
- **Evidência:**
  - `/src/components/ABCCurveCard.tsx:117-132` — calcula `acumuladoAnterior` ANTES de acumular; classifica pelo `acumuladoAnterior`, não pelo final.
  - `/src/components/CustomerABCReportPage.tsx:296-310` — classifica ANTES de acumular; comentário explícito "CORREÇÃO: Classificar ANTES de acumular o percentual atual".
- **Regressão se:** a lógica mudar para classificar pelo acumulado DEPOIS de somar o percentual do cliente atual — clientes borderline (perto de 80% e 95%) mudarão de curva.

---

### Parâmetro include_itens ativa retorno de itens do pedido na API (modo LIST)

Quando `api.get('vendas', { params: { include_itens: true } })` é chamado (modo LIST), a Edge Function `pedido-venda-v2` retorna cada pedido com um array `produtos`. Porém, quando `api.getById('vendas', id)` é chamado (modo GET by ID), a Edge Function **SEMPRE** retorna os produtos, independente de qualquer parâmetro. Sem o parâmetro `include_itens` no modo LIST, o array `produtos` não é incluído, e componentes como `ProductABCReportPage` buscam itens diretamente do Supabase como alternativa.

- **Tipo:** business-rule
- **Evidência:**
  - `/src/services/api.ts:1953-1955` — mapeamento `params.include_itens=true` → `baseParams.include_itens='true'` passado à Edge Function.
  - `/supabase/functions/pedido-venda-v2/index.ts:156-228` — GET by ID sempre retorna produtos.
  - `/supabase/functions/pedido-venda-v2/index.ts:287-319` — GET LIST só retorna produtos com a flag `include_itens`.
- **Regressão se:** remover `include_itens` da Edge Function — relatórios que dependem de itens detalhados (Mix, Solicitado/Faturado) ficarão vazios.

---

### Status Mix determina ativação de produto para cliente

Cada combinação (cliente, produto) pode ter um `status_mix` armazenado no banco com valores **'ativo'** ou **'inativo'** somente (imposto por CHECK constraint). Ao exibir o status do mix, o sistema trata registros ausentes na tabela `status_mix` como **'sem_cadastro'** (estado virtual, não armazenado). Essa lógica de três estados (ativo/inativo/sem_cadastro) indica se um produto está ativo no mix do cliente, previamente marcado inativo, ou nunca cadastrado. A camada de banco impede estritamente qualquer valor fora de 'ativo' e 'inativo' via constraint SQL.

- **Tipo:** business-rule
- **Evidência:**
  - `/supabase/migrations/137_status_mix_table.sql:3-14` — tabela `status_mix` com `UNIQUE(cliente_id, produto_id)` e CHECK `status IN ('ativo','inativo')`.
  - `/src/components/RelatorioMixCliente.tsx:270-291` — busca `status_mix` e classifica como 'ativo'/'inativo', ou 'sem_cadastro' (virtual) se não encontrado.
- **Regressão se:** retirar a tabela `status_mix` — o sistema não conseguirá rastrear quais produtos estão ativos para cada cliente.

---

### Relatórios paginam automaticamente até carregar TODOS os dados

Em vez de limitar a resultados de uma página, os relatórios (clientes, vendas, produtos) fazem loop pelas páginas retornadas pela Edge Function até `totalPages`, concatenando resultados. Máximo 100 itens/página na API, mas o relatório coleta tudo.

- **Tipo:** business-rule
- **Evidência:**
  - `/src/components/CustomerABCReportPage.tsx:68-78` — carregamento com paginação: loop com `pagina <= totalPaginas`; concatena todos em `todosClientes`.
  - `/src/services/api.ts:1962-1973` — mesmo padrão para vendas: "percorremos TODAS as páginas e juntamos tudo", em vez de usar `limit=1000` que retornava apenas 100 mais recentes.
- **Regressão se:** remover paginação — relatórios exibirão apenas os primeiros 100 registros; em bases com 960+ clientes, a análise ABC ficará incompleta.

---

### ROI é calculado para os últimos 365 dias (filtro client-side)

Relatório ROI por cliente executa um filtro **client-side** para limitar vendas aos últimos 365 dias, sem UI para período customizado. Contudo, a restrição **não é enforçada server-side**: a API é chamada sem parâmetros de data, recebendo todos os pedidos do cliente, e apenas depois faz o filtro em memória. A API suporta `dataInicio`/`dataFim` mas não os utiliza aqui. Há risco de exposição se o filtro client-side falhar ou for contornado.

- **Tipo:** business-rule
- **Evidência:**
  - `/src/components/RelatorioROICliente.tsx:116-123` — `dataInicio` = 365 dias atrás; filtra vendas `>= dataInicio` em memória.
  - `/src/components/RelatorioROICliente.tsx:120` — `api.get("vendas", { params: { clienteId: clienteSelecionado.id } })` não passa `dataInicio`/`dataFim`.
- **Regressão se:** deixar período customizado afetar o cálculo de ROI — o indicador ficará inconsistente (mesmo cliente com ROI diferente em períodos distintos).

---

### Exportação CSV inclui BOM UTF-8 para compatibilidade Excel (com uma exceção)

A maioria dos exports para CSV (12 de 13 casos) adiciona BOM (Byte Order Mark) UTF-8 no início do arquivo e usa `charset=utf-8` para garantir leitura correta de caracteres acentuados no Excel e LibreOffice. **Exceção conhecida:** `SellerCommissionsPage.tsx` viola esse padrão ao exportar CSV sem BOM, criando inconsistência na aplicação da regra.

- **Tipo:** business-rule
- **Evidência:**
  - `/src/components/CustomerABCReportPage.tsx:414` — `new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })`.
  - `/src/components/RelatorioMixCliente.tsx:389` — mesmo padrão de BOM na exportação Mix.
  - `/src/components/SellerCommissionsPage.tsx:221` — `new Blob([csvContent], { type: "text/csv;charset=utf-8;" })` — SEM BOM (contraexemplo).
- **Regressão se:** remover o BOM — a acentuação será corrompida no Excel ("São Paulo" vira gibberish em algumas máquinas).

---

## Architecture decisions

### ABC de Produtos carrega itens direto de pedido_venda_produtos via Supabase (RLS)

Para `ProductABCReportPage` **especificamente**, os itens SÃO buscados diretamente da tabela `pedido_venda_produtos` via cliente Supabase (com JWT injetado), em lotes de 200, respeitando RLS — em vez de contar com `include_itens` da API. Porém, outros relatórios (ex.: `SolicitadoFaturadoReportPage`) ainda usam `include_itens` da API, indicando que essa mudança arquitetural **não foi universalmente aplicada** a todos os relatórios de produto.

- **Tipo:** arch-decision
- **Evidência:**
  - `/src/components/ProductABCReportPage.tsx:55-76` — query direta: `supabase.from('pedido_venda_produtos').select(...).in('pedido_venda_id', batch)` em lotes de 200.
  - `/src/components/ChangelogPage.tsx:75` — nota de correção: "dados agora carregam corretamente — client Supabase injeta token JWT, respeitando RLS".
  - `/src/components/SolicitadoFaturadoReportPage.tsx:70` — usa `api.get('vendas', { params: { include_itens: true } })` (padrão divergente).
- **Regressão se:** RLS policies forem removidas ou o token não for injetado — a query retornará itens de pedidos de outros usuários ou nenhum resultado.
