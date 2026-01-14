# Sistema de Condições de Pagamento

## Visão Geral

O sistema de **Condições de Pagamento** permite configurar condições comerciais que estarão disponíveis para seleção durante as vendas aos clientes. Cada condição combina uma forma de pagamento com prazos, descontos e valores mínimos.

---

## Componentes Implementados

### 1. **Tipos TypeScript** (`/types/condicaoPagamento.ts`)

#### Interface `CondicaoPagamento`
```typescript
interface CondicaoPagamento {
  id: string;
  nome: string;                    // Nome descritivo da condição
  formaPagamentoId: string;        // FK para forma de pagamento
  prazoPagamento: string;          // Prazo em dias (ex: "30" ou "30/60/90")
  descontoExtra: number;           // Percentual de desconto (0-100)
  valorPedidoMinimo: number;       // Valor mínimo do pedido
  ativo: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
}
```

#### Funções Helper Disponíveis

**`calcularNumeroParcelas(prazoPagamento: string): number`**
- Calcula o número de parcelas a partir do prazo
- Exemplo: "30/60/90" retorna 3

**`formatarPrazoPagamento(prazoPagamento: string): string`**
- Formata o prazo para exibição amigável
- Exemplos:
  - "0" → "0 dias"
  - "30" → "30 dias"
  - "30/60/90" → "3x (30 / 60 / 90 dias)"

**`validarPrazoPagamento(prazoPagamento: string): { valido: boolean; erro?: string }`**
- Valida o formato do prazo de pagamento
- Verifica se os prazos estão em ordem crescente
- Retorna objeto com status de validação e mensagem de erro

---

## 2. **Dados Mock** (`/data/mockCondicoesPagamento.ts`)

10 condições de pagamento pré-cadastradas para demonstração:

| ID | Nome | Forma | Prazo | Desconto | Valor Mínimo | Status |
|----|------|-------|-------|----------|--------------|--------|
| cp-1 | À Vista - PIX com 5% desconto | PIX | 0 | 5% | R$ 0 | Ativo |
| cp-2 | À Vista - Dinheiro com 3% desconto | Dinheiro | 0 | 3% | R$ 0 | Ativo |
| cp-3 | 30 dias - Transferência | Transferência | 30 | 0% | R$ 500 | Ativo |
| cp-4 | 2x (30/60 dias) - Cheque | Cheque | 30/60 | 0% | R$ 1.000 | Ativo |
| cp-5 | 3x (30/60/90 dias) - Depósito | Depósito | 30/60/90 | 0% | R$ 2.000 | Ativo |
| cp-6 | Cartão de Crédito - À Vista | Cartão de Crédito | 0 | 0% | R$ 0 | Ativo |
| cp-7 | Cartão de Débito - À Vista | Cartão de Débito | 0 | 0% | R$ 0 | Ativo |
| cp-8 | 4x (30/60/90/120 dias) - Transferência | Transferência | 30/60/90/120 | 0% | R$ 5.000 | Ativo |
| cp-9 | 45 dias - PIX | PIX | 45 | 0% | R$ 1.500 | Ativo |
| cp-10 | 60 dias - Transferência Premium | Transferência | 60 | 0% | R$ 10.000 | Inativo |

---

## 3. **Interface de Configuração** (SettingsPage)

### Nova Aba: "Condições de Pagamento"

A interface permite:

#### ✅ **Cadastro de Nova Condição**
- Nome descritivo da condição
- Seleção de forma de pagamento (apenas formas habilitadas para "Condições de Pagamento")
- Prazo de pagamento em dias
- Desconto extra (%)
- Valor de pedido mínimo (R$)

#### ✅ **Listagem de Condições**
Tabela com colunas:
- Nome
- Forma de Pagamento (com ícone)
- Prazo (formatado)
- Desconto (com destaque visual se > 0)
- Valor Mínimo (formatado em moeda)
- Status (Ativo/Inativo)
- Ações (Toggle Status e Deletar)

#### ✅ **Validações**
- Nome obrigatório
- Forma de pagamento obrigatória
- Prazo de pagamento com validação de formato
- Prazos em ordem crescente para parcelamento
- Desconto entre 0 e 100%
- Valor mínimo não negativo

---

## Como Funciona

### 1. **Configuração nas Settings**

As condições são criadas em **Configurações > Condições de Pagamento**.

**Importante:** Apenas formas de pagamento com o switch **"Condições de Pagamento"** habilitado estarão disponíveis para seleção.

### 2. **Associação com Cliente**

No cadastro de clientes, haverá uma seção para associar quais condições de pagamento estarão disponíveis para aquele cliente específico.

### 3. **Uso na Venda**

Durante a inclusão de uma venda:

