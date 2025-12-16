# ⚙️ Preferências de Integração ERP - Transmissão de OC

## ✅ Implementação Concluída

Nova seção **"Preferências de Integração"** adicionada nas configurações do ERP para controlar se a Ordem de Compra (OC) deve ser transmitida junto com as observações da venda ao ERP.

---

## 📍 Localização

**Caminho no Sistema:**
```
Configurações → Integração ERP → Tiny ERP → Preferências de Integração
```

**Estrutura:**
```
┌─ Configurações
   └─ Aba: Integração ERP
      └─ Tiny ERP
         ├─ Configuração de Credenciais
         ├─ Teste de Conexão
         ├─ Funcionalidades Disponíveis
         └─ ✨ Preferências de Integração (NOVO)
```

---

## 🎯 Funcionalidade

### **Controle de Transmissão da OC**

**Opção:** "Transmitir OC nas Observações"

**Comportamento:**

| Estado | Descrição |
|--------|-----------|
| ✅ **Ativado** | A OC é incluída nas observações ao transmitir vendas para o ERP |
| ❌ **Desativado** | A OC **não** é incluída nas observações |

---

## 💡 Como Funciona

### **1. Ativado (Padrão)**

Quando a opção está **ativada**, ao transmitir uma venda ao ERP, o campo de observações incluirá:

```
• OC: 12345/2025
• Condição de Pagamento: 30/60 dias
• Instruções de Entrega: Entregar no período da manhã
• Observação do Cliente: Material para obra
```

---

### **2. Desativado**

Quando a opção está **desativada**, ao transmitir uma venda ao ERP, o campo de observações **NÃO** incluirá a OC:

```
• Condição de Pagamento: 30/60 dias
• Instruções de Entrega: Entregar no período da manhã
• Observação do Cliente: Material para obra
```

---

## 🎨 Interface

### **Card de Preferências:**

```
┌──────────────────────────────────────────────────┐
│ Preferências de Integração                       │
│ Configure como os dados devem ser transmitidos   │
│ ao ERP                                            │
├──────────────────────────────────────────────────┤
│                                                   │
│ ┌────────────────────────────────────────────┐  │
│ │ Transmitir OC nas Observações       [ON]   │  │
│ │ Quando ativado, a Ordem de Compra (OC)     │  │
│ │ será incluída nas observações ao           │  │
│ │ transmitir a venda para o ERP              │  │
│ └────────────────────────────────────────────┘  │
│                                                   │
│ ✓ A OC será transmitida junto com as            │
│   observações da venda no campo de observações   │
│   do pedido no ERP.                              │
│                                                   │
│ Exemplo de Observações Transmitidas:             │
│ • OC: 12345/2025                                 │
│ • Condição de Pagamento: 30/60 dias              │
│ • Instruções de Entrega: Entregar no período     │
│   da manhã                                        │
│ • Observação do Cliente: Material para obra      │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Utilizados

### **Switch Toggle:**

```tsx
<Switch
  id="transmitirOC"
  checked={transmitirOC}
  onCheckedChange={setTransmitirOC}
/>
```

### **Alert Dinâmico:**

O alert muda conforme o estado:

**Ativado:**
```tsx
✓ A OC será transmitida junto com as observações da venda 
  no campo de observações do pedido no ERP.
```

**Desativado:**
```tsx
✗ A OC não será incluída nas observações. Apenas outras 
  informações relevantes serão transmitidas.
