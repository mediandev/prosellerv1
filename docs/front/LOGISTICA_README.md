# 📦 Aba Logística - Cadastro de Clientes

## 📋 Visão Geral

A aba **Logística** foi adicionada ao cadastro de clientes para gerenciar requisitos logísticos específicos de cada cliente. Essas informações são usadas para gerar observações automáticas na nota fiscal.

---

## 🎯 Funcionalidades Implementadas

### **1. Entrega Agendada**

**Tipo:** Checkbox

**Comportamento:**
- Quando marcado, exibe seção "Instruções de Agendamento"
- Permite adicionar múltiplos contatos para agendamento

**Instruções de Agendamento incluem:**
- **E-mails:** Lista de e-mails para contato
- **Telefones:** Lista de números de telefone
- **WhatsApp:** Lista de números de WhatsApp

**Recursos:**
- ➕ Botão "Adicionar" para cada tipo de contato
- ❌ Botão para remover contatos individuais
- ✅ Suporte para múltiplos contatos de cada tipo

---

### **2. Horário de Recebimento**

**Tipo:** Checkbox

**Comportamento:**
- Quando marcado, permite adicionar horários de recebimento
- Suporta múltiplos horários diferentes

**Cada horário inclui:**
- **Dias da Semana:** Checkboxes para selecionar dias (Segunda a Domingo)
- **Horário Inicial:** Campo de hora (HH:mm)
- **Horário Final:** Campo de hora (HH:mm)
- **Possui Intervalo:** Checkbox opcional
  - Se marcado, exibe campos adicionais:
    - Horário Inicial (após intervalo)
    - Horário Final (após intervalo)

**Exemplo de uso:**
```
Dias: Segunda, Terça, Quarta, Quinta, Sexta
Horário: 08:00 às 12:00 e 13:00 às 17:00
(Com intervalo de almoço)
```

**Recursos:**
- ➕ Botão "Adicionar Horário" para criar novo horário
- 🗑️ Botão "Remover" para excluir horário
- ✅ Suporte para múltiplos horários na lista

---

### **3. Tipo de Veículo Específico**

**Tipo:** Checkbox

**Comportamento:**
- Quando marcado, exibe campo "Tipo de Veículo"

**Tipo de Veículo:**
- **Tipo:** Dropdown pesquisável (Combobox)
- **Opções disponíveis:**
  - VUC (Veículo Urbano de Carga)
  - Toco
  - Truck
  - Carreta
  - Bitrem
  - Moto
  - Van
  - [Outros tipos configurados]

**Inclusão Rápida:**
- ➕ Botão "Adicionar Novo" ao lado do dropdown
- Abre modal para adicionar novo tipo sem sair da página
- Tipo adicionado fica disponível imediatamente

---

### **4. 1 SKU por Caixa**

**Tipo:** Checkbox

**Comportamento:**
- Quando marcado, adiciona observação na nota fiscal
- Observação: "Atenção: 1 SKU/EAN por caixa."

---

### **5. Observações Obrigatórias Para Nota Fiscal**

**Tipo:** Lista de campos de texto livre

**Comportamento:**
- Permite adicionar múltiplas observações customizadas
- Cada observação é um campo de texto longo (Textarea)

**Recursos:**
- ➕ Botão "Adicionar Observação"
- ❌ Botão para remover observação individual
- ✅ Suporte para quantas observações forem necessárias

**Exemplos de uso:**
```
- "Transportadora própria não aceita"
- "Exige nota fiscal em 3 vias"
- "Necessário DANFE adicional"
```

---

## 📄 Observações da Nota Fiscal (Pré-Visualização)

### **Descrição:**

Campo de texto longo, **não editável**, que mostra automaticamente como as informações serão exibidas na nota fiscal.

### **Composição:**

As observações são geradas automaticamente no seguinte formato:

```
OC: [Número da OC]

***INSTRUÇÕES LOGÍSTICA:***
[Requisito 1] // [Requisito 2] // [Requisito 3] // ...
```

