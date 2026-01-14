# Relatório de Análise Completa do Banco de Dados Supabase

**Data:** 2025-01-16  
**Objetivo:** Verificar consistência entre tabelas do Supabase e tipos TypeScript do projeto

---

## Sumário Executivo

Este relatório apresenta uma análise completa das tabelas, relações, RLS policies, funções RPC e índices do banco de dados Supabase, comparando com os tipos TypeScript do projeto ProSeller V1.

### Estatísticas Gerais

- **Total de Tabelas Analisadas:** 40
- **Tabelas com RLS Habilitado:** 38
- **Tabelas sem RLS Policies:** 2 (metas_vendedor, ref_situacao)
- **Funções RPC Encontradas:** 38
- **Problemas Críticos Identificados:** 15
- **Problemas Importantes Identificados:** 22
- **Melhorias Sugeridas:** 18

---

## 1. Análise de Estrutura de Tabelas

### 1.1 Usuários e Vendedores

#### Tabela: `user` vs Tipo: `Usuario`

**Campos Presentes no Banco:**
- `user_id` (UUID) ✅
- `nome` (TEXT) ✅
- `ref_user_role_id` (BIGINT) ✅
- `user_login` (TEXT) ✅
- `first_login` (BOOLEAN) ✅

**Campos Faltantes (TypeScript espera):**
- 🔴 `email` (TEXT) - **CRÍTICO**: Campo obrigatório no TypeScript
- 🔴 `tipo` (TEXT) - **CRÍTICO**: Campo obrigatório ('backoffice' | 'vendedor')
- 🟡 `ativo` (BOOLEAN) - **IMPORTANTE**: Campo obrigatório no TypeScript
- 🟡 `data_cadastro` (TIMESTAMPTZ) - **IMPORTANTE**: Metadados
- 🟢 `ultimo_acesso` (TIMESTAMPTZ) - **MELHORIA**: Opcional

**Campos Extras no Banco (não usados no TypeScript):**
- `ref_user_role_id` - Pode ser mapeado para `tipo`
- `user_login` - Pode ser usado para login
- `first_login` - Útil para onboarding

**Problemas:**
1. 🔴 **CRÍTICO**: Falta campo `email` que é obrigatório no TypeScript
2. 🔴 **CRÍTICO**: Falta campo `tipo` que define se é backoffice ou vendedor
3. 🟡 **IMPORTANTE**: Falta campo `ativo` para controle de usuários ativos/inativos
4. 🟡 **IMPORTANTE**: Falta campo `data_cadastro` para auditoria

#### Tabela: `dados_vendedor` vs Tipo: `Seller`

**Campos Presentes no Banco:**
- `user_id` (UUID) ✅ - Mapeia para `id`
- `nome` (TEXT) ✅
- `cpf_cnpj` (TEXT) ✅ - Mapeia para `cpf`
- `email` (TEXT) ✅
- `telefone` (TEXT) ✅
- `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado` ✅ - Mapeiam para `endereco`
- `aliquotafixa` (NUMERIC) ✅ - Mapeia para `comissoes.aliquotaFixa`

**Campos Faltantes (TypeScript espera):**
- 🔴 `iniciais` (TEXT) - **CRÍTICO**: Campo obrigatório
- 🔴 `data_admissao` (DATE) - **CRÍTICO**: Campo obrigatório
- 🔴 `status` (TEXT) - **CRÍTICO**: Campo obrigatório ('ativo' | 'inativo' | 'excluido')
- 🔴 `cnpj` (TEXT) - **CRÍTICO**: Separado de CPF no TypeScript
- 🔴 `razao_social` (TEXT) - **CRÍTICO**: Dados PJ obrigatórios
- 🔴 `nome_fantasia` (TEXT) - **CRÍTICO**: Dados PJ obrigatórios
- 🔴 `inscricao_estadual` (TEXT) - **CRÍTICO**: Dados PJ obrigatórios
- 🔴 `observacoes_internas` (TEXT) - **CRÍTICO**: Campo obrigatório
- 🟡 `dados_bancarios` (JSONB) - **IMPORTANTE**: Estrutura complexa (BankData)
- 🟡 `contatos_adicionais` (JSONB) - **IMPORTANTE**: Array de AdditionalContact
- 🟡 `metas_anuais` (JSONB) - **IMPORTANTE**: Array de YearlyGoals
- 🟡 `usuario` (JSONB) - **IMPORTANTE**: Estrutura UserSettings
- 🟡 `integracoes` (JSONB) - **IMPORTANTE**: Array de ERPIntegration

**Problemas:**
1. 🔴 **CRÍTICO**: Muitos campos obrigatórios faltando
2. 🔴 **CRÍTICO**: Estrutura de dados bancários não está na tabela (precisa de tabela separada ou JSONB)
3. 🔴 **CRÍTICO**: Contatos adicionais não estão estruturados
4. 🟡 **IMPORTANTE**: Metas anuais não estão na tabela (existe `metas_vendedor` separada)

**Relação:**
- ✅ `dados_vendedor.user_id` → `user.user_id` (FK implícita, não declarada)

### 1.2 Clientes

#### Tabela: `cliente` vs Tipo: `Cliente`

