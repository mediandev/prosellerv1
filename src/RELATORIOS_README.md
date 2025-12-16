# Sistema de Relatórios - Documentação Completa

## Visão Geral

O sistema de relatórios oferece três tipos principais de análises com filtros personalizados, opções de agrupamento e exportação para Excel.

## Estrutura de Arquivos

```
/components/
├── ReportsPage.tsx              # Página principal com navegação por abas
├── SalesReport.tsx              # Relatório de Vendas
├── CustomerABCReport.tsx        # Curva ABC de Clientes
└── ProductABCReport.tsx         # Curva ABC de Produtos
```

## 1. Relatório de Vendas

### Descrição
Relação detalhada das vendas realizadas no período selecionado.

### Campos Exibidos
- **Data**: Data da venda
- **ID da Venda**: Identificador único da venda
- **OC Cliente**: Ordem de compra do cliente
- **Grupo/Rede**: Grupo/rede a que pertence o cliente
- **Cliente**: Nome/Razão social do cliente
- **Natureza Operação**: Natureza da operação fiscal
- **Valor Total**: Valor total da venda

### Filtros Disponíveis
- **Período Personalizável**: Data início e data fim
- **Vendedor**: Filtrar por vendedor específico
- **Cliente**: Filtrar por cliente específico
- **Natureza de Operação**: Filtrar por natureza de operação

### Opções de Agrupamento
- Sem agrupamento
- Cliente
- Grupo/Rede
- Vendedor
- Natureza de Operação

### Funcionalidades
- Resumo de quantidade de vendas e valor total
- Exportação para Excel (CSV)
- Subtotais por grupo quando agrupado

## 2. Curva ABC de Clientes

### Descrição
Análise de clientes ordenados por participação no faturamento, classificados em curvas A, B e C.

### Campos Exibidos
- **Grupo/Rede**: Grupo/rede do cliente
- **Cliente**: Nome/Razão social
- **CNPJ**: CNPJ do cliente
- **Vendedor**: Vendedor atribuído ao cliente
- **Curva ABC**: Classificação (A, B ou C)
- **Valor Total**: Valor total de vendas do cliente
- **% Participação**: Percentual do cliente no faturamento total
- **% Acumulado**: Percentual acumulado considerando clientes anteriores

### Classificação ABC
- **Curva A**: Clientes que representam até 80% do faturamento
- **Curva B**: Clientes que representam de 80% a 95% do faturamento
- **Curva C**: Clientes que representam de 95% a 100% do faturamento

### Filtros Disponíveis
- **Período Personalizável**: Data início e data fim
- **Vendedor**: Filtrar por vendedor específico
- **Grupo/Rede**: Filtrar por grupo/rede específico
- **Natureza de Operação**: Filtrar por natureza de operação

### Opções de Agrupamento
- Sem agrupamento
- Grupo/Rede
- Vendedor
- Natureza de Operação

### Funcionalidades
- Ordenação automática por valor (decrescente)
- Cálculo automático de percentuais
- Exportação para Excel (CSV)
- Badge visual para identificar curva (A, B, C)

## 3. Curva ABC de Produtos

### Descrição
Análise de produtos ordenados por participação no faturamento, classificados em curvas A, B e C.

### Campos Exibidos
- **Código SKU**: Código do produto
- **Descrição do Produto**: Nome completo do produto
- **Qtd. Total**: Quantidade total vendida no período
- **Valor Total**: Valor total de vendas do produto
- **Curva ABC**: Classificação (A, B ou C)
- **% Participação**: Percentual do produto no faturamento total
- **% Acumulado**: Percentual acumulado considerando produtos anteriores

### Classificação ABC
- **Curva A**: Produtos que representam até 80% do faturamento
- **Curva B**: Produtos que representam de 80% a 95% do faturamento
- **Curva C**: Produtos que representam de 95% a 100% do faturamento

### Filtros Disponíveis
- **Período Personalizável**: Data início e data fim

### Estatísticas por Curva
Cards visuais mostrando:
- Quantidade de produtos em cada curva
- Percentual de produtos em cada curva
- Valor total de vendas de cada curva
- Participação aproximada no faturamento

### Funcionalidades
- Ordenação automática por valor (decrescente)
- Cálculo automático de percentuais
- Exportação para Excel (CSV)
- Badge visual para identificar curva (A, B, C)
- Cards estatísticos coloridos por curva

