# 📦 ANÁLISE COMPLETA - MÓDULO LOGÍSTICA TMS EMBARCADOR (LogCRM → ProSeller)

## 🎯 RESUMO EXECUTIVO

Implementação do **Módulo de Logística TMS Embarcador** no ProSeller, unificando funcionalidades do LogCRM em uma plataforma completa de gestão comercial + logística. A implementação seguirá **4 fases progressivas**, começando pela fundação essencial e avançando até integração total com automação SSW, incluindo recursos críticos de TMS: **Gestão de CT-e/DACTE com validação**, **Consolidação de Cargas**, **SLA (Service Level Agreement)** e **Gestão de Devoluções (Reverse Logistics)**.

---

## 📋 RESPOSTAS ÀS DEFINIÇÕES ESTRATÉGICAS

### ✅ **Confirmações Recebidas:**

| Item | Definição |
|------|-----------|
| **Prioridade** | Fase 1 → Fase 2 → Fase 3 → Fase 4 (ordem sequencial) |
| **SSW API** | Integração sem necessidade de credenciais de teste |
| **Padrão EDI** | PROCEDA (padrão logístico brasileiro) |
| **Armazenamento** | Supabase Storage com limite/redução de tamanho |
| **Permissões Vendedores** | ❌ Sem acesso ao módulo logístico |
| **Visualização Vendedores** | ✅ Seção de entrega na tela de detalhes do pedido (data/hora + comprovante) |
| **Notificações** | ❌ Não necessárias - status do pedido suficiente |
| **Documentos Fiscais** | DACTE, CTE, NF Serviços (integração + manual) |
| **Comprovante Entrega** | Importação via integração ou upload manual |
| **Agrupamento Fretes** | ✅ Cotações agrupadas com rateio de custos comuns |
| **Páginas Existentes** | 🛡️ Preservar ao máximo - criar novas páginas |
| **Dashboard** | 🔄 Adicionar abas Vendas/Logística no topo |
| **CT-e/DACTE** | ✅ Upload + Validação XML + Extração dados + Consulta SEFAZ |
| **Consolidação** | ✅ Expansão do agrupamento com otimização de carga |
| **SLA** | ✅ Gestão completa de Service Level Agreement |
| **Devoluções** | ✅ Reverse Logistics completo |

---

## 🏗️ ARQUITETURA DE DADOS

### **Estrutura KV Store**

```typescript
// ENTREGAS
logistics:delivery:{deliveryId}
{
  id: string,
  numeroExpedicao: string,
  saleId: string,                    // Vinculação com venda
  notaFiscal: string,
  clienteNome: string,
  clienteId: string,
  transportadorId: string,
  
  // DATAS
  dataPedido: string,                // Data registro pedido
  dataColetaSaida: string,           // Data saída
  dataPrevistaEntrega: string,       // Previsão
  dataEfetivaEntrega: string,        // Real
  
  // SLA
  slaTransportador: number,          // SLA em dias úteis
  dataSlaLimite: string,             // Data limite baseada no SLA
  dentroDoPrazo: boolean,            // Se foi entregue dentro do SLA
  diasAtraso: number,                // Dias de atraso (se houver)
  
  // VALORES
  valorCotacao: number,              // Valor cotado
  valorRealizado: number,            // Valor cobrado (faturas)
  custoIndividual: number,           // Custo específico desta entrega
  custoComumRateado: number,         // Parcela do custo comum
  agrupamentoId?: string,            // ID do agrupamento de cotação
  
  // STATUS
  statusInterno: 'aguardando_coleta' | 'em_transito' | 'entrega_agendada' | 
                 'entregue' | 'reentrega' | 'recusada' | 'devolvida' | 'cancelada',
  statusTransportador: string,       // Status original SSW
  
  // DEVOLUÇÃO (se aplicável)
  isDevolucao: boolean,
  devolucaoInfo?: {
    motivoDevolucao: string,
    custoReverso: number,
    responsavelCusto: 'cliente' | 'empresa',
    statusRetorno: 'em_transito' | 'recebido' | 'reintegrado',
    dataRetorno?: string,
    observacoes: string,
  },
  
  // DOCUMENTOS
  dacteUrl?: string,                 // DACTE (Supabase Storage)
  dacteXml?: string,                 // XML do DACTE
  dacteChaveAcesso?: string,         // Chave de 44 dígitos
  dacteValidado: boolean,            // Se foi validado na SEFAZ
  dacteStatus?: string,              // Autorizado, Cancelado, etc.
  
  cteUrl?: string,                   // CTE (Supabase Storage)
  cteXml?: string,                   // XML do CT-e
  cteChaveAcesso?: string,           // Chave de 44 dígitos
  cteValidado: boolean,              // Se foi validado na SEFAZ
  cteStatus?: string,                // Autorizado, Cancelado, Inutilizado
  cteDadosExtrated?: {               // Dados extraídos do XML
    numeroDocumento: string,
    serie: string,
    dataEmissao: string,
    valorPrestacao: number,
    valorCarga: number,
    cfop: string,
    icmsValor?: number,
    pesoTotal?: number,
    volumes?: number,
  },
  
  nfServicoUrl?: string,             // NF Serviços Transporte
  comprovanteEntregaUrl?: string,    // Comprovante assinado
  
  // OBSERVAÇÕES
  observacoes: string,
  instrucoesLogisticas: string,
  
  // CONTROLE
  empresaId: string,
  createdAt: string,
  updatedAt: string,
  createdBy: string,
}

// AGRUPAMENTO DE COTAÇÕES (CONSOLIDAÇÃO DE CARGAS)
logistics:quote-group:{groupId}
{
  id: string,
  nome: string,                      // Ex: "Cotação São Paulo - Semana 12"
  transportadorId: string,
  dataColeta: string,
  custoComum: number,                // Valor a ratear entre entregas
  
  // CONSOLIDAÇÃO AVANÇADA
  pesoTotal: number,                 // Peso total do agrupamento
  volumeTotal: number,               // Volume total (m³)
  capacidadeVeiculo: {
    pesoMax: number,                 // kg
    volumeMax: number,               // m³
  },
  aproveitamento: {
    percentualPeso: number,          // % do peso utilizado
    percentualVolume: number,        // % do volume utilizado
  },
  
  observacoes: string,
  deliveryIds: string[],             // IDs das entregas agrupadas
  empresaId: string,
  createdAt: string,
  createdBy: string,
}

// OCORRÊNCIAS
logistics:occurrence:{deliveryId}:{occurrenceId}
{
  id: string,
  deliveryId: string,
  tipo: string,                      // ID do tipo cadastrado
  tipoNome: string,                  // Ex: "Entrega Agendada"
  classificacao: 'informativo' | 'cliente' | 'critico',
  titulo: string,
  descricao: string,
  dataHora: string,
  
  // ORIGEM
  origem: 'manual' | 'ssw',          // Se foi criada manualmente ou via API
  
  // LOCALIZAÇÃO
  domicilio?: string,
  filial?: string,
  cidade?: string,
  uf?: string,
  
  // ANEXOS
  anexos: Array<{
    nome: string,
    tipo: 'foto' | 'documento' | 'comprovante',
    url: string,                     // Supabase Storage
    tamanho: number,
  }>,
  
  createdAt: string,
  createdBy: string,
}

// TRANSPORTADORES
logistics:carrier:{carrierId}
{
  id: string,
  nome: string,
  cnpj: string,
  contato: string,
  email: string,
  telefone: string,
  
  // INTEGRAÇÃO SSW
  sswIntegrado: boolean,
  sswEmpresaId?: string,             // ID da empresa no SSW
  sswApiUrl?: string,                // URL específica se houver
  
  // SLA POR REGIÃO
  slaConfigs: Array<{
    origem: {                        // CEP ou UF
      tipo: 'cep' | 'uf',
      valor: string,
    },
    destino: {
      tipo: 'cep' | 'uf',
      valor: string,
    },
    slaDiasUteis: number,
    ativo: boolean,
  }>,
  
  ativo: boolean,
  observacoes: string,
  empresaId: string,
  createdAt: string,
}

// TIPOS DE OCORRÊNCIA
logistics:occurrence-type:{typeId}
{
  id: string,
  nome: string,                      // Ex: "Atraso", "Endereço Incorreto"
  classificacao: 'informativo' | 'cliente' | 'critico',
  cor: string,                       // Hex color
  icone?: string,                    // Lucide icon name
  ativo: boolean,
  empresaId: string,
  createdAt: string,
}

// FATURAS
logistics:invoice:{invoiceId}
{
  id: string,
  tipo: 'edi' | 'pdf' | 'xml',
  transportadorId: string,
  numeroFatura: string,
  dataEmissao: string,
  dataVencimento: string,
  valorTotal: number,
  
  // ARQUIVO ORIGINAL
  arquivoUrl: string,                // Supabase Storage
  arquivoNome: string,
  
  // PARSING
  parsed: boolean,
  parseData?: {
    // Dados extraídos do EDI/PDF
    itens: Array<{
      notaFiscal: string,
      valorCobrado: number,
      peso?: number,
      volumes?: number,
    }>
  },
  
  // RELACIONAMENTO
  deliveryIds: string[],             // Entregas vinculadas
  
  empresaId: string,
  createdAt: string,
  uploadedBy: string,
}

// CONFIGURAÇÕES SSW
logistics:ssw-config:{empresaId}
{
  empresaId: string,
  habilitado: boolean,
  urlBase: string,
  empresaSswId: string,              // ID da empresa no SSW
  
  // MAPEAMENTO DE STATUS
  statusMap: {
    [sswStatus: string]: string      // SSW → ProSeller
  },
  
  // SINCRONIZAÇÃO
  ultimaSync: string,
  autoSync: boolean,
  intervaloSync: number,             // Minutos
  
  updatedAt: string,
  updatedBy: string,
}

// MAPEAMENTO PEDIDO → ENTREGA
logistics:sale-delivery-map:{saleId}
{
  saleId: string,
  deliveryId: string,
  createdAt: string,
}

// DEVOLUÇÕES (Reverse Logistics)
logistics:return:{returnId}
{
  id: string,
  deliveryOriginalId: string,       // ID da entrega original
  saleId: string,
  notaFiscalOriginal: string,
  
  // DADOS DA DEVOLUÇÃO
  motivoDevolucao: string,           // Ex: "Recusa", "Avaria", "Erro no pedido"
  tipoMotivo: 'recusa' | 'avaria' | 'erro_pedido' | 'insatisfacao' | 'outro',
  descricaoDetalhada: string,
  
  // TRANSPORTADORA
  transportadorId: string,
  numeroExpedicaoRetorno: string,
  
  // CUSTOS
  custoRetorno: number,
  responsavelCusto: 'cliente' | 'empresa' | 'transportadora',
  
  // STATUS
  statusRetorno: 'aguardando_coleta' | 'em_transito' | 'recebido' | 'reintegrado' | 'descartado',
  
  // DATAS
  dataSolicitacao: string,
  dataColetaRetorno?: string,
  dataRecebimento?: string,
  dataReintegracao?: string,         // Se foi reintegrado ao estoque
  
  // DOCUMENTOS
  comprovanteRetornoUrl?: string,
  fotosAvariaUrls?: string[],
  
  // OBSERVAÇÕES
  observacoes: string,
  acaoTomada?: string,               // Ex: "Reenvio ao cliente", "Estorno"
  
  empresaId: string,
  createdAt: string,
  createdBy: string,
}
```

