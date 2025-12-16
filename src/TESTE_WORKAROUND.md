# 🧪 Teste do Workaround - Município via CNPJ

## ⚡ Teste Rápido (1 minuto)

### **O Que Foi Mudado:**

Agora, ao buscar CNPJ:
1. Sistema preenche dados do CNPJ ✅
2. Sistema detecta que CEP foi preenchido ✅
3. Sistema **busca automaticamente o CEP** ✅
4. CEP retorna município ✅
5. Município é preenchido! 🎉

---

## 🎯 Passo a Passo

### **1. Abra o Console (Opcional)**
- F12 → Console → Limpar (🚫)
- **Observação:** Você verá logs mostrando o workaround funcionando

### **2. Vá para Novo Cliente**
- Menu Lateral → **Clientes**
- Botão → **Novo Cliente**

### **3. Busque CNPJ**
- Campo **CPF/CNPJ:** `00.000.000/0001-91`
- Clique em **🔍** buscar
- **Aguarde ~1 segundo** (um pouco mais que antes)

### **4. Verifique o Resultado**

**Campos que DEVEM estar preenchidos:**

```
✅ Razão Social: BANCO DO BRASIL S.A.
✅ CEP: 70398-900
✅ Logradouro: SCS Quadra 1
✅ Bairro: Asa Sul
✅ UF: DF
✅ Município: Brasília ← ESTE É O OBJETIVO!
```

---

## ✅ Teste Passou?

### **SIM - Município preenchido:**

🎉 **SUCESSO! Workaround funcionando!**

**Console mostra (se abriu):**
```javascript
🔄 WORKAROUND: Buscando CEP automaticamente: 70398-900
✅ WORKAROUND: Município obtido via CEP: Brasília
✅ WORKAROUND: Município preenchido com sucesso: Brasília
```

---

### **NÃO - Município continua vazio:**

❌ **Workaround não funcionou**

**Verifique:**

1. **CEP foi preenchido?**
   - Se SIM → Problema no workaround
   - Se NÃO → CNPJ não retornou CEP

2. **Console mostra erros?**
   ```javascript
   ⚠️ WORKAROUND: Erro ao buscar CEP: [erro]
   ```
   - API ViaCEP pode estar fora do ar

3. **Aguardou tempo suficiente?**
   - Aguarde até 2 segundos
   - Workaround demora ~1 segundo

---

## 🧪 CNPJs para Teste

Teste com diferentes CNPJs:

| CNPJ | Empresa | UF | Município Esperado |
|------|---------|----|--------------------|
| `00.000.000/0001-91` | Banco do Brasil | DF | Brasília |
| `33.000.167/0001-01` | Petrobras | RJ | Rio de Janeiro |
| `60.701.190/0001-04` | Bradesco | SP | Osasco |
| `07.526.557/0001-00` | Submarino | SP | São Paulo |

---

## 📊 Comparação: Antes vs Agora

### **ANTES (sem workaround):**

```
Tempo: ~0.5s
Resultado:
  ✅ Razão Social
  ✅ CEP
  ✅ Logradouro
  ✅ Bairro
  ✅ UF
  ❌ Município (vazio)
```

### **AGORA (com workaround):**

```
Tempo: ~1.0s (500ms adicional)
Resultado:
  ✅ Razão Social
  ✅ CEP
  ✅ Logradouro
  ✅ Bairro
  ✅ UF
  ✅ Município (preenchido!)
```

**Trade-off:** 500ms a mais para ter município preenchido = **vale a pena!**

---

## 🔍 Debug Avançado (Se Falhar)

### **1. Verifique os logs no Console:**

**Logs esperados em ordem:**

