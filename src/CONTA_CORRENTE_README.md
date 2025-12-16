# 💰 Conta Corrente - Gestão de Investimentos e Ressarcimentos

## ✅ Implementação Concluída

Novo módulo completo de **Conta Corrente** para gerenciar investimentos e ressarcimentos em clientes, incluindo registro de compromissos, pagamentos e controle financeiro.

---

## 📍 Localização

**Caminho no Sistema:**
```
Clientes → Editar/Visualizar Cliente → Aba: Conta Corrente
```

**Estrutura de Navegação:**
```
┌─ Cadastro de Cliente
   ├─ Aba: Dados Cadastrais
   ├─ Aba: Contato
   ├─ Aba: Condição Comercial
   ├─ Aba: Logística
   ├─ 💰 Aba: Conta Corrente (NOVO)
   └─ Aba: Histórico
```

> **Nota:** A aba "Conta Corrente" aparece apenas em modo de edição ou visualização de clientes existentes.

---

## 🎯 Funcionalidades Principais

### 1️⃣ **Dashboard de Resumo**

Quatro cards mostrando visão geral financeira:
- **Total Investimentos:** Soma de todos os investimentos acordados
- **Total Ressarcimentos:** Soma de todas as compensações devidas
- **Total Pago:** Valor total já pago ao cliente
- **Saldo Pendente:** Valor ainda a pagar

### 2️⃣ **Gestão de Compromissos**

Registro e controle de acordos comerciais:
- **Investimentos:** Valores que a empresa investe no cliente
- **Ressarcimentos:** Compensações por problemas (avarias, devoluções, etc.)

### 3️⃣ **Controle de Pagamentos**

Registro detalhado de pagamentos:
- Vinculação ao compromisso
- Múltiplas formas de pagamento
- Anexo de comprovantes
- Rastreamento de saldo

---

## 📋 Lançamento de Compromisso

### **Campos do Formulário:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| **Cliente** | Auto-preenchido | ✅ Sim | Cliente em que o compromisso está sendo lançado |
| **Data** | Date | ✅ Sim | Data do acordo/compromisso |
| **Valor** | Number | ✅ Sim | Valor total do compromisso (R$) |
| **Tipo de Compromisso** | Select | ✅ Sim | Investimento ou Ressarcimento |
| **Título** | Text | ✅ Sim | Título resumido do compromisso |
| **Descrição** | Textarea | ❌ Não | Descrição detalhada do acordo |
| **Arquivos Anexos** | File Upload | ❌ Não | Documentos relacionados ao compromisso |

---

### **Sistema de Anexos:**

#### **Tipos de Arquivo (Pré-cadastrados):**

1. **Contrato** - Documento de contrato firmado
2. **Proposta Comercial** - Proposta de investimento ou acordo
3. **Nota Fiscal** - Nota fiscal de produto/serviço
4. **Comprovante de Pagamento** - Comprovante bancário
5. **Termo de Acordo** - Termo de acordo de ressarcimento
6. **Foto do Produto** - Registro fotográfico
7. **Laudo Técnico** - Laudo de avaria ou problema técnico
8. **E-mail** - Comunicação por e-mail
9. **Ata de Reunião** - Registro de reunião
10. **Outro** - Documento não especificado

#### **Criação Rápida de Tipo de Arquivo:**

- **Sem sair da tela:** Dialog modal para criar novo tipo
- **Campos:** Nome (obrigatório) e Descrição (opcional)
- **Imediato:** Tipo criado fica disponível instantaneamente

#### **Combobox Pesquisável:**

- **Busca dinâmica:** Digite para filtrar tipos
- **Seleção rápida:** Clique para selecionar
- **Visual limpo:** Dropdown organizado

---

### **Fluxo de Adição de Arquivos:**

```
1. Selecionar tipo de arquivo no Combobox
2. Sistema abre seletor de arquivo automaticamente
3. Arquivo é adicionado à lista
4. Visualização: Nome, Tipo, Tamanho
5. Possibilidade de remover antes de salvar
```

---

## 💳 Lançamento de Pagamento

### **Campos do Formulário:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| **Compromisso** | Combobox | ✅ Sim | Selecionar compromisso a pagar (apenas pendentes) |
| **Data do Pagamento** | Date | ✅ Sim | Data em que o pagamento foi realizado |
| **Valor** | Number | ✅ Sim | Valor pago (pode ser parcial) |
| **Forma de Pagamento** | Select | ✅ Sim | Como o pagamento foi feito |
| **Comprovante** | File Upload | ❌ Não | Arquivo do comprovante de pagamento |
| **Observações** | Textarea | ❌ Não | Informações adicionais sobre o pagamento |

