# 🚀 Prompt para Replicação do Sistema no Cursor + Supabase Relacional

## 📋 Visão Geral do Sistema

Preciso criar um **sistema completo de gestão comercial e força de vendas** com as seguintes características:

- **Frontend:** React + TypeScript + Tailwind CSS v4
- **Backend:** Supabase Edge Functions (Deno + Hono)
- **Banco de Dados:** Supabase PostgreSQL (Relacional)
- **Autenticação:** Supabase Auth
- **Integração:** Tiny ERP (API REST + XML)
- **UI Components:** shadcn/ui

---

## 🎯 Funcionalidades Principais

### 1. Autenticação e Autorização

- **Login/Logout** com Supabase Auth
- **Dois tipos de usuários:**
  - **Backoffice:** Acesso total ao sistema
  - **Vendedor:** Acesso limitado (apenas seus dados)
- **Sistema de permissões granulares** por funcionalidade
- **Context API** para gerenciar estado de autenticação

### 2. Dashboard em Tempo Real

- **KPIs principais:**
  - Total de vendas no período
  - Meta do mês (com progress bar)
  - Número de clientes ativos
  - Ticket médio
  - Taxa de conversão
- **Gráficos:**
  - Vendas por período (linha)
  - Vendas por vendedor (barra)
  - Vendas por status (pizza)
  - Top 10 produtos mais vendidos
- **Filtros:**
  - Período (hoje, semana, mês, trimestre, ano, customizado)
  - Vendedor (backoffice vê todos, vendedor vê apenas próprios)
  - Empresa de faturamento

### 3. Gestão de Clientes (CRUD Completo)

**Campos:**
- Dados cadastrais: razão social, nome fantasia, CNPJ, IE
- Endereço completo com **integração ViaCEP**
- Contatos: telefone, celular, email
- Dados comerciais: vendedor responsável, lista de preço, grupo/rede
- Requisitos logísticos:
  - Tipo de veículo
  - Horário de entrega
  - Observações de entrega
  - Agendamento obrigatório
  - Empilhamento máximo
  - 1 SKU por caixa
  - Observações obrigatórias
- **Status de aprovação:** análise, aprovado, reprovado
- **Situação:** ativo, inativo, excluído

**Funcionalidades:**
- Sistema de aprovação de cadastros (backoffice aprova/reprova)
- Máscaras brasileiras (CNPJ, telefone, CEP)
- Validação de CNPJ
- Busca e filtros avançados
- Importação/exportação em massa (Excel/CSV)
- Histórico de alterações

**Permissões:**
- Vendedor: cria clientes (ficam em análise), edita apenas seus clientes aprovados, visualiza apenas seus clientes
- Backoffice: aprova/reprova cadastros, edita qualquer cliente, visualiza todos

### 4. Gestão de Produtos

**Campos:**
- Código (SKU), código EAN, descrição
- Tipo de produto, marca, unidade de medida
- Preço de tabela (por lista de preço)
- Status: ativo/inativo
- NCM, origem
- Peso, dimensões

**Funcionalidades:**
- CRUD completo
- Precificação por lista de preço
- Cálculo automático de descontos
- Importação/exportação em massa

### 5. Sistema de Vendas/Pedidos (核心)

#### 5.1. Criação de Pedidos

**Dados do Pedido:**
- Número sequencial automático (PV-2025-0001)
- Data do pedido
- Cliente (dropdown com clientes aprovados)
- Vendedor responsável
- Empresa de faturamento
- Natureza de operação
- Condição de pagamento
- Forma de pagamento
- Ordem de compra do cliente
- Observações da nota fiscal (geradas automaticamente)
- Observações internas (não vão para NF)

**Itens do Pedido:**
- Produto (dropdown com busca)
- Quantidade
- Valor de tabela (automático)
- Desconto % (calculado automaticamente com base na lista de preço do cliente)
- Valor unitário final
- Subtotal
- Adicionar/remover/editar itens

**Cálculos Automáticos:**
- Subtotal dos itens
- Desconto total em R$ e %
- Valor total do pedido

**Observações da NF (Geradas Automaticamente):**
```
OC: [ordem de compra do cliente]

INSTRUÇÕES LOGÍSTICAS:
- Tipo de veículo: [tipo]
- Horário de entrega: [horário]
- [Agendamento obrigatório]
- [Empilhamento máximo: X caixas]
- [1 SKU/EAN por caixa]

OBSERVAÇÕES OBRIGATÓRIAS:
- [observação 1]
- [observação 2]
```

#### 5.2. Sistema de Rascunhos

**Funcionalidade "Salvar como Rascunho":**
- Permite salvar pedidos incompletos
- Validação flexível (não exige todos os campos)
- Status especial "Rascunho"
- Badge amarelo visual
- Filtro específico na listagem
- Botões contextuais:
  - Modo CRIAR: [Cancelar] [Salvar como Rascunho] [Enviar para Análise]
  - Modo EDITAR RASCUNHO: [Cancelar] [Salvar Alterações] [Enviar para Análise]
  - Modo EDITAR NORMAL: [Cancelar] [Salvar Alterações]

**Proteções (5 Camadas):**
1. Frontend (SalesPage): Filtra rascunhos antes de envio ao ERP
2. Serviço Auto-Send: Valida status antes de enviar
3. Serviço Sync Tiny: Lança erro se tentar enviar rascunho
4. Backend API: Retorna 400 se tentar enviar rascunho
5. Formulário: Não cria integração ERP para rascunhos

**REGRA CRÍTICA:** Pedidos com status "Rascunho" NUNCA podem ser enviados ao ERP

#### 5.3. Fluxo de Status

```
Rascunho → Em Análise → Aprovado → Em Separação → Enviado → Concluído
                ↓           ↓            ↓            ↓
            Cancelado   Cancelado    Cancelado    Cancelado
```