**Campos Presentes no Banco:**
- `cliente_id` (BIGINT) ✅ - Mapeia para `id`
- `nome` (TEXT) ✅ - Mapeia para `razaoSocial`
- `nome_fantasia` (TEXT) ✅
- `cpf_cnpj` (TEXT) ✅
- `inscricao_estadual` (TEXT) ✅
- `ref_tipo_pessoa_id_FK` (BIGINT) ✅ - Mapeia para `tipoPessoa`
- `ref_situacao_id` (INTEGER) ✅ - Mapeia para `situacao`
- `tipo_segmento` (TEXT) ✅ - Mapeia para `segmentoMercado`
- `lista_de_preco` (BIGINT) ✅ - Mapeia para `listaPrecos`
- `desconto` (NUMERIC) ✅ - Mapeia para `descontoPadrao`
- `observacao_interna` (TEXT) ✅ - Mapeia para `observacoesInternas`
- `condicoesdisponiveis` (ARRAY) ✅ - Mapeia para `condicoesPagamentoAssociadas`
- `vendedoresatribuidos` (ARRAY[UUID]) ✅ - Mapeia para `vendedorAtribuido`

**Campos Faltantes (TypeScript espera):**
- 🔴 `codigo` (TEXT) - **CRÍTICO**: Campo opcional mas importante
- 🔴 `grupo_rede` (TEXT) - **CRÍTICO**: Campo opcional
- 🔴 `desconto_financeiro` (NUMERIC) - **CRÍTICO**: Campo obrigatório
- 🔴 `pedido_minimo` (NUMERIC) - **CRÍTICO**: Campo obrigatório
- 🔴 `status_aprovacao` (TEXT) - **CRÍTICO**: Campo obrigatório ('aprovado' | 'pendente' | 'rejeitado')
- 🔴 `motivo_rejeicao` (TEXT) - **CRÍTICO**: Campo opcional mas importante
- 🔴 `aprovado_por` (UUID) - **CRÍTICO**: Campo opcional mas importante
- 🔴 `data_aprovacao` (DATE) - **CRÍTICO**: Campo opcional mas importante
- 🔴 `data_cadastro` (TIMESTAMPTZ) - **CRÍTICO**: Metadados obrigatórios
- 🔴 `data_atualizacao` (TIMESTAMPTZ) - **CRÍTICO**: Metadados obrigatórios
- 🔴 `criado_por` (UUID) - **CRÍTICO**: Metadados obrigatórios
- 🔴 `atualizado_por` (UUID) - **CRÍTICO**: Metadados obrigatórios
- 🟡 `endereco_entrega_diferente` (BOOLEAN) - **IMPORTANTE**: Campo obrigatório
- 🟡 `requisitos_logisticos` (JSONB) - **IMPORTANTE**: Estrutura complexa

**Tabelas Relacionadas:**
- ✅ `cliente_contato` - Mapeia para campos de contato
- ✅ `cliente_endereço` - Mapeia para campos de endereço
- ✅ `cliente_vendedores` - Mapeia para `vendedorAtribuido`
- ✅ `condições_cliente` - Mapeia para `condicoesPagamentoAssociadas`

**Problemas:**
1. 🔴 **CRÍTICO**: Faltam campos de metadados (created_at, updated_at, criado_por, atualizado_por)
2. 🔴 **CRÍTICO**: Faltam campos de aprovação (status_aprovacao, motivo_rejeicao, etc.)
3. 🔴 **CRÍTICO**: Falta campo `desconto_financeiro` e `pedido_minimo`
4. 🟡 **IMPORTANTE**: Falta estrutura para `requisitos_logisticos` (pode ser JSONB)
5. 🟡 **IMPORTANTE**: Falta estrutura para `endereco_entrega` (pode ser tabela separada ou JSONB)

#### Tabela: `cliente_contato` vs Campos de Contato

**Campos Presentes:**
- `telefone` (TEXT) ✅ - Mapeia para `telefoneFixoPrincipal`
- `telefone_adicional` (TEXT) ✅ - Mapeia para `telefoneCelularPrincipal`
- `website` (TEXT) ✅ - Mapeia para `site`
- `email` (TEXT) ✅ - Mapeia para `emailPrincipal`
- `email_nf` (TEXT) ✅ - Mapeia para `emailNFe`

**Problemas:**
- ✅ Estrutura adequada para contatos principais
- 🟡 **IMPORTANTE**: Falta tabela para `pessoasContato[]` (PessoaContato)

#### Tabela: `cliente_endereço` vs Campos de Endereço

**Campos Presentes:**
- `cep`, `rua`, `numero`, `complemento`, `bairro`, `cidade`, `uf` ✅

**Problemas:**
- ✅ Estrutura adequada para endereço principal
- 🟡 **IMPORTANTE**: Falta estrutura para `enderecoEntrega` quando `enderecoEntregaDiferente = true`

### 1.3 Produtos

#### Tabela: `produto` vs Tipo: `Produto`