---

### **Formas de Pagamento:**

1. **Abatimento em Boleto**
   - Desconto aplicado em boleto futuro
   - Cliente paga menos na próxima compra

2. **Pagamento via Boleto**
   - Empresa emite boleto para o cliente
   - Cliente recebe valor através de boleto

3. **Transferência Bancária**
   - Transferência direta para conta do cliente
   - Requer comprovante bancário

---

## 📊 Status de Compromissos

| Status | Significado | Cor |
|--------|-------------|-----|
| **Pendente** | Nenhum pagamento realizado | 🔴 Vermelho |
| **Pago Parcialmente** | Pagamento parcial realizado | 🟡 Amarelo |
| **Pago Integralmente** | Totalmente pago | 🟢 Verde |
| **Cancelado** | Compromisso cancelado | ⚪ Cinza |

---

## 🎨 Interface do Usuário

### **Cards de Resumo:**

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total Inv.  │ Total Res.  │ Total Pago  │ Pendente    │
│ R$ 5.000,00 │ R$ 1.200,00 │ R$ 3.200,00 │ R$ 3.000,00 │
│ Acordos     │ Compensação │ 2 pagamentos│ A pagar     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

---

### **Lista de Compromissos:**

```
┌──────────────────────────────────────────────────────┐
│ Compromissos                    [+ Novo Compromisso] │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Investimento em Material de PDV  🔵 Investimento     │
│ 🟡 Pago Parcialmente                   R$ 5.000,00   │
│                                        15/01/2025    │
│ Investimento acordado para fornecimento de material  │
│ de ponto de venda...                                 │
│                                                       │
│ Pago: R$ 2.000,00  Pendente: R$ 3.000,00            │
│ Arquivos: 1                                          │
│ 📎 proposta-pdv-central.pdf                         │
│                                                       │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Ressarcimento - Produto Avariado  🟠 Ressarcimento   │
│ 🟢 Pago Integralmente                  R$ 1.200,00   │
│                                        10/12/2024    │
│ Ressarcimento acordado devido a lote de produtos...  │
│                                                       │
│ Pago: R$ 1.200,00  Pendente: R$ 0,00               │
│ Arquivos: 2                                          │
│ 📎 foto-avaria-lote.jpg  📎 termo-acordo.pdf        │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### **Tabela de Pagamentos:**

```
┌──────────────────────────────────────────────────────┐
│ Pagamentos                   [+ Registrar Pagamento] │
├──────────────────────────────────────────────────────┤
│ Data       │ Compromisso         │ Valor        │ ... │
├──────────────────────────────────────────────────────┤
│ 01/02/2025 │ Investimento PDV    │ R$ 2.000,00  │ ... │
│ 20/12/2024 │ Ressarcimento Avar. │ R$ 1.200,00  │ ... │
└──────────────────────────────────────────────────────┘
```

---

## 💼 Casos de Uso Práticos

### **Caso 1: Investimento em Material de PDV**

**Contexto:**
- Cliente é rede de supermercados
- Empresa investe em material promocional
- Valor: R$ 5.000,00

**Fluxo:**

1️⃣ **Criar Compromisso:**
   - Tipo: Investimento
   - Título: "Investimento em Material de PDV"
   - Valor: R$ 5.000,00
   - Data: 15/01/2025
   - Descrição: Detalhes do que será fornecido
   - Anexos: Proposta comercial assinada

2️⃣ **Primeiro Pagamento (Parcial):**
   - Compromisso: Investimento em Material de PDV
   - Valor: R$ 2.000,00
   - Forma: Transferência Bancária
   - Data: 01/02/2025
   - Anexo: Comprovante de transferência
   - Status do compromisso: **Pago Parcialmente**

3️⃣ **Segundo Pagamento (Final):**
   - Compromisso: Investimento em Material de PDV
   - Valor: R$ 3.000,00
   - Forma: Transferência Bancária
   - Data: 01/03/2025
   - Anexo: Comprovante de transferência
   - Status do compromisso: **Pago Integralmente** ✅

---

### **Caso 2: Ressarcimento por Produto Avariado**

**Contexto:**
- Produto chegou avariado na entrega
- Cliente tem direito a compensação
- Valor: R$ 1.200,00

**Fluxo:**

1️⃣ **Criar Compromisso:**
   - Tipo: Ressarcimento
   - Título: "Ressarcimento - Produto Avariado NF 12345"
   - Valor: R$ 1.200,00
   - Data: 10/12/2024
   - Descrição: "Lote de produtos avariados durante transporte..."
   - Anexos: 
     - Foto da avaria
     - Termo de acordo assinado
     - Cópia da NF

2️⃣ **Pagamento via Abatimento:**
   - Compromisso: Ressarcimento - Produto Avariado
   - Valor: R$ 1.200,00
   - Forma: Abatimento em Boleto
   - Data: 20/12/2024
   - Observações: "Abatido no boleto vencimento 20/12/2024"
   - Status do compromisso: **Pago Integralmente** ✅

---

### **Caso 3: Investimento em Reforma de Loja**

**Contexto:**
- Cliente vai reformar ponto de venda
- Empresa patrocina parte da reforma
- Valor: R$ 10.000,00
- Pagamento em 5x

**Fluxo:**

1️⃣ **Criar Compromisso:**
   - Tipo: Investimento
   - Título: "Patrocínio Reforma Loja - Matriz"
   - Valor: R$ 10.000,00
   - Data: 01/01/2025
   - Descrição: Detalhes da reforma e contrapartidas
   - Anexos: Contrato, projeto da reforma

2️⃣ **Pagamentos Mensais:**
   - 5 pagamentos de R$ 2.000,00
   - Forma: Transferência Bancária
   - Um pagamento por mês (jan a mai/2025)
   - Cada pagamento com seu comprovante
   - Status evolui de Pendente → Pago Parcialmente → Pago Integralmente

---

### **Caso 4: Múltiplos Ressarcimentos**

**Contexto:**
- Cliente teve 3 problemas diferentes no mês
- Cada problema gera um ressarcimento
- Total: R$ 500 + R$ 800 + R$ 300 = R$ 1.600

**Fluxo:**

1️⃣ **Criar 3 Compromissos Separados:**
   - Ressarcimento 1: Produto vencido (R$ 500)
   - Ressarcimento 2: Entrega atrasada (R$ 800)
   - Ressarcimento 3: Produto errado (R$ 300)

2️⃣ **Pagamento Único Consolidado:**
   - Pode pagar tudo de uma vez via boleto
   - Ou abater em múltiplos boletos
   - Ou fazer transferência única
   - Rastreamento individual de cada compromisso

---

## 📈 Benefícios do Módulo

### **Para o Comercial:**

✅ **Transparência:** Tudo documentado e rastreável  
✅ **Controle:** Sabe exatamente o que deve e já pagou  
✅ **Histórico:** Acesso fácil a acordos passados  
✅ **Negociação:** Base para futuros acordos  

---

### **Para o Financeiro:**

✅ **Organização:** Todos compromissos em um lugar  
✅ **Comprovantes:** Anexos de todos documentos  
✅ **Conciliação:** Fácil conferir pagamentos  
✅ **Auditoria:** Trilha completa de evidências  

---

### **Para a Gestão:**

✅ **Visão Geral:** Dashboard com resumo financeiro  
✅ **Decisão:** Dados para avaliar investimentos  
✅ **Controle:** Quanto está investido em cada cliente  
✅ **ROI:** Avaliar retorno dos investimentos  

---

## 🔧 Detalhes Técnicos

### **Arquivos Criados:**

```
📁 /types/contaCorrente.ts
   - Tipos TypeScript para conta corrente
   - Interfaces: Compromisso, Pagamento, TipoArquivo, etc.
   - Enums: TipoCompromisso, FormaPagamento, StatusCompromisso