**Regras de Transição:**
- Vendedor cria → "Rascunho" ou "Em Análise"
- Backoffice aprova → "Aprovado" (dispara envio ao ERP)
- Após envio ao ERP → status sincronizado automaticamente
- Cancelamento pode ocorrer em qualquer etapa (com confirmação)

#### 5.4. Integração com Tiny ERP

**Envio Automático de Pedidos:**
- Disparado quando status = "Aprovado"
- Retry inteligente (configurável: 1-10 tentativas)
- Intervalo entre tentativas (1-60 minutos)
- Notificações de sucesso/falha
- Armazena ID do pedido no Tiny

**Sincronização de Status (Tripla):**

1. **Webhooks (Prioridade 1 - Tempo Real):**
   - Tiny envia notificação quando status muda
   - Atualização instantânea no sistema

2. **Polling Automático (Prioridade 2 - Backup 24h):**
   - Consulta Tiny ERP a cada 24h (configurável 1-48h)
   - Atualiza todos os pedidos enviados
   - Roda em background

3. **Sincronização Manual (Prioridade 3 - On Demand):**
   - Botão "Sincronizar Agora"
   - Disponível em múltiplos locais
   - Feedback visual de progresso

**Mapeamento de Status Tiny → Interno:**
```typescript
{
  'aberto': 'Em Análise',
  'aprovado': 'Aprovado',
  'preparando_envio': 'Aprovado',
  'faturado': 'Concluído',
  'pronto_envio': 'Em Separação',
  'enviado': 'Enviado',
  'entregue': 'Enviado',
  'cancelado': 'Cancelado',
  'nao_aprovado': 'Cancelado'
}
```

**Dados Enviados ao Tiny (Formato XML):**
```xml
<pedido>
  <pedido>
    <data_pedido>DD/MM/YYYY</data_pedido>
    <numero_pedido>PV-2025-XXXX</numero_pedido>
    <ordem_compra>OC do Cliente</ordem_compra>
    
    <cliente>
      <codigo>CODIGO_CLIENTE</codigo>
      <nome>RAZÃO SOCIAL</nome>
      <cnpj>00.000.000/0000-00</cnpj>
      <ie>ISENTO ou nº da IE</ie>
    </cliente>
    
    <itens>
      <item>
        <codigo>SKU-PRODUTO</codigo>
        <descricao>Descrição do Produto</descricao>
        <unidade>UN</unidade>
        <quantidade>10</quantidade>
        <valor_unitario>100.00</valor_unitario>
      </item>
    </itens>
    
    <valor_pedido>1000.00</valor_pedido>
    <observacoes>Observações da NF</observacoes>
    <obs_internas>Observações Internas</obs_internas>
    <natureza_operacao>5102 - Venda</natureza_operacao>
  </pedido>
</pedido>
```

**Configuração por Empresa:**
- Token de API do Tiny
- Envio automático (ativo/inativo)
- Tentativas máximas
- Intervalo entre tentativas
- Preferências (transmitir OC nas observações)

#### 5.5. Proteções contra Edição

**Pedidos Bloqueados para Edição:**
- Critério: Possui `erpPedidoId` (foi enviado ao ERP)
- Exceções: Status "Rascunho" ou "Cancelado"

**Comportamento:**
- Alert visual de aviso
- Campos desabilitados
- Botão "Editar" desabilitado com ícone de cadeado
- Permitido apenas:
  - Visualizar detalhes
  - Adicionar observações internas
  - Cancelar (com confirmação dupla)

**Alert de Pedido Bloqueado:**
```
⚠️ Pedido Enviado ao ERP
Este pedido já foi enviado ao [EmpresaX] ERP (ID: 12345) e não pode
mais ser modificado. Qualquer alteração deve ser feita diretamente no ERP.

Última sincronização: 17/12/2025 às 14:30
```

#### 5.6. Interface do Formulário

**Estrutura:**
1. Header com título, badge de status e botões de ação (topo)
2. Informações do Cliente
3. Itens do Pedido (tabela com ações)
4. Totais do Pedido
5. Detalhes do Pedido
6. Observações (NF e Internas)
7. Botões de ação duplicados (final) ← IMPORTANTE!

**Botões Duplicados (Topo e Final):**
- Mesma função `renderActionButtons()` usada duas vezes
- Melhora UX em formulários longos
- Evita rolagem desnecessária
- Garantia de consistência

**Validações:**
- Cliente obrigatório (apenas se não for rascunho)
- Natureza de operação obrigatória (apenas se não for rascunho)
- Pelo menos 1 item (apenas se não for rascunho)
- Quantidade > 0
- Valor unitário > 0

### 6. Sistema de Comissões

**Lançamento Automático:**
- Disparado quando pedido muda para "Concluído"
- Cálculo baseado em regras configuráveis:
  - % sobre valor total
  - % sobre margem
  - Valor fixo por pedido
  - Valor fixo por item
- Regras por vendedor, produto ou categoria

**Gestão:**
- Listagem de comissões
- Filtros por vendedor, período, status
- Status: pendente, pago, cancelado
- Exportação para Excel
- Relatório de comissões

### 7. Sistema de Metas

**Configuração:**
- Meta por vendedor ou equipe
- Período (mensal, trimestral, anual)
- Tipo (valor, quantidade, ticket médio)
- Alerta quando atingir % da meta

**Visualização:**
- Dashboard com progress bars
- Ranking de vendedores
- Histórico de metas
- Gráfico de evolução

### 8. Relatórios Executivos

**Relatórios Disponíveis:**
- Vendas por período
- Vendas por vendedor
- Vendas por produto
- Vendas por cliente
- Comissões por vendedor
- Atingimento de metas
- Análise de descontos
- Produtos mais vendidos
- Clientes mais lucrativos