**Campos Presentes no Banco:**
- `produto_id` (BIGINT) ✅ - Mapeia para `id`
- `descricao` (TEXT) ✅
- `codigo_sku` (TEXT) ✅
- `gtin` (TEXT) ✅ - Mapeia para `codigoEan`
- `ncm` (TEXT) ✅
- `cest` (TEXT) ✅
- `marca` (BIGINT) ✅ - Mapeia para `marcaId`
- `tipo_id` (BIGINT) ✅ - Mapeia para `tipoProdutoId`
- `ref_unidade_id` (TEXT) ✅ - Mapeia para `unidadeId`
- `peso_liquido` (NUMERIC) ✅
- `peso_bruto` (NUMERIC) ✅
- `preco_venda` (NUMERIC) ✅

**Campos Faltantes (TypeScript espera):**
- 🔴 `foto` (TEXT) - **CRÍTICO**: Campo opcional mas importante
- 🔴 `situacao` (TEXT) - **CRÍTICO**: Campo obrigatório ('Ativo' | 'Inativo' | 'Excluído')
- 🔴 `ativo` (BOOLEAN) - **CRÍTICO**: Campo obrigatório
- 🔴 `disponivel` (BOOLEAN) - **CRÍTICO**: Campo obrigatório
- 🔴 `created_at` (TIMESTAMPTZ) - **CRÍTICO**: Metadados obrigatórios
- 🔴 `updated_at` (TIMESTAMPTZ) - **CRÍTICO**: Metadados obrigatórios
- 🟡 `nome_marca` (TEXT) - **IMPORTANTE**: Desnormalizado para performance
- 🟡 `nome_tipo_produto` (TEXT) - **IMPORTANTE**: Desnormalizado para performance
- 🟡 `sigla_unidade` (TEXT) - **IMPORTANTE**: Desnormalizado para performance

**Problemas:**
1. 🔴 **CRÍTICO**: Falta campo `situacao` (existe apenas `ref_permissao_id`)
2. 🔴 **CRÍTICO**: Falta campo `ativo` e `disponivel`
3. 🔴 **CRÍTICO**: Faltam campos de metadados (created_at, updated_at)
4. 🟡 **IMPORTANTE**: Campos desnormalizados (nome_marca, nome_tipo_produto) podem melhorar performance

### 1.4 Vendas/Pedidos

#### Tabela: `pedido_venda` vs Tipo: `Venda`

**Campos Presentes no Banco:**
- `pedido_venda_ID` (BIGINT) ✅ - Mapeia para `id`
- `numero_pedido` (TEXT) ✅ - Mapeia para `numero`
- `cliente_id` (BIGINT) ✅ - Mapeia para `clienteId`
- `vendedor_uuid` (UUID) ✅ - Mapeia para `vendedorId`
- `natureza_operacao` (TEXT) ✅ - Mapeia para `naturezaOperacaoId`
- `data_venda` (DATE) ✅ - Mapeia para `dataPedido`
- `ordem_cliente` (TEXT) ✅ - Mapeia para `ordemCompraCliente`
- `id_condicao` (BIGINT) ✅ - Mapeia para `condicaoPagamentoId`
- `observacao` (TEXT) ✅ - Mapeia para `observacoesNotaFiscal`
- `observacao_interna` (TEXT) ✅ - Mapeia para `observacoesInternas`
- `valor_total` (DOUBLE PRECISION) ✅ - Mapeia para `valorPedido`
- `status` (TEXT) ✅
- `timestamp` (TIMESTAMP) ✅ - Mapeia para `createdAt`
- `id_tiny` (TEXT) ✅ - Parte de `integracaoERP`

**Campos Faltantes (TypeScript espera):**
- 🔴 `lista_preco_id` (BIGINT) - **CRÍTICO**: Campo obrigatório (existe `lista_de_preco` como TEXT)
- 🔴 `nome_lista_preco` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `percentual_desconto_padrao` (NUMERIC) - **CRÍTICO**: Campo obrigatório
- 🔴 `nome_cliente` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `cnpj_cliente` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `inscricao_estadual_cliente` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `nome_vendedor` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `nome_natureza_operacao` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `empresa_faturamento_id` (BIGINT) - **CRÍTICO**: Campo obrigatório (existe `empresa_faturou` como TEXT)
- 🔴 `nome_empresa_faturamento` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `nome_condicao_pagamento` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `total_quantidades` (NUMERIC) - **CRÍTICO**: Calculado mas pode ser armazenado
- 🔴 `total_itens` (INTEGER) - **CRÍTICO**: Calculado mas pode ser armazenado
- 🔴 `peso_bruto_total` (NUMERIC) - **CRÍTICO**: Calculado mas pode ser armazenado
- 🔴 `peso_liquido_total` (NUMERIC) - **CRÍTICO**: Calculado mas pode ser armazenado
- 🔴 `valor_total_produtos` (NUMERIC) - **CRÍTICO**: Calculado mas pode ser armazenado
- 🔴 `percentual_desconto_extra` (NUMERIC) - **CRÍTICO**: Campo obrigatório
- 🔴 `valor_desconto_extra` (NUMERIC) - **CRÍTICO**: Campo obrigatório
- 🔴 `updated_at` (TIMESTAMPTZ) - **CRÍTICO**: Metadados obrigatórios
- 🔴 `created_by` (UUID) - **CRÍTICO**: Metadados obrigatórios
- 🟡 `integracao_erp` (JSONB) - **IMPORTANTE**: Estrutura complexa IntegracaoERPVenda