📁 /data/mockContaCorrente.ts
   - Dados mock para desenvolvimento
   - Tipos de arquivo pré-cadastrados
   - Exemplos de compromissos e pagamentos

📁 /components/CustomerFormContaCorrente.tsx
   - Componente principal da aba
   - Formulários de compromisso e pagamento
   - Listagens e visualizações
   - Gestão de anexos

📁 /components/CustomerFormPage.tsx (modificado)
   - Integração da nova aba
   - Navegação atualizada
```

---

### **Tipos TypeScript:**

```typescript
export interface Compromisso {
  id: string;
  clienteId: string;
  clienteNome: string;
  data: string;
  valor: number;
  titulo: string;
  descricao: string;
  tipoCompromisso: 'Investimento' | 'Ressarcimento';
  arquivos: ArquivoAnexo[];
  status: StatusCompromisso;
  valorPago: number;
  valorPendente: number;
  dataCriacao: string;
  criadoPor: string;
  dataAtualizacao: string;
  atualizadoPor: string;
}

export interface Pagamento {
  id: string;
  compromissoId: string;
  compromissoTitulo: string;
  dataPagamento: string;
  valor: number;
  formaPagamento: FormaPagamento;
  comprovanteAnexo?: ArquivoAnexo;
  observacoes?: string;
  dataCriacao: string;
  criadoPor: string;
}

