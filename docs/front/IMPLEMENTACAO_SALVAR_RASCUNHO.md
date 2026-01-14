# ✅ Implementação: Salvar como Rascunho

**Data**: 17 de dezembro de 2025  
**Solicitação**: Adicionar funcionalidade de salvar pedidos como rascunho  
**Status**: ✅ IMPLEMENTADO

---

## 🎯 **PROBLEMA IDENTIFICADO**

O sistema tinha o status "Rascunho" definido no tipo `StatusVenda`, mas:
- ❌ NÃO havia botão "Salvar como Rascunho" na interface
- ❌ Vendedor não podia escolher salvar como rascunho intencionalmente
- ❌ Todos os pedidos salvos iam direto para "Em Análise"

**Comportamento ANTES**:
```
[Criar Pedido] → [Preencher dados] → [Clicar "Salvar"] → Status = "Em Análise"
                                                          (SEMPRE)
```

---

## ✅ **SOLUÇÃO IMPLEMENTADA**

### **1. Dois Botões de Salvamento**

**ANTES** (1 botão):
```
┌──────────────────┐
│  Salvar Pedido   │
└──────────────────┘
(sempre muda para "Em Análise")
```

**DEPOIS** (2 botões):
```
┌─────────────────────────┐  ┌──────────────────────────┐
│ Salvar como Rascunho    │  │  Enviar para Análise     │
└─────────────────────────┘  └──────────────────────────┘
   (status = Rascunho)          (status = Em Análise)
```

---

### **2. Validação Flexível**

**Para Rascunho** (validação LEVE):
- ✅ Permite salvar sem todos os campos obrigatórios
- ✅ Exige apenas que tenha PELO MENOS UM campo preenchido
- ✅ Vendedor pode continuar editando depois

**Para Enviar para Análise** (validação COMPLETA):
- ✅ Exige todos os campos obrigatórios
- ✅ Cliente, Natureza, Itens, Condição Pagamento, Empresa
- ✅ Garante que pedido está completo

---

### **3. Lógica de Exibição dos Botões**

| Cenário | Botão "Salvar Rascunho" | Botão Principal |
|---------|------------------------|-----------------|
| **Criar novo pedido** | ✅ Sim | "Enviar para Análise" |
| **Editar rascunho** | ✅ Sim | "Salvar Alterações" |
| **Editar pedido Em Análise** | ❌ Não | "Salvar Alterações" |
| **Editar pedido Aprovado** | ❌ Não | "Salvar Alterações" |
| **Visualizar (readonly)** | ❌ Não | "Editar" |

**Razão**: Uma vez que o pedido sai de "Rascunho", não faz sentido voltar. O fluxo é unidirecional.

---

### **4. Indicador Visual de Rascunho**

**Badge no cabeçalho**:
```
┌─────────────────────────────────────────────┐
│  🛒 Editar Pedido de Venda  [Rascunho]      │
│  PV-2025-6789                               │
└─────────────────────────────────────────────┘
```

- Aparece quando `formData.status === 'Rascunho'`
- Badge outline cinza
- Deixa claro que é um rascunho em edição

---

### **5. Mensagens de Feedback**

**Ao salvar como Rascunho**:
```
✅ Rascunho salvo com sucesso! Você pode continuar editando depois.
```

**Ao enviar para Análise** (criar):
```
✅ Pedido criado e enviado para análise!
```

**Ao salvar alterações** (editar):
```
✅ Pedido atualizado com sucesso!
```

---

## 🔧 **MUDANÇAS TÉCNICAS**

### **Arquivo**: `/components/SaleFormPage.tsx`

#### **1. Função handleSave** (linha 1062)

**ANTES**:
```typescript
const handleSave = async () => {
  // ...
  status: 'Em Análise',  // ❌ SEMPRE Em Análise
  // ...
}
```

**DEPOIS**:
```typescript
const handleSave = async (salvarComoRascunho: boolean = false) => {
  // ...
  // ✅ NOVO: Define status baseado no tipo de salvamento
  status: salvarComoRascunho ? 'Rascunho' : 'Em Análise',
  // ...
}
```

---

#### **2. Validação de Campos** (linha 1073)

**ANTES**:
```typescript
// Sempre validava TODOS os campos obrigatórios
if (!formData.clienteId) {
  toast.error('Selecione um cliente');
  return;
}
// ... (outros campos)
```