### **Requisitos incluídos (quando preenchidos):**

1. **Horário de Recebimento:**
   ```
   Horário de Recebimento: Segunda-feira, Terça-feira: 08:00 às 12:00 e 13:00 às 17:00
   ```

2. **Entrega Agendada:**
   ```
   Entrega Agendada - E-mail(s): logistica@cliente.com | Tel: (11) 1234-5678 | WhatsApp: (11) 98765-4321
   ```

3. **Tipo de Veículo:**
   ```
   Tipo de Veículo: VUC (Veículo Urbano de Carga)
   ```

4. **1 SKU por Caixa:**
   ```
   Atenção: 1 SKU/EAN por caixa.
   ```

5. **Observações Customizadas:**
   ```
   Transportadora própria não aceita
   ```

### **Exemplo Completo:**

```
OC: [Número da OC]

***INSTRUÇÕES LOGÍSTICA:***
Horário de Recebimento: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira: 08:00 às 12:00 e 13:00 às 17:00 // Entrega Agendada - E-mail(s): agendamento@cliente.com, logistica@cliente.com | Tel: (11) 1234-5678 | WhatsApp: (11) 98765-4321 // Tipo de Veículo: VUC (Veículo Urbano de Carga) // Atenção: 1 SKU/EAN por caixa. // Transportadora própria não aceita // Necessário DANFE adicional
```

---

## 🔄 Integração com Vendas e ERP

### **Fluxo de Dados:**

1. **Cadastro do Cliente:**
   - Usuário preenche requisitos logísticos
   - Dados salvos no perfil do cliente

2. **Criação da Venda:**
   - Sistema carrega requisitos logísticos do cliente
   - Pré-visualização mostra observações da NF
   - Usuário pode adicionar informações específicas da venda (ex: número da OC)

3. **Geração da Nota Fiscal:**
   - Sistema combina:
     - Requisitos logísticos do cliente
     - Informações específicas da venda
   - Gera texto final das observações

4. **Transmissão para ERP:**
   - Observações enviadas para campo apropriado
   - ERP inclui no campo "Dados Adicionais" ou "Informações Complementares"
   - Nota fiscal emitida com todas as instruções

---

## 🎨 Estrutura Visual

### **Layout da Aba:**

```
┌─────────────────────────────────────────────────────┐
│  📦 Requisitos Logísticos                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ☐ Entrega Agendada                                │
│     └─ [Instruções de Agendamento]                 │
│                                                     │
│  ───────────────────────────────────────           │
│                                                     │
│  ☐ Horário de Recebimento                          │
│     └─ [Lista de Horários]                         │
│                                                     │
│  ───────────────────────────────────────           │
│                                                     │
│  ☐ Tipo de Veículo Específico                      │
│     └─ [Dropdown + Adicionar Novo]                 │
│                                                     │
│  ───────────────────────────────────────           │
│                                                     │
│  ☐ 1 SKU por Caixa                                 │
│                                                     │
│  ───────────────────────────────────────           │
│                                                     │
│  📝 Observações Obrigatórias                       │
│     [Lista de Observações]                         │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📄 Observações da Nota Fiscal (Pré-Visualização)  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Campo de texto não editável mostrando            │
│   como as observações aparecerão na NF]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Estrutura de Dados

### **Tipos TypeScript:**

```typescript
interface HorarioRecebimento {
  id: string;
  diasSemana: string[]; // ['Segunda-feira', 'Terça-feira', ...]
  horarioInicial1: string; // "08:00"
  horarioFinal1: string; // "12:00"
  temIntervalo: boolean;
  horarioInicial2?: string; // "13:00"
  horarioFinal2?: string; // "17:00"
}

interface InstrucoesAgendamento {
  emails: string[];
  telefones: string[];
  whatsapps: string[];
}

interface RequisitosLogisticos {
  entregaAgendada: boolean;
  horarioRecebimentoHabilitado: boolean;
  horariosRecebimento: HorarioRecebimento[];
  instrucoesAgendamento?: InstrucoesAgendamento;
  tipoVeiculoEspecifico: boolean;
  tipoVeiculo?: string;
  umSkuPorCaixa: boolean;
  observacoesObrigatorias: string[];
}

