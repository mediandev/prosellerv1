# Exemplo de Integração - Listas de Preço em Vendas

## Cenário Completo: Venda com Lista de Preço

### 1. Configuração Prévia

#### Cadastro de Lista de Preço
```
Nome: Tabela Premium - Atacado
Produtos:
  - Notebook Dell Inspiron 15: R$ 3.200,00
  - Mouse Logitech MX Master 3: R$ 400,00
  - Teclado Mecânico Keychron K2: R$ 620,00

Tipo de Comissão: Conforme Desconto
Faixas:
  1. Desconto de 0% a 10% → Comissão de 10%
  2. Desconto acima de 10,01% → Comissão de 5%
```

#### Cadastro de Cliente
```
Cliente: Tech Solutions LTDA
CNPJ: 12.345.678/0001-90
Lista de Preço: Tabela Premium - Atacado
Desconto Padrão: 8%
```

#### Cadastro de Vendedor
```
Vendedor: João Silva
Tipo de Comissão: Definido em Lista de Preço
(Usará as regras da lista de preço em cada venda)
```

### 2. Fluxo de Venda

#### Passo 1: Início da Venda
```typescript
// Sistema carrega dados do cliente
const cliente = getClienteById('cliente-123');

// Dados do cliente
{
  nome: "Tech Solutions LTDA",
  listaPrecos: "lista-2", // ID da "Tabela Premium - Atacado"
  descontoPadrao: 8 // 8%
}

// Sistema carrega a lista de preço vinculada
const listaPreco = getListaPrecoById('lista-2');
```

#### Passo 2: Adicionar Produto 1
```typescript
// Vendedor adiciona: Notebook Dell Inspiron 15
const produto1 = {
  id: '1',
  nome: 'Notebook Dell Inspiron 15',
  quantidade: 2
};

// Sistema busca preço na lista
const precoLista = listaPreco.produtos.find(p => p.produtoId === '1').preco;
// precoLista = R$ 3.200,00

// Aplica desconto padrão do cliente
const descontoPadrao = cliente.descontoPadrao; // 8%
const descontoValor = precoLista * (descontoPadrao / 100);
// descontoValor = R$ 256,00

const precoUnitario = precoLista - descontoValor;
// precoUnitario = R$ 2.944,00

const valorTotal = precoUnitario * produto1.quantidade;
// valorTotal = R$ 5.888,00
```

#### Passo 3: Adicionar Produto 2
```typescript
// Vendedor adiciona: Mouse Logitech MX Master 3
const produto2 = {
  id: '2',
  nome: 'Mouse Logitech MX Master 3',
  quantidade: 5
};

// Sistema busca preço na lista
const precoLista2 = listaPreco.produtos.find(p => p.produtoId === '2').preco;
// precoLista2 = R$ 400,00

// Aplica desconto padrão do cliente (8%)
const descontoValor2 = precoLista2 * 0.08;
// descontoValor2 = R$ 32,00

const precoUnitario2 = precoLista2 - descontoValor2;
// precoUnitario2 = R$ 368,00

const valorTotal2 = precoUnitario2 * produto2.quantidade;
// valorTotal2 = R$ 1.840,00
```

#### Passo 4: Vendedor Aplica Desconto Adicional no Produto 1
```typescript
// Vendedor decide dar desconto adicional de 4% no Notebook
const descontoAdicional = 4; // %
const descontoTotalProduto1 = descontoPadrao + descontoAdicional;
// descontoTotalProduto1 = 12%

// Recalcula preço
const descontoTotal = precoLista * 0.12;
// descontoTotal = R$ 384,00

const novoPrecoUnitario = precoLista - descontoTotal;
// novoPrecoUnitario = R$ 2.816,00

const novoValorTotal = novoPrecoUnitario * 2;
// novoValorTotal = R$ 5.632,00
```