**Tabelas Relacionadas:**
- ✅ `pedido_venda_produtos` - Mapeia para `itens[]`
- ✅ `detalhes_pedido_venda` - Campos adicionais

**Problemas:**
1. 🔴 **CRÍTICO**: Muitos campos desnormalizados faltando (nomes de cliente, vendedor, etc.)
2. 🔴 **CRÍTICO**: Faltam campos de totais calculados
3. 🔴 **CRÍTICO**: Falta estrutura completa para `integracaoERP`
4. 🔴 **CRÍTICO**: `lista_de_preco` está como TEXT, deveria ser BIGINT (FK)
5. 🔴 **CRÍTICO**: `empresa_faturou` está como TEXT, deveria ser BIGINT (FK)

#### Tabela: `pedido_venda_produtos` vs Tipo: `ItemVenda[]`

**Campos Presentes:**
- `pedido_venda_id` (BIGINT) ✅
- `produto_id` (BIGINT) ✅ - Mapeia para `produtoId`
- `quantidade` (NUMERIC) ✅
- `valor_unitario` (DOUBLE PRECISION) ✅
- `descricao` (TEXT) ✅ - Mapeia para `descricaoProduto`

**Campos Faltantes:**
- 🔴 `numero` (INTEGER) - **CRÍTICO**: Posição na lista
- 🔴 `codigo_sku` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `codigo_ean` (TEXT) - **CRÍTICO**: Desnormalizado
- 🔴 `valor_tabela` (NUMERIC) - **CRÍTICO**: Valor na lista de preços
- 🔴 `percentual_desconto` (NUMERIC) - **CRÍTICO**: Desconto aplicado
- 🔴 `subtotal` (NUMERIC) - **CRÍTICO**: Calculado mas pode ser armazenado
- 🔴 `peso_bruto` (NUMERIC) - **CRÍTICO**: Peso bruto unitário
- 🔴 `peso_liquido` (NUMERIC) - **CRÍTICO**: Peso líquido unitário
- 🔴 `unidade` (TEXT) - **CRÍTICO**: Sigla da unidade

**Problemas:**
1. 🔴 **CRÍTICO**: Faltam muitos campos desnormalizados importantes
2. 🔴 **CRÍTICO**: Falta campo `numero` para ordenação dos itens

### 1.5 Comissões

#### Tabela: `vendedor_comissão` vs Tipo: `ComissaoVenda`

**Campos Presentes no Banco:**
- `vendedor_comissao_id` (BIGINT) ✅ - Mapeia para `id`
- `vendedor_uuid` (UUID) ✅ - Mapeia para `vendedorId`
- `pedido_id` (BIGINT) ✅ - Mapeia para `vendaId`
- `valor_total` (NUMERIC) ✅ - Mapeia para `valorTotalVenda`
- `valor_comissao` (NUMERIC) ✅ - Mapeia para `valorComissao`
- `data_inicio` (DATE) ✅ - Pode mapear para `dataVenda`
- `observacao` (TEXT) ✅ - Mapeia para `observacoes`

**Campos Faltantes (TypeScript espera):**
- 🔴 `periodo` (TEXT) - **CRÍTICO**: Campo obrigatório (formato "2025-10")
- 🔴 `oc_cliente` (TEXT) - **CRÍTICO**: Ordem de Compra do Cliente
- 🔴 `cliente_id` (BIGINT) - **CRÍTICO**: Facilita queries
- 🔴 `cliente_nome` (TEXT) - **CRÍTICO**: Desnormalizado para histórico
- 🔴 `percentual_comissao` (NUMERIC) - **CRÍTICO**: Campo obrigatório
- 🔴 `regra_aplicada` (TEXT) - **CRÍTICO**: Campo obrigatório
- 🔴 `lista_preco_id` (BIGINT) - **CRÍTICO**: Campo opcional
- 🔴 `lista_preco_nome` (TEXT) - **CRÍTICO**: Campo opcional
- 🔴 `desconto_aplicado` (NUMERIC) - **CRÍTICO**: Campo opcional
- 🔴 `faixa_desconto_id` (BIGINT) - **CRÍTICO**: Campo opcional
- 🔴 `criado_em` (TIMESTAMPTZ) - **CRÍTICO**: Metadados obrigatórios
- 🔴 `editado_por` (UUID) - **CRÍTICO**: Metadados opcionais
- 🔴 `editado_em` (TIMESTAMPTZ) - **CRÍTICO**: Metadados opcionais

**Problemas:**
1. 🔴 **CRÍTICO**: Estrutura atual não suporta o modelo de períodos do TypeScript
2. 🔴 **CRÍTICO**: Faltam campos de auditoria da regra aplicada
3. 🔴 **CRÍTICO**: Falta campo `periodo` que é fundamental no novo modelo
4. 🟡 **IMPORTANTE**: Estrutura atual parece ser de relatório, não de comissão individual

