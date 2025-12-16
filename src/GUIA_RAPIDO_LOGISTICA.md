# ⚡ Guia Rápido - Aba Logística

## 🎯 O Que É?

A aba **Logística** permite configurar requisitos logísticos específicos de cada cliente. Essas informações são automaticamente incluídas nas notas fiscais.

---

## 📋 Campos Disponíveis

### **1. ☑️ Entrega Agendada**

**Quando usar:** Cliente exige agendamento prévio de entregas

**Como configurar:**
1. Marque o checkbox "Entrega Agendada"
2. Clique em "Adicionar E-mail" e digite email de contato
3. Clique em "Adicionar Telefone" e digite telefone
4. Clique em "Adicionar WhatsApp" e digite número

**Exemplo:** agendamento@cliente.com, (11) 1234-5678

---

### **2. ☑️ Horário de Recebimento**

**Quando usar:** Cliente tem horários específicos para receber entregas

**Como configurar:**
1. Marque o checkbox "Horário de Recebimento"
2. Clique em "Adicionar Horário"
3. Selecione os dias da semana (Segunda, Terça, etc.)
4. Preencha horário inicial e final
5. Se houver intervalo (almoço), marque "Possui Intervalo" e preencha

**Exemplo:** 
- Dias: Seg a Sex
- Horário: 08:00 às 12:00 e 13:00 às 17:00

---

### **3. ☑️ Tipo de Veículo Específico**

**Quando usar:** Cliente só aceita tipo específico de veículo

**Como configurar:**
1. Marque o checkbox "Tipo de Veículo Específico"
2. Selecione o tipo no dropdown (VUC, Toco, Truck, etc.)
3. Se não encontrar, clique "Adicionar Novo"

**Exemplo:** VUC (Veículo Urbano de Carga)

---

### **4. ☑️ 1 SKU por Caixa**

**Quando usar:** Cliente exige que cada caixa contenha apenas um tipo de produto

**Como configurar:**
1. Marque o checkbox "1 SKU por caixa"

**Resultado:** Adiciona "Atenção: 1 SKU/EAN por caixa." na nota fiscal

---

### **5. 📝 Observações Obrigatórias**

**Quando usar:** Cliente tem requisitos adicionais específicos

**Como configurar:**
1. Clique em "Adicionar Observação"
2. Digite o texto da observação
3. Repita para cada observação adicional

**Exemplos:**
- "Transportadora própria não aceita"
- "Exige nota fiscal em 3 vias"
- "Necessário DANFE adicional"

---

## 👀 Pré-Visualização da Nota Fiscal

**Localização:** Final da aba Logística

**O que mostra:** Como as informações aparecerão na nota fiscal

**Atualização:** Automática (em tempo real conforme você preenche)

**Formato:**
```
OC: [Número da OC]

***INSTRUÇÕES LOGÍSTICA:***
[Requisito 1] // [Requisito 2] // [Requisito 3]
```

---

## 🔄 Fluxo Completo

### **Passo a Passo:**

```
1. Cadastro do Cliente
   └─ Preencher aba Logística
   └─ Visualizar pré-visualização
   └─ Salvar cliente

2. Criação da Venda
   └─ Sistema carrega requisitos do cliente
   └─ Adicionar número da OC
   └─ Observações geradas automaticamente

3. Emissão da Nota Fiscal
   └─ Observações enviadas para ERP
   └─ Aparecem em "Dados Adicionais"
   └─ Nota emitida com instruções
```

---

## ✅ Checklist de Configuração

Use este checklist ao cadastrar cliente com requisitos logísticos:

- [ ] **Entrega Agendada?**
  - [ ] E-mail(s) de agendamento
  - [ ] Telefone(s) de agendamento
  - [ ] WhatsApp(s) de agendamento

- [ ] **Horário de Recebimento?**
  - [ ] Dias da semana
  - [ ] Horário inicial e final
  - [ ] Possui intervalo? (sim/não)
  - [ ] Horário após intervalo (se aplicável)

- [ ] **Tipo de Veículo Específico?**
  - [ ] Tipo selecionado

- [ ] **1 SKU por Caixa?**
  - [ ] Checkbox marcado

- [ ] **Observações Adicionais?**
  - [ ] Observação 1
  - [ ] Observação 2
  - [ ] Observação N...

- [ ] **Pré-Visualização**
  - [ ] Revisar texto gerado
  - [ ] Confirmar formatação

- [ ] **Salvar Cliente**

---

## 🎬 Exemplos Práticos

### **Exemplo 1: Loja Simples**

**Cliente:** Mercadinho do Bairro

**Requisitos:**
- Recebe apenas de Segunda a Sexta, 08:00 às 17:00

**Configuração:**
```
☑️ Horário de Recebimento
   Dias: Seg, Ter, Qua, Qui, Sex
   Horário: 08:00 - 17:00
```

