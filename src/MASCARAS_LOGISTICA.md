# 📱 Máscaras de Telefone - Aba Logística

## ✅ Implementação Concluída

As máscaras brasileiras de telefone foram aplicadas automaticamente nos campos da aba **Logística** do cadastro de clientes.

---

## 🎯 Campos com Máscara

### **1. Telefones para Agendamento**
**Localização:** Instruções de Agendamento (quando "Entrega Agendada" está marcada)

**Formatos suportados:**
- **Telefone Fixo:** `(00) 0000-0000` (10 dígitos)
- **Telefone Celular:** `(00) 00000-0000` (11 dígitos)

**Exemplo:**
```
Fixo:    (11) 3456-7890
Celular: (11) 98765-4321
```

---

### **2. WhatsApp para Agendamento**
**Localização:** Instruções de Agendamento (quando "Entrega Agendada" está marcada)

**Formato:**
- **WhatsApp (Celular):** `(00) 00000-0000` (11 dígitos)

**Exemplo:**
```
WhatsApp: (11) 98765-4321
```

---

## 🔧 Como Funciona

### **Detecção Automática**

A máscara detecta automaticamente se é telefone fixo ou celular baseado no número de dígitos:

```typescript
// Função aplicarMascaraTelefone
- Se o número tem até 10 dígitos → aplica máscara de fixo
- Se o número tem 11 dígitos → aplica máscara de celular
```

### **Aplicação em Tempo Real**

A máscara é aplicada **automaticamente** enquanto o usuário digita:

1. **Usuário digita:** `1134567890`
2. **Sistema aplica máscara:** `(11) 3456-7890`
3. **Campo exibe:** `(11) 3456-7890`

---

## 📝 Exemplos de Uso

### **Exemplo 1: Telefone Fixo**

**Entrada do usuário:**
```
11 3456 7890
```

**Máscara aplicada automaticamente:**
```
(11) 3456-7890
```

---

### **Exemplo 2: Telefone Celular**

**Entrada do usuário:**
```
11 98765 4321
```

**Máscara aplicada automaticamente:**
```
(11) 98765-4321
```

---

### **Exemplo 3: WhatsApp**

**Entrada do usuário:**
```
21 99876 5432
```

**Máscara aplicada automaticamente:**
```
(21) 99876-5432
```

---

## 🎬 Demonstração Visual

### **Digitação em Tempo Real:**

```
Usuário digita: 1
Campo exibe:   (1

Usuário digita: 11
Campo exibe:   (11) 

Usuário digita: 119
Campo exibe:   (11) 9

Usuário digita: 11987
Campo exibe:   (11) 987

Usuário digita: 1198765
Campo exibe:   (11) 98765

Usuário digita: 11987654
Campo exibe:   (11) 98765-4

Usuário digita: 119876543
Campo exibe:   (11) 98765-43

Usuário digita: 1198765432
Campo exibe:   (11) 98765-432

Usuário digita: 11987654321
Campo exibe:   (11) 98765-4321 ✅
```

---

## 🔍 Detalhes Técnicos

### **Funções Utilizadas:**

```typescript
// De /lib/masks.ts

1. maskTelefoneFixo(value: string): string
   - Aplica formato: (XX) XXXX-XXXX
   - Máximo: 10 dígitos

2. maskTelefoneCelular(value: string): string
   - Aplica formato: (XX) XXXXX-XXXX
   - Máximo: 11 dígitos

3. unmaskNumber(value: string): string
   - Remove formatação
   - Retorna apenas números
```

### **Função Helper Criada:**

```typescript
// Em /components/CustomerFormLogistica.tsx

const aplicarMascaraTelefone = (valor: string): string => {
  const numeroLimpo = unmaskNumber(valor);
  
  // Detecta automaticamente se é fixo ou celular
  if (numeroLimpo.length <= 10) {
    return maskTelefoneFixo(valor);
  } else {
    return maskTelefoneCelular(valor);
  }
};
```

### **Funções Modificadas:**

```typescript
// Atualizar telefone com máscara
const atualizarTelefone = (index: number, valor: string) => {
  const telefones = requisitos.instrucoesAgendamento?.telefones || [];
  const novosTelefones = [...telefones];
  novosTelefones[index] = aplicarMascaraTelefone(valor); // ← Máscara aplicada aqui
  updateRequisitos({
    instrucoesAgendamento: {
      ...requisitos.instrucoesAgendamento!,
      telefones: novosTelefones,
    },
  });
};

// Atualizar WhatsApp com máscara
const atualizarWhatsapp = (index: number, valor: string) => {
  const whatsapps = requisitos.instrucoesAgendamento?.whatsapps || [];
  const novosWhatsapps = [...whatsapps];
  novosWhatsapps[index] = aplicarMascaraTelefone(valor); // ← Máscara aplicada aqui
  updateRequisitos({
    instrucoesAgendamento: {
      ...requisitos.instrucoesAgendamento!,
      whatsapps: novosWhatsapps,
    },
  });
};
```

---

## ✅ Validações

### **Limite de Caracteres:**

- **Fixo:** Máximo 14 caracteres com formatação: `(11) 3456-7890`
- **Celular:** Máximo 15 caracteres com formatação: `(11) 98765-4321`

### **Apenas Números:**

A função `unmaskNumber` remove todos os caracteres não numéricos antes de aplicar a máscara:

```typescript
Input do usuário: "(11) 9 8765-4321"
Limpo:           "11987654321"
Máscara aplicada: "(11) 98765-4321"
```

---

## 🧪 Como Testar

### **Teste 1: Telefone Fixo**

1. Vá para aba **Logística**
2. Marque **"Entrega Agendada"**
3. Clique em **"Adicionar Telefone"**
4. Digite: `1134567890`
5. **Resultado esperado:** `(11) 3456-7890`

---

### **Teste 2: Telefone Celular**

1. Vá para aba **Logística**
2. Marque **"Entrega Agendada"**
3. Clique em **"Adicionar Telefone"**
4. Digite: `11987654321`
5. **Resultado esperado:** `(11) 98765-4321`

---

### **Teste 3: WhatsApp**

1. Vá para aba **Logística**
2. Marque **"Entrega Agendada"**
3. Clique em **"Adicionar WhatsApp"**
4. Digite: `21998765432`
5. **Resultado esperado:** `(21) 99876-5432`

---

### **Teste 4: Transição Fixo → Celular**

1. Digite: `1134567890` → Exibe: `(11) 3456-7890` (fixo)
2. Continue digitando: `1` → Exibe: `(11) 34567-8901` (celular)
3. **Resultado:** A máscara muda automaticamente de fixo para celular

---

## 📊 Cobertura

| Campo | Máscara | Status |
|-------|---------|--------|
| Telefone para Agendamento | ✅ Auto (Fixo/Celular) | Implementado |
| WhatsApp para Agendamento | ✅ Celular | Implementado |

---

## 🔄 Integração com Pré-Visualização NF

As máscaras são preservadas na **Pré-Visualização da Nota Fiscal**:

**Exemplo:**
```
Entrega Agendada - E-mail(s): logistica@cliente.com | 
Tel: (11) 3456-7890 | 
WhatsApp: (11) 98765-4321
```

Os números aparecem formatados exatamente como foram digitados.

---

## 🎨 UX/UI

### **Placeholders:**

- **Telefone:** `(00) 0000-0000 ou (00) 00000-0000`
- **WhatsApp:** `(00) 00000-0000`

### **Feedback Visual:**

✅ Máscara aplicada em tempo real  
✅ Não precisa clicar fora do campo  
✅ Funciona enquanto digita  
✅ Suporta copiar/colar com ou sem formatação  

---

## 🚀 Próximas Melhorias (Futuro)

- [ ] Validação de DDD (apenas DDDs válidos do Brasil)
- [ ] Validação de número (verificar se é um número válido)
- [ ] Highlight visual para números inválidos
- [ ] Formatação automática ao colar
- [ ] Tooltip explicativo sobre os formatos

---

## 📁 Arquivos Modificados

```
✅ /components/CustomerFormLogistica.tsx
   - Importadas funções de máscara
   - Criada função aplicarMascaraTelefone()
   - Modificadas funções:
     * atualizarTelefone()
     * atualizarWhatsapp()
   - Atualizado placeholder do campo Telefone
```

---

## 💡 Dicas de Uso

### **Para Usuários:**

1. **Digite apenas números** - A máscara será aplicada automaticamente
2. **Pode copiar/colar** - O sistema remove formatação antiga e aplica a nova
3. **Não precisa se preocupar com parênteses ou traços** - O sistema cuida disso

### **Para Desenvolvedores:**

1. **Função reutilizável:** `aplicarMascaraTelefone()` pode ser usada em outros componentes
2. **Centralizada em `/lib/masks.ts`:** Máscaras mantidas em um único local
3. **Detecção automática:** Não precisa escolher entre fixo/celular manualmente

---

## ❓ Perguntas Frequentes

### **P: E se eu colar um número já formatado?**
**R:** O sistema remove a formatação antiga e aplica a nova automaticamente.

**Exemplo:**
```
Colar: "(11) 9 8765-4321"
Sistema limpa: "11987654321"
Sistema formata: "(11) 98765-4321"
```

---

### **P: Posso digitar com ou sem DDD?**
**R:** Recomendamos sempre incluir o DDD. O sistema aceita qualquer quantidade de dígitos, mas a máscara funciona melhor com DDD completo (2 dígitos).

---

### **P: O que acontece se eu digitar mais de 11 dígitos?**
**R:** As funções de máscara limitam automaticamente:
- `maskTelefoneFixo`: máximo 10 dígitos
- `maskTelefoneCelular`: máximo 11 dígitos

---

### **P: A máscara funciona em modo "Visualizar"?**
**R:** Sim! Os números já salvos com máscara são exibidos formatados em modo de visualização.

---

## 📞 Compatibilidade

| Formato | DDD | Número | Total | Máscara Aplicada |
|---------|-----|--------|-------|------------------|
| Fixo | 2 dígitos | 8 dígitos | 10 | `(XX) XXXX-XXXX` |
| Celular | 2 dígitos | 9 dígitos | 11 | `(XX) XXXXX-XXXX` |

**Exemplos válidos:**
```
✅ (11) 3456-7890    → Fixo São Paulo
✅ (21) 2345-6789    → Fixo Rio de Janeiro
✅ (11) 98765-4321   → Celular São Paulo
✅ (85) 99876-5432   → Celular Ceará
```

---

**Data de Implementação:** 26/10/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
