# Correção: Select de Empresas de Faturamento

## 📋 Problema Identificado

No formulário de Nova Venda (`/components/SaleFormPage.tsx`), o campo **"Empresa de Faturamento"** não estava exibindo todas as empresas cadastradas no dropdown, apesar de 3 empresas estarem registradas no sistema.

### Sintomas
- ✅ Console mostrava que 3 empresas estavam sendo carregadas corretamente
- ✅ Console confirmava que as 3 empresas estavam sendo renderizadas
- ❌ Visualmente, apenas 1 empresa aparecia no dropdown para seleção

## 🔍 Diagnóstico

Após análise com logs de debug, identificamos que:

1. **Dados estavam corretos**: O hook `useCompanies` estava carregando as 3 empresas
2. **Renderização estava correta**: O `companies.map()` estava executando para todas as empresas
3. **Problema era visual/UI**: O componente `SelectPrimitive.Viewport` estava limitando a altura

### Causa Raiz

O problema estava no componente base `/components/ui/select.tsx`:

```tsx
// ❌ ANTES - Limitava altura ao tamanho do trigger
<SelectPrimitive.Viewport
  className={cn(
    "p-1",
    position === "popper" &&
      "h-[var(--radix-select-trigger-height)] ..." // ← Problema aqui!
  )}
>
```

A classe `h-[var(--radix-select-trigger-height)]` fazia com que o viewport tivesse a mesma altura do botão trigger, exibindo apenas uma opção por vez!

### Empresas no Sistema
```typescript
[
  { id: "emp1", nomeFantasia: "Empresa Principal" },
  { id: "emp2", nomeFantasia: "Filial SP" },
  { id: "emp3", nomeFantasia: "Filial RJ" }
]
```

## ✅ Solução Implementada

### 1. Correção do Componente Base Select (PRINCIPAL)

**Arquivo**: `/components/ui/select.tsx`

Removemos a restrição de altura do `SelectPrimitive.Viewport`:

```tsx
// ✅ DEPOIS - Permite altura automática baseada no conteúdo
<SelectPrimitive.Viewport
  className={cn(
    "p-1",
    position === "popper" &&
      "w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
      // ← Removida a classe h-[var(--radix-select-trigger-height)]
  )}
>
  {children}
</SelectPrimitive.Viewport>
```

**Impacto**: Esta correção resolve o problema para TODOS os componentes Select do sistema, não apenas para empresas!

### 2. Ajustes no SelectContent (Complementar)

Adicionamos propriedades específicas ao `SelectContent` para garantir renderização correta:

```tsx
<SelectContent 
  position="popper" 
  sideOffset={4} 
  align="start" 
  className="max-h-[300px] w-full min-w-[var(--radix-select-trigger-width)]"
>
  {companies.map(empresa => (
    <SelectItem key={empresa.id} value={empresa.id}>
      {empresa.nomeFantasia}
    </SelectItem>
  ))}
</SelectContent>
```

### 2. Propriedades Adicionadas

- **`position="popper"`**: Força o dropdown a usar posicionamento absoluto
- **`sideOffset={4}`**: Adiciona espaçamento entre o trigger e o content
- **`align="start"`**: Alinha o dropdown ao início do trigger
- **`max-h-[300px]`**: Define altura máxima para scroll
- **`w-full`**: Garante largura completa
- **`min-w-[var(--radix-select-trigger-width)]`**: Garante largura mínima igual ao trigger

### 3. Melhoria no useEffect de Auto-preenchimento

Garantimos que o campo de empresa só seja preenchido quando as empresas estiverem carregadas:

```tsx
useEffect(() => {
  if (formData.clienteId && modo === 'criar' && !clienteJaCarregado) {
    const cliente = clientes.find(c => c.id === formData.clienteId);
    if (cliente && companies.length > 0) {  // ← Adicionada verificação
      // ... preencher dados
    }
  }
}, [formData.clienteId, clientes, modo, clienteJaCarregado, companies]);
```

### 4. Limpeza de Código

Removemos logs de debug desnecessários:
- ❌ Removidos logs do `SaleFormPage.tsx`
- ❌ Removidos logs do `useCompanies.ts`
- ✅ Código limpo e performático

## 📝 Arquivos Modificados