interface Cliente {
  // ... outros campos
  requisitosLogisticos?: RequisitosLogisticos;
}
```

---

## 📝 Validações

### **Validações Implementadas:**

1. **Horário de Recebimento:**
   - ⚠️ Exibe na pré-visualização apenas se:
     - Pelo menos 1 dia da semana selecionado
     - Horário inicial e final preenchidos

2. **Entrega Agendada:**
   - ⚠️ Exibe na pré-visualização apenas se:
     - Pelo menos 1 contato (email, telefone ou WhatsApp) preenchido

3. **Tipo de Veículo:**
   - ⚠️ Exibe na pré-visualização apenas se:
     - Tipo de veículo selecionado

4. **Observações:**
   - ⚠️ Ignora observações vazias ou apenas com espaços

---

## 🔧 Configurações

### **Tipos de Veículos Pré-Configurados:**

Os tipos de veículos são gerenciados em `/data/mockCustomers.ts`:

```typescript
export const tiposVeiculos: TipoVeiculo[] = [
  { id: 'veiculo-1', nome: 'VUC (Veículo Urbano de Carga)', descricao: 'Até 3,5 toneladas' },
  { id: 'veiculo-2', nome: 'Toco', descricao: 'Caminhão com eixo simples' },
  { id: 'veiculo-3', nome: 'Truck', descricao: 'Caminhão com dois eixos traseiros' },
  // ...
];
```

**Futuramente:**
- Configurável via página de Configurações
- Gerenciamento CRUD de tipos de veículos
- Sincronização com backend

---

## 🎯 Casos de Uso

### **Caso 1: Cliente com Horário de Recebimento Restrito**

**Cenário:**
- Cliente só recebe de Segunda a Sexta
- Horário: 08:00 às 17:00 com intervalo de almoço

**Configuração:**
1. ☑️ Marcar "Horário de Recebimento"
2. Adicionar horário
3. Selecionar dias: Seg, Ter, Qua, Qui, Sex
4. Horário 1: 08:00 - 12:00
5. ☑️ Marcar "Possui Intervalo"
6. Horário 2: 13:00 - 17:00

**Resultado na NF:**
```
Horário de Recebimento: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira: 08:00 às 12:00 e 13:00 às 17:00
```

---

### **Caso 2: Cliente que Exige Agendamento**

**Cenário:**
- Toda entrega deve ser agendada previamente
- Contatos: email, telefone e WhatsApp

**Configuração:**
1. ☑️ Marcar "Entrega Agendada"
2. Adicionar e-mail: agendamento@cliente.com
3. Adicionar telefone: (11) 1234-5678
4. Adicionar WhatsApp: (11) 98765-4321

**Resultado na NF:**
```
Entrega Agendada - E-mail(s): agendamento@cliente.com | Tel: (11) 1234-5678 | WhatsApp: (11) 98765-4321
```

---

### **Caso 3: Cliente com Restrição de Veículo**

**Cenário:**
- Cliente só aceita VUC (área com restrição de caminhões grandes)

**Configuração:**
1. ☑️ Marcar "Tipo de Veículo Específico"
2. Selecionar: "VUC (Veículo Urbano de Carga)"

**Resultado na NF:**
```
Tipo de Veículo: VUC (Veículo Urbano de Carga)
```

---

### **Caso 4: Cliente Complexo (Múltiplos Requisitos)**

**Cenário:**
- Horário de recebimento restrito
- Exige agendamento
- Apenas VUC
- 1 SKU por caixa
- Observações adicionais

**Configuração:**
1. ☑️ Todos os checkboxes relevantes
2. Preencher todos os campos
3. Adicionar observações customizadas

**Resultado na NF:**
```
OC: [Número da OC]