#### Passo 5: Resumo da Venda
```
Item 1: Notebook Dell Inspiron 15
  - Quantidade: 2
  - Preço Lista: R$ 3.200,00
  - Desconto Total: 12% (8% padrão + 4% adicional)
  - Preço Unitário Final: R$ 2.816,00
  - Subtotal: R$ 5.632,00

Item 2: Mouse Logitech MX Master 3
  - Quantidade: 5
  - Preço Lista: R$ 400,00
  - Desconto Total: 8% (padrão)
  - Preço Unitário Final: R$ 368,00
  - Subtotal: R$ 1.840,00

Total da Venda: R$ 7.472,00
```

### 3. Cálculo de Comissão

#### Verificar Tipo de Comissão do Vendedor
```typescript
const vendedor = getVendedorById('user-2');

if (vendedor.tipoComissao === 'fixa') {
  // Usa percentual fixo do vendedor
  const comissao = valorTotalVenda * (vendedor.percentualFixo / 100);
} else if (vendedor.tipoComissao === 'lista_preco') {
  // Usa regras da lista de preço
  const comissao = calcularComissaoPorListaPreco();
}
```

#### Cálculo Item por Item (Vendedor com "Definido em Lista de Preço")
```typescript
// Item 1: Notebook (desconto de 12%)
const descontoItem1 = 12; // %

// Busca faixa de desconto aplicável na lista de preço
const faixa1 = listaPreco.faixasDesconto.find(f => 
  descontoItem1 >= f.descontoMin && 
  (f.descontoMax === null || descontoItem1 <= f.descontoMax)
);

// Faixa encontrada: "Acima de 10,01%" → Comissão 5%
const comissaoItem1 = 5632.00 * 0.05;
// comissaoItem1 = R$ 281,60

// Item 2: Mouse (desconto de 8%)
const descontoItem2 = 8; // %

// Busca faixa de desconto aplicável
const faixa2 = listaPreco.faixasDesconto.find(f => 
  descontoItem2 >= f.descontoMin && 
  (f.descontoMax === null || descontoItem2 <= f.descontoMax)
);

// Faixa encontrada: "0% a 10%" → Comissão 10%
const comissaoItem2 = 1840.00 * 0.10;
// comissaoItem2 = R$ 184,00

// Comissão Total
const comissaoTotal = comissaoItem1 + comissaoItem2;
// comissaoTotal = R$ 465,60
```

### 4. Resultado Final da Venda

```
═══════════════════════════════════════════════════
                   PEDIDO DE VENDA
═══════════════════════════════════════════════════

Cliente: Tech Solutions LTDA
CNPJ: 12.345.678/0001-90
Lista de Preço: Tabela Premium - Atacado
Vendedor: João Silva

───────────────────────────────────────────────────
ITENS
───────────────────────────────────────────────────

1. Notebook Dell Inspiron 15
   Qtd: 2 un
   Preço Lista: R$ 3.200,00
   Desconto: 12% (R$ 384,00)
   Preço Unit.: R$ 2.816,00
   Subtotal: R$ 5.632,00
   Comissão Vendedor: 5% = R$ 281,60

2. Mouse Logitech MX Master 3
   Qtd: 5 un
   Preço Lista: R$ 400,00
   Desconto: 8% (R$ 32,00)
   Preço Unit.: R$ 368,00
   Subtotal: R$ 1.840,00
   Comissão Vendedor: 10% = R$ 184,00

───────────────────────────────────────────────────
TOTAIS
───────────────────────────────────────────────────

Subtotal Produtos: R$ 7.472,00
Desconto Total: R$ 928,00
Total da Venda: R$ 7.472,00

Comissão do Vendedor: R$ 465,60

═══════════════════════════════════════════════════
```

### 5. Comparação de Cenários de Comissão

#### Cenário A: Vendedor com Alíquota Fixa de 8%
```
Valor da Venda: R$ 7.472,00
Comissão: R$ 7.472,00 × 8% = R$ 597,76
```

#### Cenário B: Vendedor com "Definido em Lista de Preço"
```
Item 1 (12% desconto): R$ 5.632,00 × 5% = R$ 281,60
Item 2 (8% desconto): R$ 1.840,00 × 10% = R$ 184,00
Comissão Total: R$ 465,60
```

