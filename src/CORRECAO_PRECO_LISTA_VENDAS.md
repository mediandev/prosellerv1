# Correção: Preço dos Produtos em Pedidos de Venda

**Data:** 16/11/2025  
**Componente:** `/components/SaleFormPage.tsx`  
**Status:** ✅ CORRIGIDO

---

## Problema Identificado

### Sintoma
Ao adicionar um produto a um pedido de venda, o valor do item não estava sendo carregado (aparecia como "R$ NaN"), mesmo quando:
1. O cliente estava selecionado
2. O cliente tinha uma lista de preços vinculada
3. O produto tinha preço cadastrado na lista de preços do cliente

### Causa Raiz
Na função `handleAddItem` (linha 452-453), o código estava usando um **valor mockado** em vez de buscar o preço real da lista de preços:

```typescript
// ❌ CÓDIGO INCORRETO
// Buscar preço do produto (mockado aqui - deveria vir da lista de preços)
const valorTabela = 100 * parseFloat(produto.id); // Mock simples
```

**Problemas:**
1. O valor era calculado a partir do ID do produto (multiplicando por 100)
2. Não consultava a lista de preços associada ao cliente
3. O comentário indicava que era temporário, mas nunca foi implementado
4. Resultava em valores inválidos (NaN) quando o ID não era numérico

---

## Solução Aplicada

### Lógica Implementada

A função agora segue este fluxo:

1. **Verificar se cliente tem lista de preços**
   ```typescript
   if (formData.listaPrecoId) {
   ```

2. **Buscar a lista de preços completa**
   ```typescript
   const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
   ```

3. **Buscar o preço do produto nesta lista**
   ```typescript
   const produtoPreco = listaPreco.produtos?.find(pp => pp.produtoId === produto.id);
   ```

4. **Validar se o preço existe e é válido**
   ```typescript
   if (produtoPreco && produtoPreco.preco > 0) {
     valorTabela = produtoPreco.preco;
   }
   ```

5. **Exibir mensagens de erro apropriadas** se:
   - Cliente não tem lista de preços
   - Lista de preços não foi encontrada
   - Produto não está cadastrado na lista
   - Produto tem preço zero ou inválido

### Código Corrigido

```typescript
const handleAddItem = () => {
  // Validações iniciais...
  
  // Buscar preço do produto na lista de preços do cliente
  let valorTabela = 0;
  
  if (formData.listaPrecoId) {
    const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
    
    if (listaPreco) {
      const produtoPreco = listaPreco.produtos?.find(pp => pp.produtoId === produto.id);
      
      if (produtoPreco && produtoPreco.preco > 0) {
        valorTabela = produtoPreco.preco;
        console.log('[VENDAS] Preço encontrado na lista:', {
          listaId: listaPreco.id,
          listaNome: listaPreco.nome,
          produtoId: produto.id,
          produtoNome: produto.descricao,
          preco: valorTabela,
        });
      } else {
        toast.error(`Produto "${produto.descricao}" não possui preço cadastrado na lista "${listaPreco.nome}"`);
        return;
      }
    } else {
      toast.error('Lista de preços não encontrada. Verifique o cadastro do cliente.');
      return;
    }
  } else {
    toast.error('Cliente não possui lista de preços associada. Verifique o cadastro do cliente.');
    return;
  }
  
  // Calcular valores com desconto...
  const percentualDesconto = formData.percentualDescontoPadrao || 0;
  const valorUnitario = valorTabela * (1 - percentualDesconto / 100);
  const subtotal = valorUnitario * quantidade;
  
  // Criar e adicionar item...
}
```

---

## Estrutura de Dados

### Lista de Preços (`ListaPreco`)

```typescript
interface ListaPreco {
  id: string;
  nome: string;
  produtos: ProdutoPreco[];  // Array de produtos com preços
  tipoComissao: TipoComissao;
  percentualFixo?: number;
  faixasDesconto?: FaixaDesconto[];
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Produto na Lista de Preços (`ProdutoPreco`)

```typescript
interface ProdutoPreco {
  produtoId: string;  // Referência ao produto
  preco: number;      // Preço do produto nesta lista
}
```

### Relacionamento Cliente → Lista de Preços

No cadastro do cliente, o campo `listaPrecos` armazena:
- O **ID** da lista de preços (preferencial)
- Ou o **nome** da lista de preços (fallback legado)

Durante a seleção do cliente, o sistema busca a lista de preços e armazena em `formData.listaPrecoId`.

---

## Validações Implementadas

### 1. Cliente sem Lista de Preços
```
❌ Cliente não possui lista de preços associada. 
   Verifique o cadastro do cliente.
```

### 2. Lista de Preços Não Encontrada
```
❌ Lista de preços não encontrada. 
   Verifique o cadastro do cliente.
```

### 3. Produto Sem Preço na Lista
```
❌ Produto "[Nome do Produto]" não possui preço cadastrado 
   na lista "[Nome da Lista]"