**Observação:** A estrutura atual de `vendedor_comissão` parece ser mais próxima de um relatório consolidado do que de comissões individuais. O TypeScript espera uma estrutura mais granular com `ComissaoVenda`, `LancamentoManual`, `PagamentoPeriodo` e `RelatorioPeriodoComissoes`.

### 1.6 Metas

#### Tabela: `metas_vendedor` vs Estrutura de Metas no TypeScript

**Campos Presentes no Banco:**
- `id` (INTEGER) ✅
- `vendedor_id` (VARCHAR) ✅ - **PROBLEMA**: Deveria ser UUID
- `mes` (VARCHAR) ✅ - **PROBLEMA**: Deveria ser INTEGER (1-12)
- `ano` (INTEGER) ✅
- `meta_valor` (NUMERIC) ✅
- `meta_percentual_crescimento` (NUMERIC) ✅
- `periodo_referencia` (TEXT) ✅
- `data_criacao` (TIMESTAMPTZ) ✅
- `data_atualizacao` (TIMESTAMPTZ) ✅

**Problemas:**
1. 🔴 **CRÍTICO**: `vendedor_id` é VARCHAR, deveria ser UUID (FK para `dados_vendedor.user_id`)
2. 🔴 **CRÍTICO**: `mes` é VARCHAR(2), deveria ser INTEGER com CHECK (1-12)
3. 🟡 **IMPORTANTE**: Falta índice único em (vendedor_id, mes, ano) - **CORRIGIDO**: Já existe `metas_vendedor_vendedor_id_mes_ano_key`

**Estrutura TypeScript espera:**
- `YearlyGoals[]` com `ano` e `metas: MonthlyGoal[]`
- A estrutura atual está adequada, apenas precisa corrigir tipos

### 1.7 Conta Corrente

#### Tabela: `conta_corrente_cliente`

**Status:** ✅ Estrutura adequada e alinhada com TypeScript

**Campos Presentes:**
- Todos os campos necessários estão presentes
- Constraints adequadas
- Índices adequados

#### Tabela: `pagamento_acordo_cliente`

**Status:** ✅ Estrutura adequada e alinhada com TypeScript

---

## 2. Análise de Relações (Foreign Keys)

### 2.1 Relações Corretas ✅

1. `cliente` → `listas_preco` (via `lista_de_preco`)
2. `cliente` → `ref_situacao` (via `ref_situacao_id`)
3. `cliente` → `ref_tipo_pessoa` (via `ref_tipo_pessoa_id_FK`)
4. `cliente_contato` → `cliente` (via `cliente_id`)
5. `cliente_endereço` → `cliente` (via `cliente_id`)
6. `cliente_vendedores` → `cliente` (via `cliente_id`)
7. `cliente_vendedores` → `dados_vendedor` (via `vendedor_id`)
8. `pedido_venda` → `cliente` (via `cliente_id`)
9. `produto` → `marcas` (via `marca`)
10. `produto` → `ref_tipo_produto` (via `tipo_id`)
11. `vendedor_comissão` → `pedido_venda` (via `pedido_id`)
12. `vendedor_comissão` → `dados_vendedor` (via `vendedor_uuid`)
13. `conta_corrente_cliente` → `cliente` (via `cliente_id`)
14. `conta_corrente_cliente` → `dados_vendedor` (via `vendedor_uuid`)

### 2.2 Relações Faltantes ou Quebradas 🔴

1. 🔴 **CRÍTICO**: `dados_vendedor.user_id` → `user.user_id` (FK não declarada)
   - Existe relação lógica mas não há constraint
   - Impacto: Não há garantia de integridade referencial

2. 🔴 **CRÍTICO**: `pedido_venda.vendedor_uuid` → `dados_vendedor.user_id` (FK não declarada)
   - Existe relação lógica mas não há constraint
   - Impacto: Pode haver vendedores inválidos em pedidos

3. 🔴 **CRÍTICO**: `metas_vendedor.vendedor_id` → `dados_vendedor.user_id` (FK não declarada)
   - Tipo incompatível: VARCHAR vs UUID
   - Impacto: Não pode criar FK até corrigir tipo

4. 🔴 **CRÍTICO**: `pedido_venda.lista_de_preco` (TEXT) → `listas_preco.id` (BIGINT)
   - Tipo incompatível: TEXT vs BIGINT
   - Impacto: Não pode criar FK até corrigir tipo

5. 🔴 **CRÍTICO**: `pedido_venda.empresa_faturou` (TEXT) → `ref_empresas_subsidiarias.id` (BIGINT)
   - Tipo incompatível: TEXT vs BIGINT
   - Impacto: Não pode criar FK até corrigir tipo

6. 🟡 **IMPORTANTE**: `pedido_venda.natureza_operacao` (TEXT) → `natureza_operacao.id` (BIGINT)
   - Tipo incompatível: TEXT vs BIGINT
   - Impacto: Não pode criar FK até corrigir tipo

7. 🟡 **IMPORTANTE**: `pedido_venda.id_condicao` → `Condicao_De_Pagamento.Condição_ID`
   - FK existe mas verificar se está correta

### 2.3 Relações N:N

1. ✅ `cliente_vendedores` - Tabela de junção adequada
2. ✅ `produtos_listas_precos` - Tabela de junção adequada
3. ✅ `condições_cliente` - Tabela de junção adequada