**Funcionalidades:**
- Exportação em Excel/PDF
- Filtros avançados
- Gráficos interativos
- Agendamento de relatórios

### 9. Gestão de Cadastros Auxiliares

**Empresas de Faturamento:**
- Razão social, CNPJ, IE
- Endereço completo
- Configuração ERP (token Tiny)
- Status ativo/inativo

**Listas de Preço:**
- Nome, descrição
- Itens com preços e descontos por produto
- Vinculação a clientes

**Condições de Pagamento:**
- Nome (ex: "30/60/90 dias")
- Parcelas e dias

**Formas de Pagamento:**
- Nome (ex: "Boleto", "PIX", "Cartão")
- Tipo (à vista, prazo)

**Naturezas de Operação:**
- Código CFOP
- Descrição
- Tipo (venda, devolução, etc)

**Tipos de Produto, Marcas, Unidades de Medida:**
- CRUD simples

**Grupos/Redes:**
- Agrupamento de clientes
- Permite aplicar condições especiais

**Tipos de Veículo:**
- Para requisitos logísticos

**Categorias Conta Corrente:**
- Para controle financeiro futuro

### 10. Importação/Exportação em Massa

**Importação:**
- Formatos: Excel (.xlsx), CSV
- Entidades: clientes, produtos, preços
- Validação de dados antes de importar
- Relatório de erros e sucessos
- Atualização ou criação de registros

**Exportação:**
- Formatos: Excel, CSV, PDF
- Todas as listagens podem ser exportadas
- Exportação com filtros aplicados
- Templates disponíveis

---

## 🗄️ Estrutura do Banco de Dados (PostgreSQL)

### Schema Relacional Completo