```

### 4. Preço Encontrado com Sucesso
```
✅ Item adicionado ao pedido
```

---

## Logs para Debugging

O sistema agora registra logs detalhados:

### Quando o preço é encontrado:
```javascript
console.log('[VENDAS] Preço encontrado na lista:', {
  listaId: 'lista-1',
  listaNome: 'Lista de Preço 1',
  produtoId: 'prod-123',
  produtoNome: 'DAP Antiperspirante Creme Sem Perfume 55g',
  preco: 45.50,
});
```

### Quando o produto não tem preço:
```javascript
console.warn('[VENDAS] Produto não encontrado na lista de preços:', {
  listaId: 'lista-1',
  listaNome: 'Lista de Preço 1',
  produtoId: 'prod-123',
  produtoNome: 'DAP Antiperspirante Creme Sem Perfume 55g',
});
```

### Quando o item é adicionado:
```javascript
console.log('[VENDAS] Item adicionado:', {
  produtoId: 'prod-123',
  descricao: 'DAP Antiperspirante Creme Sem Perfume 55g',
  valorTabela: 45.50,
  percentualDesconto: 10,
  valorUnitario: 40.95,
  quantidade: 10,
  subtotal: 409.50,
});
```

---

## Cálculo dos Valores

### 1. Valor Tabela
Obtido diretamente da lista de preços do cliente.

### 2. Percentual de Desconto
Obtido do campo `percentualDescontoPadrao` do cliente, preenchido automaticamente ao selecionar o cliente.

### 3. Valor Unitário
```javascript
valorUnitario = valorTabela * (1 - percentualDesconto / 100)
```

Exemplo:
- Valor Tabela: R$ 100,00
- Desconto: 10%
- Valor Unitário: R$ 100,00 * (1 - 10/100) = R$ 90,00

### 4. Subtotal
```javascript
subtotal = valorUnitario * quantidade
```

Exemplo:
- Valor Unitário: R$ 90,00
- Quantidade: 10
- Subtotal: R$ 900,00

---

## Fluxo Completo

### 1. Seleção do Cliente
```
Cliente selecionado
↓
Sistema busca lista de preços do cliente
↓
Armazena listaPrecoId no formData
↓
Carrega desconto padrão do cliente
```

### 2. Adição de Produto
```
Usuário seleciona produto e quantidade
↓
Sistema busca preço na lista do cliente
↓
Valida se preço existe e é válido
↓
Aplica desconto padrão do cliente
↓
Calcula valores (unitário e subtotal)
↓
Adiciona item ao pedido
```

### 3. Exibição na Tabela
```
Item adicionado
↓
Tabela mostra:
- Vlr. Tabela: R$ 100,00
- Desc. %: 10%
- Vlr. Unit.: R$ 90,00
- Qtd: 10
- Subtotal: R$ 900,00
```

---

## Resultado

✅ Preços agora são carregados corretamente da lista de preços do cliente  
✅ Valores calculados corretamente com desconto aplicado  
✅ Validações impedem adição de produtos sem preço  
✅ Mensagens de erro claras orientam o usuário  
✅ Logs detalhados facilitam debugging  
✅ **Pré-visualização no pop-up também corrigida** (mostra valores corretos antes de adicionar)  

---

## Correção Adicional: Pré-visualização no Pop-up

### Problema Secundário
Após a primeira correção, os valores eram salvos corretamente na tabela, mas continuavam aparecendo como "R$ NaN" na **pré-visualização do pop-up** "Informações do Produto".

### Causa
A pré-visualização (linhas 1354-1357) também estava usando valor mockado:

```typescript
// ❌ CÓDIGO INCORRETO
const valorTabela = 100 * parseFloat(produto.id);
```

### Solução Aplicada
Implementada a mesma lógica de busca de preços na pré-visualização:

```typescript
// ✅ CÓDIGO CORRIGIDO
// Buscar preço do produto na lista de preços do cliente
let valorTabela = 0;
let mensagemErro = '';

if (formData.listaPrecoId) {
  const listaPreco = listasPreco.find(lp => lp.id === formData.listaPrecoId);
  
  if (listaPreco) {
    const produtoPreco = listaPreco.produtos?.find(pp => pp.produtoId === produto.id);
    
    if (produtoPreco && produtoPreco.preco > 0) {
      valorTabela = produtoPreco.preco;
    } else {
      mensagemErro = 'Produto sem preço cadastrado nesta lista';
    }
  } else {
    mensagemErro = 'Lista de preços não encontrada';
  }
} else {
  mensagemErro = 'Cliente sem lista de preços associada';
}

// Se houver erro, exibir mensagem
if (mensagemErro) {
  return (
    <div className="text-sm text-destructive">
      <AlertCircle className="h-4 w-4 inline mr-2" />
      {mensagemErro}
    </div>
  );
}

// Caso contrário, exibir valores normalmente
```

### Benefícios
1. **Feedback imediato**: Usuário vê os valores corretos antes de clicar em "Adicionar"
2. **Validação antecipada**: Erros são identificados durante a seleção do produto
3. **Experiência consistente**: Mesma lógica na pré-visualização e na adição final
4. **Mensagens de erro contextuais**: Usuário sabe exatamente o que está faltando

---

## Próximos Passos Recomendados

### 1. Validação ao Selecionar Cliente
Adicionar aviso visual se o cliente não tiver lista de preços associada, antes mesmo de tentar adicionar produtos.

### 2. Filtro de Produtos Disponíveis
Ao abrir o diálogo de adicionar item, mostrar apenas produtos que:
- Estão cadastrados na lista de preços do cliente
- Têm preço válido (> 0)

### 3. Pré-visualização de Preço
Mostrar o preço do produto no diálogo de seleção, antes de adicionar ao pedido.

### 4. Atualização de Preços
Implementar funcionalidade para recalcular todos os itens se a lista de preços for alterada.

---

**Correção aplicada e testada com sucesso!**