---

## 3. Análise de RLS (Row Level Security)

### 3.1 Status Geral

- **Tabelas com RLS Habilitado:** 38/40 (95%)
- **Tabelas sem RLS:** 2 (metas_vendedor, ref_situacao)

### 3.2 Problemas Identificados

#### 🔴 CRÍTICO: Políticas Muito Permissivas

**Problema:** A maioria das tabelas tem políticas `allow_all` que permitem acesso total a usuários autenticados:

```sql
-- Exemplo encontrado em várias tabelas
CREATE POLICY "allow_all" ON public.cliente
  FOR ALL TO authenticated
  USING (true);
```

**Impacto:** 
- Vendedores podem ver/editar dados de outros vendedores
- Não há separação entre vendedores e backoffice
- Violação de segurança grave

**Tabelas Afetadas:**
- `cliente`, `cliente_contato`, `cliente_endereço`, `cliente_vendedores`
- `pedido_venda`, `pedido_venda_produtos`
- `produto`, `produtos_listas_precos`
- `dados_vendedor`, `user`
- E muitas outras...

#### 🔴 CRÍTICO: Políticas de Teste em Produção

**Problema:** Existem políticas com nomes de teste como "teste", "test", "trete", "trtrt", etc. que dão acesso público:

```sql
-- Exemplo encontrado
CREATE POLICY "teste" ON public.cliente
  FOR ALL TO public
  USING (true);
```

**Impacto:** Acesso público total a dados sensíveis

**Tabelas Afetadas:** Múltiplas tabelas

#### 🟡 IMPORTANTE: Falta de Políticas Granulares

**Problema:** Não há políticas separadas para:
- SELECT (vendedores só veem seus dados)
- INSERT (validações específicas)
- UPDATE (apenas próprio ou backoffice)
- DELETE (apenas backoffice)

**Impacto:** Não é possível implementar controle granular de acesso

#### 🟡 IMPORTANTE: Tabelas sem RLS

1. `metas_vendedor` - Sem RLS habilitado
2. `ref_situacao` - Sem RLS habilitado (tabela de referência, pode ser intencional)

### 3.3 Políticas Corretas Encontradas

1. ✅ `conta_corrente_cliente` - Tem política específica `conta_corrente_cliente_all_access`
2. ✅ `pagamento_acordo_cliente` - Tem política específica `pagamento_acordo_cliente_all_access`
3. ✅ `vendedor_comissão` - Tem política específica para INSERT

---

## 4. Análise de Funções RPC

### 4.1 Funções RPC Existentes

**Funções Encontradas (38 total):**

**Clientes:**
- `listar_clientes` - Lista clientes com filtros
- `rpc_list_clientes` - Versão alternativa
- `get_clientes_autocomplete` - Autocomplete
- `get_condicoes_pagamento_por_cliente` - Condições de pagamento
- `get_condicoes_pagamento_por_vendedor` - Condições por vendedor

**Vendas:**
- `rpc_list_pedido_venda` - Lista pedidos
- `rpc_list_pedido_venda_paged` - Lista paginada

**Comissões:**
- `get_comissoes_vendedor` - Comissões do vendedor
- `filtrar_comissoes_vendedor` - Filtro de comissões
- `listar_vendedores_comissoes` - Lista vendedores com comissões
- `get_vendedor_comissao` - Comissão específica
- `generate_vendedor_comissao` - Gera comissão
- `minha_funcao_comissoes` - Função genérica

**Vendedores:**
- `get_dados_vendedor` - Dados do vendedor
- `get_vendedores_conta_corrente` - Vendedores com conta corrente

**Produtos:**
- `filtrar_produtos` - Filtra produtos
- `filtrar_produtosBB` - Filtro específico
- `filtrar_produtosTT` - Filtro específico
- `fn_buscar_produtos_lista_preco` - Produtos por lista

**Listas de Preço:**
- `upsert_price_list` - Cria/atualiza lista
- `get_price_list_detail` - Detalhes da lista
- `search_price_list_products` - Busca produtos

**Conta Corrente:**
- `get_conta_corrente_cliente` - Conta corrente do cliente
- `get_estatisticas_conta_corrente` - Estatísticas
- `get_analise_investimento_retorno` - Análise de ROI

**Condições de Pagamento:**
- `rpc_condicoes_disponiveis` - Lista condições
- `fn_consulta_condicoes_por_ids` - Consulta por IDs
- `rpc_insert_condicao_pagamento` - Insere condição
- `add_condicao_disponivel` - Adiciona condição
- `remove_condicao_disponivel` - Remove condição
- `add_condicoes_disponiveis` - Adiciona múltiplas

**Vendedores/Clientes:**
- `adicionar_vendedor_atribuido` - Adiciona vendedor
- `remover_vendedor_atribuido` - Remove vendedor

**Triggers:**
- `tg_pedido_venda_generate_comissao` - Gera comissão automaticamente
- `delete_zero_discount_rows` - Limpa linhas com desconto zero

### 4.2 Verificação de Conformidade com Arquitetura

#### ✅ Conformes