---

## 🚀 IMPLEMENTAÇÃO POR FASES

---

## **FASE 1 - FUNDAÇÃO (ESSENCIAL)** 🏗️

### **Objetivo:** Estrutura básica funcional com CRUD completo + CT-e/DACTE + SLA

### **1.1 Backend (Servidor)**

**Arquivo:** `/supabase/functions/server/logistics.ts` (NOVO)

**Rotas a implementar:**

```typescript
// ENTREGAS
GET    /make-server-f9c0d131/logistics/deliveries
POST   /make-server-f9c0d131/logistics/deliveries
GET    /make-server-f9c0d131/logistics/deliveries/:id
PUT    /make-server-f9c0d131/logistics/deliveries/:id
DELETE /make-server-f9c0d131/logistics/deliveries/:id

// TRANSPORTADORES
GET    /make-server-f9c0d131/logistics/carriers
POST   /make-server-f9c0d131/logistics/carriers
PUT    /make-server-f9c0d131/logistics/carriers/:id
DELETE /make-server-f9c0d131/logistics/carriers/:id

// TIPOS DE OCORRÊNCIA
GET    /make-server-f9c0d131/logistics/occurrence-types
POST   /make-server-f9c0d131/logistics/occurrence-types
PUT    /make-server-f9c0d131/logistics/occurrence-types/:id
DELETE /make-server-f9c0d131/logistics/occurrence-types/:id

// AGRUPAMENTO DE COTAÇÕES (CONSOLIDAÇÃO)
GET    /make-server-f9c0d131/logistics/quote-groups
POST   /make-server-f9c0d131/logistics/quote-groups
GET    /make-server-f9c0d131/logistics/quote-groups/:id
PUT    /make-server-f9c0d131/logistics/quote-groups/:id
DELETE /make-server-f9c0d131/logistics/quote-groups/:id
GET    /make-server-f9c0d131/logistics/quote-groups/:id/optimization
  // Retorna sugestões de otimização de carga

// CT-e / DACTE
POST   /make-server-f9c0d131/logistics/cte/validate
  // Valida XML do CT-e e extrai dados
POST   /make-server-f9c0d131/logistics/cte/consult-sefaz
  // Consulta situação na SEFAZ por chave de acesso
GET    /make-server-f9c0d131/logistics/deliveries/:id/cte-dados
  // Retorna dados extraídos do CT-e

// SLA
GET    /make-server-f9c0d131/logistics/sla/calculate
  // Calcula SLA para uma rota (origem, destino, transportadora)
GET    /make-server-f9c0d131/logistics/sla/report
  // Relatório de cumprimento de SLA

// DEVOLUÇÕES
GET    /make-server-f9c0d131/logistics/returns
POST   /make-server-f9c0d131/logistics/returns
GET    /make-server-f9c0d131/logistics/returns/:id
PUT    /make-server-f9c0d131/logistics/returns/:id
DELETE /make-server-f9c0d131/logistics/returns/:id

// VINCULAÇÃO PEDIDO → ENTREGA
GET    /make-server-f9c0d131/logistics/sales/:saleId/delivery
```

**Funcionalidades:**
- ✅ CRUD completo de entregas
- ✅ CRUD de transportadores com SLA por região
- ✅ CRUD de tipos de ocorrência
- ✅ CRUD de agrupamentos de cotação
- ✅ CRUD de devoluções
- ✅ Validações de negócio
- ✅ Cálculo automático de rateio de custos comuns
- ✅ Validação de XML CT-e/DACTE
- ✅ Extração de dados do XML
- ✅ Consulta SEFAZ (via API pública)
- ✅ Cálculo automático de SLA
- ✅ Verificação de cumprimento de prazo
- ✅ Consulta de entrega por venda (saleId)
- ✅ Cálculo de aproveitamento de carga

---

### **1.2 Serviço API (Frontend)**

**Arquivo:** `/services/logistics-api.ts` (NOVO)

```typescript
// Serviço de comunicação com backend
// Similar ao /services/api.ts existente
// Métodos: 
//   - getDeliveries, createDelivery, updateDelivery, deleteDelivery
//   - validateCTe, consultSefaz
//   - calculateSLA, getSLAReport
//   - getReturns, createReturn, updateReturn
//   - getQuoteGroups, optimizeLoad
```

---

### **1.3 Páginas e Componentes**

#### **PÁGINA: Lista de Entregas**

**Arquivo:** `/components/LogisticsDeliveriesPage.tsx` (NOVO)

**Funcionalidades:**
- ✅ Tabela de entregas com colunas:
  - NF / Nº Expedição
  - Cliente
  - Transportadora
  - Data Saída
  - Data Prevista
  - SLA (prazo em dias)
  - Status Interno
  - Status Transportador
  - Indicador SLA (✅ dentro / ⚠️ em risco / ❌ atrasado)
  - Ações (👁️ Visualizar, ✏️ Editar, 🗑️ Deletar)

- ✅ Filtros avançados:
  - Nome do Cliente
  - Nº da NF
  - Nº Expedição
  - Status Interno (dropdown)
  - Transportador (dropdown)
  - Status Transportador (text)
  - Data de Saída (range)
  - Comprovante Anexado (sim/não)
  - CT-e Validado (sim/não)
  - SLA (dentro/atrasado/em risco)
  - Tipo (normal/devolução)

- ✅ Indicadores visuais:
  - Badge colorido por status
  - Ícones de anexos
  - Contador de dias em trânsito
  - Indicador de SLA (cores)
  - Ícone de devolução

- ✅ Paginação e exportação

---

#### **PÁGINA: Formulário de Entrega**

**Arquivo:** `/components/LogisticsDeliveryForm.tsx` (NOVO)

**Campos do Formulário:**

**Seção 1: Vinculação com Pedido**
- 🔗 Buscar Pedido (autocomplete por NF ou cliente)
- 📋 Exibir dados do pedido selecionado (cliente, valor, NF)

**Seção 2: Dados Logísticos**
- 🚚 Transportador (select)
- 📦 Número de Expedição
- 💰 Valor da Cotação
- 📅 Data de Coleta/Saída
- 📅 Data Prevista de Entrega
- 📅 Data Efetiva de Entrega (opcional, só quando entregue)
- ⏱️ **SLA Calculado** (automático - readonly) - Exibe prazo em dias úteis
- 📅 **Data Limite SLA** (automático - readonly)

