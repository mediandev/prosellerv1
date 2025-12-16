# 🧪 Guia de Teste - Município via CNPJ

## ⚡ Teste Rápido (2 minutos)

### **1. Abra o Console**
- Pressione `F12`
- Clique na aba "Console"
- Clique em 🚫 para limpar

### **2. Acesse Novo Cliente**
- Menu lateral → **Clientes**
- Botão → **Novo Cliente**

### **3. Digite CNPJ**
- Campo **CPF/CNPJ:** `00.000.000/0001-91`
- Clique no botão **🔍** ao lado

### **4. Observe**

**No formulário:**
- Campo **UF** deve mostrar: `DF`
- Campo **Município** deve mostrar: `Brasília`

**No console, você deve ver:**
```javascript
🔍 CNPJ - Dados recebidos: { uf: 'DF', municipio: 'Brasília' }
📌 CNPJ - Armazenando município pendente: Brasília
🔄 useEffect disparado - UF: DF Município pendente: Brasília
✅ Município encontrado na lista, preenchendo: Brasília
```

---

## ✅ Teste Passou?

### **SIM - Município preenchido corretamente:**

**Console mostra:**
```
✅ Município encontrado na lista, preenchendo: Brasília
```

**Formulário mostra:**
- UF: DF ✅
- Município: Brasília ✅

🎉 **PROBLEMA RESOLVIDO!**

---

### **NÃO - Município continua vazio:**

Veja qual mensagem aparece no console:

---

#### **Opção A: Não apareceu nenhum log do useEffect**

```javascript
// Apareceu:
🔍 CNPJ - Dados recebidos: ...
📌 CNPJ - Armazenando município pendente: ...

// NÃO apareceu:
🔄 useEffect disparado...
```

**Problema:** useEffect não está sendo chamado.

**Verificar:**
1. Aguarde até 300ms
2. Veja se aparece: `⚠️ FALLBACK: useEffect não preencheu...`
3. Se aparecer o FALLBACK e município for preenchido → useEffect tem bug mas fallback funciona
4. Se não aparecer nada → problema mais profundo

---

#### **Opção B: useEffect disparou mas município não encontrado**

```javascript
🔄 useEffect disparado - UF: DF Município pendente: Brasília
⚠️ Município não encontrado na lista: Brasília
📋 Primeiros 10 municípios: [...]
```

**Problema:** Município retornado pela API não está na lista.

**Verificar:**
1. Compare o município que veio da API com os da lista
2. Pode haver diferença em:
   - Acentos (Brasília vs Brasilia)
   - Espaços extras
   - Maiúsculas/minúsculas

**Solução:** Reportar os valores exatos mostrados no log

---

#### **Opção C: useEffect disparou mas nada aconteceu**

```javascript
🔄 useEffect disparado - UF: DF Município pendente: Brasília
📋 Lista de municípios disponíveis: 0
```

**Problema:** Lista de municípios está vazia mesmo após UF ser definida.

**Verificar:**
1. O campo UF está realmente preenchido no formulário?
2. Se sim, mas lista = 0, há problema no `useMemo` de `municipiosOptions`

---

#### **Opção D: Fallback preencheu após 300ms**

```javascript
🔍 CNPJ - Dados recebidos: ...
📌 CNPJ - Armazenando município pendente: ...
// ... 300ms depois ...
⚠️ FALLBACK: useEffect não preencheu, tentando agora: Brasília
```

**Resultado:** Município foi preenchido, mas pelo fallback (não pelo useEffect)

**Status:** ⚠️ Funciona, mas useEffect tem problema

**Próximo passo:** Investigar por que useEffect não funcionou

---

## 🧪 CNPJs Adicionais para Teste

| CNPJ | Empresa | UF | Município Esperado |
|------|---------|----|--------------------|
| `00.000.000/0001-91` | Banco do Brasil | DF | Brasília |
| `33.000.167/0001-01` | Petrobras | RJ | Rio de Janeiro |
| `60.701.190/0001-04` | Bradesco | SP | Osasco |
| `07.526.557/0001-00` | Submarino | SP | São Paulo |

---

## 📸 Como Reportar Problema

Se o teste falhar, tire print ou copie:

### **1. Console completo** mostrando:
```javascript
// Cole TODOS os logs que aparecem após clicar em buscar
BrasilAPI Response: ...
BrasilAPI - Município extraído: ...
🔍 CNPJ - Dados recebidos: ...
📌 CNPJ - Armazenando município pendente: ...
🔄 useEffect disparado...
...
```

### **2. Estado do formulário:**
- Campo UF: (preenchido ou vazio?)
- Campo Município: (preenchido ou vazio?)
- Se preenchidos, quais valores?

### **3. CNPJ testado:**
- Qual CNPJ você usou?

---

## 🔍 Debug Avançado

Se quiser investigar mais profundamente:

### **Verificar estado interno:**

Adicione `console.log` temporário no código:

```typescript
// Em CustomerFormDadosCadastrais.tsx, após o useEffect

console.log('Estado atual:', {
  'formData.uf': formData.uf,
  'formData.municipio': formData.municipio,
  'municipiosOptions.length': municipiosOptions.length,
  'primeiros 5 municipios': municipiosOptions.slice(0, 5),
});
```

Isso mostrará:
- Se UF está no estado
- Se município está no estado
- Quantos municípios estão disponíveis
- Quais são os primeiros municípios

---

## 📊 Checklist de Teste

Execute em ordem:

- [ ] Console aberto (F12)
- [ ] Console limpo (🚫)
- [ ] Em "Novo Cliente"
- [ ] CNPJ digitado: `00.000.000/0001-91`
- [ ] Clicou em buscar 🔍
- [ ] UF preenchida?
  - [ ] ✅ SIM - UF = "DF"
  - [ ] ❌ NÃO - parar aqui, problema anterior
- [ ] Município preenchido?
  - [ ] ✅ SIM - Município = "Brasília" → **SUCESSO!** 🎉
  - [ ] ❌ NÃO - ver logs do console
- [ ] Console mostra logs?
  - [ ] `🔍 CNPJ - Dados recebidos`
  - [ ] `📌 CNPJ - Armazenando município pendente`
  - [ ] `🔄 useEffect disparado`
  - [ ] `✅ Município encontrado` OU `⚠️ Município não encontrado`
  - [ ] `⚠️ FALLBACK` (após 300ms, se useEffect falhou)

---

## 🎯 Resultado Esperado Final

✅ **TUDO FUNCIONANDO:**

**Console:**
```javascript
BrasilAPI Response: { ... }
BrasilAPI - Município extraído: Brasília
BrasilAPI - UF extraído: DF
🔍 CNPJ - Dados recebidos: { uf: 'DF', municipio: 'Brasília' }
📌 CNPJ - Armazenando município pendente: Brasília
🔄 useEffect disparado - UF: DF Município pendente: Brasília
🔄 UF atualizada de null para DF
📋 Lista de municípios disponíveis: 12
🔍 Procurando município: Brasília
✅ Município encontrado na lista, preenchendo: Brasília
```

**Formulário:**
- Razão Social: BANCO DO BRASIL S.A.
- CEP: 70398-900
- Logradouro: SCS Quadra 1
- Bairro: Asa Sul
- UF: DF
- **Município: Brasília** ✅

---

**Criado em:** 26/10/2025  
**Objetivo:** Validar correção do preenchimento de município via CNPJ  
**Tempo estimado:** 2-3 minutos