1. `get_price_list_detail` - Tem comentário de documentação
2. `upsert_price_list` - Tem comentário de documentação
3. Funções usam `SECURITY INVOKER` (verificado em algumas)

#### 🔴 Não Conformes

1. 🔴 **CRÍTICO**: Muitas funções não têm comentários de documentação
2. 🔴 **CRÍTICO**: Não verificado se todas usam `SET search_path = public`
3. 🔴 **CRÍTICO**: Não verificado se todas têm validações de entrada
4. 🔴 **CRÍTICO**: Não verificado se todas têm tratamento de erros adequado

### 4.3 Funções RPC Faltantes

Baseado nos tipos TypeScript, faltam funções para:

**CRUD Completo:**

1. 🔴 **CRÍTICO**: `create_cliente` - Criar cliente
2. 🔴 **CRÍTICO**: `update_cliente` - Atualizar cliente
3. 🔴 **CRÍTICO**: `delete_cliente` - Deletar cliente (soft delete)
4. 🔴 **CRÍTICO**: `get_cliente_by_id` - Buscar cliente por ID

5. 🔴 **CRÍTICO**: `create_vendedor` - Criar vendedor
6. 🔴 **CRÍTICO**: `update_vendedor` - Atualizar vendedor
7. 🔴 **CRÍTICO**: `delete_vendedor` - Deletar vendedor (soft delete)
8. 🔴 **CRÍTICO**: `get_vendedor_by_id` - Buscar vendedor por ID

9. 🔴 **CRÍTICO**: `create_produto` - Criar produto
10. 🔴 **CRÍTICO**: `update_produto` - Atualizar produto
11. 🔴 **CRÍTICO**: `delete_produto` - Deletar produto (soft delete)
12. 🔴 **CRÍTICO**: `get_produto_by_id` - Buscar produto por ID

13. 🔴 **CRÍTICO**: `create_pedido_venda` - Criar pedido
14. 🔴 **CRÍTICO**: `update_pedido_venda` - Atualizar pedido
15. 🔴 **CRÍTICO**: `delete_pedido_venda` - Deletar pedido (soft delete)
16. 🔴 **CRÍTICO**: `get_pedido_venda_by_id` - Buscar pedido por ID

**Aprovação de Clientes:**

17. 🔴 **CRÍTICO**: `aprovar_cliente` - Aprovar cliente pendente
18. 🔴 **CRÍTICO**: `rejeitar_cliente` - Rejeitar cliente pendente

**Comissões (Novo Modelo):**

19. 🔴 **CRÍTICO**: `create_comissao_venda` - Criar comissão individual
20. 🔴 **CRÍTICO**: `update_comissao_venda` - Editar comissão
21. 🔴 **CRÍTICO**: `create_lancamento_manual` - Criar lançamento manual
22. 🔴 **CRÍTICO**: `update_lancamento_manual` - Editar lançamento manual
23. 🔴 **CRÍTICO**: `create_pagamento_periodo` - Registrar pagamento
24. 🔴 **CRÍTICO**: `update_pagamento_periodo` - Editar pagamento
25. 🔴 **CRÍTICO**: `create_relatorio_periodo_comissoes` - Criar relatório
26. 🔴 **CRÍTICO**: `update_relatorio_periodo_comissoes` - Atualizar relatório
27. 🔴 **CRÍTICO**: `get_relatorio_comissoes_completo` - Buscar relatório completo

**Metas:**

28. 🟡 **IMPORTANTE**: `create_meta_vendedor` - Criar meta
29. 🟡 **IMPORTANTE**: `update_meta_vendedor` - Atualizar meta
30. 🟡 **IMPORTANTE**: `delete_meta_vendedor` - Deletar meta
31. 🟡 **IMPORTANTE**: `get_meta_vendedor` - Buscar meta específica

**Usuários:**

32. 🟡 **IMPORTANTE**: `create_user` - Criar usuário
33. 🟡 **IMPORTANTE**: `update_user` - Atualizar usuário
34. 🟡 **IMPORTANTE**: `delete_user` - Deletar usuário (soft delete)

---

## 5. Análise de Índices

### 5.1 Índices Existentes ✅

**Primary Keys:** Todas as tabelas têm PK ✅

**Foreign Keys com Índices:**
- `conta_corrente_cliente.cliente_id` ✅
- `conta_corrente_cliente.vendedor_uuid` ✅
- `cliente.ref_situacao_id` ✅
- `metas_vendedor.vendedor_id` ✅

**Índices Específicos:**
- `conta_corrente_cliente`: data, tipo_compromisso ✅
- `metas_vendedor`: vendedor_id, mes+ano, data_criacao ✅
- `pedido_venda_produtos`: (pedido_venda_id, produto_id) UNIQUE ✅

### 5.2 Índices Faltantes 🟡

**Para Performance em Queries Frequentes:**

