# Guia de Integração - Condições de Pagamento

Este documento mostra exemplos de código de como integrar as Condições de Pagamento com o Cadastro de Clientes e a Tela de Vendas.

---

## 1. Integração com Cadastro de Clientes

### Modificar o tipo `Customer` para incluir condições de pagamento

**Arquivo:** `/types/customer.ts`

```typescript
export interface Customer {
  // ... campos existentes ...
  
  // ADICIONAR:
  condicoesPagamentoIds?: string[]; // IDs das condições de pagamento habilitadas
}
```

### Adicionar campo no formulário de cadastro

**Arquivo:** `/components/CustomerFormCondicaoComercial.tsx` (ou criar nova aba)

```typescript
import { CondicaoPagamento } from '../types/condicaoPagamento';
import { condicoesPagamentoMock } from '../data/mockCondicoesPagamento';
import { Checkbox } from './ui/checkbox';

// No componente:
const [selectedCondicoes, setSelectedCondicoes] = useState<string[]>(
  customerData.condicoesPagamentoIds || []
);

// Filtrar apenas condições ativas
const condicoesAtivas = condicoesPagamentoMock.filter(c => c.ativo);

// Renderizar:
<div className="space-y-4">
  <Label>Condições de Pagamento Permitidas</Label>
  <div className="space-y-2 border rounded-lg p-4">
    {condicoesAtivas.map((condicao) => (
      <div key={condicao.id} className="flex items-center space-x-2">
        <Checkbox
          id={`condicao-${condicao.id}`}
          checked={selectedCondicoes.includes(condicao.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedCondicoes([...selectedCondicoes, condicao.id]);
            } else {
              setSelectedCondicoes(selectedCondicoes.filter(id => id !== condicao.id));
            }
          }}
        />
        <label
          htmlFor={`condicao-${condicao.id}`}
          className="text-sm cursor-pointer flex-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{condicao.nome}</span>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{formatarPrazoPagamento(condicao.prazoPagamento)}</span>
              {condicao.descontoExtra > 0 && (
                <Badge variant="success">{condicao.descontoExtra}% OFF</Badge>
              )}
              {condicao.valorPedidoMinimo > 0 && (
                <span className="text-xs">
                  Mín: {condicao.valorPedidoMinimo.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              )}
            </div>
          </div>
        </label>
      </div>
    ))}
  </div>
  
  {selectedCondicoes.length === 0 && (
    <p className="text-sm text-amber-600">
      ⚠️ Nenhuma condição selecionada. O cliente não poderá realizar vendas.
    </p>
  )}
  
  <p className="text-sm text-muted-foreground">
    {selectedCondicoes.length} condição(ões) selecionada(s)
  </p>
</div>
```

---

## 2. Integração com Tela de Vendas

### Adicionar lógica de filtragem e validação

**Arquivo:** `/components/SalesPage.tsx`

