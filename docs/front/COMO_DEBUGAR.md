# 🔧 Como Usar a Ferramenta de Debug - Município CNPJ

## 🎯 Problema

O município não está sendo preenchido automaticamente ao buscar um CNPJ.

---

## 🛠️ Ferramenta de Debug

Uma ferramenta visual foi adicionada para facilitar o diagnóstico.

---

## 📝 Passo a Passo

### **1. Acesse a Ferramenta**

1. Faça login no sistema
2. Vá para **Clientes** (menu lateral)
3. Clique em **"Novo Cliente"**
4. Você verá um **card laranja** no topo com o título:
   ```
   🔧 Debug - Teste de CNPJ
   ```

---

### **2. Teste um CNPJ**

1. **Digite um CNPJ** no campo (use um destes):
   - `00.000.000/0001-91` (Banco do Brasil)
   - `33.000.167/0001-01` (Petrobras)
   - `60.701.190/0001-04` (Bradesco)

2. **Clique em "Testar"**

3. **Aguarde** a resposta (alguns segundos)

---

### **3. Analise os Resultados**

A ferramenta mostrará 3 seções:

#### **A. Dados Extraídos** (com cores)

```
Razão Social: BANCO DO BRASIL S.A.

┌─────────────────────────────┐
│ UF: DF ✅                   │  ← Verde = OK
└─────────────────────────────┘

┌─────────────────────────────┐
│ Município: Brasília ✅      │  ← Verde = OK
└─────────────────────────────┘

Logradouro: SCS Quadra 1
Bairro: Asa Sul
CEP: 70398-900
```

**Ou:**

```
┌─────────────────────────────┐
│ UF: SP ✅                   │  ← Verde = OK
└─────────────────────────────┘

┌─────────────────────────────┐
│ Município: ❌ VAZIO         │  ← Vermelho = PROBLEMA!
└─────────────────────────────┘
```

#### **B. Response Completo (JSON)**

JSON com todos os dados retornados pela API.

#### **C. Instruções**

Mini-guia de como interpretar os resultados.

---

## 🔍 Interpretação dos Resultados

### **✅ Cenário 1: Município está VERDE (OK)**

```
✅ UF: DF
✅ Município: Brasília
```

**Significa:**
- API está funcionando ✅
- Mapeamento está correto ✅
- Dados estão sendo extraídos ✅

**Problema:**
- O delay entre UF e Município pode não estar funcionando
- Ou a lista de municípios não está sendo recalculada

**Próximo passo:**
1. Abra o Console (F12)
2. Clique no botão de busca CNPJ do formulário principal
3. Veja os logs:
   ```
   🔍 CNPJ - Dados antes do update: { uf: "DF", municipio: "Brasília" }
   ⏰ CNPJ - Agendando preenchimento em 200ms: Brasília
   ✅ CNPJ - Preenchendo município agora: Brasília
   ```
4. Se vê esses logs mas o campo continua vazio, reporte o problema

---

### **❌ Cenário 2: Município está VERMELHO (VAZIO)**

```
✅ UF: DF
❌ Município: VAZIO
```

**Significa:**
- API está funcionando (trouxe UF) ✅
- Mas município não veio na resposta ❌

**Problema:**
- API não retornou município para este CNPJ
- Ou a estrutura da API mudou

**Próximo passo:**
1. Abra o Console (F12)
2. Procure por:
   ```
   BrasilAPI Response: { ... }
   BrasilAPI - Município extraído: 
   ```
3. Veja a estrutura completa do JSON na ferramenta
4. Procure por campos que possam conter município:
   - `municipio`
   - `cidade`
   - `localidade`
   - `estabelecimento.cidade`
   - etc.

---

### **❌ Cenário 3: UF e Município VAZIOS**

```
❌ UF: VAZIO
❌ Município: VAZIO
```

**Significa:**
- API pode estar fora do ar
- CNPJ inválido
- Ou problema na consulta

**Próximo passo:**
1. Abra o Console (F12)
2. Procure por erros:
   ```
   ❌ Erro BrasilAPI: ...
   "BrasilAPI falhou, tentando ReceitaWS..."
   ❌ Erro ReceitaWS: ...
   ```
3. Veja se alguma API respondeu
4. Se todas falharam, pode ser:
   - CNPJ inválido
   - APIs fora do ar
   - Problema de rede

---

## 🧪 Teste Completo

Faça este teste completo:

### **1. Teste na Ferramenta de Debug**

```
CNPJ: 00.000.000/0001-91
Resultado esperado:
✅ UF: DF
✅ Município: Brasília
```

### **2. Teste no Formulário**

1. **Role para baixo** até o formulário principal
2. **Digite o mesmo CNPJ** no campo "CPF/CNPJ"
3. **Clique no botão** 🔍 ao lado do campo
4. **Observe:**
   - ✅ Razão Social preenchida?
   - ✅ UF preenchida?
   - ❓ Município preenchido?

### **3. Compare os Resultados**

| Local | UF | Município |
|-------|----|-----------| 
| **Ferramenta Debug** | DF ✅ | Brasília ✅ |
| **Formulário** | DF ✅ | ??? |

**Se município OK na ferramenta mas vazio no formulário:**
→ Problema é no delay/formulário

**Se município vazio em ambos:**
→ Problema é na API/mapeamento

---

## 📋 Checklist Rápido

Execute em ordem:

- [ ] Abri "Novo Cliente"
- [ ] Vejo o card laranja de debug
- [ ] Digitei CNPJ: `00.000.000/0001-91`
- [ ] Cliquei em "Testar"
- [ ] Vi os resultados
- [ ] Município está verde (OK) ou vermelho (VAZIO)?
  - [ ] ✅ Verde → Testar no formulário
  - [ ] ❌ Vermelho → Abrir console e ver logs da API
- [ ] Abri Console (F12)
- [ ] Testei no formulário principal
- [ ] Comparei resultados

---

## 📸 Como Reportar

Se o problema persistir, tire screenshots de:

1. **Ferramenta de Debug** mostrando:
   - UF (verde ou vermelho)
   - Município (verde ou vermelho)

2. **Console** mostrando:
   - Logs da API (BrasilAPI Response)
   - Valores extraídos
   - Logs do formulário

3. **Formulário** mostrando:
   - Campo UF preenchido
   - Campo Município vazio

---

## 🎯 Mudanças Recentes

### **Delay aumentado para 200ms:**

```typescript
// ANTES (100ms - pode ser pouco)
setTimeout(() => {
  updateFormData({ municipio });
}, 100);

// AGORA (200ms - mais margem)
setTimeout(() => {
  updateFormData({ municipio });
}, 200);
```

### **Logs adicionados:**

```javascript
// Console mostrará:
🔍 CNPJ - Dados antes do update: { uf: "DF", municipio: "Brasília" }
⏰ CNPJ - Agendando preenchimento em 200ms: Brasília
✅ CNPJ - Preenchendo município agora: Brasília
```

---

## 💡 Dica

Se município aparecer na ferramenta mas não no formulário, tente:

1. **Aumentar ainda mais o delay:**
   - Edite `CustomerFormDadosCadastrais.tsx`
   - Mude `200` para `500` na linha do setTimeout
   - Teste novamente

2. **Forçar recarga da lista:**
   - Após preencher UF, mude manualmente para outra UF
   - Depois volte para a UF correta
   - Isso força o useMemo a recalcular

---

**Criado em:** 26/10/2025  
**Objetivo:** Diagnosticar problema de município não preencher via CNPJ  
**Status:** 🔧 Ferramenta Ativa