export interface ArquivoAnexo {
  id: string;
  nomeArquivo: string;
  tamanho: number;
  tipoArquivoId: string;
  tipoArquivoNome: string;
  url: string;
  dataUpload: string;
  uploadedBy: string;
}
```

---

## 🎯 Validações Implementadas

### **Compromisso:**

- ✅ Data obrigatória
- ✅ Valor obrigatório e > 0
- ✅ Título obrigatório
- ✅ Tipo de compromisso obrigatório

### **Pagamento:**

- ✅ Compromisso selecionado obrigatório
- ✅ Data obrigatória
- ✅ Valor obrigatório e > 0
- ✅ Valor não pode exceder saldo pendente
- ✅ Forma de pagamento obrigatória

### **Anexos:**

- ✅ Tipo de arquivo obrigatório antes do upload
- ✅ Exibição de tamanho do arquivo
- ✅ Possibilidade de remover antes de salvar

---

## 📱 Responsividade

### **Desktop:**
- Grid 4 colunas para cards de resumo
- Tabela completa de pagamentos
- Dialog de formulários em tela cheia

### **Tablet:**
- Grid 2 colunas para cards
- Tabela responsiva com scroll horizontal
- Dialog ajustado

### **Mobile:**
- Cards empilhados (1 coluna)
- Tabela simplificada ou lista
- Dialog full-screen

---

## 🔐 Permissões e Segurança

### **Visualização:**

- ✅ Backoffice: Acesso total
- ✅ Gerente: Acesso total
- ✅ Vendedor: Apenas seus clientes
- ❌ Cliente: Sem acesso

### **Criação/Edição:**

- ✅ Backoffice: Pode criar e editar
- ✅ Gerente: Pode criar e editar
- ⚠️ Vendedor: Pode visualizar (não editar)
- ❌ Cliente: Sem acesso

### **Exclusão:**

- ✅ Backoffice: Pode excluir (com auditoria)
- ⚠️ Gerente: Apenas próprios registros
- ❌ Vendedor: Não pode excluir
- ❌ Cliente: Sem acesso

---

## 🚀 Melhorias Futuras

### **Curto Prazo:**

1. **Notificações Automáticas:**
   - Alertar quando pagamento vencer
   - Notificar quando pagar parcialmente
   - Avisar quando pago integralmente

2. **Relatórios:**
   - Relatório de investimentos por período
   - Relatório de ressarcimentos por motivo
   - Dashboard executivo consolidado

3. **Aprovação de Compromissos:**
   - Workflow de aprovação
   - Diferentes níveis por valor
   - Auditoria de aprovações

---

### **Médio Prazo:**

4. **Integração Financeira:**
   - Sincronizar com sistema financeiro
   - Gerar lançamentos contábeis
   - Conciliação bancária automática

5. **Agendamento de Pagamentos:**
   - Agendar pagamentos futuros
   - Pagamentos recorrentes
   - Lembretes automáticos

6. **Analytics:**
   - ROI de investimentos por cliente
   - Taxa de ressarcimento
   - Análise de tendências

---

### **Longo Prazo:**

7. **IA e Machine Learning:**
   - Sugerir investimentos baseado em histórico
   - Prever necessidade de ressarcimentos
   - Otimizar formas de pagamento

8. **Portal do Cliente:**
   - Cliente consulta compromissos (limitado)
   - Acompanhar pagamentos
   - Solicitar ressarcimentos (workflow)

9. **Integração ERP:**
   - Sincronização bidirecional
   - Importar/exportar dados
   - Conciliação automática

---

## 📖 Documentação de Integração

### **API Endpoints (Futuros):**

```typescript
// Compromissos
GET    /api/clientes/{id}/compromissos
POST   /api/clientes/{id}/compromissos
PUT    /api/compromissos/{id}
DELETE /api/compromissos/{id}

// Pagamentos
GET    /api/compromissos/{id}/pagamentos
POST   /api/compromissos/{id}/pagamentos
DELETE /api/pagamentos/{id}