```typescript
import { CondicaoPagamento } from '../types/condicaoPagamento';
import { condicoesPagamentoMock } from '../data/mockCondicoesPagamento';
import { formatarPrazoPagamento } from '../types/condicaoPagamento';

// No componente de venda:
const [clienteSelecionado, setClienteSelecionado] = useState<Customer | null>(null);
const [condicaoPagamentoSelecionada, setCondicaoPagamentoSelecionada] = useState<string>('');
const [valorTotalVenda, setValorTotalVenda] = useState(0);

// Obter condições do cliente
const condicoesDoCliente = useMemo(() => {
  if (!clienteSelecionado || !clienteSelecionado.condicoesPagamentoIds) {
    return [];
  }
  
  return condicoesPagamentoMock.filter(
    (condicao) => 
      condicao.ativo && 
      clienteSelecionado.condicoesPagamentoIds!.includes(condicao.id)
  );
}, [clienteSelecionado]);

// Verificar se condição atende ao valor mínimo
const condicaoAtendeMínimo = (condicao: CondicaoPagamento): boolean => {
  return valorTotalVenda >= condicao.valorPedidoMinimo;
};

// Obter forma de pagamento da condição
const getFormaPagamento = (formaPagamentoId: string) => {
  return formasPagamentoMock.find(f => f.id === formaPagamentoId);
};

// Calcular desconto extra aplicado
const descontoExtraAplicado = useMemo(() => {
  if (!condicaoPagamentoSelecionada) return 0;
  
  const condicao = condicoesPagamentoMock.find(
    c => c.id === condicaoPagamentoSelecionada
  );
  
  if (!condicao) return 0;
  
  return (valorTotalVenda * condicao.descontoExtra) / 100;
}, [condicaoPagamentoSelecionada, valorTotalVenda]);

// Renderizar seleção de condições:
<div className="space-y-3">
  <Label>Condição de Pagamento</Label>
  
  {!clienteSelecionado && (
    <p className="text-sm text-muted-foreground">
      Selecione um cliente para ver as condições disponíveis
    </p>
  )}
  
  {clienteSelecionado && condicoesDoCliente.length === 0 && (
    <p className="text-sm text-amber-600">
      ⚠️ Este cliente não possui condições de pagamento configuradas
    </p>
  )}
  
  {clienteSelecionado && condicoesDoCliente.length > 0 && (
    <div className="grid gap-2">
      {condicoesDoCliente.map((condicao) => {
        const atendeMínimo = condicaoAtendeMínimo(condicao);
        const formaPagamento = getFormaPagamento(condicao.formaPagamentoId);
        
        return (
          <button
            key={condicao.id}
            onClick={() => atendeMínimo && setCondicaoPagamentoSelecionada(condicao.id)}
            disabled={!atendeMínimo}
            className={cn(
              "p-4 border rounded-lg text-left transition-all",
              condicaoPagamentoSelecionada === condicao.id
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border hover:border-primary/50",
              !atendeMínimo && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{condicao.nome}</h4>
                  {condicao.descontoExtra > 0 && (
                    <Badge variant="success" className="text-xs">
                      -{condicao.descontoExtra}%
                    </Badge>
                  )}
                </div>
                
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span>{formaPagamento?.nome}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatarPrazoPagamento(condicao.prazoPagamento)}</span>
                  </div>
                </div>
                
                {!atendeMínimo && condicao.valorPedidoMinimo > 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Valor mínimo: {condicao.valorPedidoMinimo.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                    {' '}(faltam {(condicao.valorPedidoMinimo - valorTotalVenda).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })})
                  </p>
                )}
              </div>
              
              {condicaoPagamentoSelecionada === condicao.id && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  )}
</div>

{/* Resumo da venda com desconto */}
<div className="border-t pt-4 space-y-2">
  <div className="flex justify-between">
    <span>Subtotal</span>
    <span>{valorTotalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
  </div>
  
  {descontoExtraAplicado > 0 && (
    <div className="flex justify-between text-green-600">
      <span>Desconto Extra</span>
      <span>
        -{descontoExtraAplicado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  )}
  
  <div className="flex justify-between font-bold text-lg border-t pt-2">
    <span>Total</span>
    <span>
      {(valorTotalVenda - descontoExtraAplicado).toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      })}
    </span>
  </div>
</div>
```

---

## 3. Função Helper para Calcular Parcelas

**Criar arquivo:** `/utils/calcularParcelas.ts`

```typescript
import { CondicaoPagamento } from '../types/condicaoPagamento';

export interface Parcela {
  numero: number;
  valor: number;
  vencimento: Date;
}

export function calcularParcelas(
  condicao: CondicaoPagamento,
  valorTotal: number,
  dataVenda: Date
): Parcela[] {
  const prazos = condicao.prazoPagamento.split('/').map(p => parseInt(p, 10));
  const valorParcela = valorTotal / prazos.length;
  
  return prazos.map((prazo, index) => {
    const vencimento = new Date(dataVenda);
    vencimento.setDate(vencimento.getDate() + prazo);
    
    return {
      numero: index + 1,
      valor: valorParcela,
      vencimento,
    };
  });
}

// Uso:
const parcelas = calcularParcelas(condicaoSelecionada, valorTotal, new Date());
console.log(parcelas);
// [
//   { numero: 1, valor: 1000, vencimento: Date('2025-11-28') },  // +30 dias
//   { numero: 2, valor: 1000, vencimento: Date('2025-12-28') },  // +60 dias
//   { numero: 3, valor: 1000, vencimento: Date('2026-01-27') },  // +90 dias
// ]
```

