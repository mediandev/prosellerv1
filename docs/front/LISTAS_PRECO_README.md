# Listas de Preço - Documentação Completa

## Visão Geral
Sistema completo de gestão de listas de preço (tabelas de preço) com produtos, valores e regras de comissionamento integradas.

## Funcionalidades Implementadas

### 1. Cadastro de Listas de Preço

#### Campos do Cadastro:
- **Nome da Lista de Preço**: Identificação da tabela (ex: "Tabela Padrão - Varejo")
- **Produtos e Preços**: Relação de produtos com seus respectivos valores
- **Regras de Comissionamento**: Sistema de cálculo de comissões

#### Gestão de Produtos:
- Adicionar múltiplos produtos à lista
- Definir preço individual para cada produto
- Remover produtos da lista
- Visualização em tabela com código e nome do produto
- Formatação automática de valores em R$

### 2. Regras de Comissionamento

O sistema oferece dois formatos de comissionamento:

#### a) Alíquota Fixa
- Percentual único aplicado a todas as vendas
- Campo: Percentual de Comissão (0-100%)
- Exemplo: 10% de comissão em todas as vendas

#### b) Conforme Desconto
- Múltiplas faixas de desconto com percentuais variados
- Configuração por faixa:
  - **Desconto Mínimo**: Percentual inicial da faixa
  - **Desconto Máximo**: Percentual final da faixa (ou "acima de" se vazio)
  - **Percentual de Comissão**: Comissão aplicável à faixa

**Exemplo de Faixas:**
```
Faixa 1: Desconto de 0% a 10% → Comissão de 10%
Faixa 2: Desconto acima de 10,01% → Comissão de 5%
```

### 3. Hierarquia das Regras de Comissionamento

O sistema segue esta hierarquia ao calcular comissões:

1. **Vendedor com Alíquota Fixa**
   - Se o cadastro do vendedor está configurado com "Alíquota Fixa"
   - Usa o percentual definido no cadastro do vendedor
   - Ignora as regras da lista de preço

2. **Vendedor com "Definido em Lista de Preço"**
   - Se o cadastro do vendedor está configurado com "Definido em Lista de Preço"
   - Usa as regras de comissionamento da lista de preço utilizada na venda
   - Aplica as faixas de desconto conforme configurado

### 4. Integração com Vendas

#### Fluxo de Venda:
```
1. Selecionar Cliente
   ↓
2. Sistema identifica a Lista de Preço vinculada ao cliente
   ↓
3. Ao adicionar produtos, preços base vêm da lista de preço
   ↓
4. Aplica desconto padrão do cliente
   ↓
5. Cálculo: Valor da Lista - Desconto Padrão = Valor Final
```

#### Exemplo Prático:
```
Cliente: Empresa ABC
├── Lista de Preço: "Tabela Premium - Atacado"
├── Desconto Padrão: 8%
└── Produto: Notebook Dell Inspiron
    ├── Preço na Lista: R$ 3.200,00
    ├── Desconto (8%): R$ 256,00
    └── Valor Final: R$ 2.944,00
```

### 5. Cálculo de Comissão

#### Cenário 1: Vendedor com Alíquota Fixa (10%)
```
Valor da Venda: R$ 10.000,00
Comissão: R$ 1.000,00 (10% fixo)
```

#### Cenário 2: Vendedor com "Conforme Lista de Preço"
```
Lista de Preço: "Tabela Premium"
Faixas:
  - 0% a 10% desconto → 10% comissão
  - Acima de 10,01% desconto → 5% comissão

Item 1:
├── Preço Lista: R$ 1.000,00
├── Desconto Aplicado: 8% (R$ 80,00)
├── Faixa: 0% a 10% → Comissão 10%
└── Comissão: R$ 100,00

Item 2:
├── Preço Lista: R$ 2.000,00
├── Desconto Aplicado: 12% (R$ 240,00)
├── Faixa: Acima de 10,01% → Comissão 5%
└── Comissão: R$ 100,00

Total Comissão: R$ 200,00
```

## Arquivos Criados

### Types
- `/types/produto.ts` - Interface de Produto
- `/types/listaPreco.ts` - Interfaces de Lista de Preço, Produto-Preço e Faixas de Desconto

### Data/Mocks
- `/data/mockProdutos.ts` - 12 produtos de exemplo (informática)
- `/data/mockListasPreco.ts` - 4 listas de preço pré-configuradas

### Components
- `/components/PriceListManagement.tsx` - Componente principal de gestão

## Interface do Usuário

### Tela Principal
- Cards com informações resumidas de cada lista
- Indicadores visuais:
  - Nome da lista
  - Quantidade de produtos
  - Tipo de comissão (badge)
  - Percentual fixo ou faixas de desconto