```sql
-- ============================================
-- TABELA: usuarios
-- ============================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('backoffice', 'vendedor')),
  ativo BOOLEAN DEFAULT true,
  permissoes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_usuarios_auth_user_id ON usuarios(auth_user_id);

-- ============================================
-- TABELA: vendedores
-- ============================================
CREATE TABLE vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo VARCHAR(50) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  comissao_padrao DECIMAL(5,2) DEFAULT 0,
  meta_mensal DECIMAL(15,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendedores_codigo ON vendedores(codigo);
CREATE INDEX idx_vendedores_usuario_id ON vendedores(usuario_id);

-- ============================================
-- TABELA: empresas
-- ============================================
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  ie VARCHAR(20),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(10),
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_empresas_cnpj ON empresas(cnpj);

-- ============================================
-- TABELA: erp_config
-- ============================================
CREATE TABLE erp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  token_tiny TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  envio_automatico JSONB DEFAULT '{"ativo": false, "tentativasMaximas": 3, "intervaloTentativas": 30}',
  preferencias JSONB DEFAULT '{"transmitirOcObservacoes": true}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(empresa_id)
);

CREATE INDEX idx_erp_config_empresa_id ON erp_config(empresa_id);

-- ============================================
-- TABELA: grupos_redes
-- ============================================
CREATE TABLE grupos_redes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: tipos_veiculo
-- ============================================
CREATE TABLE tipos_veiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: listas_preco
-- ============================================
CREATE TABLE listas_preco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: clientes
-- ============================================
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  ie VARCHAR(20),
  
  -- Endereço
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(10),
  
  -- Contatos
  telefone VARCHAR(20),
  celular VARCHAR(20),
  email VARCHAR(255),
  
  -- Dados Comerciais
  vendedor_id UUID REFERENCES vendedores(id),
  lista_preco_id UUID REFERENCES listas_preco(id),
  grupo_rede_id UUID REFERENCES grupos_redes(id),
  
  -- Requisitos Logísticos
  tipo_veiculo_id UUID REFERENCES tipos_veiculo(id),
  horario_entrega VARCHAR(100),
  observacoes_entrega TEXT,
  agendamento_obrigatorio BOOLEAN DEFAULT false,
  empilhamento_maximo INTEGER,
  um_sku_por_caixa BOOLEAN DEFAULT false,
  observacoes_obrigatorias TEXT[],
  
  -- Status
  situacao VARCHAR(50) DEFAULT 'Ativo' CHECK (situacao IN ('Ativo', 'Inativo', 'Excluído')),
  status_aprovacao VARCHAR(50) DEFAULT 'analise' CHECK (status_aprovacao IN ('analise', 'aprovado', 'reprovado')),
  motivo_reprovacao TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  approved_by UUID REFERENCES usuarios(id),
  approved_at TIMESTAMP
);

CREATE INDEX idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX idx_clientes_status_aprovacao ON clientes(status_aprovacao);
CREATE INDEX idx_clientes_situacao ON clientes(situacao);

-- ============================================
-- TABELA: tipos_produto
-- ============================================
CREATE TABLE tipos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: marcas
-- ============================================
CREATE TABLE marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: unidades_medida
-- ============================================
CREATE TABLE unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla VARCHAR(10) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: produtos
-- ============================================
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  codigo_ean VARCHAR(50),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_produto_id UUID REFERENCES tipos_produto(id),
  marca_id UUID REFERENCES marcas(id),
  unidade_medida_id UUID REFERENCES unidades_medida(id),
  preco_tabela DECIMAL(15,2) DEFAULT 0,
  ncm VARCHAR(20),
  origem VARCHAR(1),
  peso_bruto DECIMAL(10,3),
  peso_liquido DECIMAL(10,3),
  largura DECIMAL(10,2),
  altura DECIMAL(10,2),
  profundidade DECIMAL(10,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_produtos_codigo ON produtos(codigo);
CREATE INDEX idx_produtos_codigo_ean ON produtos(codigo_ean);
CREATE INDEX idx_produtos_tipo_produto_id ON produtos(tipo_produto_id);

-- ============================================
-- TABELA: lista_preco_itens
-- ============================================
CREATE TABLE lista_preco_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_preco_id UUID REFERENCES listas_preco(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  preco DECIMAL(15,2) NOT NULL,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lista_preco_id, produto_id)
);

CREATE INDEX idx_lista_preco_itens_lista ON lista_preco_itens(lista_preco_id);
CREATE INDEX idx_lista_preco_itens_produto ON lista_preco_itens(produto_id);

-- ============================================
-- TABELA: condicoes_pagamento
-- ============================================
CREATE TABLE condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  parcelas JSONB DEFAULT '[]', -- [{dias: 30, percentual: 100}]
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: formas_pagamento
-- ============================================
CREATE TABLE formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) CHECK (tipo IN ('a_vista', 'a_prazo')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: naturezas_operacao
-- ============================================
CREATE TABLE naturezas_operacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfop VARCHAR(10) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABELA: vendas
-- ============================================
CREATE TABLE vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) UNIQUE NOT NULL,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Relacionamentos
  cliente_id UUID REFERENCES clientes(id),
  vendedor_id UUID REFERENCES vendedores(id),
  empresa_faturamento_id UUID REFERENCES empresas(id),
  natureza_operacao_id UUID REFERENCES naturezas_operacao(id),
  condicao_pagamento_id UUID REFERENCES condicoes_pagamento(id),
  forma_pagamento_id UUID REFERENCES formas_pagamento(id),
  
  -- Dados comerciais
  ordem_compra VARCHAR(100),
  observacoes_nota_fiscal TEXT,
  observacoes_internas TEXT,
  
  -- Valores
  valor_produtos DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  percentual_desconto DECIMAL(5,2) DEFAULT 0,
  valor_total DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'Rascunho' CHECK (status IN (
    'Rascunho', 'Em Análise', 'Aprovado', 'Em Separação', 
    'Enviado', 'Concluído', 'Cancelado'
  )),
  
  -- Integração ERP
  integracao_erp JSONB DEFAULT NULL,
  -- Estrutura do JSONB:
  -- {
  --   "erpPedidoId": "12345",
  --   "erpStatus": "aprovado",
  --   "dataEnvio": "2025-12-17T10:30:00",
  --   "dataSincronizacao": "2025-12-17T14:30:00",
  --   "tentativasEnvio": 1,
  --   "erroSincronizacao": null
  -- }
  
  -- Campos de controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  approved_by UUID REFERENCES usuarios(id),
  approved_at TIMESTAMP
);

CREATE INDEX idx_vendas_numero ON vendas(numero);
CREATE INDEX idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX idx_vendas_vendedor_id ON vendas(vendedor_id);
CREATE INDEX idx_vendas_status ON vendas(status);
CREATE INDEX idx_vendas_data_pedido ON vendas(data_pedido);
CREATE INDEX idx_vendas_erp_id ON vendas((integracao_erp->>'erpPedidoId'));

-- ============================================
-- TABELA: venda_itens
-- ============================================
CREATE TABLE venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_tabela DECIMAL(15,2) NOT NULL,
  percentual_desconto DECIMAL(5,2) DEFAULT 0,
  valor_unitario DECIMAL(15,2) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_venda_itens_venda_id ON venda_itens(venda_id);
CREATE INDEX idx_venda_itens_produto_id ON venda_itens(produto_id);

-- ============================================
-- TABELA: comissoes
-- ============================================
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID REFERENCES vendas(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES vendedores(id),
  
  valor_base DECIMAL(15,2) NOT NULL,
  percentual DECIMAL(5,2) NOT NULL,
  valor_comissao DECIMAL(15,2) NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  data_pagamento DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comissoes_venda_id ON comissoes(venda_id);
CREATE INDEX idx_comissoes_vendedor_id ON comissoes(vendedor_id);
CREATE INDEX idx_comissoes_status ON comissoes(status);

-- ============================================
-- TABELA: metas
-- ============================================
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES vendedores(id),
  
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  tipo VARCHAR(50) CHECK (tipo IN ('valor', 'quantidade', 'ticket_medio')),
  valor_meta DECIMAL(15,2) NOT NULL,
  valor_realizado DECIMAL(15,2) DEFAULT 0,
  percentual_atingido DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metas_vendedor_id ON metas(vendedor_id);
CREATE INDEX idx_metas_periodo ON metas(periodo_inicio, periodo_fim);

-- ============================================
-- TABELA: categorias_conta_corrente
-- ============================================
CREATE TABLE categorias_conta_corrente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) CHECK (tipo IN ('receita', 'despesa')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vendedores_updated_at BEFORE UPDATE ON vendedores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER venda_itens_updated_at BEFORE UPDATE ON venda_itens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comissoes_updated_at BEFORE UPDATE ON comissoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER metas_updated_at BEFORE UPDATE ON metas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

-- Políticas de exemplo (ajustar conforme necessidade)
-- Vendedores veem apenas seus próprios dados
CREATE POLICY vendedores_select_own ON vendedores
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE id = vendedores.usuario_id
    ) OR
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE tipo = 'backoffice'
    )
  );

-- Backoffice vê tudo
CREATE POLICY clientes_select_all_backoffice ON clientes
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuarios WHERE tipo = 'backoffice'
    )
  );

-- Vendedores veem apenas seus clientes
CREATE POLICY clientes_select_own ON clientes
  FOR SELECT
  USING (
    vendedor_id IN (
      SELECT id FROM vendedores WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE auth_user_id = auth.uid()
      )
    )
  );
```

---

## 🏗️ Arquitetura Backend (Supabase Edge Functions + Hono)

### Estrutura de Pastas