**Diferença:** R$ 597,76 - R$ 465,60 = R$ 132,16 a menos

**Análise:** No Cenário B, o vendedor ganha menos comissão porque:
- Deu desconto acima de 10% no notebook (caiu para faixa de 5%)
- Manteve desconto padrão no mouse (ficou na faixa de 10%)

Isso incentiva o vendedor a:
1. Negociar descontos menores
2. Aumentar a margem de lucro da empresa
3. Ser mais estratégico nas negociações

## Código de Exemplo

### Interface de Venda Simplificada

```typescript
interface ItemVenda {
  produtoId: string;
  quantidade: number;
  precoLista: number;
  descontoPercentual: number;
  precoUnitario: number;
  subtotal: number;
  comissaoPercentual: number;
  comissaoValor: number;
}

interface Venda {
  clienteId: string;
  vendedorId: string;
  listaPrecoId: string;
  itens: ItemVenda[];
  valorTotal: number;
  comissaoTotal: number;
}

// Função para calcular item
function calcularItemVenda(
  produto: Produto,
  quantidade: number,
  cliente: Cliente,
  listaPreco: ListaPreco,
  descontoAdicional: number = 0
): ItemVenda {
  // Busca preço do produto na lista
  const precoLista = listaPreco.produtos.find(
    p => p.produtoId === produto.id
  )?.preco || 0;

  // Calcula desconto total
  const descontoTotal = cliente.descontoPadrao + descontoAdicional;
  
  // Calcula preço unitário
  const descontoValor = precoLista * (descontoTotal / 100);
  const precoUnitario = precoLista - descontoValor;
  
  // Calcula subtotal
  const subtotal = precoUnitario * quantidade;

  return {
    produtoId: produto.id,
    quantidade,
    precoLista,
    descontoPercentual: descontoTotal,
    precoUnitario,
    subtotal,
    comissaoPercentual: 0, // será calculado depois
    comissaoValor: 0, // será calculado depois
  };
}

// Função para calcular comissão
function calcularComissaoItem(
  item: ItemVenda,
  vendedor: Vendedor,
  listaPreco: ListaPreco
): { percentual: number; valor: number } {
  // Se vendedor tem alíquota fixa
  if (vendedor.tipoComissao === 'fixa') {
    return {
      percentual: vendedor.percentualFixo,
      valor: item.subtotal * (vendedor.percentualFixo / 100),
    };
  }

  // Se vendedor usa lista de preço
  if (vendedor.tipoComissao === 'lista_preco') {
    // Se lista tem alíquota fixa
    if (listaPreco.tipoComissao === 'fixa') {
      return {
        percentual: listaPreco.percentualFixo,
        valor: item.subtotal * (listaPreco.percentualFixo / 100),
      };
    }

    // Se lista tem faixas de desconto
    if (listaPreco.tipoComissao === 'conforme_desconto') {
      const faixa = listaPreco.faixasDesconto.find(
        f => item.descontoPercentual >= f.descontoMin &&
             (f.descontoMax === null || item.descontoPercentual <= f.descontoMax)
      );

      if (faixa) {
        return {
          percentual: faixa.percentualComissao,
          valor: item.subtotal * (faixa.percentualComissao / 100),
        };
      }
    }
  }

  return { percentual: 0, valor: 0 };
}
```

## Benefícios do Sistema

### 1. Flexibilidade
- Múltiplas listas de preço para diferentes segmentos
- Regras de comissão personalizáveis por lista
- Descontos negociáveis mantendo rastreabilidade

### 2. Controle
- Preços base padronizados por lista
- Comissões atreladas ao desconto concedido
- Incentivo para margens maiores

### 3. Transparência
- Cálculo automático e auditável
- Vendedor sabe exatamente quanto ganhará
- Gestão pode analisar margens em tempo real

### 4. Estratégia Comercial
- Diferentes políticas para diferentes clientes
- Incentivo à venda de produtos com maior margem
- Controle de rentabilidade por lista/cliente
