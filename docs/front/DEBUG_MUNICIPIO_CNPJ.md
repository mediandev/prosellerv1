# 🔧 Debug - Município não preenche via CNPJ

## ✅ Status Atual

- ✅ **CEP:** Funcionando - Município é preenchido corretamente
- ❌ **CNPJ:** Com problema - Município não é preenchido

---

## 🛠️ Ferramenta de Debug Adicionada

Foi adicionada uma ferramenta de debug na página "Novo Cliente" para facilitar o diagnóstico.

### **Como Usar:**

1. **Vá para "Clientes" → "Novo Cliente"**
2. **Você verá um card laranja no topo:** "🔧 Debug - Teste de CNPJ"
3. **Digite um CNPJ de teste:** `00.000.000/0001-91` (Banco do Brasil)
4. **Clique em "Testar"**
5. **Veja os resultados:**
   - ✅ **Verde:** Dado foi extraído corretamente
   - ❌ **Vermelho:** Dado está vazio

---

## 📋 CNPJs para Teste

| CNPJ | Empresa | Esperado |
|------|---------|----------|
| `00.000.000/0001-91` | Banco do Brasil | UF: DF, Município: Brasília |
| `33.000.167/0001-01` | Petrobras | UF: RJ, Município: Rio de Janeiro |
| `60.701.190/0001-04` | Bradesco | UF: SP, Município: Osasco |
| `07.526.557/0001-00` | Submarino | UF: SP, Município: São Paulo |

---

## 🔍 O Que Verificar

### **1. Ferramenta de Debug Mostra Município?**

#### **SIM - Município aparece na ferramenta:**
```
✅ UF: SP
✅ Município: São Paulo
```

**Diagnóstico:** O problema está no delay ou no formulário.

**Solução:**
- Aumentar delay de 100ms para 200ms
- Verificar logs no console

#### **NÃO - Município está vazio na ferramenta:**
```
✅ UF: SP
❌ Município: VAZIO
```

**Diagnóstico:** O problema está na API ou mapeamento.

**Solução:**
- Verificar logs no console
- Ver qual API está sendo usada
- Verificar estrutura do JSON retornado

---

## 🔎 Verificação Passo a Passo

### **Passo 1: Abrir Console**
1. Pressione `F12`
2. Clique na aba "Console"
3. Limpe o console (ícone 🚫)

### **Passo 2: Testar na Ferramenta de Debug**
1. Digite CNPJ: `00.000.000/0001-91`
2. Clique em "Testar"

### **Passo 3: Ver Logs**

Procure por estas mensagens:

```javascript
// Qual API foi usada?
"BrasilAPI Response: { ... }"  // ← API que respondeu

// Município foi extraído?
"BrasilAPI - Município extraído: Brasília"  // ← Deve ter valor
"BrasilAPI - UF extraído: DF"               // ← Deve ter valor
```

### **Passo 4: Analisar JSON**

Na ferramenta de debug, veja a seção "Response Completo (JSON)".

Procure por:
```json
{
  "cnpj": {
    "municipio": "Brasília",  // ← Deve existir
    "uf": "DF"                // ← Deve existir
  }
}
```

---

## 🎯 Cenários Possíveis

### **Cenário A: Município OK na ferramenta, vazio no formulário**

**Problema:** Delay não está funcionando corretamente.

**Logs esperados no console ao clicar no botão de busca CNPJ do formulário:**
```javascript
🔍 CNPJ - Dados antes do update: { uf: "DF", municipio: "Brasília" }
⏰ CNPJ - Agendando preenchimento de município em 100ms: Brasília
// ... 100ms depois ...
✅ CNPJ - Preenchendo município agora: Brasília
```

**Se ver:**
```javascript
⚠️ CNPJ - Município vazio na resposta da API
```

Significa que `data.municipio` está undefined/null.

---

### **Cenário B: Município vazio na ferramenta**

**Problema:** API não está retornando município ou mapeamento está errado.

**Verificar logs:**
```javascript
// Qual API respondeu?
BrasilAPI Response: { ... }

// Veja a estrutura completa:
{
  "municipio": undefined,  // ← Não existe!
  "cidade": "Brasília"     // ← Pode estar em outro campo!
}
```