```
/supabase
  /functions
    /server
      index.tsx          # Main server file com Hono
      /routes
        auth.ts          # Rotas de autenticação
        usuarios.ts      # CRUD usuários
        vendedores.ts    # CRUD vendedores
        clientes.ts      # CRUD clientes
        produtos.ts      # CRUD produtos
        vendas.ts        # CRUD vendas
        empresas.ts      # CRUD empresas
        tiny.ts          # Proxy Tiny ERP
        ...
      /services
        tinyERP.ts       # Lógica de integração Tiny
        autoSend.ts      # Envio automático ao ERP
        sync.ts          # Sincronização de status
      /utils
        supabase.ts      # Cliente Supabase
        xml.ts           # Parser XML
        validators.ts    # Validadores
```

### Exemplo de Rota (vendas.ts)

```typescript
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';

const vendas = new Hono();

// Listar vendas
vendas.get('/', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data, error } = await supabase
    .from('vendas')
    .select(`
      *,
      cliente:clientes(*),
      vendedor:vendedores(*),
      empresa:empresas(*),
      itens:venda_itens(*, produto:produtos(*))
    `)
    .order('created_at', { ascending: false });
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// Criar venda
vendas.post('/', async (c) => {
  const venda = await c.req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Gerar número sequencial
  const { data: ultimaVenda } = await supabase
    .from('vendas')
    .select('numero')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  const proximoNumero = gerarProximoNumero(ultimaVenda?.numero);
  
  // Inserir venda
  const { data: vendaCriada, error: erroVenda } = await supabase
    .from('vendas')
    .insert({
      ...venda,
      numero: proximoNumero,
    })
    .select()
    .single();
  
  if (erroVenda) return c.json({ error: erroVenda.message }, 500);
  
  // Inserir itens
  const itensComVendaId = venda.itens.map(item => ({
    ...item,
    venda_id: vendaCriada.id
  }));
  
  const { error: erroItens } = await supabase
    .from('venda_itens')
    .insert(itensComVendaId);
  
  if (erroItens) return c.json({ error: erroItens.message }, 500);
  
  // Se status = "Aprovado", disparar envio ao ERP
  if (vendaCriada.status === 'Aprovado') {
    // Chamar serviço de envio automático
    await dispararEnvioERP(vendaCriada.id);
  }
  
  return c.json(vendaCriada, 201);
});

// Atualizar venda
vendas.put('/:id', async (c) => {
  const id = c.req.param('id');
  const updates = await c.req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // 🛡️ PROTEÇÃO: Não permitir atualização se foi enviado ao ERP
  const { data: vendaAtual } = await supabase
    .from('vendas')
    .select('integracao_erp, status')
    .eq('id', id)
    .single();
  
  if (vendaAtual?.integracao_erp?.erpPedidoId && 
      !['Rascunho', 'Cancelado'].includes(vendaAtual.status)) {
    return c.json({ 
      error: 'Pedido já foi enviado ao ERP e não pode ser editado' 
    }, 403);
  }
  
  // 🛡️ PROTEÇÃO: Nunca enviar rascunho ao ERP
  if (updates.status === 'Rascunho' && updates.integracao_erp?.erpPedidoId) {
    return c.json({ 
      error: 'Rascunhos não podem ter integração com ERP' 
    }, 400);
  }
  
  const { data, error } = await supabase
    .from('vendas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) return c.json({ error: error.message }, 500);
  
  // Se mudou para "Aprovado", disparar envio ao ERP
  if (updates.status === 'Aprovado' && vendaAtual.status !== 'Aprovado') {
    await dispararEnvioERP(id);
  }
  
  return c.json(data);
});

// Deletar venda
vendas.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // 🛡️ PROTEÇÃO: Não permitir exclusão se foi enviado ao ERP
  const { data: vendaAtual } = await supabase
    .from('vendas')
    .select('integracao_erp')
    .eq('id', id)
    .single();
  
  if (vendaAtual?.integracao_erp?.erpPedidoId) {
    return c.json({ 
      error: 'Pedido já foi enviado ao ERP e não pode ser excluído' 
    }, 403);
  }
  
  const { error } = await supabase
    .from('vendas')
    .delete()
    .eq('id', id);
  
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

export default vendas;
```

---

## 🎨 Frontend (React + TypeScript + Tailwind)

### Estrutura de Pastas

```
/src
  /components
    /ui                    # shadcn/ui components
    /figma                 # Componentes utilitários
    
    Dashboard.tsx
    SalesPage.tsx          # Lista de vendas
    SaleFormPage.tsx       # Criar/Editar/Visualizar venda
    ClientsPage.tsx        # Gestão de clientes
    ProductsPage.tsx       # Gestão de produtos
    CompanyERPDialog.tsx   # Configuração ERP
    ERPStatusBadge.tsx     # Badge de status ERP
    TinyERPModeIndicator.tsx
    TinyERPSyncSettings.tsx
    ...
    
  /contexts
    AuthContext.tsx        # Context de autenticação
    
  /services
    api.ts                 # Serviço de API (chamadas ao backend)
    tinyERPSync.ts         # Sincronização Tiny ERP
    erpAutoSendService.ts  # Envio automático ao ERP
    
  /utils
    formatters.ts          # Formatadores (moeda, data, CPF/CNPJ)
    validators.ts          # Validadores
    masks.ts               # Máscaras brasileiras
    
  /types
    index.ts               # Types TypeScript
    
  App.tsx                  # Componente principal
  main.tsx                 # Entry point
```

### Exemplo de Serviço API