**DEPOIS**:
```typescript
// ✅ NOVO: Validação condicional
if (!salvarComoRascunho) {
  // Validação completa apenas se NÃO for rascunho
  if (!formData.clienteId) {
    toast.error('Selecione um cliente');
    return;
  }
  // ... (outros campos)
} else {
  // Para rascunho: apenas verificar que tem ALGO preenchido
  const temAlgumCampo = formData.clienteId || 
                        formData.itens?.length > 0 || ...;
  if (!temAlgumCampo) {
    toast.error('Preencha pelo menos um campo');
    return;
  }
}
```

---

#### **3. Mensagens de Sucesso** (linha 1219)

**ANTES**:
```typescript
toast.success(modoAtual === 'criar' ? 
  'Pedido criado com sucesso!' : 
  'Pedido atualizado com sucesso!');
```

**DEPOIS**:
```typescript
// ✅ NOVO: Mensagem diferente para rascunho
if (salvarComoRascunho) {
  toast.success('Rascunho salvo com sucesso! Você pode continuar editando depois.');
} else {
  toast.success(modoAtual === 'criar' ? 
    'Pedido criado e enviado para análise!' : 
    'Pedido atualizado com sucesso!');
}
```

---

#### **4. Botões da Interface** (linha 1413)

**ANTES**:
```typescript
<Button onClick={handleSave}>
  <Save className="h-4 w-4 mr-2" />
  {modo === 'criar' ? 'Criar Pedido' : 'Salvar Alterações'}
</Button>
```

**DEPOIS**:
```typescript
{/* ✅ NOVO: Botão Salvar como Rascunho */}
{(modo === 'criar' || (modo === 'editar' && formData.status === 'Rascunho')) && (
  <Button 
    variant="outline"
    onClick={() => handleSave(true)}
  >
    <FileText className="h-4 w-4 mr-2" />
    Salvar como Rascunho
  </Button>
)}

{/* Botão principal */}
<Button onClick={() => handleSave(false)}>
  <Save className="h-4 w-4 mr-2" />
  {modo === 'criar' ? 'Enviar para Análise' : 'Salvar Alterações'}
</Button>
```

---

#### **5. Badge de Rascunho** (linha 1404)

**NOVO**:
```typescript
<h1 className="flex items-center gap-2">
  <ShoppingCart className="h-6 w-6" />
  {modo === 'criar' ? 'Novo Pedido de Venda' : 
   modoAtual === 'editar' ? 'Editar Pedido de Venda' : 
   'Visualizar Pedido de Venda'}
  
  {/* ✅ NOVO: Badge indicando Rascunho */}
  {formData.status === 'Rascunho' && (
    <Badge variant="outline" className="text-gray-500">
      Rascunho
    </Badge>
  )}
</h1>
```

---

#### **6. Import do Badge** (linha 12)

**NOVO**:
```typescript
import { Badge } from './ui/badge';
```

---

## 🎮 **FLUXOS DE USO**

### **Cenário 1: Vendedor Interrompido**

1. Vendedor começa a criar pedido
2. Cliente liga → Precisa atender
3. **Clica "Salvar como Rascunho"** ✅
4. Pedido salvo com status "Rascunho"
5. Depois, volta e clica "Enviar para Análise"
6. Status muda para "Em Análise"

---

### **Cenário 2: Pedido Incompleto**

1. Vendedor cria pedido
2. Faltam dados do cliente (CNPJ, endereço, etc.)
3. Não consegue enviar para análise (validação bloqueia)
4. **Clica "Salvar como Rascunho"** ✅
5. Salvou com campos parciais
6. Depois completa os dados
7. Clica "Enviar para Análise"

---

### **Cenário 3: Múltiplas Versões**

1. Cliente pede 3 orçamentos diferentes
2. Vendedor cria 3 rascunhos
3. Cliente escolhe um
4. Vendedor envia escolhido para análise
5. Apaga os outros rascunhos

---

### **Cenário 4: Proteção contra Perda**

1. Vendedor cria pedido complexo
2. Navegador fecha/trava
3. Volta → Rascunho ainda está lá ✅
4. Continua de onde parou

---

## 🔍 **VALIDAÇÕES**