```javascript
// 1. Busca CNPJ
"BrasilAPI Response: ..."
"BrasilAPI - Município extraído: Brasília"

// 2. Dados recebidos
"🔍 CNPJ - Dados recebidos: { uf: 'DF', municipio: 'Brasília', cep: '70398-900' }"

// 3. Workaround iniciado
"🔄 WORKAROUND: Buscando CEP automaticamente para preencher município: 70398-900"

// 4. CEP retornou
"✅ WORKAROUND: Município obtido via CEP: Brasília"

// 5. Município preenchido
"✅ WORKAROUND: Município preenchido com sucesso: Brasília"
```

### **2. Se não aparecer log do workaround:**

**Log ausente:**
```javascript
// NÃO aparece:
"🔄 WORKAROUND: Buscando CEP automaticamente..."
```

**Possível causa:**
- CEP não foi preenchido
- CEP está inválido

**Verificar:**
1. Console mostra: `"⚠️ CEP inválido ou não fornecido"`?
2. Campo CEP está vazio no formulário?

### **3. Se workaround iniciou mas não completou:**

**Logs aparecem:**
```javascript
✅ "🔄 WORKAROUND: Buscando CEP..."
❌ Não aparece: "✅ WORKAROUND: Município obtido..."
```

**Possível causa:**
- API ViaCEP não respondeu
- CEP inválido

**Verificar:**
```javascript
// Deve aparecer:
"⚠️ WORKAROUND: Erro ao buscar CEP: [erro]"
```

---

## 🎬 Demonstração Visual

### **Timeline do que acontece:**

```
t = 0s
  ⏳ Usuário clica em buscar CNPJ

t = 0.5s
  ✅ Campos preenchidos (exceto município)
  🔄 Workaround inicia busca de CEP

t = 1.0s
  ✅ CEP retorna com município
  ✅ MUNICÍPIO PREENCHIDO!

TOTAL: ~1 segundo
```

---

## 📞 Como Reportar Problema

Se o workaround não funcionar:

### **1. Tire screenshot mostrando:**
- Campo CEP (preenchido ou vazio?)
- Campo UF (preenchido ou vazio?)
- Campo Município (preenchido ou vazio?)

### **2. Cole logs do Console:**
```javascript
// Cole TODOS os logs após clicar em buscar
BrasilAPI Response: ...
🔍 CNPJ - Dados recebidos: ...
🔄 WORKAROUND: ...
...
```

### **3. Informe:**
- CNPJ testado
- Navegador usado
- Tempo aguardado

---

## ✅ Checklist de Teste

- [ ] Console aberto (F12) - opcional
- [ ] Novo Cliente acessado
- [ ] CNPJ digitado: `00.000.000/0001-91`
- [ ] Clicou em buscar 🔍
- [ ] Aguardou ~1 segundo
- [ ] CEP preenchido?
  - [ ] ✅ SIM - CEP = "70398-900"
  - [ ] ❌ NÃO - problema anterior
- [ ] UF preenchida?
  - [ ] ✅ SIM - UF = "DF"
  - [ ] ❌ NÃO - problema anterior
- [ ] **Município preenchido?**
  - [ ] ✅ **SIM** - Município = "Brasília" → **SUCESSO!** 🎉
  - [ ] ❌ **NÃO** - ver debug avançado

---

## 🎯 Resultado Esperado

✅ **WORKAROUND FUNCIONANDO:**

**Formulário:**
```
Razão Social:    BANCO DO BRASIL S.A.
Nome Fantasia:   [vazio ou preenchido]
CPF/CNPJ:        00.000.000/0001-91

CEP:             70398-900
Logradouro:      SCS Quadra 1
Número:          Bloco A
Bairro:          Asa Sul
UF:              DF
Município:       Brasília ← ✅ PREENCHIDO!
```

**Console:**
```javascript
✅ Todos os logs do workaround apareceram
✅ Nenhum erro
✅ Município obtido via CEP
✅ Município preenchido com sucesso
```

**Tempo:** ~1 segundo (aceitável)

---

**Data:** 26/10/2025  
**Objetivo:** Validar workaround de município via CNPJ  
**Tempo:** 1-2 minutos  
**Resultado Esperado:** ✅ Município preenchido automaticamente