**Seção 3: Agrupamento de Cotação / Consolidação (Opcional)**
- ✅ Checkbox "Faz parte de cotação agrupada?"
- 📋 Select de agrupamento existente OU
- ➕ Criar novo agrupamento:
  - Nome do agrupamento
  - Custo comum total
  - Peso total previsto (kg)
  - Volume total previsto (m³)
  - Capacidade do veículo (peso/volume)
  - Observações
- 📊 **Indicador de Aproveitamento** (se agrupado):
  - Barra de progresso: Peso utilizado / Capacidade
  - Barra de progresso: Volume utilizado / Capacidade
  - Alertas se capacidade excedida

**Seção 4: Custos**
- 💵 Custo Individual desta Entrega
- 💵 Custo Comum Rateado (calculado automaticamente se agrupado)
- 💰 **Valor Total Cotado** (individual + rateado) - READONLY

**Seção 5: Status**
- 🔵 Status Interno (select)
  - Aguardando Coleta
  - Em Trânsito
  - Entrega Agendada
  - Entregue
  - Reentrega
  - Recusada
  - Devolvida
  - Cancelada

**Seção 6: Observações**
- 📝 Observações Gerais (textarea)
- 📋 Instruções Logísticas (textarea)

**Seção 7: Documentos**

**DACTE:**
- 📄 Upload DACTE (PDF ou XML)
- Se XML:
  - ✅ Botão "Validar DACTE"
  - Exibir: Chave de Acesso, Status SEFAZ, Data Emissão
  - Badge: ✅ Validado / ⚠️ Pendente Validação / ❌ Inválido

**CT-e:**
- 📄 Upload CT-e XML
- ✅ Botão "Validar CT-e"
- Após validação, exibir card com dados extraídos:
  - Nº Documento / Série
  - Data Emissão
  - Valor da Prestação
  - Valor da Carga
  - CFOP
  - ICMS
  - Peso Total
  - Volumes
- Badge: ✅ Autorizado / ⚠️ Pendente / ❌ Cancelado
- 🔍 Botão "Consultar na SEFAZ" (valida se está autorizado)

**Outros:**
- 📄 Upload NF Serviços
- 📸 Upload Comprovante de Entrega

**Validações:**
- ✅ Pedido obrigatório
- ✅ Transportador obrigatório
- ✅ Valor cotação > 0
- ✅ Data saída ≤ Data prevista
- ✅ Se status = "Entregue", data efetiva obrigatória
- ✅ Se CT-e XML fornecido, deve ser validável
- ✅ Chave de acesso CT-e deve ter 44 dígitos
- ✅ Limite de tamanho de arquivos (5MB por arquivo)
- ✅ Se agrupado, peso/volume não pode exceder capacidade

---

#### **PÁGINA: Gestão de Transportadores**

**Arquivo:** `/components/LogisticsCarriersPage.tsx` (NOVO)

**Funcionalidades:**
- ✅ Tabela de transportadores
- ✅ Botão "Novo Transportador"
- ✅ Modal de cadastro/edição:
  - Nome
  - CNPJ (com máscara)
  - Contato
  - Email
  - Telefone (com máscara)
  - Ativo (toggle)
  - Observações
  - **Integração SSW:** (checkbox + campos condicionais)
    - SSW Empresa ID
    - SSW API URL (opcional)
  - **SLA por Região:**
    - Tabela editável de SLAs
    - Adicionar linha: Origem (UF ou CEP), Destino (UF ou CEP), Prazo (dias úteis)
    - Exemplo:
      - SP → RJ: 2 dias úteis
      - SP → CE: 5 dias úteis
      - 01310-100 → 20000-000: 1 dia útil (CEP específico)
    - Ações por linha: Editar, Deletar
- ✅ Ações: Editar, Desativar, Deletar

---

#### **PÁGINA: Gestão de Devoluções**

**Arquivo:** `/components/LogisticsReturnsPage.tsx` (NOVO)

**Funcionalidades:**

**Tabela de Devoluções:**
- Colunas:
  - NF Original
  - Cliente
  - Motivo
  - Transportadora
  - Status Retorno
  - Data Solicitação
  - Data Recebimento
  - Custo Retorno
  - Responsável Custo
  - Ações (👁️ Ver, ✏️ Editar)

**Filtros:**
- Status Retorno
- Motivo
- Responsável Custo
- Período (data solicitação)
- Cliente
- Transportadora

**Botão:** "Registrar Nova Devolução"

**Formulário de Devolução:**
- Buscar Entrega Original (por NF)
- Exibir dados da entrega original
- Motivo da Devolução (select):
  - Recusa do Cliente
  - Avaria no Transporte
  - Erro no Pedido
  - Insatisfação com Produto
  - Outro
- Descrição Detalhada (textarea)
- Transportadora do Retorno (select)
- Número Expedição Retorno
- Custo do Retorno (R$)
- Responsável pelo Custo:
  - Cliente
  - Empresa
  - Transportadora
- Status:
  - Aguardando Coleta
  - Em Trânsito
  - Recebido
  - Reintegrado ao Estoque
  - Descartado
- Upload Comprovante de Retorno
- Upload Fotos de Avaria (se aplicável)
- Observações
- Ação Tomada (textarea): Ex: "Reenvio ao cliente", "Estorno realizado"

**Indicadores (Cards no topo):**
- Total de Devoluções no Período
- Custo Total de Devoluções
- Taxa de Devolução (% sobre entregas)
- Principal Motivo

---

#### **PÁGINA: Configurações de Logística**

**Arquivo:** `/components/LogisticsSettingsPage.tsx` (NOVO)

**Abas:**

**Aba 1: Tipos de Ocorrência**
- ✅ Tabela de tipos
- ✅ Criar/Editar tipos:
  - Nome
  - Classificação (Informativo/Cliente/Crítico)
  - Cor (color picker)
  - Ícone (select de Lucide icons)
  - Ativo (toggle)

**Aba 2: Mapeamento de Status SSW** (Fase 3)
- (Reservado para Fase 3)

**Aba 3: SLA Global**
- Configurações globais de SLA
- SLA padrão (se transportadora não tiver configurado)
- Alertas de SLA:
  - ⚠️ Alerta quando faltarem X dias para vencer
  - 🔴 Alerta quando vencido

---

#### **COMPONENTE: Badge de Status**

**Arquivo:** `/components/logistics/LogisticsStatusBadge.tsx` (NOVO)

```typescript
// Badge colorido com mapeamento de cores por status
// Exemplo: Em Trânsito = Amarelo, Entregue = Verde
```

---

#### **COMPONENTE: Indicador de SLA**

**Arquivo:** `/components/logistics/LogisticsSLAIndicator.tsx` (NOVO)

```typescript
// Componente que exibe indicador visual de SLA:
// - ✅ Verde: Dentro do prazo (faltam mais de 2 dias)
// - ⚠️ Amarelo: Em risco (faltam 1-2 dias)
// - 🔴 Vermelho: Atrasado (prazo vencido)
// Tooltip: "SLA: 3 dias úteis | Faltam: 1 dia | Limite: 20/12/2024"
```

---

#### **COMPONENTE: Validador de CT-e**

**Arquivo:** `/components/logistics/LogisticsCTeValidator.tsx` (NOVO)

```typescript
// Componente para upload e validação de CT-e XML
// - Upload de arquivo XML
// - Parse do XML
// - Extração de dados
// - Consulta na SEFAZ
// - Exibição de dados extraídos em card formatado
// - Badges de status (Autorizado/Cancelado/Inutilizado)
```

---

### **1.4 Integração com Páginas Existentes**

#### ⚠️ **ALTERAÇÃO NECESSÁRIA:** `/components/SalesDetailPage.tsx`

**Modificação:** Adicionar nova seção ao final da página

**Nova Seção: "Informações de Entrega"**