## Funcionalidades Comuns

### Exportação para Excel
Todos os relatórios podem ser exportados para formato CSV (compatível com Excel) com:
- Codificação UTF-8 com BOM (garante acentuação correta)
- Separador de ponto e vírgula (;)
- Nome do arquivo com data de geração
- Todos os dados filtrados

### Sistema de Filtros
- Interface intuitiva com campos de formulário
- Botão "Limpar Filtros" quando há filtros ativos
- Indicador visual de filtros aplicados
- Atualização em tempo real dos dados

### Agrupamento de Dados
- Linhas de cabeçalho de grupo destacadas visualmente
- Subtotais por grupo
- Quantidade de itens no grupo
- Fundo diferenciado para identificação

### Interface Responsiva
- Layout adaptativo para diferentes tamanhos de tela
- Tabelas com scroll horizontal em telas pequenas
- Grid responsivo para filtros
- Cards adaptativos

## Navegação

### Acesso
Menu lateral → **Relatórios** (ícone BarChart3)

### Estrutura de Abas
1. **Relatório de Vendas**: FileText icon
2. **Curva ABC - Clientes**: TrendingUp icon
3. **Curva ABC - Produtos**: Package icon

## Permissões

### Usuários Backoffice
- Acesso completo a todos os relatórios
- Visualização de todos os vendedores e clientes
- Exportação ilimitada

### Usuários Vendedores
- Acesso a todos os relatórios
- Filtros automáticos aplicados para seus dados
- Visualizam apenas clientes vinculados
- Visualizam apenas suas vendas

## Dados Mockados

Os relatórios utilizam os seguintes dados mockados:
- `mockVendas`: Vendas com itens detalhados
- `mockCustomers`: Base de clientes
- `mockSellers`: Base de vendedores
- `mockNaturezasOperacao`: Naturezas de operação
- `mockProdutos`: Catálogo de produtos

## Cálculos Realizados

### Curva ABC
1. Agrupa dados por entidade (cliente ou produto)
2. Soma valores totais por entidade
3. Ordena por valor decrescente
4. Calcula percentual de participação individual
5. Calcula percentual acumulado
6. Classifica em curvas A, B ou C baseado no acumulado

### Agrupamento
1. Agrupa dados pela dimensão selecionada
2. Calcula subtotais por grupo
3. Conta quantidade de itens por grupo
4. Mantém ordenação original dentro dos grupos

### Totalizadores
- Soma de valores totais
- Contagem de registros
- Contagem de quantidades (produtos)
- Médias quando aplicável

## Performance

### Otimizações Implementadas
- `useMemo` para cálculos pesados
- Filtragem eficiente com early return
- Ordenação única após agregação
- Renderização condicional de grupos

### Limitações
- Relatórios operam com dados em memória
- Não há paginação (todos os dados são exibidos)
- Exportação carrega todos os dados filtrados

## Melhorias Futuras Sugeridas

1. **Paginação**: Implementar paginação para grandes volumes
2. **Gráficos**: Adicionar visualizações gráficas aos relatórios
3. **Comparativos**: Comparar períodos diferentes
4. **Drill-down**: Detalhar dados ao clicar em linhas
5. **Agendamento**: Agendar geração de relatórios
6. **Múltiplos Formatos**: Exportar em PDF, XLSX
7. **Relatórios Customizados**: Permitir salvar configurações de filtros
8. **Dashboard de Relatórios**: Página inicial com KPIs principais

## Exemplos de Uso

### Exemplo 1: Vendas do Mês por Vendedor
1. Acesse "Relatório de Vendas"
2. Defina período: 01/11/2025 a 30/11/2025
3. Selecione "Agrupar Por: Vendedor"
4. Clique em "Exportar Excel"

### Exemplo 2: Top Clientes Curva A
1. Acesse "Curva ABC - Clientes"
2. Defina período desejado
3. Visualize apenas clientes da Curva A
4. Exporte para análise detalhada

### Exemplo 3: Produtos Menos Vendidos
1. Acesse "Curva ABC - Produtos"
2. Defina período
3. Visualize produtos da Curva C
4. Analise para decisões estratégicas

## Suporte

Para dúvidas ou problemas:
1. Verifique se os filtros estão corretos
2. Teste com período diferente
3. Limpe os filtros e tente novamente
4. Verifique se há dados no período selecionado