### **Campos Obrigatórios para "Enviar para Análise"**:
- ✅ Cliente
- ✅ Natureza de Operação
- ✅ Itens (pelo menos 1)
- ✅ Condição de Pagamento
- ✅ Empresa Faturamento

### **Campos Obrigatórios para "Salvar como Rascunho"**:
- ✅ Pelo menos UM campo preenchido (qualquer um)

---

## 📊 **IMPACTO**

### ✅ **Benefícios**

| Antes | Depois |
|-------|--------|
| ❌ Vendedor tinha que completar pedido inteiro | ✅ Pode salvar parcial |
| ❌ Perdia dados se fechasse navegador | ✅ Rascunho persiste |
| ❌ Não conseguia fazer orçamentos | ✅ Múltiplos rascunhos |
| ❌ Pressão para finalizar rápido | ✅ Trabalha com calma |

### 🎯 **UX Melhorada**

1. **Flexibilidade**: Vendedor controla quando enviar
2. **Segurança**: Dados não se perdem
3. **Clareza**: Badge mostra claramente status de rascunho
4. **Feedback**: Mensagens específicas para cada ação

---

## 🧪 **TESTES SUGERIDOS**

### ✅ **Teste 1: Criar Rascunho**
1. Criar novo pedido
2. Preencher apenas cliente
3. Clicar "Salvar como Rascunho"
4. **Esperado**: ✅ Salva com status "Rascunho"

### ✅ **Teste 2: Rascunho → Análise**
1. Abrir rascunho
2. Completar todos os campos
3. Clicar "Enviar para Análise"
4. **Esperado**: ✅ Status muda para "Em Análise"

### ✅ **Teste 3: Validação Completa**
1. Criar novo pedido
2. Preencher apenas cliente
3. Clicar "Enviar para Análise" (SEM ser rascunho)
4. **Esperado**: ❌ Erro "Adicione pelo menos um item"

### ✅ **Teste 4: Validação Rascunho**
1. Criar novo pedido
2. NÃO preencher nada
3. Clicar "Salvar como Rascunho"
4. **Esperado**: ❌ Erro "Preencha pelo menos um campo"

### ✅ **Teste 5: Badge Visual**
1. Abrir pedido em rascunho
2. **Esperado**: ✅ Badge "Rascunho" visível no cabeçalho

### ✅ **Teste 6: Editar Pedido Aprovado**
1. Abrir pedido com status "Aprovado"
2. **Esperado**: ❌ Botão "Salvar como Rascunho" NÃO aparece

---

## 📝 **NOTAS TÉCNICAS**

### **Por que não permitir voltar para Rascunho?**

Uma vez que o pedido foi enviado para análise (status "Em Análise" ou superior):
- ❌ Pode já ter sido aprovado por backoffice
- ❌ Pode já estar sendo processado
- ❌ Pode já ter sido enviado ao ERP
- ❌ Regredir causaria confusão no fluxo

**Fluxo unidirecional** é mais seguro:
```
Rascunho → Em Análise → Aprovado → ... → Concluído
   ↑          ❌          ❌          ❌
(só aqui)   (não volta) (não volta) (não volta)
```

### **Por que validação flexível em Rascunho?**

Rascunho por definição é **incompleto**. Se exigir todos os campos, não faz sentido ter rascunho!

**Casos de uso**:
- Salvar só o cliente (para pedir CNPJ depois)
- Salvar só os produtos (para definir condição depois)
- Salvar observações (para lembrar detalhes da negociação)

---

## ✅ **CONCLUSÃO**

Implementação **COMPLETA e ROBUSTA** de funcionalidade "Salvar como Rascunho":

✅ Dois botões claramente diferenciados  
✅ Validação flexível para rascunho  
✅ Validação completa para envio  
✅ Badge visual indicando rascunho  
✅ Mensagens específicas de feedback  
✅ Lógica condicional de exibição  
✅ Fluxo unidirecional (não volta)  
✅ Proteção contra perda de dados  

**Experiência do usuário significativamente melhorada!** 🎉

---

**Desenvolvedor**: Claude AI  
**Revisor**: Usuário  
**Data**: 17/12/2025  
**Tempo**: ~30 minutos  
**Complexidade**: Média  
**Risco**: Baixo  
**Impacto**: ALTO (melhora workflow de vendas)
