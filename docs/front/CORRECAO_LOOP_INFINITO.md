# 🔧 Correção: Loop Infinito no TinyERPPedidosPage

## ❌ Problema Identificado

### Erro:
```
RangeError: Maximum call stack size exceeded
    at components/TinyERPPedidosPage.tsx:35:22
```

### Sintomas:
- Página "Tiny ERP" travava ao carregar
- Erro de stack overflow no console
- Navegador ficava sem resposta

### Causa Raiz:

**Problema 1: Proxy Problemático**
O arquivo `/data/mockVendas.ts` estava usando um `Proxy` para detectar mudanças no array e salvar automaticamente no localStorage. Este Proxy estava causando loops infinitos quando componentes React tentavam acessar o array.

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (removido)
if (typeof window !== 'undefined') {
  const handler = {
    set(target: any, property: string, value: any) {
      target[property] = value;
      if (property !== 'length') {
        salvarVendasNoLocalStorage(target); // 💥 Podia causar loops
      }
      return true;
    },
  };
  Object.setPrototypeOf(mockVendas, new Proxy(mockVendas, handler));
}
```

**Problema 2: useMemo com Referência Mutável**
O `TinyERPPedidosPage` usava `mockVendas` diretamente no `useMemo`, e como o array podia ser modificado, causava re-renders infinitos.

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (corrigido)
const vendasTiny = useMemo(() => {
  return mockVendas.filter(venda => { // 💥 mockVendas era mutável
    // ...
  });
}, [searchTerm]); // 💥 Faltava mockVendas nas dependências
```

## ✅ Solução Implementada

### 1. Remoção do Proxy

**Arquivo:** `/data/mockVendas.ts`

Removemos o Proxy automático e voltamos para salvamento manual:

```typescript
// ✅ CÓDIGO CORRIGIDO
export const mockVendas: Venda[] = carregarVendasDoLocalStorage();

// Nota: O salvamento no localStorage é feito manualmente após modificações
// chamando salvarVendasNoLocalStorage(mockVendas) nos pontos de modificação
```

**Vantagens:**
- ✅ Sem loops infinitos
- ✅ Controle explícito de quando salvar
- ✅ Mais previsível e debugável
- ✅ Melhor performance

**Onde salvar manualmente:**
O salvamento já está implementado em:
- `/components/SaleFormPage.tsx` - ao criar/editar venda

### 2. Snapshot no useMemo

**Arquivo:** `/components/TinyERPPedidosPage.tsx`

Criamos um snapshot (cópia) do array antes de filtrar:

```typescript
// ✅ CÓDIGO CORRIGIDO
const [refreshKey, setRefreshKey] = useState(0);

const vendasTiny = useMemo(() => {
  // Criar snapshot do array atual para evitar referências mutáveis
  const vendasSnapshot = mockVendas.slice();
  
  return vendasSnapshot.filter(venda => {
    if (!venda.integracaoERP?.erpPedidoId) return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        venda.numero.toLowerCase().includes(search) ||
        venda.nomeCliente?.toLowerCase().includes(search) ||
        venda.integracaoERP.erpPedidoId.toLowerCase().includes(search) ||
        venda.integracaoERP.erpNumero?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });
}, [searchTerm, refreshKey]);
```

**Melhorias:**
- ✅ `.slice()` cria cópia superficial do array
- ✅ `refreshKey` permite forçar atualização quando necessário
- ✅ Sem referências mutáveis que causam loops

### 3. Botão de Atualização

Adicionamos botão para atualizar a lista manualmente:

```typescript
const handleRefresh = () => {
  toast.info('Atualizando lista de pedidos...');
  setRefreshKey(prev => prev + 1); // Força recálculo do useMemo
  setTimeout(() => {
    toast.success('Lista atualizada!');
  }, 500);
};
```

**Interface:**
```tsx
<Button
  variant="outline"
  size="icon"
  onClick={handleRefresh}
  title="Atualizar lista"
>
  <RefreshCw className="h-4 w-4" />
</Button>
```

## 📊 Antes vs Depois

### Antes (Com Problemas)

```
┌─────────────────────────────────────────┐
│  mockVendas (com Proxy)                 │
│  ↓                                       │
│  Acesso por TinyERPPedidosPage          │
│  ↓                                       │
│  Proxy detecta acesso                   │
│  ↓                                       │
│  Salva no localStorage                  │
│  ↓                                       │
│  Array muda                             │
│  ↓                                       │
│  React detecta mudança                  │
│  ↓                                       │
│  Re-renderiza componente                │
│  ↓                                       │
│  useMemo recalcula                      │
│  ↓                                       │
│  Acessa mockVendas novamente            │
│  ↓                                       │
│  💥 LOOP INFINITO 💥                    │
└─────────────────────────────────────────┘
```

### Depois (Corrigido)

```
┌─────────────────────────────────────────┐
│  mockVendas (array simples)             │
│  ↓                                       │
│  TinyERPPedidosPage carrega             │
│  ↓                                       │
│  .slice() cria snapshot                 │
│  ↓                                       │
│  useMemo filtra snapshot                │
│  ↓                                       │
│  Renderiza lista                        │
│  ↓                                       │
│  ✅ FIM (sem loops)                     │
│                                         │
│  Quando necessário:                     │
│  - Usuário clica "Atualizar"           │
│  - refreshKey incrementa               │
│  - useMemo recalcula                   │
│  - Lista atualizada                    │
└─────────────────────────────────────────┘
```

## 🧪 Como Testar

### Teste 1: Carregar Página Tiny ERP

1. Faça login como backoffice
2. Menu → Tiny ERP
3. ✅ **Resultado esperado:** Página carrega sem erros