**Possíveis causas:**
1. API mudou estrutura
2. CNPJ não tem município cadastrado
3. Mapeamento precisa ser atualizado

---

### **Cenário C: API falhando**

**Logs esperados:**
```javascript
"BrasilAPI falhou, tentando ReceitaWS..."
"ReceitaWS Response: { ... }"
"ReceitaWS - Município extraído: Brasília"
```

Sistema deve tentar 3 APIs automaticamente.

---

## 🔧 Ações de Debug Implementadas

### **1. Logs na Busca de CNPJ (`CustomerFormDadosCadastrais.tsx`):**

```typescript
console.log('🔍 CNPJ - Dados antes do update:', { uf, municipio });
console.log('⏰ CNPJ - Agendando preenchimento...');
console.log('✅ CNPJ - Preenchendo município agora:', municipio);
console.log('⚠️ CNPJ - Município vazio na resposta da API');
```

### **2. Logs nas APIs (`services/integrations.ts`):**

```typescript
console.log('BrasilAPI Response:', data);
console.log('BrasilAPI - Município extraído:', municipio);
console.log('BrasilAPI - UF extraído:', uf);

console.log('ReceitaWS Response:', data);
console.log('ReceitaWS - Município extraído:', municipio);

console.log('CNPJ.WS Response:', data);
console.log('CNPJ.WS - Município extraído:', municipio);
```

### **3. Ferramenta de Debug Visual:**

Componente `CNPJDebugger` mostra visualmente:
- ✅ Dados extraídos (verde se OK, vermelho se vazio)
- 📦 JSON completo da resposta
- 📋 Instruções de uso

---

## 📊 Checklist de Diagnóstico

Execute este checklist para diagnosticar o problema:

- [ ] **Ferramenta de Debug criada e aparece em "Novo Cliente"**
- [ ] **Testar CNPJ na ferramenta**
- [ ] **Município aparece na ferramenta?**
  - [ ] ✅ SIM → Problema é no formulário/delay
  - [ ] ❌ NÃO → Problema é na API/mapeamento
- [ ] **Console aberto (F12)**
- [ ] **Ver logs da API:**
  - [ ] Qual API respondeu? (BrasilAPI/ReceitaWS/CNPJ.WS)
  - [ ] Município extraído tem valor?
  - [ ] UF extraída tem valor?
- [ ] **Ver logs do formulário:**
  - [ ] "Dados antes do update" mostra município?
  - [ ] "Agendando preenchimento" foi chamado?
  - [ ] "Preenchendo município agora" foi chamado?
- [ ] **Testar no formulário normal:**
  - [ ] Clicar no botão 🔍 de busca CNPJ
  - [ ] UF é preenchida?
  - [ ] Município é preenchido?
  - [ ] Quanto tempo leva para aparecer?

---

## 🚀 Próximos Passos

Dependendo do diagnóstico:

### **Se município OK na ferramenta mas falha no formulário:**

1. Aumentar delay:
   ```typescript
   setTimeout(() => {
     updateFormData({ municipio });
   }, 200); // Aumentar de 100ms para 200ms
   ```

2. Adicionar mais logs para rastrear o fluxo

3. Verificar se `useMemo` está sendo recalculado

### **Se município vazio na ferramenta:**

1. Verificar qual API está sendo usada
2. Ver estrutura completa do JSON no console
3. Atualizar mapeamento se necessário
4. Reportar estrutura encontrada

---

## 📞 Como Reportar Problema

Ao reportar, forneça:

1. **Screenshot da ferramenta de debug** mostrando:
   - ✅ ou ❌ para UF e Município
   
2. **Console logs completos:**
   - Qual API foi usada
   - Valores extraídos
   - Erros (se houver)

3. **CNPJ testado**

4. **O que acontece no formulário:**
   - UF preenche?
   - Município preenche?
   - Quanto tempo demora?

---

**Criado em:** 26/10/2025  
**Versão:** 1.0  
**Status:** 🔧 Ferramenta de Debug Ativa