**Resultado na NF:**
```
Horário de Recebimento: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira: 08:00 às 17:00
```

---

### **Exemplo 2: Supermercado com Agendamento**

**Cliente:** Supermercado Central

**Requisitos:**
- Exige agendamento prévio
- Contatos: email e WhatsApp

**Configuração:**
```
☑️ Entrega Agendada
   E-mail: logistica@supercentral.com
   WhatsApp: (11) 98765-4321
```

**Resultado na NF:**
```
Entrega Agendada - E-mail(s): logistica@supercentral.com | WhatsApp: (11) 98765-4321
```

---

### **Exemplo 3: Shopping Center (Restritivo)**

**Cliente:** Loja Shopping Center

**Requisitos:**
- Horário restrito (sem intervalo)
- Apenas VUC (shopping não permite caminhão grande)
- 1 SKU por caixa
- Observação adicional

**Configuração:**
```
☑️ Horário de Recebimento
   Dias: Seg, Ter, Qua, Qui, Sex, Sáb
   Horário: 06:00 - 10:00

☑️ Tipo de Veículo Específico
   Tipo: VUC (Veículo Urbano de Carga)

☑️ 1 SKU por Caixa

📝 Observações:
   "Entrega pela doca B - Subsolo"
```

**Resultado na NF:**
```
OC: [Número da OC]

***INSTRUÇÕES LOGÍSTICA:***
Horário de Recebimento: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado: 06:00 às 10:00 // Tipo de Veículo: VUC (Veículo Urbano de Carga) // Atenção: 1 SKU/EAN por caixa. // Entrega pela doca B - Subsolo
```

---

## ❓ Perguntas Frequentes

### **P: Posso adicionar múltiplos horários de recebimento?**
**R:** Sim! Clique em "Adicionar Horário" quantas vezes precisar. Por exemplo, um horário para dias úteis e outro para sábado.

---

### **P: O que acontece se eu não preencher nenhum requisito?**
**R:** A pré-visualização mostrará apenas "OC: [Número da OC]". A seção de instruções logísticas não aparecerá.

---

### **P: Posso editar os requisitos depois de salvar o cliente?**
**R:** Sim! Acesse o cliente em modo "Editar" e vá para a aba Logística.

---

### **P: Como adiciono um tipo de veículo que não está na lista?**
**R:** Marque "Tipo de Veículo Específico", clique em "Adicionar Novo" ao lado do dropdown, digite o nome e clique "Adicionar".

---

### **P: As observações aparecerão em todas as vendas deste cliente?**
**R:** Sim! As observações são carregadas automaticamente sempre que você criar uma venda para este cliente.

---

### **P: Posso ter diferentes instruções de agendamento para email, telefone e WhatsApp?**
**R:** Sim! Você pode adicionar quantos contatos de cada tipo forem necessários.

---

## 🚨 Dicas Importantes

### **✅ Boas Práticas:**

1. **Seja específico nas observações:**
   - ❌ "Horário especial"
   - ✅ "Receber apenas até 10h devido processo de inventário"

2. **Mantenha contatos atualizados:**
   - Revise periodicamente os emails e telefones
   - Remova contatos inativos

3. **Use a pré-visualização:**
   - Sempre confira como ficará na nota fiscal
   - Verifique se está claro e completo

4. **Documente tudo:**
   - Se o cliente tem uma exigência, documente
   - Melhor ter mais informação que menos

---

### **⚠️ Atenções:**

1. **Horários vazios não aparecem:**
   - Se não preencher horário inicial e final, não aparecerá na NF

2. **Emails/telefones vazios são ignorados:**
   - Apenas contatos preenchidos aparecem na NF

3. **Dias da semana:**
   - Marque apenas os dias que o cliente realmente recebe
   - Se nenhum dia marcado, horário não aparece

---

## 📊 Status de Implementação

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| Entrega Agendada | ✅ Implementado | Múltiplos contatos |
| Horário de Recebimento | ✅ Implementado | Suporte a intervalo |
| Tipo de Veículo | ✅ Implementado | Inclusão rápida disponível |
| 1 SKU por Caixa | ✅ Implementado | - |
| Observações Customizadas | ✅ Implementado | Ilimitadas |
| Pré-Visualização NF | ✅ Implementado | Atualização em tempo real |
| Integração com Vendas | ⏳ Próxima fase | - |
| Integração com ERP | ⏳ Próxima fase | - |

---

## 📞 Suporte

**Dúvidas ou problemas?**
- Consulte a documentação completa: `/LOGISTICA_README.md`
- Reporte bugs ou sugestões ao time de desenvolvimento

---

**Criado em:** 26/10/2025  
**Versão:** 1.0  
**Última Atualização:** 26/10/2025