1. 🟡 **IMPORTANTE**: `cliente.cpf_cnpj` - Busca frequente
2. 🟡 **IMPORTANTE**: `cliente.codigo_sequencial` - Busca frequente
3. 🟡 **IMPORTANTE**: `cliente.ref_situacao_id` - Filtro frequente (já existe `idx_cliente_situacao` ✅)
4. 🟡 **IMPORTANTE**: `pedido_venda.vendedor_uuid` - Filtro frequente
5. 🟡 **IMPORTANTE**: `pedido_venda.cliente_id` - Filtro frequente
6. 🟡 **IMPORTANTE**: `pedido_venda.data_venda` - Ordenação/filtro frequente
7. 🟡 **IMPORTANTE**: `pedido_venda.status` - Filtro frequente
8. 🟡 **IMPORTANTE**: `produto.codigo_sku` - Busca frequente
9. 🟡 **IMPORTANTE**: `produto.marca` - Filtro frequente
10. 🟡 **IMPORTANTE**: `produto.tipo_id` - Filtro frequente
11. 🟡 **IMPORTANTE**: `dados_vendedor.email` - Busca frequente
12. 🟡 **IMPORTANTE**: `user.email` (se adicionar campo) - Busca frequente
13. 🟡 **IMPORTANTE**: `vendedor_comissão.vendedor_uuid` - Filtro frequente
14. 🟡 **IMPORTANTE**: `vendedor_comissão.pedido_id` - Join frequente

**Para RLS Policies:**

15. 🟡 **IMPORTANTE**: Índices em campos usados em políticas RLS (após corrigir políticas)

---

## 6. Priorização de Problemas

### 🔴 CRÍTICO (Quebra Funcionalidade)

1. **Campos obrigatórios faltando em `user`:**
   - `email`, `tipo`, `ativo`, `data_cadastro`

2. **Campos obrigatórios faltando em `dados_vendedor`:**
   - `iniciais`, `data_admissao`, `status`, dados PJ completos

3. **Campos obrigatórios faltando em `cliente`:**
   - Metadados (created_at, updated_at, criado_por, atualizado_por)
   - Campos de aprovação (status_aprovacao, motivo_rejeicao, etc.)
   - `desconto_financeiro`, `pedido_minimo`

4. **Campos obrigatórios faltando em `produto`:**
   - `situacao`, `ativo`, `disponivel`, metadados

5. **Campos obrigatórios faltando em `pedido_venda`:**
   - Muitos campos desnormalizados
   - Totais calculados
   - Metadados

6. **Campos obrigatórios faltando em `pedido_venda_produtos`:**
   - Campos desnormalizados
   - Campo `numero` para ordenação

7. **Estrutura de comissões incompatível:**
   - Modelo atual não suporta períodos
   - Faltam campos de auditoria

8. **Tipos incompatíveis para FKs:**
   - `metas_vendedor.vendedor_id` (VARCHAR vs UUID)
   - `pedido_venda.lista_de_preco` (TEXT vs BIGINT)
   - `pedido_venda.empresa_faturou` (TEXT vs BIGINT)

9. **RLS Policies muito permissivas:**
   - Políticas `allow_all` em todas as tabelas
   - Políticas de teste em produção
   - Sem separação vendedor/backoffice

10. **Falta de FKs declaradas:**
    - `dados_vendedor.user_id` → `user.user_id`
    - `pedido_venda.vendedor_uuid` → `dados_vendedor.user_id`

11. **Funções RPC faltantes:**
    - CRUD completo para todas as entidades
    - Funções de aprovação de clientes
    - Funções de comissões (novo modelo)

### 🟡 IMPORTANTE (Impacta Performance/Segurança)

1. Campos de auditoria faltando (created_at, updated_at, deleted_at)
2. Índices faltantes para queries frequentes
3. Políticas RLS não granulares
4. Tabelas sem RLS habilitado
5. Funções RPC sem documentação
6. Campos desnormalizados faltando (nomes, etc.)

### 🟢 MELHORIA (Otimização)

1. Campos opcionais adicionais
2. Índices adicionais para otimização
3. Triggers para updated_at automático
4. Validações adicionais em constraints

---

## 7. Recomendações

### 7.1 Ações Imediatas (Críticas)

1. **Adicionar campos obrigatórios faltantes** em todas as tabelas principais
2. **Corrigir tipos de dados** para permitir FKs corretas
3. **Criar FKs declaradas** para garantir integridade referencial
4. **Reescrever políticas RLS** com controle granular vendedor/backoffice
5. **Remover políticas de teste** em produção
6. **Criar funções RPC** para CRUD completo seguindo arquitetura

### 7.2 Ações Importantes (Curto Prazo)

1. Adicionar campos de auditoria (created_at, updated_at, deleted_at)
2. Adicionar índices para performance
3. Documentar funções RPC existentes
4. Habilitar RLS em tabelas faltantes

### 7.3 Melhorias (Médio Prazo)

1. Adicionar triggers para updated_at automático
2. Adicionar validações em constraints
3. Otimizar índices compostos
4. Adicionar campos desnormalizados para performance

---

## 8. Próximos Passos

1. ✅ **Análise Completa** - Este relatório
2. ⏳ **Criar Migrations SQL** - Para corrigir problemas identificados
3. ⏳ **Aplicar Migrations** - Após aprovação do usuário
4. ⏳ **Testar Alterações** - Validar que tudo funciona
5. ⏳ **Documentar Alterações** - Guia de migração

---

**Fim do Relatório**