```typescript
// Ao final do componente SalesDetailPage, antes do </div> final:

{/* SEÇÃO DE ENTREGA - Visível apenas se existir entrega vinculada */}
{deliveryInfo && (
  <Card>
    <CardHeader>
      <CardTitle>📦 Informações de Entrega</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Transportadora</p>
          <p>{deliveryInfo.transportadorNome}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Nº Expedição</p>
          <p>{deliveryInfo.numeroExpedicao}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data de Saída</p>
          <p>{formatDate(deliveryInfo.dataColetaSaida)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data de Entrega</p>
          <p>
            {deliveryInfo.dataEfetivaEntrega 
              ? formatDate(deliveryInfo.dataEfetivaEntrega)
              : 'Pendente'
            }
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <LogisticsStatusBadge status={deliveryInfo.statusInterno} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">SLA</p>
          <LogisticsSLAIndicator 
            sla={deliveryInfo.slaTransportador} 
            dataLimite={deliveryInfo.dataSlaLimite}
            dentroDoPrazo={deliveryInfo.dentroDoPrazo}
          />
        </div>
        
        {/* Comprovante de Entrega */}
        {deliveryInfo.comprovanteEntregaUrl && (
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground mb-2">Comprovante de Entrega</p>
            <img 
              src={deliveryInfo.comprovanteEntregaUrl} 
              alt="Comprovante de Entrega" 
              className="max-w-md border rounded cursor-pointer hover:opacity-80"
              onClick={() => window.open(deliveryInfo.comprovanteEntregaUrl, '_blank')}
            />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}

{/* SEÇÃO DE DEVOLUÇÃO - Se houver devolução vinculada */}
{returnInfo && (
  <Card className="border-orange-200">
    <CardHeader>
      <CardTitle className="text-orange-600">🔄 Devolução Registrada</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Motivo</p>
          <p>{returnInfo.motivoDevolucao}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <LogisticsStatusBadge status={returnInfo.statusRetorno} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data Solicitação</p>
          <p>{formatDate(returnInfo.dataSolicitacao)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Custo Retorno</p>
          <p>{formatCurrency(returnInfo.custoRetorno)}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

**Lógica de busca:**
```typescript
// No useEffect, buscar entrega vinculada à venda
const deliveryInfo = await logisticsApi.getDeliveryBySaleId(sale.id);
const returnInfo = await logisticsApi.getReturnByDeliveryId(deliveryInfo?.id);
```

**Permissões:**
- ✅ Vendedores podem VER esta seção (readonly)
- ❌ Vendedores NÃO podem editar

---

### **1.5 Menu de Navegação**

#### ⚠️ **ALTERAÇÃO NECESSÁRIA:** `/App.tsx`

**Modificação:** Adicionar item "Logística" no menu principal

```typescript
// No array de menuItems, adicionar (apenas para backoffice):

{
  label: "Logística",
  icon: Truck,
  page: "logistics-deliveries",
  allowedRoles: ["backoffice"],
  submenu: [
    { label: "Entregas", page: "logistics-deliveries" },
    { label: "Devoluções", page: "logistics-returns" },
    { label: "Transportadores", page: "logistics-carriers" },
    { label: "Configurações", page: "logistics-settings" },
  ]
}

// Adicionar rotas no switch:
case "logistics-deliveries":
  return <LogisticsDeliveriesPage />;
case "logistics-returns":
  return <LogisticsReturnsPage />;
case "logistics-carriers":
  return <LogisticsCarriersPage />;
case "logistics-settings":
  return <LogisticsSettingsPage />;
```

**Submenu de Logística:**
- 📦 Entregas
- 🔄 Devoluções
- 🚚 Transportadores
- ⚙️ Configurações

---

### **1.6 Storage Setup**

**Bucket Supabase:**
- Nome: `make-f9c0d131-logistics-docs`
- Privado: ✅
- Tipos permitidos: PDF, JPG, PNG, XML, EDI
- Tamanho máximo: 5MB por arquivo

**Pastas:**
- `/dacte/`
- `/cte/`
- `/nf-servico/`
- `/comprovantes/`
- `/faturas/`
- `/ocorrencias/`
- `/devoluções/`

**Otimização:**
- Imagens: Redimensionar para 1920px largura máxima
- PDFs: Comprimir se > 2MB
- XMLs: Manter original + extrair dados

---

### **1.7 Biblioteca XML Parser**

**Dependência:** Utilizar biblioteca nativa do Deno para parse de XML

```typescript
// No backend:
import { parse } from "https://deno.land/x/xml/mod.ts";

// Parser CT-e XML:
function parseCTeXML(xmlContent: string) {
  const doc = parse(xmlContent);
  // Extrair campos conforme estrutura padrão CT-e
  return {
    chaveAcesso: doc.cteProc.protCTe.infProt.chCTe,
    numeroDocumento: doc.cteProc.CTe.infCte.ide.nCT,
    // ... mais campos
  };
}
```

---

### **✅ ENTREGÁVEIS FASE 1**

1. ✅ Backend completo com rotas de CRUD
2. ✅ Serviço de API para consumo frontend
3. ✅ Página de Lista de Entregas com filtros + indicadores SLA
4. ✅ Formulário de Cadastro/Edição de Entregas
5. ✅ Página de Gestão de Transportadores com SLA por região
6. ✅ Página de Configurações (Tipos de Ocorrência + SLA Global)
7. ✅ Sistema de Agrupamento de Cotações com rateio e otimização de carga
8. ✅ **Upload e validação de CT-e/DACTE com extração de dados**
9. ✅ **Consulta de CT-e na SEFAZ**
10. ✅ **Cálculo automático de SLA por transportadora/região**
11. ✅ **Página de Gestão de Devoluções completa**
12. ✅ Upload manual de documentos (DACTE, CTE, NF Serviços, Comprovante)
13. ✅ Seção de entrega na página de detalhes do pedido (com SLA)
14. ✅ Seção de devolução na página de detalhes do pedido
15. ✅ Item de menu "Logística" com submenu (apenas backoffice)
16. ✅ Componentes reutilizáveis (Badge de Status, Indicador SLA, Validador CT-e)
17. ✅ Storage configurado e funcional
18. ✅ Parser de XML para CT-e

---

## **FASE 2 - KANBAN & OCORRÊNCIAS** 🎯

### **Objetivo:** Dashboard visual e gestão de ocorrências

### **2.1 Dashboard Logístico com Abas**

#### ⚠️ **ALTERAÇÃO NECESSÁRIA:** `/components/DashboardPage.tsx`

**Modificação:** Adicionar seletor de abas no topo

```typescript
// No topo da página, adicionar:

<Tabs defaultValue="vendas" className="w-full">
  <TabsList className="grid w-full grid-cols-2 max-w-md">
    <TabsTrigger value="vendas">
      <TrendingUp className="h-4 w-4 mr-2" />
      Vendas
    </TabsTrigger>
    <TabsTrigger value="logistica">
      <Truck className="h-4 w-4 mr-2" />
      Logística
    </TabsTrigger>
  </TabsList>

  <TabsContent value="vendas">
    {/* CONTEÚDO ATUAL DO DASHBOARD - SEM ALTERAÇÕES */}
  </TabsContent>

  <TabsContent value="logistica">
    <LogisticsDashboard />
  </TabsContent>
</Tabs>
```

**Observação:** O conteúdo atual do dashboard permanece intacto na aba "Vendas"

---

### **2.2 Componente Dashboard Logístico**

**Arquivo:** `/components/logistics/LogisticsDashboard.tsx` (NOVO)

**Layout:**

**Topo: KPIs Principais**
```
[Lead Time Médio] [Em Trânsito Hoje] [Entregas Atrasadas] [Taxa Cumprimento SLA] [Devoluções Ativas]
```

**Meio: Kanban Board**
- Colunas: Aguardando Coleta | Em Trânsito | Agendada | Entregue | Reentrega | Recusada | Devolvida
- Drag & Drop entre colunas
- Cards compactos com:
  - NF
  - Cliente (abreviado)
  - Transportadora
  - Dias em trânsito (badge)
  - Indicador SLA (✅⚠️❌)
  - Indicador de ocorrências (🔴 se houver crítica)
  - Ícone de devolução (se aplicável)

**Lateral Direita: Análise de Custos e SLA**
- Seletor de período
- Média de Cotações
- Custo Realizado
- Divergência (%)
- Tempo Médio de Entrega
- **% Cumprimento SLA**
- **Taxa de Devolução**

---

### **2.3 Componente Kanban**

**Arquivo:** `/components/logistics/LogisticsKanbanBoard.tsx` (NOVO)

**Biblioteca:** `react-dnd` (drag and drop)

**Funcionalidades:**
- ✅ Drag & Drop para mudar status
- ✅ Atualização automática no backend ao soltar
- ✅ Animações suaves
- ✅ Contador de cards por coluna
- ✅ Click no card → Modal de detalhes
- ✅ Indicadores visuais de SLA nos cards
- ✅ Coluna específica para "Devolvida"

---

### **2.4 Sistema de Ocorrências**

**Arquivo:** `/components/logistics/LogisticsOccurrencesPanel.tsx` (NOVO)

**Funcionalidades:**
- ✅ Timeline vertical de ocorrências
- ✅ Botão "Nova Ocorrência"
- ✅ Modal de criação:
  - Tipo (select de tipos cadastrados)
  - Título
  - Descrição
  - Data/Hora (default: agora)
  - Localização (opcional)
  - Upload de anexos (múltiplos)
- ✅ Visualização expandida de anexos
- ✅ Filtro por tipo/classificação
- ✅ Ordenação por data (mais recente primeiro)
- ✅ Destaque para ocorrências críticas

---

### **2.5 Página de Detalhes da Entrega**

**Arquivo:** `/components/LogisticsDeliveryDetailsPage.tsx` (NOVO)

**Seções:**

**1. Cabeçalho**
- NF, Cliente, Status (grande e colorido)
- Indicador SLA (destaque)
- Ações: Editar, Imprimir, Registrar Devolução, Voltar

**2. Informações Principais**
- Dados do pedido vinculado
- Dados da entrega
- Valores (cotado, realizado, divergência)
- **SLA:** Prazo, Data Limite, Status (✅⚠️❌)

**3. Timeline de Ocorrências**
- Componente LogisticsOccurrencesPanel

**4. Documentos**
- Grid com preview de DACTE, CTE, NF Serviços, Comprovante
- **Card especial para CT-e validado:**
  - Badge: Status SEFAZ
  - Dados extraídos em tabela formatada
  - Botão "Revalidar na SEFAZ"
- Botões de download
- Indicador se não houver documento

**5. Devolução (se houver)**
- Card laranja com dados da devolução
- Status do retorno
- Custos
- Link para página de devoluções

**6. Histórico de Alterações**
- Log de mudanças de status
- Usuário e timestamp
- Mudanças em SLA

---

### **✅ ENTREGÁVEIS FASE 2**

1. ✅ Abas Vendas/Logística no Dashboard principal
2. ✅ Dashboard Logístico com Kanban + KPIs + SLA
3. ✅ Kanban drag-and-drop funcional com indicadores SLA
4. ✅ Sistema de ocorrências manuais
5. ✅ Upload de anexos em ocorrências
6. ✅ Página de detalhes da entrega com CT-e e SLA
7. ✅ Timeline de histórico
8. ✅ Análise de custos e SLA lateral
9. ✅ Coluna de devoluções no Kanban

---

## **FASE 3 - INTEGRAÇÃO SSW** 🔗

### **Objetivo:** Automação com sincronização de dados do transportador

### **3.1 Configuração SSW**

**Arquivo:** `/components/LogisticsSSWSettings.tsx` (NOVO)

**Integrado em:** `/components/LogisticsSettingsPage.tsx` (nova aba)

**Campos:**
- ✅ Habilitar Integração SSW (toggle)
- 🌐 URL Base API SSW
- 🏢 ID da Empresa no SSW
- ⏱️ Intervalo de Sincronização Automática (minutos)
- 🔄 Auto-Sync (toggle)

**Mapeamento de Status:**
- Tabela editável: Status SSW → Status ProSeller
- Exemplo:
  ```
  SSW: "ENTREGA AGENDADA (25)" → ProSeller: "entrega_agendada"
  SSW: "EM TRANSITO (17)"      → ProSeller: "em_transito"
  SSW: "ENTREGUE (01)"         → ProSeller: "entregue"
  ```

---

### **3.2 Backend SSW**

**Arquivo:** `/supabase/functions/server/logistics-ssw.ts` (NOVO)

**Rotas:**

```typescript
// SINCRONIZAÇÃO
POST /make-server-f9c0d131/logistics/ssw/sync-manual
  // Sincroniza todas as entregas pendentes
  