```typescript
// /services/api.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const api = {
  // Vendas
  async getVendas() {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        cliente:clientes(*),
        vendedor:vendedores(*),
        empresa:empresas(*),
        natureza:naturezas_operacao(*),
        itens:venda_itens(*, produto:produtos(*))
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getVenda(id: string) {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        cliente:clientes(*),
        vendedor:vendedores(*),
        empresa:empresas(*),
        natureza:naturezas_operacao(*),
        condicao_pagamento:condicoes_pagamento(*),
        forma_pagamento:formas_pagamento(*),
        itens:venda_itens(*, produto:produtos(*))
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createVenda(venda: any) {
    // Chamar backend Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/vendas`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(venda),
      }
    );
    
    if (!response.ok) throw new Error('Erro ao criar venda');
    return response.json();
  },
  
  async updateVenda(id: string, updates: any) {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/vendas/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(updates),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar venda');
    }
    return response.json();
  },
  
  // Tiny ERP
  async enviarPedidoAoTiny(vendaId: string) {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/tiny/pedido`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ vendaId }),
      }
    );
    
    if (!response.ok) throw new Error('Erro ao enviar pedido ao Tiny');
    return response.json();
  },
  
  async consultarStatusTiny(vendaId: string) {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/tiny/status/${vendaId}`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!response.ok) throw new Error('Erro ao consultar status');
    return response.json();
  },
  
  // ... outros métodos para clientes, produtos, etc
};
```

---

## 🎯 Requisitos Específicos de UX/UI

### 1. Layout e Navegação

**Sidebar:**
- Logo no topo
- Itens de menu com ícones (lucide-react)
- Highlight do item ativo
- Colapsar em mobile (hamburguer)

**Header:**
- Título da página
- Breadcrumbs quando aplicável
- Botões de ação principais
- Avatar do usuário com dropdown (perfil, configurações, sair)

**Páginas de Listagem:**
- Tabela responsiva com ordenação
- Filtros no topo (status, período, vendedor, etc)
- Busca global
- Paginação
- Ações por linha (visualizar, editar, excluir)
- Botões de ação em massa
- Exportar para Excel/CSV

### 2. Formulários

**Campos:**
- Labels claros
- Placeholders informativos
- Validação em tempo real
- Mensagens de erro específicas
- Estados de loading
- Máscaras brasileiras (CNPJ, telefone, CEP, moeda)

**Botões:**
- Primário: ação principal (salvar, enviar)
- Secundário/Outline: ação alternativa (salvar rascunho)
- Destructive: ação perigosa (cancelar, excluir)
- Ícones + texto
- Estados de loading (spinner)

**Botões Duplicados em Formulários Longos:**
- Mesmos botões no topo E no final
- Função helper `renderActionButtons()`
- Espaçamento adequado (pt-6)
- Separador visual (border-t)

### 3. Feedback Visual

**Toasts:**
- Sucesso: verde com ✅
- Erro: vermelho com ❌
- Info: azul com ℹ️
- Warning: amarelo com ⚠️
- Duração configurável
- Descrição adicional quando necessário

**Badges de Status:**
- Rascunho: amarelo com ícone FileText
- Em Análise: azul com ícone Clock
- Aprovado: verde com ícone CheckCircle
- Cancelado: vermelho com ícone XCircle
- Concluído: verde escuro com ícone Package

**Loading States:**
- Skeleton loaders em tabelas
- Spinners em botões
- Overlay em cards
- Disable de campos durante loading

### 4. Responsividade

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Adaptações:**
- Tabelas viram cards em mobile
- Sidebar vira drawer
- Formulários: 1 coluna em mobile, 2-3 em desktop
- Gráficos ajustam tamanho

### 5. Máscaras Brasileiras

```typescript
// CNPJ: 00.000.000/0000-00
// CPF: 000.000.000-00
// Telefone: (00) 0000-0000
// Celular: (00) 00000-0000
// CEP: 00000-000
// Moeda: R$ 1.234,56
```

### 6. Integração ViaCEP

```typescript
async function buscarCEP(cep: string) {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const data = await response.json();
  
  if (data.erro) {
    toast.error('CEP não encontrado');
    return;
  }
  
  setFormData({
    ...formData,
    logradouro: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    uf: data.uf,
  });
}
```

---

## 🔐 Sistema de Permissões

### Estrutura de Permissões

```typescript
interface Permissoes {
  // Dashboard
  'dashboard.visualizar': boolean;
  
  // Vendas
  'vendas.visualizar': boolean;
  'vendas.criar': boolean;
  'vendas.editar': boolean;
  'vendas.excluir': boolean;
  'vendas.aprovar': boolean;
  'vendas.enviar_erp': boolean;
  
  // Clientes
  'clientes.visualizar': boolean;
  'clientes.criar': boolean;
  'clientes.editar': boolean;
  'clientes.excluir': boolean;
  'clientes.aprovar': boolean;
  
  // Produtos
  'produtos.visualizar': boolean;
  'produtos.criar': boolean;
  'produtos.editar': boolean;
  'produtos.excluir': boolean;
  
  // Comissões
  'comissoes.visualizar': boolean;
  'comissoes.editar': boolean;
  'comissoes.pagar': boolean;
  
  // Configurações
  'config.visualizar': boolean;
  'config.editar': boolean;
  'config.erp': boolean;
  
  // Relatórios
  'relatorios.vendas': boolean;
  'relatorios.comissoes': boolean;
  'relatorios.metas': boolean;
}
```

### Permissões Padrão

**Backoffice:**
```typescript
{
  // Todas as permissões = true
}
```

**Vendedor:**
```typescript
{
  'dashboard.visualizar': true,
  'vendas.visualizar': true,  // apenas suas vendas
  'vendas.criar': true,
  'vendas.editar': true,      // apenas suas vendas não enviadas ao ERP
  'clientes.visualizar': true, // apenas seus clientes
  'clientes.criar': true,
  'clientes.editar': true,     // apenas seus clientes aprovados
  'produtos.visualizar': true,
  'comissoes.visualizar': true, // apenas suas comissões
  'relatorios.vendas': true,    // apenas seus dados
  
  // Resto = false
}
```

### Hook de Permissões

```typescript
const { temPermissao } = useAuth();