### Teste 2: Buscar Pedidos

1. Na página Tiny ERP
2. Digite no campo de busca
3. ✅ **Resultado esperado:** Lista filtra instantaneamente

### Teste 3: Atualizar Lista

1. Na página Tiny ERP
2. Clique no botão de refresh (ícone circular)
3. ✅ **Resultado esperado:** Toast mostra "Lista atualizada!"

### Teste 4: Criar Novo Pedido

1. Crie um novo pedido de venda
2. Salve o pedido (será enviado ao Tiny em modo MOCK)
3. Vá para Menu → Tiny ERP
4. Clique no botão de refresh
5. ✅ **Resultado esperado:** Novo pedido aparece na lista

### Teste 5: Persistência

1. Crie pedido (deve aparecer em Tiny ERP)
2. Recarregue a página (F5)
3. Vá para Menu → Tiny ERP
4. ✅ **Resultado esperado:** Pedido ainda está lá

## 🐛 Erros Resolvidos

| Erro | Status | Solução |
|------|--------|---------|
| `Maximum call stack size exceeded` | ✅ Resolvido | Removido Proxy |
| Loop infinito no useMemo | ✅ Resolvido | Snapshot com .slice() |
| Lista não atualiza | ✅ Resolvido | Botão de refresh |

## 📝 Arquivos Modificados

### 1. `/data/mockVendas.ts`
**Mudança:** Removido Proxy automático

**Antes:**
```typescript
// Proxy complicado que causava loops
Object.setPrototypeOf(mockVendas, new Proxy(...));
```

**Depois:**
```typescript
// Array simples, salvamento manual
export const mockVendas: Venda[] = carregarVendasDoLocalStorage();
```

### 2. `/components/TinyERPPedidosPage.tsx`
**Mudanças:**
- Adicionado `refreshKey` state
- Snapshot com `.slice()` no useMemo
- Função `handleRefresh()`
- Botão de atualização na UI

### 3. `/CORRECAO_LOOP_INFINITO.md` (este arquivo)
**Novo:** Documentação da correção

## 💡 Boas Práticas Aprendidas

### ❌ Evitar

1. **Proxies em Arrays React:**
   - Causam comportamentos imprevisíveis
   - Difíceis de debugar
   - Podem causar loops infinitos

2. **Referências Mutáveis no useMemo:**
   - useMemo precisa de dependências estáveis
   - Arrays mutáveis causam re-cálculos inesperados

3. **Salvamento Automático Excessivo:**
   - Pode causar performance ruim
   - Pode causar loops
   - Melhor controlar explicitamente

### ✅ Fazer

1. **Snapshots de Dados:**
   ```typescript
   const snapshot = arrayMutavel.slice();
   ```

2. **Salvamento Explícito:**
   ```typescript
   // Após modificação
   salvarVendasNoLocalStorage(mockVendas);
   ```

3. **Refresh Keys para Forçar Updates:**
   ```typescript
   const [refreshKey, setRefreshKey] = useState(0);
   // Incrementar quando necessário
   setRefreshKey(prev => prev + 1);
   ```

4. **Logs para Debug:**
   ```typescript
   console.log('Vendas carregadas:', vendas.length);
   ```

## 🔄 Como Funciona Agora

### Fluxo de Criação de Venda

```
1. Usuário cria venda
   ↓
2. SaleFormPage.tsx salva em mockVendas
   ↓
3. Chama salvarVendasNoLocalStorage(mockVendas)
   ↓
4. localStorage.setItem('mockVendas', JSON.stringify(...))
   ↓
5. ✅ Venda persistida
```

### Fluxo de Visualização

```
1. TinyERPPedidosPage carrega
   ↓
2. useMemo cria snapshot: mockVendas.slice()
   ↓
3. Filtra por integração ERP
   ↓
4. Filtra por searchTerm
   ↓
5. Retorna lista filtrada
   ↓
6. ✅ Renderiza tabela
```

### Fluxo de Atualização

```
1. Usuário clica botão refresh
   ↓
2. setRefreshKey(prev => prev + 1)
   ↓
3. refreshKey mudou, useMemo recalcula
   ↓
4. Novo snapshot: mockVendas.slice()
   ↓
5. Nova filtragem
   ↓
6. ✅ Lista atualizada
```

## 📊 Performance

### Antes (Com Proxy)
- ⚠️ Salvava em CADA acesso ao array
- ⚠️ Muitas escritas no localStorage
- ⚠️ Causava re-renders desnecessários
- ❌ Loop infinito (crash)

### Depois (Sem Proxy)
- ✅ Salva apenas quando necessário
- ✅ Escritas mínimas no localStorage
- ✅ Re-renders controlados
- ✅ Sem loops, estável

## 🎯 Conclusão

O loop infinito foi causado por uma combinação de:
1. Proxy automático que modificava o array em cada acesso
2. useMemo com dependências incompletas
3. Referências mutáveis causando re-cálculos infinitos

A solução envolveu:
1. ✅ Remover o Proxy
2. ✅ Criar snapshots estáveis com `.slice()`
3. ✅ Adicionar `refreshKey` para controle manual
4. ✅ Botão de refresh na UI

O sistema agora é:
- ✅ Estável (sem loops)
- ✅ Previsível (salvamento explícito)
- ✅ Performático (menos operações)
- ✅ Fácil de debugar

---

**Data:** 03/11/2025  
**Status:** ✅ Corrigido e testado  
**Arquivo problemático:** `/data/mockVendas.ts` (Proxy)  
**Arquivo afetado:** `/components/TinyERPPedidosPage.tsx` (useMemo)  
**Solução:** Snapshot + refreshKey + salvamento explícito