***INSTRUÇÕES LOGÍSTICA:***
Horário de Recebimento: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira: 08:00 às 12:00 e 13:00 às 17:00 // Entrega Agendada - E-mail(s): agendamento@cliente.com | Tel: (11) 1234-5678 | WhatsApp: (11) 98765-4321 // Tipo de Veículo: VUC (Veículo Urbano de Carga) // Atenção: 1 SKU/EAN por caixa. // Transportadora própria não aceita // Necessário DANFE adicional
```

---

## 📁 Arquivos Criados/Modificados

### **Novos Arquivos:**

```
✅ /components/CustomerFormLogistica.tsx
   - Componente principal da aba Logística
   - ~650 linhas de código

✅ /LOGISTICA_README.md
   - Esta documentação
```

### **Arquivos Modificados:**

```
✅ /types/customer.ts
   - Adicionados tipos:
     * HorarioRecebimento
     * InstrucoesAgendamento
     * RequisitosLogisticos
     * TipoVeiculo
   - Adicionado campo requisitosLogisticos em Cliente

✅ /data/mockCustomers.ts
   - Adicionado: tiposVeiculos[]
   - 7 tipos de veículos pré-configurados

✅ /components/CustomerFormPage.tsx
   - Importado: CustomerFormLogistica
   - Adicionada aba "Logística" no Tabs
   - Inicialização de requisitosLogisticos no formData
   - Ajustado grid-cols para acomodar nova aba
```

---

## 🧪 Como Testar

### **Teste 1: Criar Cliente com Requisitos Logísticos**

1. Acesse **Clientes** → **Novo Cliente**
2. Preencha dados básicos
3. Vá para aba **Logística**
4. Marque "Entrega Agendada"
5. Adicione email: teste@exemplo.com
6. Observe a pré-visualização atualizar automaticamente
7. Salve o cliente

**Resultado esperado:**
- ✅ Cliente salvo com sucesso
- ✅ Pré-visualização mostra instruções formatadas

---

### **Teste 2: Múltiplos Horários de Recebimento**

1. Aba **Logística**
2. Marque "Horário de Recebimento"
3. Clique "Adicionar Horário"
4. Configure:
   - Dias: Seg, Ter, Qua, Qui, Sex
   - Horário: 08:00 - 17:00 (com intervalo)
5. Clique "Adicionar Horário" novamente
6. Configure:
   - Dias: Sábado
   - Horário: 08:00 - 12:00 (sem intervalo)

**Resultado esperado:**
- ✅ Dois horários na lista
- ✅ Pré-visualização mostra ambos os horários

---

### **Teste 3: Adicionar Tipo de Veículo Customizado**

1. Aba **Logística**
2. Marque "Tipo de Veículo Específico"
3. Clique "Adicionar Novo"
4. Digite: "Caminhão Refrigerado"
5. Clique "Adicionar"

**Resultado esperado:**
- ✅ Modal fecha
- ✅ "Caminhão Refrigerado" selecionado automaticamente
- ✅ Aparece na pré-visualização

---

### **Teste 4: Pré-Visualização Completa**

1. Configure TODOS os requisitos logísticos
2. Observe a pré-visualização em tempo real

**Resultado esperado:**
- ✅ Pré-visualização atualiza automaticamente
- ✅ Formato correto com "//" separando requisitos
- ✅ Apenas requisitos preenchidos aparecem

---

## 🚀 Próximos Passos

### **Curto Prazo:**
- [ ] Integração com módulo de Vendas
- [ ] Testes com usuários reais
- [ ] Ajustes de UX baseados em feedback

### **Médio Prazo:**
- [ ] Página de Configurações para tipos de veículos
- [ ] CRUD completo de tipos de veículos
- [ ] Validações mais robustas
- [ ] Máscaras para telefone/WhatsApp

### **Longo Prazo:**
- [ ] Templates de requisitos logísticos
- [ ] Cópia de requisitos entre clientes
- [ ] Histórico de alterações de requisitos
- [ ] Relatórios de clientes por requisito

---

**Data de Criação:** 26/10/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Pronto para Uso