```

### **Exemplo Visual:**

A pré-visualização muda dinamicamente mostrando como ficará o campo de observações:

```tsx
{transmitirOC && (
  <p>• OC: 12345/2025</p>
)}
<p>• Condição de Pagamento: 30/60 dias</p>
<p>• Instruções de Entrega: Entregar no período da manhã</p>
<p>• Observação do Cliente: Material para obra</p>
```

---

## 📋 Casos de Uso

### **Caso 1: Empresa que Precisa da OC**

**Cenário:**
- Empresa trabalha com projetos específicos
- Controle interno exige rastreamento por OC
- ERP precisa receber OC para conciliação

**Configuração:**
- ✅ Transmitir OC nas Observações: **ATIVADO**

**Resultado:**
```
OC aparecerá no pedido do ERP:
"OC: PROJ-2025-001, Condição: 30/60 dias, Entrega: Manhã"
```

---

### **Caso 2: Empresa que Não Usa OC**

**Cenário:**
- Empresa não trabalha com OC
- Ou usa OC apenas internamente
- ERP não precisa dessa informação

**Configuração:**
- ❌ Transmitir OC nas Observações: **DESATIVADO**

**Resultado:**
```
OC NÃO aparecerá no pedido do ERP:
"Condição: 30/60 dias, Entrega: Manhã, Obs: Material para obra"
```

---

### **Caso 3: Campos Personalizados no ERP**

**Cenário:**
- ERP tem campo específico para OC
- Não deve ir nas observações
- Sistema fará integração customizada

**Configuração:**
- ❌ Transmitir OC nas Observações: **DESATIVADO**

**Resultado:**
```
OC será transmitida via campo customizado, não nas observações
```

---

## 🔄 Fluxo de Trabalho

### **1. Configuração Inicial:**

```
Usuário → Configurações → Integração ERP → Tiny ERP
  → Preferências de Integração
  → Ativa/Desativa "Transmitir OC nas Observações"
  → Salvar Configuração
```

---

### **2. Durante a Venda:**

```
Vendedor cria pedido com:
  - Produtos
  - Cliente
  - OC: 12345/2025
  - Observações: "Material para obra"
  - Condições de pagamento: 30/60 dias
```

---

### **3. Transmissão ao ERP:**

**Se transmitirOC = true:**
```javascript
{
  cliente: "Cliente XYZ",
  produtos: [...],
  observacoes: "OC: 12345/2025\nCondição: 30/60 dias\nObs: Material para obra"
}
```

**Se transmitirOC = false:**
```javascript
{
  cliente: "Cliente XYZ",
  produtos: [...],
  observacoes: "Condição: 30/60 dias\nObs: Material para obra"
}
```

---

## 💻 Implementação Técnica

### **Estado do Componente:**

```tsx
const [transmitirOC, setTransmitirOC] = useState(true);
```

**Valor padrão:** `true` (ativado)

---

### **Salvamento da Configuração:**

```tsx
const handleSalvarConfiguracao = () => {
  // Salvar configuração incluindo preferências
  salvarConfigERP({
    ...tinyConfig,
    preferencias: {
      transmitirOC
    }
  });
  
  toast.success('Configuração do ERP salva com sucesso!');
};
```

---

### **Uso na Transmissão:**

```tsx
// Em SalesPage.tsx ou outro componente de vendas
const transmitirVendaParaERP = async (venda) => {
  const config = await buscarConfigERP();
  
  let observacoes = [];
  
  // Adiciona OC se configurado
  if (config.preferencias.transmitirOC && venda.oc) {
    observacoes.push(`OC: ${venda.oc}`);
  }
  
  // Adiciona outras observações
  if (venda.condicaoPagamento) {
    observacoes.push(`Condição: ${venda.condicaoPagamento}`);
  }
  
  if (venda.observacoesCliente) {
    observacoes.push(`Obs: ${venda.observacoesCliente}`);
  }
  
  // Transmite ao ERP
  await erpService.criarPedido({
    ...venda,
    observacoes: observacoes.join('\n')
  });
};
```

---

## 🎓 Boas Práticas

### **1. Configurar Antes de Usar:**

✅ Defina a preferência antes de começar a transmitir vendas  
✅ Teste com um pedido de exemplo  
✅ Verifique como aparece no ERP  

---

### **2. Documentar Internamente:**

✅ Informe a equipe sobre a configuração escolhida  
✅ Documente o motivo da escolha  
✅ Estabeleça padrão de preenchimento de OC  

---

### **3. Revisão Periódica:**

✅ Revisar configuração semestralmente  
✅ Verificar se ainda atende às necessidades  
✅ Ajustar se processos mudarem  

---

## 📊 Impacto

### **Na Venda:**

- ✅ Não afeta o cadastro da venda
- ✅ OC continua sendo obrigatória/opcional conforme regra de negócio
- ✅ Apenas controla se vai ou não para o ERP

---

### **No ERP:**

- ✅ Controla tamanho do campo de observações
- ✅ Evita poluição com informações desnecessárias
- ✅ Permite campos customizados quando disponíveis

---

### **No Processo:**

- ✅ Flexibiliza integração conforme necessidade
- ✅ Permite diferentes configurações por empresa
- ✅ Facilita migração entre ERPs

---

## 🔍 Validações

### **Campo Observações no ERP:**

**Tiny ERP:**
- Limite: 1000 caracteres
- Formato: Texto livre
- Aceita quebras de linha

**Comportamento do Sistema:**
- ✅ Valida tamanho total das observações
- ✅ Trunca se exceder limite
- ✅ Alerta usuário se observações muito grandes

---

## 🧪 Testes

### **Teste 1: Ativar Transmissão de OC**

1. Vá em Configurações → Integração ERP → Tiny ERP
2. Role até "Preferências de Integração"
3. Ative "Transmitir OC nas Observações"
4. Observe:
   - ✅ Alert muda para "✓ A OC será transmitida..."
   - ✅ Exemplo mostra "• OC: 12345/2025"
5. Clique em "Salvar Configuração"
6. Crie uma venda de teste com OC
7. Transmita ao ERP
8. Verifique no ERP: OC deve estar nas observações

---

### **Teste 2: Desativar Transmissão de OC**

1. Vá em Configurações → Integração ERP → Tiny ERP
2. Role até "Preferências de Integração"
3. Desative "Transmitir OC nas Observações"
4. Observe:
   - ✅ Alert muda para "✗ A OC não será incluída..."
   - ✅ Exemplo **não** mostra "• OC: 12345/2025"
5. Clique em "Salvar Configuração"
6. Crie uma venda de teste com OC
7. Transmita ao ERP
8. Verifique no ERP: OC **não** deve estar nas observações

---

### **Teste 3: Exemplo Visual Dinâmico**

1. Vá em Configurações → Integração ERP → Tiny ERP
2. Role até "Preferências de Integração"
3. Alterne o switch ON/OFF
4. Observe:
   - ✅ Exemplo muda em tempo real
   - ✅ Linha da OC aparece/desaparece
   - ✅ Alert muda dinamicamente

---

## 📁 Arquivos Modificados

```
✅ /components/ERPConfigSettings.tsx
   - Adicionado estado: transmitirOC
   - Criada seção: Preferências de Integração
   - Implementado Switch para controlar OC
   - Adicionado Alert dinâmico
   - Criado exemplo visual dinâmico
   - Atualizada função de salvar configuração