POST /make-server-f9c0d131/logistics/ssw/sync-delivery/:deliveryId
  // Sincroniza entrega específica
  
POST /make-server-f9c0d131/logistics/ssw/webhook
  // Recebe notificações do SSW (se suportado)

// DOCUMENTOS
GET /make-server-f9c0d131/logistics/ssw/dacte/:deliveryId
  // Busca DACTE no SSW e salva no storage
  
GET /make-server-f9c0d131/logistics/ssw/cte/:deliveryId
  // Busca CT-e XML no SSW, valida e extrai dados
  
GET /make-server-f9c0d131/logistics/ssw/comprovante/:deliveryId
  // Busca comprovante de entrega no SSW
```

**Funcionalidades:**
- ✅ Consulta API SSW (sem credenciais, como no LogCRM)
- ✅ Parse de ocorrências SSW
- ✅ Mapeamento de status usando tabela configurada
- ✅ Criação automática de ocorrências no ProSeller
- ✅ Download automático de DACTE/CT-e/Comprovante
- ✅ **Validação automática de CT-e após download**
- ✅ Atualização de status da entrega
- ✅ **Recalculo de SLA quando status muda**
- ✅ Log de sincronizações (sucesso/erro)

---

### **3.3 Polling Automático**

**Arquivo:** `/supabase/functions/server/logistics-cron.ts` (NOVO)

**Funcionalidade:**
- ✅ Job que roda a cada X minutos (configurável)
- ✅ Busca entregas com status != "entregue" e != "cancelada" e != "devolvida"
- ✅ Para cada entrega, chama sync-delivery
- ✅ Registra última sincronização
- ✅ Alerta se SLA próximo de vencer

**Trigger:** Pode ser acionado via Supabase Edge Functions Cron ou polling manual

---

### **3.4 Interface de Sincronização**

**Em:** `/components/LogisticsDeliveriesPage.tsx`

**Adicionar:**
- 🔄 Botão "Sincronizar com SSW" (global)
- 🔄 Botão de sincronização individual por linha
- 🕐 Indicador de última sincronização
- ⚠️ Badge de erro se falhar
- 📊 Modal "Resultado da Sincronização":
  - Entregas sincronizadas com sucesso
  - Ocorrências criadas
  - Documentos baixados
  - Erros (se houver)

---

### **3.5 Importação Automática de Documentos**

**Funcionalidade:**
- Ao sincronizar entrega, tenta buscar:
  - DACTE/CTE no SSW (XML)
  - Comprovante de entrega (se status = entregue)
- Salva automaticamente no Storage
- **Valida CT-e automaticamente**
- **Extrai dados e armazena**
- Atualiza URLs na entrega
- Registra em log se falhar

---

### **✅ ENTREGÁVEIS FASE 3**

1. ✅ Configuração SSW na página de settings
2. ✅ Mapeamento de status SSW → ProSeller
3. ✅ Backend de integração SSW
4. ✅ Sincronização manual (botão)
5. ✅ Sincronização automática (polling)
6. ✅ Criação automática de ocorrências
7. ✅ Download automático de DACTE/CT-e/Comprovante
8. ✅ **Validação automática de CT-e baixado**
9. ✅ Indicadores de status de sincronização
10. ✅ Log de erros de integração
11. ✅ Recalculo de SLA após sincronização

---

## **FASE 4 - FATURAS & ANALYTICS** 📊

### **Objetivo:** Gestão financeira e análise de performance

### **4.1 Gestão de Faturas**

**Arquivo:** `/components/LogisticsInvoicesPage.tsx` (NOVO)

**Funcionalidades:**

**Upload de Faturas:**
- ✅ Drag & Drop de arquivos EDI/PDF
- ✅ Suporte múltiplos arquivos simultâneos
- ✅ Preview antes de importar

**Parser de EDI (Padrão PROCEDA):**
```typescript
// Extrai do EDI:
// - Número da fatura
// - Data emissão/vencimento
// - Valor total
// - Lista de NFs cobradas
// - Valor por NF
// - Peso, volumes, etc.
```

**Parser de PDF:**
- OCR básico para extrair dados
- Regex para identificar NFs e valores
- Confirmação manual se houver dúvida

**Relacionamento Automático:**
- Busca entregas por NF
- Vincula fatura às entregas
- Atualiza campo `valorRealizado` na entrega
- Soma valores se múltiplas faturas para mesma NF

**Lista de Faturas:**
- Tabela com: Nº Fatura, Transportador, Data, Valor, Status
- Status: Pendente Parsing, Processada, Erro
- Ações: Ver Detalhes, Reprocessar, Deletar

---

### **4.2 Auditoria de Custos**

**Arquivo:** `/components/LogisticsCostAuditPage.tsx` (NOVO)

**Tabela Comparativa:**
| NF | Cliente | Transportador | Valor Cotado | Valor Cobrado | Divergência | % | CT-e Validado |
|----|---------|---------------|--------------|---------------|-------------|---|---------------|

**Filtros:**
- Período
- Transportador
- Apenas com divergência
- % divergência > X
- CT-e validado (sim/não)

**Exportação:**
- CSV para análise externa
- Relatório em PDF

**Alertas:**
- 🟡 Divergência > 5%
- 🔴 Divergência > 10%
- 🟢 Sem divergência
- ⚠️ Sem CT-e validado

---

### **4.3 Dashboard de KPIs Completo**

**Adicionar em:** `/components/logistics/LogisticsDashboard.tsx`

**Cards de KPIs:**

```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ Lead Time Médio     │ Lead Time Coleta    │ Lead Time Trânsito  │ Taxa Entrega Prazo  │
│ 5.2 dias            │ 1.1 dias            │ 3.8 dias            │ 87%                 │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘

┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ Participação Frete  │ Custo Médio Frete   │ Divergência Média   │ Índice Ocorrências  │
│ 8.5%                │ R$ 142,30           │ +3.2%               │ 12%                 │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘

┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ Cumprimento SLA     │ Taxa Devolução      │ Custo Devoluções    │ CT-e Validados      │
│ 92%                 │ 3.2%                │ R$ 1.850,00         │ 95%                 │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

**Gráficos:**