// Uso
if (temPermissao('vendas.aprovar')) {
  // Mostrar botão de aprovar
}
```

---

## 🚨 Regras de Negócio Críticas

### 1. Rascunhos NUNCA Vão para o ERP

**5 Camadas de Proteção:**

```typescript
// CAMADA 1: Frontend - SalesPage
const vendasParaEnvio = vendas.filter(v => v.status !== 'Rascunho');

// CAMADA 2: Serviço Auto-Send
if (venda.status === 'Rascunho') {
  console.warn('🛡️ BLOQUEADO: Tentativa de envio de rascunho');
  return false;
}

// CAMADA 3: Serviço Sync Tiny
if (venda.status === 'Rascunho') {
  throw new Error('ERRO CRÍTICO: Rascunhos não podem ser enviados ao ERP');
}

// CAMADA 4: Backend API
if (venda.status === 'Rascunho') {
  return c.json({ error: 'Rascunhos não podem ser enviados ao ERP' }, 400);
}

// CAMADA 5: Formulário
const vendaData = {
  ...formData,
  status: salvarComoRascunho ? 'Rascunho' : 'Em Análise',
  integracaoERP: salvarComoRascunho ? null : formData.integracaoERP,
};
```

### 2. Pedidos Enviados ao ERP São Bloqueados

```typescript
const pedidoBloqueado = useMemo(() => {
  // Se tem erpPedidoId E status não é Rascunho/Cancelado
  return !!(
    formData.integracaoERP?.erpPedidoId &&
    !['Rascunho', 'Cancelado'].includes(formData.status)
  );
}, [formData]);

// Desabilitar campos
<Input disabled={pedidoBloqueado || isReadOnly} />

// Mostrar alerta
{pedidoBloqueado && (
  <Alert variant="destructive">
    <Lock className="h-4 w-4" />
    <AlertTitle>Pedido Bloqueado para Edição</AlertTitle>
    <AlertDescription>
      Este pedido já foi enviado ao ERP (ID: {formData.integracaoERP?.erpPedidoId})
      e não pode mais ser modificado.
    </AlertDescription>
  </Alert>
)}
```

### 3. Vendedores Só Veem Seus Dados

```typescript
// No backend
if (usuario.tipo === 'vendedor') {
  query = query.eq('vendedor_id', usuario.vendedor_id);
}

// RLS no Postgres
CREATE POLICY vendedor_own_data ON vendas
  FOR SELECT
  USING (
    vendedor_id IN (
      SELECT id FROM vendedores WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE auth_user_id = auth.uid()
      )
    )
  );
```

### 4. Aprovação de Clientes

```typescript
// Cliente criado por vendedor
status_aprovacao = 'analise'

// Backoffice aprova
status_aprovacao = 'aprovado'  // Pode ser usado em pedidos
status_aprovacao = 'reprovado' // Não pode ser usado

// Apenas clientes aprovados aparecem no dropdown de vendas
const clientesDisponiveis = clientes.filter(c => 
  c.statusAprovacao === 'aprovado' && 
  c.situacao === 'Ativo'
);
```

### 5. Geração de Número Sequencial

```typescript
function gerarNumeroVenda(ultimoNumero?: string): string {
  const ano = new Date().getFullYear();
  
  if (!ultimoNumero) {
    return `PV-${ano}-0001`;
  }
  
  // Extrair número do último pedido
  const match = ultimoNumero.match(/PV-(\d{4})-(\d{4})/);
  if (!match) return `PV-${ano}-0001`;
  
  const [, anoUltimo, numeroUltimo] = match;
  
  // Se mudou o ano, resetar contador
  if (parseInt(anoUltimo) !== ano) {
    return `PV-${ano}-0001`;
  }
  
  // Incrementar número
  const proximoNumero = (parseInt(numeroUltimo) + 1)
    .toString()
    .padStart(4, '0');
  
  return `PV-${ano}-${proximoNumero}`;
}
```

### 6. Cálculo de Desconto Automático

```typescript
function calcularDesconto(
  produtoId: string,
  clienteId: string,
  quantidade: number
): {
  valorTabela: number;
  percentualDesconto: number;
  valorUnitario: number;
  subtotal: number;
} {
  // Buscar produto
  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) throw new Error('Produto não encontrado');
  
  // Buscar cliente
  const cliente = clientes.find(c => c.id === clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');
  
  // Buscar lista de preço do cliente
  const listaPrecoCLiente = cliente.lista_preco_id;
  if (!listaPrecoCliente) {
    // Usar preço de tabela padrão
    return {
      valorTabela: produto.preco_tabela,
      percentualDesconto: 0,
      valorUnitario: produto.preco_tabela,
      subtotal: produto.preco_tabela * quantidade,
    };
  }
  
  // Buscar item da lista de preço
  const itemListaPreco = await supabase
    .from('lista_preco_itens')
    .select('*')
    .eq('lista_preco_id', listaPrecoCliente)
    .eq('produto_id', produtoId)
    .single();
  
  if (!itemListaPreco.data) {
    // Produto não está na lista de preço, usar preço padrão
    return {
      valorTabela: produto.preco_tabela,
      percentualDesconto: 0,
      valorUnitario: produto.preco_tabela,
      subtotal: produto.preco_tabela * quantidade,
    };
  }
  
  // Calcular com desconto da lista
  const valorTabela = produto.preco_tabela;
  const percentualDesconto = itemListaPreco.data.desconto_percentual;
  const valorUnitario = itemListaPreco.data.preco;
  const subtotal = valorUnitario * quantidade;
  
  return {
    valorTabela,
    percentualDesconto,
    valorUnitario,
    subtotal,
  };
}
```

---

## 📦 Bibliotecas e Dependências

### Frontend

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.39.0",
    
    "lucide-react": "latest",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "sonner": "^1.3.0",
    
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-alert-dialog": "latest",
    
    "tailwindcss": "^4.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### Backend (Deno)

```typescript
// Imports diretos via npm: no deno.json ou import maps
import { Hono } from 'npm:hono@latest';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
```

---

## 🔧 Configuração e Variáveis de Ambiente

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...
```