---

## 4. Validação em Tempo Real

**Componente de alerta dinâmico:**

```typescript
// Adicionar validação visual
{clienteSelecionado && condicoesDoCliente.length > 0 && (
  <Alert>
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Condições Disponíveis</AlertTitle>
    <AlertDescription>
      {condicoesDoCliente.filter(c => condicaoAtendeMínimo(c)).length} de{' '}
      {condicoesDoCliente.length} condição(ões) disponível(is) para este valor de venda
    </AlertDescription>
  </Alert>
)}
```

---

## 5. Dados de Exemplo para Testes

### Cliente com Condições Configuradas

```typescript
const clienteExemplo: Customer = {
  id: '1',
  razaoSocial: 'Empresa Teste Ltda',
  // ... outros campos ...
  condicoesPagamentoIds: ['cp-1', 'cp-3', 'cp-4', 'cp-5'] // IDs das condições
};
```

### Cenários de Teste

**Cenário 1: Venda de R$ 500**
- ✅ cp-1: À Vista - PIX (sem mínimo)
- ✅ cp-3: 30 dias - Transferência (mínimo R$ 500)
- ❌ cp-4: 2x Cheque (mínimo R$ 1.000)
- ❌ cp-5: 3x Depósito (mínimo R$ 2.000)

**Cenário 2: Venda de R$ 1.500**
- ✅ cp-1: À Vista - PIX (desconto de 5% = R$ 75)
- ✅ cp-3: 30 dias - Transferência
- ✅ cp-4: 2x Cheque
- ❌ cp-5: 3x Depósito (mínimo R$ 2.000)

**Cenário 3: Venda de R$ 3.000**
- ✅ Todas as condições disponíveis
- Desconto máximo: cp-1 com 5% = R$ 150

---

## 6. Relatórios e Analytics

**Condições mais usadas:**

```typescript
interface CondicaoComUso {
  condicao: CondicaoPagamento;
  quantidadeVendas: number;
  valorTotal: number;
}

function getCondicoesMaisUsadas(vendas: Venda[]): CondicaoComUso[] {
  const uso = new Map<string, { qtd: number; valor: number }>();
  
  vendas.forEach(venda => {
    const current = uso.get(venda.condicaoPagamentoId) || { qtd: 0, valor: 0 };
    uso.set(venda.condicaoPagamentoId, {
      qtd: current.qtd + 1,
      valor: current.valor + venda.valorTotal,
    });
  });
  
  return Array.from(uso.entries())
    .map(([id, stats]) => ({
      condicao: condicoesPagamentoMock.find(c => c.id === id)!,
      quantidadeVendas: stats.qtd,
      valorTotal: stats.valor,
    }))
    .sort((a, b) => b.quantidadeVendas - a.quantidadeVendas);
}
```

---

## Checklist de Implementação

### Cadastro de Clientes
- [ ] Adicionar campo `condicoesPagamentoIds` ao tipo `Customer`
- [ ] Criar interface de seleção múltipla de condições
- [ ] Validar que pelo menos uma condição está selecionada
- [ ] Exibir preview das condições selecionadas

### Tela de Vendas
- [ ] Filtrar condições por cliente selecionado
- [ ] Implementar validação de valor mínimo
- [ ] Desabilitar condições que não atendem requisitos
- [ ] Calcular e aplicar desconto extra automaticamente
- [ ] Exibir detalhes das parcelas (se parcelado)
- [ ] Mostrar alerta quando valor não atinge nenhuma condição

### Melhorias Futuras
- [ ] Permitir edição rápida de condições na tela de venda
- [ ] Sugestão automática da melhor condição para o cliente
- [ ] Histórico de condições usadas por cliente
- [ ] Alertas de condições próximas ao valor mínimo
- [ ] Simulador de condições de pagamento

---

**Este é um guia de referência para implementação futura.**  
Os tipos e dados mock já estão prontos e podem ser utilizados imediatamente.