1. **Lead Time por Etapa (Stacked Bar)**
   - Processamento | Aguardando Coleta | Em Trânsito
   - Por semana/mês

2. **Evolução de Entregas (Line Chart)**
   - Linhas: Entregue, Atrasada, Em Trânsito
   - Eixo X: Tempo

3. **Performance por Transportador (Bar Chart)**
   - Lead Time médio
   - Índice de ocorrências
   - Taxa de entrega no prazo
   - **% Cumprimento SLA**

4. **Distribuição de Ocorrências (Pie Chart)**
   - Por tipo de ocorrência
   - Por criticidade

5. **Custos Reais vs Cotados (Line Chart)**
   - Duas linhas comparativas
   - Destacar divergências

6. **Cumprimento de SLA por Transportador (Bar Chart)**
   - % dentro do prazo
   - Cores: verde (>90%), amarelo (70-90%), vermelho (<70%)

7. **Devoluções por Motivo (Pie Chart)**
   - Recusa, Avaria, Erro, etc.

**Filtros Globais:**
- 📅 Período
- 🚚 Transportador
- 📍 UF Destino
- 🏢 Empresa Emitente

---

### **4.4 Relatórios Logísticos**

**Arquivo:** `/components/LogisticsReportsPage.tsx` (NOVO)

**Ou integrar em:** `/components/ReportsPage.tsx` (adicionar cards)

**Relatórios Disponíveis:**

1. **Relatório de Entregas**
   - Detalhamento completo de todas as entregas
   - Filtros: período, status, transportador, UF
   - Inclui: SLA, CT-e validado, devoluções
   - Exportação CSV/Excel

2. **Relatório de Lead Time**
   - Análise detalhada por etapa
   - Comparativo por transportador
   - Identificação de gargalos

3. **Relatório de Ocorrências**
   - Listagem de todas as ocorrências
   - Agrupamento por tipo/criticidade
   - Anexos incluídos

4. **Relatório de Custos**
   - Cotado vs Realizado
   - Divergências destacadas
   - Análise de rentabilidade
   - CT-e validados vs não validados

5. **Relatório de Performance de Transportadores**
   - Ranking por KPI
   - Comparativo temporal
   - **SLA por transportador**
   - Recomendações

6. **Relatório de SLA**
   - Cumprimento por transportador
   - Entregas atrasadas
   - Análise de tendências
   - Alertas de risco

7. **Relatório de Devoluções**
   - Motivos de devolução
   - Custos de reverse logistics
   - Taxa de devolução por cliente/produto
   - Ações tomadas

---

### **4.5 Importação de Comprovantes em Massa**

**Funcionalidade:**
- Upload de pasta ZIP com múltiplos comprovantes
- Nome do arquivo = NF.pdf ou NF.jpg
- Sistema vincula automaticamente à entrega correta
- Lista de sucessos/erros após import

---

### **✅ ENTREGÁVEIS FASE 4**

1. ✅ Página de gestão de faturas
2. ✅ Upload e parser de EDI (PROCEDA)
3. ✅ Upload e parser de PDF
4. ✅ Relacionamento automático NF → Entrega
5. ✅ Atualização de valores cobrados
6. ✅ Página de auditoria de custos
7. ✅ Dashboard completo com todos os KPIs + SLA + Devoluções
8. ✅ 7 gráficos analíticos
9. ✅ Página de relatórios logísticos (7 tipos)
10. ✅ Exportação de relatórios
11. ✅ Importação em massa de comprovantes
12. ✅ Alertas de divergência
13. ✅ Relatório específico de SLA
14. ✅ Relatório específico de Devoluções

---

## 📊 CÁLCULO DE RATEIO DE CUSTOS E CONSOLIDAÇÃO

### **Lógica de Agrupamento com Otimização:**

**Exemplo:**
```
Agrupamento: "São Paulo - Semana 12"
Custo Comum: R$ 500,00
Capacidade Veículo: 1000kg / 10m³

Entregas:
- NF 001: Peso 200kg, Volume 2m³, Custo Individual R$ 100,00
- NF 002: Peso 300kg, Volume 3m³, Custo Individual R$ 150,00
- NF 003: Peso 250kg, Volume 2.5m³, Custo Individual R$ 120,00

Total: 3 entregas
Peso Total: 750kg (75% da capacidade)
Volume Total: 7.5m³ (75% da capacidade)

Rateio = R$ 500,00 ÷ 3 = R$ 166,67 por entrega

Valores Finais Cotados:
- NF 001: R$ 100,00 + R$ 166,67 = R$ 266,67
- NF 002: R$ 150,00 + R$ 166,67 = R$ 316,67
- NF 003: R$ 120,00 + R$ 166,67 = R$ 286,67

Aproveitamento:
- Peso: 75% ✅ Bom
- Volume: 75% ✅ Bom
- Sugestão: Espaço para mais 250kg / 2.5m³
```

**Armazenamento:**
```typescript
{
  custoIndividual: 100.00,
  custoComumRateado: 166.67,
  valorCotacao: 266.67,  // Calculado: individual + rateado
  agrupamentoId: "group-123",
  pesoKg: 200,
  volumeM3: 2,
}
```

**Regras:**
- ✅ Ao adicionar entrega ao agrupamento, recalcula rateio de todas
- ✅ Ao remover entrega do agrupamento, recalcula rateio das restantes
- ✅ Ao editar custo comum, recalcula rateio de todas
- ✅ Exibe breakdown no formulário e nos relatórios
- ✅ **Alerta se exceder capacidade do veículo**
- ✅ **Sugestão de otimização (quanto falta para completar)**

---

## 📄 VALIDAÇÃO DE CT-e E DACTE

### **Fluxo de Validação:**

1. **Upload do XML:**
   - Usuário faz upload do arquivo XML do CT-e
   - Sistema valida estrutura básica do XML

2. **Parse do XML:**
   - Extrai dados principais:
     - Chave de acesso (44 dígitos)
     - Número do documento
     - Série
     - Data de emissão
     - Valor da prestação
     - Valor da carga
     - CFOP
     - ICMS
     - Peso total
     - Volumes
     - Dados do emitente
     - Dados do destinatário

3. **Consulta na SEFAZ:**
   - Utiliza API pública da SEFAZ para consultar situação
   - URL: `http://www.cte.fazenda.gov.br/portal/consulta.aspx?tipoConsulta=completa&chCTe={chave}`
   - Verifica se está:
     - ✅ Autorizado
     - ❌ Cancelado
     - ⚠️ Inutilizado
     - 🔴 Rejeitado

4. **Armazenamento:**
   - Salva XML no Storage
   - Armazena dados extraídos no registro da entrega
   - Marca como validado
   - Registra status SEFAZ

5. **Alertas:**
   - Se CT-e cancelado: alerta crítico
   - Se valor CT-e != valor cotação: alerta de divergência
   - Se CT-e sem validação há > 7 dias: alerta pendência

---

## ⏱️ GESTÃO DE SLA (SERVICE LEVEL AGREEMENT)

### **Configuração de SLA:**

**Nível 1: SLA Global (Padrão)**
- Configurado em: Configurações de Logística
- Exemplo: 5 dias úteis para qualquer entrega

**Nível 2: SLA por Transportador**
- Configurado em: Cadastro de Transportador
- Exemplo: Transportador X tem SLA geral de 3 dias úteis

**Nível 3: SLA por Rota (Transportador + Origem/Destino)**
- Configurado em: Cadastro de Transportador → Tabela de SLAs
- Exemplo:
  - SP → RJ: 2 dias úteis
  - SP → CE: 5 dias úteis
  - 01310-100 → 20040-020: 1 dia útil (CEPs específicos)

**Prioridade:** Rota específica > Transportador > Global

---

### **Cálculo de SLA:**

```typescript
function calcularSLA(entrega: Delivery) {
  // 1. Buscar SLA mais específico
  const sla = buscarSLARota(entrega.origem, entrega.destino, entrega.transportadorId)
    || buscarSLATransportador(entrega.transportadorId)
    || buscarSLAGlobal();
  
  // 2. Calcular data limite (dias úteis)
  const dataLimite = adicionarDiasUteis(entrega.dataColetaSaida, sla);
  
  // 3. Verificar status
  const hoje = new Date();
  const diasRestantes = calcularDiasUteisEntre(hoje, dataLimite);
  
  let status: 'dentro' | 'em_risco' | 'atrasado';
  if (entrega.statusInterno === 'entregue') {
    status = entrega.dataEfetivaEntrega <= dataLimite ? 'dentro' : 'atrasado';
  } else {
    if (diasRestantes > 2) status = 'dentro';
    else if (diasRestantes > 0) status = 'em_risco';
    else status = 'atrasado';
  }
  
  return { sla, dataLimite, status, diasRestantes };
}
```

---

### **Indicadores de SLA:**

**No Dashboard:**
- Card: % Cumprimento SLA
- Exemplo: "92% das entregas dentro do prazo"
- Meta visual: verde (>90%), amarelo (80-90%), vermelho (<80%)