- Botões de ação: Editar e Excluir

### Dialog de Cadastro/Edição
Organizado em 3 seções:

1. **Informações Básicas**
   - Nome da lista de preço

2. **Produtos e Preços**
   - Seletor de produto
   - Campo de preço
   - Tabela de produtos adicionados
   - Botões para adicionar/remover

3. **Regras de Comissionamento**
   - Seleção de tipo (Radio buttons)
   - Campos dinâmicos conforme tipo selecionado
   - Para "Conforme Desconto":
     - Cards de faixas
     - Botão para adicionar faixas
     - Exemplos em tempo real

## Validações Implementadas

### Cadastro de Lista:
✓ Nome obrigatório
✓ Pelo menos um produto na lista
✓ Preços devem ser valores positivos

### Alíquota Fixa:
✓ Percentual entre 0 e 100

### Conforme Desconto:
✓ Desconto mínimo entre 0 e 100
✓ Desconto máximo maior que mínimo
✓ Desconto máximo entre 0 e 100 (ou null)
✓ Percentual de comissão entre 0 e 100
✓ Pelo menos uma faixa de desconto

## Dados Mockados

### Produtos (12 itens)
- Notebook Dell Inspiron 15
- Mouse Logitech MX Master 3
- Teclado Mecânico Keychron K2
- Monitor LG UltraWide 29"
- SSD Samsung 970 EVO Plus 1TB
- Memória RAM Corsair 16GB DDR4
- Webcam Logitech C920
- Headset HyperX Cloud II
- Impressora HP LaserJet Pro
- Roteador TP-Link Archer AX50
- HD Externo Seagate 2TB
- Placa de Vídeo RTX 3060

### Listas de Preço (4 tabelas)

**1. Tabela Padrão - Varejo**
- 10 produtos
- Comissão: Alíquota Fixa de 10%

**2. Tabela Premium - Atacado**
- 12 produtos
- Comissão: Conforme Desconto
  - 0% a 10% → 10% comissão
  - Acima de 10,01% → 5% comissão

**3. Tabela Especial - Parceiros**
- 8 produtos
- Comissão: Conforme Desconto
  - 0% a 5% → 12% comissão
  - 5,01% a 15% → 8% comissão
  - Acima de 15,01% → 4% comissão

**4. Tabela Promocional**
- 5 produtos
- Comissão: Alíquota Fixa de 7%

## Integração com Módulos Existentes

### Cliente (CustomerFormCondicaoComercial.tsx)
- Campo: Lista de Preço (select)
- Campo: Desconto Padrão (%)
- Vincula cliente à lista de preço escolhida

### Vendedor (SellerFormComissoes.tsx)
- Opção: Tipo de Comissão
  - Alíquota Fixa
  - Definido em Lista de Preço
- Se fixa: campo de percentual
- Se lista de preço: usa regras da lista

### Vendas (SalesPage.tsx)
- Ao selecionar cliente, carrega lista de preço vinculada
- Preços base dos produtos vêm da lista
- Aplica desconto padrão do cliente
- Calcula comissão conforme hierarquia definida

## Navegação

**Configurações → Cadastros → Listas de Preço**

A aba "Listas de Preço" foi adicionada ao menu de configurações, junto com:
- Empresas
- Naturezas de Operação
- Segmentos de Cliente
- Formas de Pagamento
- Condições de Pagamento

## Recursos Visuais

### Ícones Utilizados
- DollarSign: Produtos e Preços
- TrendingUp: Regras de Comissionamento
- Percent: Percentuais e descontos
- Plus: Adicionar itens
- Edit2: Editar listas
- Trash2: Remover itens

### Badges e Indicadores
- Tipo de comissão (outline badge)
- Número de produtos
- Faixas de desconto (cards com fundo muted)

### Feedback ao Usuário
- Toast notifications para ações
- Placeholders informativos
- Textos explicativos em cada seção
- Exemplos práticos em tempo real

## Observações Técnicas

1. **Performance**: Dados em memória (mock), prontos para integração com backend
2. **Responsividade**: Grid adaptativo (1-3 colunas conforme viewport)
3. **Acessibilidade**: Labels, placeholders e descrições completas
4. **UX**: Validações em tempo real e feedback imediato
5. **Manutenibilidade**: Código componentizado e tipado

## Próximos Passos Sugeridos

1. Integração com backend/API
2. Histórico de alterações de preços
3. Importação/exportação de listas
4. Duplicação de listas
5. Pesquisa e filtros avançados
6. Relatórios de comissionamento
7. Análise de rentabilidade por lista