// Tipos de Arquivo
GET    /api/tipos-arquivo
POST   /api/tipos-arquivo

// Anexos
POST   /api/compromissos/{id}/anexos
DELETE /api/anexos/{id}
GET    /api/anexos/{id}/download
```

---

### **Estrutura de Dados Backend:**

```sql
-- Tabela de Compromissos
CREATE TABLE compromissos (
  id UUID PRIMARY KEY,
  cliente_id UUID NOT NULL,
  data DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_compromisso VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  valor_pendente DECIMAL(10,2),
  data_criacao TIMESTAMP DEFAULT NOW(),
  criado_por UUID,
  data_atualizacao TIMESTAMP,
  atualizado_por UUID,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Tabela de Pagamentos
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY,
  compromisso_id UUID NOT NULL,
  data_pagamento DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL,
  observacoes TEXT,
  data_criacao TIMESTAMP DEFAULT NOW(),
  criado_por UUID,
  FOREIGN KEY (compromisso_id) REFERENCES compromissos(id)
);

-- Tabela de Tipos de Arquivo
CREATE TABLE tipos_arquivo (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255),
  ativo BOOLEAN DEFAULT true
);

-- Tabela de Anexos
CREATE TABLE anexos (
  id UUID PRIMARY KEY,
  compromisso_id UUID,
  pagamento_id UUID,
  nome_arquivo VARCHAR(255) NOT NULL,
  tamanho INT NOT NULL,
  tipo_arquivo_id UUID NOT NULL,
  url VARCHAR(500) NOT NULL,
  data_upload TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID,
  FOREIGN KEY (compromisso_id) REFERENCES compromissos(id),
  FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id),
  FOREIGN KEY (tipo_arquivo_id) REFERENCES tipos_arquivo(id)
);
```

---

## 🎓 Guia de Uso para Usuários

### **Como Registrar um Investimento:**

1. Abrir cliente em modo de edição
2. Ir na aba "Conta Corrente"
3. Clicar em "Novo Compromisso"
4. Preencher:
   - Data do acordo
   - Valor do investimento
   - Tipo: Investimento
   - Título descritivo
   - Descrição detalhada
5. Anexar documentos (proposta, contrato, etc.)
6. Clicar em "Salvar Compromisso"

---

### **Como Registrar um Ressarcimento:**

1. Abrir cliente em modo de edição
2. Ir na aba "Conta Corrente"
3. Clicar em "Novo Compromisso"
4. Preencher:
   - Data da ocorrência
   - Valor do ressarcimento
   - Tipo: Ressarcimento
   - Título (ex: "Ressarcimento - Produto Avariado")
   - Descrição do problema
5. Anexar evidências (fotos, laudos, NF, etc.)
6. Clicar em "Salvar Compromisso"

---

### **Como Registrar um Pagamento:**

1. Abrir cliente em modo de edição
2. Ir na aba "Conta Corrente"
3. Clicar em "Registrar Pagamento"
4. Selecionar compromisso pendente
5. Preencher:
   - Data do pagamento
   - Valor (total ou parcial)
   - Forma de pagamento
6. Anexar comprovante (se houver)
7. Adicionar observações (opcional)
8. Clicar em "Registrar Pagamento"

---

### **Como Criar Novo Tipo de Arquivo:**

1. No dialog de "Novo Compromisso"
2. Na seção "Arquivos Anexos"
3. Clicar em "Novo Tipo"
4. Preencher nome e descrição
5. Clicar em "Criar Tipo"
6. Tipo fica disponível imediatamente

---

## ✅ Checklist de Implementação

- [x] Tipos TypeScript criados
- [x] Mock data implementado
- [x] Componente principal desenvolvido
- [x] Dashboard de resumo funcionando
- [x] Formulário de compromissos completo
- [x] Formulário de pagamentos completo
- [x] Sistema de anexos implementado
- [x] Criação rápida de tipos de arquivo
- [x] Comboboxes pesquisáveis
- [x] Validações implementadas
- [x] Cálculo automático de saldos
- [x] Status dinâmicos
- [x] Integração com CustomerFormPage
- [x] Responsivo
- [x] Documentação completa

---

**Data de Implementação:** 27/10/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Pronto para Uso

---

## 📞 Suporte

Para dúvidas ou problemas com o módulo de Conta Corrente, consulte:
- Esta documentação
- Equipe de desenvolvimento
- Guias de uso internos