**Na Lista de Entregas:**
- Badge por linha:
  - ✅ Verde: Dentro do prazo (faltam mais de 2 dias)
  - ⚠️ Amarelo: Em risco (faltam 1-2 dias)
  - 🔴 Vermelho: Atrasado (prazo vencido)

**No Kanban:**
- Badge pequeno no card
- Tooltip: "SLA: 3 dias úteis | Faltam: 1 dia | Limite: 20/12/2024"

**No Detalhes da Entrega:**
- Card destacado com informações completas de SLA
- Timeline visual mostrando prazo

---

### **Relatório de SLA:**

**Campos:**
- Transportadora
- Rota (Origem → Destino)
- SLA Configurado (dias)
- Total de Entregas
- Entregas Dentro do Prazo
- Entregas Atrasadas
- % Cumprimento
- Lead Time Médio Real
- Diferença (Real - SLA)

**Filtros:**
- Período
- Transportadora
- Status (todas/apenas atrasadas)
- Rota

**Gráfico:**
- Evolução mensal do cumprimento de SLA
- Comparativo entre transportadoras

---

## 🔄 GESTÃO DE DEVOLUÇÕES (REVERSE LOGISTICS)

### **Tipos de Devolução:**

1. **Recusa do Cliente**
   - Cliente recusou receber o pedido
   - Motivos: mudou de ideia, produto errado, etc.

2. **Avaria no Transporte**
   - Produto chegou danificado
   - Necessário fotos da avaria
   - Pode gerar sinistro/indenização

3. **Erro no Pedido**
   - Empresa enviou produto errado
   - Empresa responsável por custos

4. **Insatisfação com Produto**
   - Cliente exerceu direito de arrependimento
   - Prazo legal: 7 dias

5. **Outro**
   - Motivos diversos

---

### **Fluxo de Devolução:**

```
1. Registro da Devolução
   ↓
2. Definir Responsável pelo Custo
   ↓
3. Agendar Coleta de Retorno
   ↓
4. Transportadora Coleta
   ↓
5. Em Trânsito (Retorno)
   ↓
6. Recebido no CD
   ↓
7. Inspeção/Classificação
   ↓
8. Reintegração ao Estoque OU Descarte
```

---

### **Custos de Devolução:**

**Responsabilidade:**
- Cliente: Desistência/Arrependimento
- Empresa: Erro no pedido, Avaria
- Transportadora: Avaria comprovada

**Tracking:**
- Custo do frete reverso
- Custo de reembalagem (se necessário)
- Custo de reintegração ao estoque
- Perda de valor (se produto depreciado)

---

### **Indicadores de Devoluções:**

**Dashboard:**
- Card: Taxa de Devolução (% sobre entregas)
- Card: Custo Total de Devoluções no período
- Gráfico: Devoluções por motivo

**Relatório:**
- Análise de devoluções por:
  - Cliente (quem mais devolve)
  - Produto (qual mais devolvido)
  - Transportadora (qual gera mais avarias)
  - Motivo
- Custo médio por devolução
- Tempo médio de processamento

---

### **Alertas:**

- 🔴 Cliente com taxa de devolução > 20%
- 🔴 Produto com taxa de devolução > 10%
- ⚠️ Devolução recebida há > 7 dias sem reintegração
- ⚠️ Custo de devoluções > 5% do faturamento

---

## 🔐 PERMISSÕES E SEGURANÇA

### **Matriz de Permissões:**

| Funcionalidade | Backoffice | Vendedor |
|----------------|------------|----------|
| **Ver menu Logística** | ✅ | ❌ |
| **Ver lista de entregas** | ✅ | ❌ |
| **Criar entrega** | ✅ | ❌ |
| **Editar entrega** | ✅ | ❌ |
| **Deletar entrega** | ✅ | ❌ |
| **Ver ocorrências** | ✅ | ❌ |
| **Criar ocorrência** | ✅ | ❌ |
| **Sincronizar SSW** | ✅ | ❌ |
| **Upload faturas** | ✅ | ❌ |
| **Ver relatórios logísticos** | ✅ | ❌ |
| **Validar CT-e** | ✅ | ❌ |
| **Configurar SLA** | ✅ | ❌ |
| **Registrar devolução** | ✅ | ❌ |
| **Ver devoluções** | ✅ | ❌ |
| **Ver info entrega no pedido** | ✅ | ✅ |
| **Ver comprovante no pedido** | ✅ | ✅ |
| **Ver SLA no pedido** | ✅ | ✅ |
| **Ver devolução no pedido** | ✅ | ✅ |

---

## 📱 RESPONSIVIDADE

**Desktop (≥ 1024px):**
- Kanban: 7 colunas lado a lado (incluindo Devolvida)
- Painéis laterais visíveis
- Tabelas completas
- Cards de CT-e expandidos

**Tablet (768px - 1023px):**
- Kanban: 3 colunas, scroll horizontal
- Painéis colapsáveis
- Tabelas com scroll horizontal
- Cards de CT-e compactos

**Mobile (< 768px):**
- Kanban: 1 coluna, tabs para trocar
- Painéis em drawers
- Tabelas: cards verticais
- CT-e: accordion

---

## 🎨 IDENTIDADE VISUAL

**Cores do Sistema:**
- Primary: `#1e40af` (Blue-800 Navy) - já definida
- Logística: `#f97316` (Orange-500) - cor de destaque para módulo
- SLA OK: `#22c55e` (Green-500)
- SLA Risco: `#eab308` (Yellow-500)
- SLA Atrasado: `#ef4444` (Red-500)
- Devolução: `#f97316` (Orange-500)

**Ícones:**
- 📦 Entregas: `Package`
- 🚚 Transportadores: `Truck`
- 📋 Ocorrências: `AlertCircle`
- 💰 Faturas: `Receipt`
- 📊 Dashboard: `BarChart3`
- ⚙️ Configurações: `Settings`
- 📄 CT-e: `FileText`
- ⏱️ SLA: `Clock`
- 🔄 Devolução: `RotateCcw`
- ✅ Validado: `CheckCircle2`
- ⚠️ Alerta: `AlertTriangle`

---

## 🧪 TESTES E VALIDAÇÕES

**Checklist de Testes (por fase):**

**Fase 1:**
- ✅ Criar entrega vinculada a pedido
- ✅ Criar entrega sem agrupamento
- ✅ Criar agrupamento e adicionar 3 entregas
- ✅ Verificar cálculo de rateio
- ✅ Verificar aproveitamento de carga (peso/volume)
- ✅ **Upload CT-e XML e validar estrutura**
- ✅ **Consultar CT-e na SEFAZ**
- ✅ **Verificar extração de dados do CT-e**
- ✅ **Configurar SLA por transportadora/rota**
- ✅ **Calcular SLA automaticamente ao criar entrega**
- ✅ **Registrar devolução**
- ✅ Upload de 4 tipos de documentos
- ✅ Editar entrega e mudar status
- ✅ Deletar entrega
- ✅ Filtrar por múltiplos critérios incluindo SLA
- ✅ Ver info entrega na página de pedido (vendedor) com SLA
- ✅ Ver devolução na página de pedido

**Fase 2:**
- ✅ Arrastar card no Kanban
- ✅ Verificar atualização de status
- ✅ Ver indicador SLA no card do Kanban
- ✅ Criar ocorrência manual
- ✅ Upload anexo em ocorrência
- ✅ Ver timeline de ocorrências
- ✅ Trocar entre abas Vendas/Logística
- ✅ Ver detalhes de CT-e validado na página de detalhes
- ✅ Ver coluna "Devolvida" no Kanban

**Fase 3:**
- ✅ Configurar integração SSW
- ✅ Mapear 10 status diferentes
- ✅ Sincronizar manualmente 1 entrega
- ✅ Verificar criação de ocorrências SSW
- ✅ Download automático de DACTE
- ✅ **Download e validação automática de CT-e**
- ✅ Download automático de comprovante
- ✅ **Recalculo de SLA após mudança de status**
- ✅ Polling automático funcionando

**Fase 4:**
- ✅ Upload EDI e verificar parsing
- ✅ Upload PDF e verificar parsing
- ✅ Relacionamento automático com NFs
- ✅ Múltiplas faturas para mesma NF
- ✅ Auditoria: divergência > 10%
- ✅ **Auditoria: CT-e não validados**
- ✅ Todos os KPIs calculando corretamente (incluindo SLA e Devoluções)
- ✅ 7 gráficos renderizando dados reais
- ✅ Exportar 7 tipos de relatórios
- ✅ **Relatório de SLA específico**
- ✅ **Relatório de Devoluções específico**

---

## 📚 DOCUMENTAÇÃO NECESSÁRIA

**Para Usuários:**
1. Manual de Cadastro de Entregas
2. Manual de Agrupamento e Consolidação de Cotações
3. Manual de Gestão de Ocorrências
4. **Manual de Validação de CT-e/DACTE**
5. **Manual de Configuração de SLA**
6. **Manual de Gestão de Devoluções**
7. Manual de Integração SSW
8. Manual de Importação de Faturas
9. Guia de Interpretação de KPIs