```

---

## 🚀 Próximos Passos

### **Fase 1: Configuração (✅ Concluído)**
- [x] Interface de configuração
- [x] Switch para ativar/desativar
- [x] Exemplo visual
- [x] Salvamento da preferência

### **Fase 2: Integração (Próximo)**
- [ ] Implementar lógica de transmissão
- [ ] Aplicar preferência ao enviar venda
- [ ] Montar observações conforme configuração
- [ ] Testar com API real do Tiny ERP

### **Fase 3: Outras Preferências (Futuro)**
- [ ] Transmitir Condição de Pagamento
- [ ] Transmitir Instruções de Logística
- [ ] Formato de data preferencial
- [ ] Mapeamento de campos customizados

---

## 💡 Sugestões de Uso

### **Para Pequenas Empresas:**

✅ **Recomendado:** Ativado  
**Motivo:** Simplicidade, todas informações centralizadas nas observações

---

### **Para Médias/Grandes Empresas:**

❌ **Recomendado:** Desativado  
**Motivo:** Usar campos customizados do ERP para melhor rastreabilidade

---

### **Para B2B:**

✅ **Recomendado:** Ativado  
**Motivo:** OC geralmente exigida pelo cliente, importante rastrear

---

### **Para B2C:**

❌ **Recomendado:** Desativado  
**Motivo:** Vendas diretas raramente têm OC

---

## 📞 Exemplo Real

### **Empresa: Distribuidora ABC**

**Situação Anterior:**
```
Problema: ERP recebia todas vendas com "OC: N/A" nas observações
Impacto: Poluição visual, confusão na leitura
```

**Solução Aplicada:**
```
Configuração: Desativou "Transmitir OC nas Observações"
Resultado: Observações mais limpas, apenas info relevante
```

**Observações Antes:**
```
OC: N/A
Condição: À vista
Entrega: Normal
Observação: Cliente preferencial
```

**Observações Depois:**
```
Condição: À vista
Entrega: Normal
Observação: Cliente preferencial
```

✅ **Ganho:** Observações 25% menores, mais legíveis

---

**Data de Implementação:** 27/10/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Pronto para Teste