1. **Filtragem por Cliente**: Apenas condições associadas ao cliente selecionado ficam visíveis
2. **Validação de Valor Mínimo**: Condições só são clicáveis se o valor total da venda for ≥ valor mínimo configurado
3. **Aplicação de Desconto**: Se a condição tiver desconto extra, ele é aplicado automaticamente sobre o subtotal de produtos

---

## Formato do Prazo de Pagamento

### Exemplos Válidos:

| Input | Significado | Parcelas |
|-------|-------------|----------|
| `0` | À vista | 1 |
| `30` | 30 dias | 1 |
| `30/60` | 2 parcelas (30 e 60 dias) | 2 |
| `30/60/90` | 3 parcelas (30, 60 e 90 dias) | 3 |
| `30/60/90/120` | 4 parcelas | 4 |
| `15/30/45/60/75/90` | 6 parcelas | 6 |

### Regras de Validação:

✅ Apenas números e barras (`/`)  
✅ Prazos em ordem crescente  
✅ Sem espaços  
❌ `60/30` - Ordem incorreta  
❌ `30//60` - Barra dupla  
❌ `abc` - Não numérico  

---

## Exemplos de Uso

### Exemplo 1: Desconto à Vista
```
Nome: "À Vista - PIX com 5% desconto"
Forma: PIX
Prazo: 0
Desconto: 5%
Valor Mínimo: R$ 0,00
```
**Comportamento:** Disponível para qualquer valor e aplica 5% de desconto automaticamente.

### Exemplo 2: Parcelado com Valor Mínimo
```
Nome: "3x (30/60/90 dias) - Depósito"
Forma: Depósito Bancário
Prazo: 30/60/90
Desconto: 0%
Valor Mínimo: R$ 2.000,00
```
**Comportamento:** Só fica disponível se venda ≥ R$ 2.000. Divide pagamento em 3 parcelas.

### Exemplo 3: Prazo Especial para Grandes Valores
```
Nome: "60 dias - Transferência Premium"
Forma: Transferência Bancária
Prazo: 60
Desconto: 0%
Valor Mínimo: R$ 10.000,00
```
**Comportamento:** Condição exclusiva para vendas de alto valor.

---

## Integração com Outros Módulos

### ✅ **Formas de Pagamento**
- Condições de pagamento dependem das formas cadastradas
- Apenas formas com `usarEmCondicoesPagamento: true` são listadas
- Se uma forma for desativada, as condições que a utilizam permanecem cadastradas mas podem ter comportamento inconsistente

### 🔜 **Cadastro de Clientes** (Próxima Implementação)
- Adicionar campo multi-select de condições de pagamento
- Apenas condições ativas serão selecionáveis
- Salvar array de IDs de condições associadas ao cliente

### 🔜 **Tela de Vendas** (Próxima Implementação)
- Listar condições do cliente selecionado
- Calcular se valor da venda atende ao mínimo
- Desabilitar condições que não atendem ao requisito
- Aplicar desconto extra automaticamente ao selecionar condição

---

## Notificações (Toast)

O sistema exibe notificações para:
- ✅ Condição cadastrada com sucesso
- ✅ Condição removida
- ❌ Erros de validação (nome vazio, forma não selecionada, etc.)
- ❌ Formato de prazo inválido
- ❌ Desconto fora da faixa permitida

---

## Tecnologias Utilizadas

- **React** com TypeScript
- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **Sonner** para notificações toast
- **shadcn/ui** components (Dialog, Table, Badge, etc.)

---

## Próximos Passos Sugeridos

1. **Integrar com Cadastro de Clientes**
   - Adicionar campo de seleção múltipla de condições
   - Salvar relacionamento cliente ↔ condições

2. **Implementar na Tela de Vendas**
   - Filtrar condições por cliente
   - Validar valor mínimo em tempo real
   - Calcular desconto extra automaticamente

3. **Melhorias Futuras**
   - Histórico de alterações de condições
   - Relatório de condições mais usadas
   - Configuração de juros para atraso
   - Templates de condições para diferentes segmentos

---

## Arquivo de Tipos

**Localização:** `/types/condicaoPagamento.ts`

```typescript
export interface CondicaoPagamento { ... }
export interface NovaCondicaoPagamento { ... }
export function calcularNumeroParcelas(prazoPagamento: string): number
export function formatarPrazoPagamento(prazoPagamento: string): string
export function validarPrazoPagamento(prazoPagamento: string): { valido: boolean; erro?: string }
```

## Arquivo de Dados Mock

**Localização:** `/data/mockCondicoesPagamento.ts`

```typescript
export const condicoesPagamentoMock: CondicaoPagamento[]
```

---

**Documentação criada em:** 29/10/2025  
**Versão do Sistema:** 1.0  
**Autor:** Sistema de Gestão Comercial e Força de Vendas