**Para Desenvolvedores:**
- Estrutura de dados KV Store
- Rotas da API
- Fluxo de sincronização SSW
- **Parser de XML CT-e**
- **Algoritmo de cálculo de SLA**
- **Integração com SEFAZ**
- Parser de EDI PROCEDA
- Lógica de rateio de custos
- Lógica de otimização de carga

---

## 🚧 DEPENDÊNCIAS TÉCNICAS

**Bibliotecas Adicionais:**
```json
{
  "react-dnd": "Drag and drop para Kanban",
  "react-dnd-html5-backend": "Backend HTML5 para DnD",
  "recharts": "Gráficos (já existe no projeto)",
  "date-fns": "Manipulação de datas (já existe)",
  "lucide-react": "Ícones (já existe)"
}
```

**Deno (Backend):**
```typescript
import { parse } from "https://deno.land/x/xml/mod.ts";  // Parser XML
```

**APIs Externas:**
- SEFAZ: Consulta de CT-e (API pública HTTP)
- SSW: Integração transportador

**Supabase:**
- Edge Functions: ✅ (já configurado)
- Storage: ✅ (criar bucket)
- Auth: ✅ (já configurado)

---

## 📈 INDICADORES DE SUCESSO

**Fase 1:**
- ✅ 100% das entregas cadastradas manualmente
- ✅ 100% dos documentos anexados corretamente
- ✅ 0 erros de rateio de custos
- ✅ **95% dos CT-e validados com sucesso**
- ✅ **100% das entregas com SLA calculado**
- ✅ **100% das devoluções registradas**

**Fase 2:**
- ✅ 100% das ocorrências registradas
- ✅ Kanban usado como interface principal
- ✅ Tempo médio de atualização < 10s
- ✅ **SLA visível em todos os pontos de contato**

**Fase 3:**
- ✅ 90% das entregas sincronizadas automaticamente
- ✅ **80% dos CT-e baixados e validados via API**
- ✅ 80% dos comprovantes baixados via API
- ✅ 100% dos status mapeados corretamente

**Fase 4:**
- ✅ 95% das faturas parseadas automaticamente
- ✅ 100% das divergências identificadas
- ✅ Relatórios gerados em < 5s
- ✅ **Relatório de SLA utilizado semanalmente**
- ✅ **Taxa de devolução monitorada mensalmente**

---

## 🎯 ROADMAP DE IMPLEMENTAÇÃO

```
FASE 1 (Semanas 1-2): FUNDAÇÃO + CT-e + SLA + DEVOLUÇÕES
├─ Backend estrutura
├─ CRUDs básicos
├─ Páginas principais
├─ Agrupamento cotações com consolidação
├─ Upload documentos
├─ Validação CT-e/DACTE
├─ Sistema de SLA
└─ Gestão de devoluções

FASE 2 (Semanas 3-4): VISUAL & OCORRÊNCIAS
├─ Dashboard com abas
├─ Kanban drag-drop
├─ Sistema ocorrências
├─ Timeline histórico
├─ Indicadores SLA visuais
└─ Coluna devoluções

FASE 3 (Semanas 5-6): AUTOMAÇÃO SSW
├─ Configuração SSW
├─ Sincronização API
├─ Mapeamento status
├─ Polling automático
├─ Download documentos
├─ Validação automática CT-e
└─ Recalculo SLA

FASE 4 (Semanas 7-8): ANALYTICS & FATURAS
├─ Upload faturas
├─ Parser EDI/PDF
├─ Auditoria custos
├─ KPIs completos
├─ Relatórios executivos
├─ Relatório SLA
└─ Relatório devoluções
```

---

## 🎬 RESUMO EXECUTIVO FINAL

### **O QUE SERÁ IMPLEMENTADO:**

✅ **Sistema Completo de TMS Embarcador** integrado ao ProSeller  
✅ **Rastreamento de Entregas** com visualização Kanban e status em tempo real  
✅ **Gestão de Ocorrências** com anexos e timeline  
✅ **Integração Automática SSW** para sincronização de dados  
✅ **Gestão Financeira** com upload de faturas e auditoria de custos  
✅ **Agrupamento e Consolidação de Cotações** com rateio inteligente e otimização de carga  
✅ **Dashboard Analítico** com 12+ KPIs e 7 gráficos  
✅ **Importação de Documentos** (DACTE, CTE, NF Serviços, Comprovantes)  
✅ **Validação de CT-e/DACTE** com extração de dados e consulta SEFAZ  
✅ **Gestão de SLA** com cálculo automático e monitoramento  
✅ **Gestão de Devoluções (Reverse Logistics)** completa  
✅ **Relatórios Executivos** exportáveis (7 tipos)  

### **ALTERAÇÕES EM PÁGINAS EXISTENTES:**

| Arquivo | Tipo de Alteração | Descrição |
|---------|-------------------|-----------|
| `/App.tsx` | ⚠️ Modificação Leve | Adicionar item "Logística" no menu + rotas |
| `/components/DashboardPage.tsx` | ⚠️ Modificação Moderada | Adicionar abas Vendas/Logística no topo |
| `/components/SalesDetailPage.tsx` | ⚠️ Modificação Moderada | Adicionar seções "Informações de Entrega" e "Devolução" ao final |

**Total:** 3 arquivos existentes alterados (apenas adições, sem remover código)

### **NOVAS PÁGINAS CRIADAS:**

✅ 15 novos componentes/páginas principais  
✅ 20+ componentes reutilizáveis  
✅ 3 arquivos de serviço backend  

### **TEMPO ESTIMADO:**

🕐 **Fase 1:** 2 semanas (com CT-e, SLA e Devoluções)  
🕐 **Fase 2:** 2 semanas  
🕐 **Fase 3:** 2 semanas  
🕐 **Fase 4:** 2 semanas  

**Total:** 8 semanas para implementação completa

---

## 🚀 ROADMAP FUTURO (v2.0)

### **Recursos para Versões Futuras:**

#### **🔴 ALTA PRIORIDADE:**
1. **Tabela de Fretes Dinâmica**
   - Cadastro de tabelas por transportadora
   - Regras por CEP, peso, valor NF, cubagem
   - GRIS, taxas, pedágio

2. **Simulador de Frete**
   - Simular custo antes de criar entrega
   - Comparar múltiplas transportadoras
   - Sugestão de melhor custo-benefício

3. **Rastreamento Visual com Mapa**
   - Google Maps API
   - Plotar entregas em mapa
   - Localização GPS em tempo real

4. **Sistema de Alertas Proativos**
   - Email/notificação automática
   - Entregas atrasadas, SLA em risco, ocorrências críticas
   - Configuração de destinatários

5. **Portal do Cliente (Self-Service)**
   - Cliente rastreia pedido sem login
   - Link público com código
   - Histórico e previsão de entrega

#### **🟡 MÉDIA PRIORIDADE:**
6. Cotação Multi-Transportadoras
7. Workflow de Aprovação de Fretes
8. ETA (Estimated Time of Arrival) Dinâmico
9. Gestão de Avarias com fotos e indenizações
10. Análise de Rotas e otimização
11. Gestão de Seguros e Apólices
12. MDF-e (Manifesto de Documentos Fiscais)
13. Notificações ao Cliente Final (SMS/WhatsApp)
14. Agendamento de Entrega pelo Cliente

#### **🟢 BAIXA PRIORIDADE:**
15. Análise de Modal (Rodoviário, Aéreo, etc.)
16. Análise de Sazonalidade
17. API Pública do ProSeller
18. EDI Outbound (envio para transportador)
19. App Mobile para Conferência
20. Integração com GPS de Frota
21. Feedback de Entrega (NPS)
22. Contas a Pagar Integrado
23. Reconciliação Bancária de Fretes
24. Integração com mais transportadoras (Correios, Jadlog, Loggi)

---

## ✅ PRÓXIMA AÇÃO

Aguardando aprovação para iniciar a **FASE 1 - FUNDAÇÃO COM CT-e, SLA E DEVOLUÇÕES** 🚀

---

## 📝 NOTAS FINAIS

Este documento serve como blueprint completo para implementação do **Módulo de Logística TMS Embarcador** no ProSeller. Cada fase foi cuidadosamente planejada para:

- ✅ Minimizar alterações em código existente
- ✅ Garantir funcionalidade incremental
- ✅ Implementar recursos críticos de TMS (CT-e, SLA, Devoluções)
- ✅ Manter qualidade e performance
- ✅ Facilitar testes e validação
- ✅ Permitir rollback seguro entre fases
- ✅ Preparar roadmap claro para evoluções futuras

**Última atualização:** Dezembro 2024  
**Versão do documento:** 2.0 (Atualizado com CT-e, SLA, Devoluções e Roadmap)