### Backend (Supabase Secrets)

```bash
# Configurar via Supabase CLI ou Dashboard
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...
```

---

## 🎬 Fluxo de Implementação Sugerido

### Fase 1: Setup Inicial
1. Criar projeto Supabase
2. Executar schema SQL completo
3. Configurar autenticação
4. Setup Edge Functions

### Fase 2: Autenticação e Base
1. Implementar Context API de autenticação
2. Tela de login
3. Sistema de permissões
4. Layout base (sidebar, header)

### Fase 3: Cadastros Básicos
1. Empresas
2. Vendedores
3. Produtos (sem lista de preço ainda)
4. Cadastros auxiliares

### Fase 4: Gestão de Clientes
1. CRUD completo
2. Integração ViaCEP
3. Sistema de aprovação
4. Importação/exportação

### Fase 5: Listas de Preço
1. CRUD listas
2. Itens da lista
3. Vinculação a clientes

### Fase 6: Sistema de Vendas (核心)
1. Formulário básico
2. Adição de itens
3. Cálculos automáticos
4. Sistema de rascunhos
5. Proteções e validações

### Fase 7: Integração Tiny ERP
1. Configuração por empresa
2. Envio de pedidos
3. Consulta de status
4. Sincronização (polling)
5. Webhooks (se disponível)

### Fase 8: Dashboard e Relatórios
1. KPIs principais
2. Gráficos
3. Filtros
4. Relatórios executivos

### Fase 9: Comissões e Metas
1. Lançamento automático
2. Gestão de comissões
3. Sistema de metas
4. Acompanhamento

### Fase 10: Refinamentos
1. Importação/exportação massa
2. Notificações
3. Histórico de alterações
4. Otimizações de performance

---

## ✅ Checklist de Implementação

### Backend
- [ ] Schema PostgreSQL criado
- [ ] RLS configurado
- [ ] Triggers de updated_at
- [ ] Edge Functions estruturadas
- [ ] Rotas CRUD todas implementadas
- [ ] Integração Tiny ERP funcional
- [ ] Proteções contra rascunhos (5 camadas)
- [ ] Proteções contra edição de pedidos enviados
- [ ] Envio automático ao ERP
- [ ] Sincronização de status (polling)
- [ ] Webhooks (se disponível)

### Frontend
- [ ] Autenticação completa
- [ ] Sistema de permissões
- [ ] Layout responsivo
- [ ] Dashboard com gráficos
- [ ] CRUD Clientes completo
- [ ] Sistema de aprovação de clientes
- [ ] Integração ViaCEP
- [ ] CRUD Produtos completo
- [ ] Listas de preço funcionais
- [ ] Formulário de vendas completo
- [ ] Sistema de rascunhos funcional
- [ ] Botões duplicados (topo/final)
- [ ] Proteções visuais (pedidos bloqueados)
- [ ] Badges de status
- [ ] Máscaras brasileiras
- [ ] Validações em tempo real
- [ ] Toasts de feedback
- [ ] Configuração ERP por empresa
- [ ] Sincronização manual de status
- [ ] Comissões
- [ ] Metas
- [ ] Relatórios
- [ ] Importação/exportação massa

### UX/UI
- [ ] Responsivo em todos os breakpoints
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Confirmações para ações destrutivas
- [ ] Breadcrumbs
- [ ] Tooltips informativos
- [ ] Acessibilidade (aria-labels, etc)

---

## 🚀 Prompt Final para o Cursor

Quero que você implemente este sistema EXATAMENTE como descrito acima, com ATENÇÃO ESPECIAL para:

1. **Banco de Dados Relacional no Supabase (PostgreSQL)**
   - Execute todo o schema SQL fornecido
   - Configure RLS corretamente
   - Use relacionamentos entre tabelas

2. **Sistema de Rascunhos com 5 Camadas de Proteção**
   - Implemente TODAS as 5 camadas
   - Adicione logs em cada camada
   - Garanta que é IMPOSSÍVEL enviar rascunho ao ERP

3. **Botões Duplicados (Topo e Final)**
   - Use função helper `renderActionButtons()`
   - Aplique em TODOS os formulários longos
   - Mantenha consistência visual

4. **Integração Tiny ERP Completa**
   - Envio automático com retry
   - Sincronização tripla (webhook + polling + manual)
   - Mapeamento correto de status
   - Formato XML correto

5. **Proteções de Edição de Pedidos Enviados**
   - Bloqueio total de edição
   - Alerts visuais
   - Exceções apenas para observações internas

6. **Sistema de Permissões Granulares**
   - Vendedor vê apenas seus dados
   - Backoffice vê tudo
   - Validações no frontend E backend

7. **UX/UI Impecável**
   - Máscaras brasileiras
   - Integração ViaCEP
   - Toasts de feedback
   - Loading states
   - Responsividade total

Por favor, comece pela Fase 1 (Setup Inicial) e siga a ordem sugerida. Confirme cada fase antes de prosseguir para a próxima.

**IMPORTANTE:** Não use KV Store! Use apenas tabelas relacionais no PostgreSQL do Supabase.

Está pronto para começar?