1. **`/components/ui/select.tsx`** ⭐ PRINCIPAL
   - **Linha 78-82**: Removida classe `h-[var(--radix-select-trigger-height)]` do Viewport
   - **Impacto**: Corrige TODOS os selects do sistema
   - **Antes**: Altura fixa igual ao trigger (exibia apenas 1 opção)
   - **Depois**: Altura automática baseada no conteúdo (exibe todas as opções)

2. **`/components/SaleFormPage.tsx`**
   - Ajustado `SelectContent` com propriedades corretas (linha 837)
   - Adicionada verificação de `companies.length` no useEffect (linha 258)
   - Removidos logs de debug

3. **`/hooks/useCompanies.ts`**
   - Removidos logs de debug
   - Mantida lógica de reatividade

## 🧪 Como Testar

1. Ir em **Vendas → Nova Venda**
2. Selecionar um cliente
3. Clicar no campo **"Empresa de Faturamento"**
4. **Resultado esperado**: Todas as 3 empresas devem aparecer no dropdown:
   - Empresa Principal
   - Filial SP
   - Filial RJ

## 🎯 Resultado Final

✅ **Problema resolvido**: Todas as empresas cadastradas agora aparecem no dropdown  
✅ **Correção sistêmica**: TODOS os componentes Select do sistema foram corrigidos  
✅ **UX melhorada**: Dropdown com largura adequada e scroll quando necessário  
✅ **Código limpo**: Logs de debug removidos  
✅ **Reatividade mantida**: Sistema continua reagindo a mudanças em empresas

## ⚠️ Nota Importante

A correção no arquivo `/components/ui/select.tsx` afeta **TODOS os componentes Select** do sistema. Isso significa que outros dropdowns que também estavam limitando opções (como Natureza de Operação, Condições de Pagamento, etc.) agora também exibirão corretamente todas as opções disponíveis.

### Componentes Beneficiados
- ✅ Empresa de Faturamento (Vendas)
- ✅ Natureza de Operação (Vendas)
- ✅ Condição de Pagamento (Vendas)
- ✅ Todos os outros Selects do sistema

## 📚 Referências

- **Radix UI Select**: https://www.radix-ui.com/docs/primitives/components/select
- **Shadcn/ui Select**: Componente base do sistema
- **Hook useCompanies**: Sistema de reatividade de empresas

---

## 🔧 Correção Adicional: Campo nomeFantasia Vazio

### Problema Secundário Identificado

Após a correção do Select, foi identificado que empresas cadastradas manualmente apareciam como opções vazias no dropdown. Isso ocorria porque:

1. O campo `nomeFantasia` não era obrigatório no cadastro
2. A API de CNPJ externa nem sempre retorna o nome fantasia
3. Empresas antigas podiam ter esse campo vazio

### Solução Implementada

**1. Validação no Salvamento** (`/components/CompanySettings.tsx`)
```tsx
// Garantir que nomeFantasia tenha valor (usar razaoSocial se estiver vazio)
const empresaParaSalvar = {
  ...formData,
  nomeFantasia: formData.nomeFantasia?.trim() || formData.razaoSocial,
};
```

**2. Migração Automática** (`/services/companyService.ts`)
```tsx
// MIGRAÇÃO: Garantir que todas as empresas tenham nomeFantasia
const companiesMigradas = companies.map(empresa => ({
  ...empresa,
  nomeFantasia: empresa.nomeFantasia?.trim() || empresa.razaoSocial || 'Empresa sem nome',
}));
```

**3. Fallback na Renderização** (`/components/SaleFormPage.tsx`)
```tsx
<SelectItem key={empresa.id} value={empresa.id}>
  {empresa.nomeFantasia || empresa.razaoSocial || `Empresa ${empresa.id}`}
</SelectItem>
```

**4. Alertas de Debug**
- Console warning quando uma empresa sem `nomeFantasia` é detectada
- Log completo da empresa problemática para facilitar debugging

### Resultado

✅ Empresas cadastradas agora sempre têm um nome para exibir  
✅ Empresas antigas são migradas automaticamente  
✅ Sistema resiliente a dados inconsistentes  
✅ Alerts informativos para debugging

---

**Data da Correção**: 11/02/2025  
**Desenvolvedor**: Sistema de IA  
**Status**: ✅ Implementado e Testado (Incluindo correção de nomeFantasia vazio)
