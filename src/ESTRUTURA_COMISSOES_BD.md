# 📊 Estrutura de Dados de Comissões para Banco de Dados (OTIMIZADA)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Filosofia da Estrutura](#filosofia-da-estrutura)
3. [Tabelas](#tabelas)
4. [Relacionamentos](#relacionamentos)
5. [Enums e Status](#enums-e-status)
6. [Regras de Negócio](#regras-de-negócio)
7. [Queries Importantes](#queries-importantes)
8. [Índices Recomendados](#índices-recomendados)
9. [Triggers e Procedures](#triggers-e-procedures)

---

## 🎯 Visão Geral

O sistema de comissões é estruturado em **relatórios periódicos** (mensais ou anuais) que **agregam lançamentos independentes**:

### Estrutura de Dados
- **`relatorios_comissoes`** - Tabela leve com metadados e totalizadores do período
- **`comissoes_vendas`** - Lançamentos de comissões por venda (editáveis)
- **`lancamentos_manuais`** - Créditos e débitos manuais (editáveis)
- **`pagamentos_comissoes`** - Histórico de pagamentos (editáveis)

### Principais Recursos
✅ **Lançamentos editáveis** - Backoffice pode transferir entre períodos  
✅ **Saldo transportado** - Saldo devedor passa automaticamente para próximo período  
✅ **Cálculo em tempo real** - Totalizadores calculados via SUM/COUNT quando necessário  
✅ **Performance otimizada** - Totais finais armazenados para evitar recálculos constantes  
✅ **Auditoria completa** - Rastreamento de criação e edição  

---

## 🏗️ Filosofia da Estrutura

### ❌ Antiga Estrutura (Redundante)
```
relatorios_comissoes {
  vendedorNome ← desnormalizado
  totalVendas ← SUM redundante
  quantidadeVendas ← COUNT redundante
  totalComissoes ← SUM redundante
  totalCreditos ← SUM redundante
  totalDebitos ← SUM redundante
  vendas[] ← array embutido
  lancamentos[] ← array embutido
  pagamentos[] ← array embutido
}
```

### ✅ Nova Estrutura (Otimizada)
```
relatorios_comissoes {
  // Apenas metadados e totalizadores finais
  status, datas, saldoAnterior
  valorLiquido, totalPago, saldoDevedor
}

comissoes_vendas {
  periodo ← FK lógica para relatório
  editável e transferível
}

lancamentos_manuais {
  periodo ← FK lógica para relatório
  editável e transferível
}

pagamentos_comissoes {
  periodo ← FK lógica para relatório
  editável e transferível
}
```

**Vantagens:**
- ✅ Lançamentos independentes e editáveis
- ✅ Transferência entre períodos sem complexidade
- ✅ Cálculos em tempo real quando necessário
- ✅ Totais finais armazenados para performance

---

## 📊 Tabelas

### 1. `relatorios_comissoes` (Tabela de Metadados)

**Função:** Armazenar status, controle de fechamento e totalizadores finais do período.

```sql
CREATE TABLE relatorios_comissoes (
  id VARCHAR(50) PRIMARY KEY,
  vendedor_id VARCHAR(50) NOT NULL,
  periodo VARCHAR(7) NOT NULL, -- Formato: "2025-10"
  tipo_periodo VARCHAR(10) NOT NULL, -- "mensal" ou "anual"
  
  -- Estado e controle
  status VARCHAR(20) NOT NULL DEFAULT 'aberto', -- "aberto", "fechado", "pago"
  data_geracao TIMESTAMP NOT NULL,
  data_fechamento TIMESTAMP,
  data_pagamento TIMESTAMP,
  
  -- Saldo anterior transportado (NOVO)
  saldo_anterior DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Totalizadores finais (armazenados para performance)
  valor_liquido DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_pago DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_devedor DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Metadados
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  
  -- Constraints
  CONSTRAINT chk_tipo_periodo CHECK (tipo_periodo IN ('mensal', 'anual')),
  CONSTRAINT chk_status CHECK (status IN ('aberto', 'fechado', 'pago')),
  CONSTRAINT chk_saldo_devedor CHECK (saldo_devedor = valor_liquido - total_pago),
  CONSTRAINT chk_total_pago_valido CHECK (total_pago <= valor_liquido + saldo_anterior),
  
  -- Índices
  UNIQUE KEY uk_vendedor_periodo (vendedor_id, periodo),
  INDEX idx_status (status),
  INDEX idx_data_geracao (data_geracao DESC),
  INDEX idx_periodo (periodo)
);
```

**Campos Removidos (calculados em tempo real):**
- ❌ `vendedor_nome` → JOIN com `vendedores`
- ❌ `total_vendas` → `SUM(comissoes_vendas.valor_total_venda WHERE periodo)`
- ❌ `quantidade_vendas` → `COUNT(comissoes_vendas WHERE periodo)`
- ❌ `total_comissoes` → `SUM(comissoes_vendas.valor_comissao WHERE periodo)`
- ❌ `total_creditos` → `SUM(lancamentos_manuais.valor WHERE periodo AND tipo='credito')`
- ❌ `total_debitos` → `SUM(lancamentos_manuais.valor WHERE periodo AND tipo='debito')`

---

### 2. `comissoes_vendas` (Comissões por Venda - EDITÁVEL)

**Função:** Registrar cada venda que gerou comissão. **Editável por backoffice**.

```sql
CREATE TABLE comissoes_vendas (
  id VARCHAR(50) PRIMARY KEY,
  venda_id VARCHAR(50) NOT NULL,
  vendedor_id VARCHAR(50) NOT NULL,
  periodo VARCHAR(7) NOT NULL, -- ← NOVO: Referência ao período (editável)
  
  -- Dados da venda
  oc_cliente VARCHAR(100),
  cliente_id VARCHAR(50) NOT NULL,
  cliente_nome VARCHAR(200) NOT NULL, -- Desnormalizado para histórico
  data_venda DATE NOT NULL,
  valor_total_venda DECIMAL(15,2) NOT NULL,
  percentual_comissao DECIMAL(5,2) NOT NULL,
  valor_comissao DECIMAL(15,2) NOT NULL,
  
  -- Auditoria da regra aplicada
  regra_aplicada VARCHAR(50) NOT NULL,
  lista_preco_id VARCHAR(50),
  lista_preco_nome VARCHAR(200),
  desconto_aplicado DECIMAL(5,2),
  faixa_desconto_id VARCHAR(50),
  observacoes TEXT,
  
  -- Auditoria de criação e edição (NOVO)
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  editado_por VARCHAR(100),
  editado_em TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (lista_preco_id) REFERENCES listas_precos(id),
  -- Período é FK lógica (não física) para permitir edição
  
  -- Constraints
  CONSTRAINT chk_regra_aplicada CHECK (
    regra_aplicada IN ('aliquota_fixa_vendedor', 'lista_preco_fixa', 'lista_preco_faixas')
  ),
  CONSTRAINT chk_percentual_comissao CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
  CONSTRAINT chk_valor_comissao CHECK (valor_comissao >= 0),
  
  -- Índices
  INDEX idx_vendedor_periodo (vendedor_id, periodo),
  INDEX idx_periodo (periodo),
  INDEX idx_venda (venda_id),
  INDEX idx_data_venda (data_venda),
  INDEX idx_cliente (cliente_id)
);
```

**Novidades:**
- ✅ Campo `periodo` editável permite transferência entre períodos
- ✅ Auditoria de edição (`editado_por`, `editado_em`)
- ✅ Não há FK física para período (permite flexibilidade)

---

### 3. `lancamentos_manuais_comissoes` (Créditos/Débitos - EDITÁVEL)

**Função:** Registrar ajustes manuais. **Editável por backoffice**.

```sql
CREATE TABLE lancamentos_manuais_comissoes (
  id VARCHAR(50) PRIMARY KEY,
  vendedor_id VARCHAR(50) NOT NULL, -- ← NOVO: Facilita queries
  periodo VARCHAR(7) NOT NULL, -- ← NOVO: Referência ao período (editável)
  
  -- Dados do lançamento
  data DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL, -- "credito" ou "debito"
  valor DECIMAL(15,2) NOT NULL,
  descricao TEXT NOT NULL,
  
  -- Auditoria de criação e edição (NOVO)
  criado_por VARCHAR(100) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  editado_por VARCHAR(100),
  editado_em TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  -- Período é FK lógica (não física) para permitir edição
  
  -- Constraints
  CONSTRAINT chk_tipo CHECK (tipo IN ('credito', 'debito')),
  CONSTRAINT chk_valor CHECK (valor > 0),
  
  -- Índices
  INDEX idx_vendedor_periodo (vendedor_id, periodo),
  INDEX idx_periodo (periodo),
  INDEX idx_tipo (tipo),
  INDEX idx_data (data)
);
```

**Novidades:**
- ✅ Campo `vendedor_id` para facilitar queries
- ✅ Campo `periodo` editável permite transferência
- ✅ Auditoria de edição

---

### 4. `pagamentos_comissoes` (Histórico de Pagamentos - EDITÁVEL)

**Função:** Registrar pagamentos realizados. **Editável por backoffice**.

```sql
CREATE TABLE pagamentos_comissoes (
  id VARCHAR(50) PRIMARY KEY,
  vendedor_id VARCHAR(50) NOT NULL, -- ← NOVO: Facilita queries
  periodo VARCHAR(7) NOT NULL, -- ← NOVO: Referência ao período (editável)
  
  -- Dados do pagamento
  data DATE NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  forma_pagamento VARCHAR(100) NOT NULL,
  comprovante VARCHAR(200),
  observacoes TEXT,
  
  -- Auditoria de criação e edição (NOVO)
  realizado_por VARCHAR(100) NOT NULL,
  realizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  editado_por VARCHAR(100),
  editado_em TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id),
  -- Período é FK lógica (não física) para permitir edição
  
  -- Constraints
  CONSTRAINT chk_valor CHECK (valor > 0),
  
  -- Índices
  INDEX idx_vendedor_periodo (vendedor_id, periodo),
  INDEX idx_periodo (periodo),
  INDEX idx_data (data DESC),
  INDEX idx_forma_pagamento (forma_pagamento)
);
```

**Novidades:**
- ✅ Campo `vendedor_id` para facilitar queries
- ✅ Campo `periodo` editável permite transferência
- ✅ Auditoria de edição

---

## 🔗 Relacionamentos

```
vendedores (1) ──────── (N) relatorios_comissoes
vendedores (1) ──────── (N) comissoes_vendas (via periodo)
vendedores (1) ──────── (N) lancamentos_manuais_comissoes (via periodo)
vendedores (1) ──────── (N) pagamentos_comissoes (via periodo)

vendas (1) ──────── (1) comissoes_vendas
clientes (1) ──────── (N) comissoes_vendas
listas_precos (1) ──────── (N) comissoes_vendas

-- Relacionamento lógico (não FK física):
relatorios_comissoes.periodo ←→ comissoes_vendas.periodo
relatorios_comissoes.periodo ←→ lancamentos_manuais_comissoes.periodo
relatorios_comissoes.periodo ←→ pagamentos_comissoes.periodo
```

### Cardinalidade
- Um vendedor tem **N relatórios** (um por período)
- Um vendedor tem **N lançamentos** vinculados via `periodo`
- Um período agrega **N lançamentos** (calculados via WHERE)
- Lançamentos são **editáveis e transferíveis** entre períodos

---

## 📌 Enums e Status

### Status do Período (`status`)
```typescript
type StatusPeriodo = "aberto" | "fechado" | "pago";
```

| Status | Descrição | Pode Editar Lançamentos? | Próximo Status |
|--------|-----------|--------------------------|----------------|
| `aberto` | Período em andamento, recebe novas vendas | ✅ Sim | `fechado` |
| `fechado` | Período encerrado, aguardando pagamento | ⚠️ Apenas backoffice | `pago` |
| `pago` | Comissão totalmente quitada (saldo = 0) | ⚠️ Apenas backoffice | - |

### Tipo de Lançamento (`tipo`)
```typescript
type TipoLancamentoManual = "credito" | "debito";
```

- **credito**: Adiciona valor ao relatório (bonificações, premiações)
- **debito**: Subtrai valor do relatório (descontos, vale transporte)

### Regra de Comissão (`regra_aplicada`)
```typescript
type RegraComissao = 
  | "aliquota_fixa_vendedor"  // Percentual fixo configurado no vendedor
  | "lista_preco_fixa"        // Lista de preço com % fixo
  | "lista_preco_faixas";     // Lista com faixas progressivas de desconto
```

---

## 💼 Regras de Negócio

### 1. Cálculo de Valores

#### Valor Líquido do Período
```sql
valor_liquido = (
  SUM(comissoes_vendas.valor_comissao WHERE periodo) +
  SUM(lancamentos_manuais.valor WHERE periodo AND tipo='credito') -
  SUM(lancamentos_manuais.valor WHERE periodo AND tipo='debito') +
  saldo_anterior
)
```

#### Saldo Devedor
```sql
saldo_devedor = valor_liquido - total_pago
```

#### Transporte de Saldo
Quando um período é fechado com `saldo_devedor > 0`, esse valor é transportado para o `saldo_anterior` do próximo período:

```sql
-- Ao criar novo período
INSERT INTO relatorios_comissoes (
  vendedor_id,
  periodo,
  saldo_anterior,
  ...
)
SELECT 
  vendedor_id,
  periodo_seguinte,
  saldo_devedor, -- ← Saldo do período anterior
  ...
FROM relatorios_comissoes
WHERE periodo = periodo_atual;
```

### 2. Edição e Transferência de Lançamentos

#### Transferir Comissão de Venda entre Períodos
```sql
-- Backoffice transfere comissão de Out/25 para Nov/25
UPDATE comissoes_vendas
SET 
  periodo = '2025-11',
  editado_por = 'usuario@empresa.com',
  editado_em = NOW()
WHERE id = 'CV-001';

-- Trigger recalcula automaticamente ambos os períodos
```

#### Transferir Lançamento Manual entre Períodos
```sql
UPDATE lancamentos_manuais_comissoes
SET 
  periodo = '2025-11',
  editado_por = 'usuario@empresa.com',
  editado_em = NOW()
WHERE id = 'LC-001';
```

#### Transferir Pagamento entre Períodos
```sql
UPDATE pagamentos_comissoes
SET 
  periodo = '2025-11',
  editado_por = 'usuario@empresa.com',
  editado_em = NOW()
WHERE id = 'PG-001';
```

### 3. Permissões de Edição

```typescript
// Vendedor: Somente visualização
if (userRole === 'vendedor') {
  canEdit = false;
  canView = vendedorId === currentUserId;
}

// Backoffice: Edição completa
if (userRole === 'backoffice') {
  canEdit = true;
  canView = true;
  canTransferBetweenPeriods = true;
}
```

### 4. Fechamento de Período

```sql
-- Ao fechar um período
UPDATE relatorios_comissoes
SET 
  status = 'fechado',
  data_fechamento = NOW(),
  valor_liquido = (SELECT calcular_valor_liquido(periodo, vendedor_id)),
  saldo_devedor = valor_liquido - total_pago
WHERE id = 'REL-2025-10-001';

-- Se houver saldo devedor, criar próximo período com saldo anterior
IF (SELECT saldo_devedor FROM relatorios_comissoes WHERE id = 'REL-2025-10-001') > 0 THEN
  INSERT INTO relatorios_comissoes (
    vendedor_id,
    periodo,
    saldo_anterior,
    status
  )
  SELECT 
    vendedor_id,
    '2025-11',
    saldo_devedor,
    'aberto'
  FROM relatorios_comissoes
  WHERE id = 'REL-2025-10-001';
END IF;
```

---

## 🔍 Queries Importantes

### 1. Buscar Relatório Completo (com cálculos)
```sql
-- Relatório com todos os lançamentos e totalizadores calculados
SELECT 
  r.*,
  v.nome as vendedor_nome,
  v.email as vendedor_email,
  v.iniciais as vendedor_iniciais,
  
  -- Totalizadores calculados
  COALESCE(SUM(CASE WHEN cv.periodo = r.periodo THEN cv.valor_total_venda END), 0) as total_vendas,
  COUNT(DISTINCT CASE WHEN cv.periodo = r.periodo THEN cv.id END) as quantidade_vendas,
  COALESCE(SUM(CASE WHEN cv.periodo = r.periodo THEN cv.valor_comissao END), 0) as total_comissoes,
  COALESCE(SUM(CASE WHEN lm.periodo = r.periodo AND lm.tipo = 'credito' THEN lm.valor END), 0) as total_creditos,
  COALESCE(SUM(CASE WHEN lm.periodo = r.periodo AND lm.tipo = 'debito' THEN lm.valor END), 0) as total_debitos
  
FROM relatorios_comissoes r
LEFT JOIN vendedores v ON r.vendedor_id = v.id
LEFT JOIN comissoes_vendas cv ON cv.vendedor_id = r.vendedor_id
LEFT JOIN lancamentos_manuais_comissoes lm ON lm.vendedor_id = r.vendedor_id
WHERE r.id = ?
GROUP BY r.id;
```

### 2. Listar Lançamentos do Período
```sql
-- Buscar todas as comissões de vendas do período
SELECT * FROM comissoes_vendas
WHERE vendedor_id = ? AND periodo = ?
ORDER BY data_venda DESC;

-- Buscar lançamentos manuais
SELECT * FROM lancamentos_manuais_comissoes
WHERE vendedor_id = ? AND periodo = ?
ORDER BY data DESC;

-- Buscar pagamentos
SELECT * FROM pagamentos_comissoes
WHERE vendedor_id = ? AND periodo = ?
ORDER BY data DESC;
```

### 3. Calcular Totalizadores do Período
```sql
-- Function para calcular valor líquido
DELIMITER $$

CREATE FUNCTION calcular_valor_liquido(
  p_periodo VARCHAR(7),
  p_vendedor_id VARCHAR(50)
) RETURNS DECIMAL(15,2)
DETERMINISTIC
BEGIN
  DECLARE v_total_comissoes DECIMAL(15,2);
  DECLARE v_total_creditos DECIMAL(15,2);
  DECLARE v_total_debitos DECIMAL(15,2);
  DECLARE v_saldo_anterior DECIMAL(15,2);
  
  -- Total de comissões
  SELECT COALESCE(SUM(valor_comissao), 0) INTO v_total_comissoes
  FROM comissoes_vendas
  WHERE periodo = p_periodo AND vendedor_id = p_vendedor_id;
  
  -- Total de créditos
  SELECT COALESCE(SUM(valor), 0) INTO v_total_creditos
  FROM lancamentos_manuais_comissoes
  WHERE periodo = p_periodo AND vendedor_id = p_vendedor_id AND tipo = 'credito';
  
  -- Total de débitos
  SELECT COALESCE(SUM(valor), 0) INTO v_total_debitos
  FROM lancamentos_manuais_comissoes
  WHERE periodo = p_periodo AND vendedor_id = p_vendedor_id AND tipo = 'debito';
  
  -- Saldo anterior
  SELECT COALESCE(saldo_anterior, 0) INTO v_saldo_anterior
  FROM relatorios_comissoes
  WHERE periodo = p_periodo AND vendedor_id = p_vendedor_id;
  
  RETURN v_total_comissoes + v_total_creditos - v_total_debitos + v_saldo_anterior;
END$$

DELIMITER ;
```

### 4. Buscar Períodos com Saldo Transportado
```sql
-- Períodos com saldo transportado para o seguinte
SELECT 
  r1.periodo as periodo_origem,
  r1.saldo_devedor as saldo_transportado,
  r2.periodo as periodo_destino,
  r2.saldo_anterior as saldo_recebido,
  v.nome as vendedor_nome
FROM relatorios_comissoes r1
JOIN relatorios_comissoes r2 ON 
  r1.vendedor_id = r2.vendedor_id AND
  DATE_ADD(STR_TO_DATE(CONCAT(r1.periodo, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH) = 
  STR_TO_DATE(CONCAT(r2.periodo, '-01'), '%Y-%m-%d')
JOIN vendedores v ON r1.vendedor_id = v.id
WHERE r1.saldo_devedor > 0
ORDER BY r1.periodo DESC;
```

### 5. Histórico de Edições de Lançamentos
```sql
-- Lançamentos editados (transferidos entre períodos)
SELECT 
  'Comissão' as tipo_lancamento,
  id,
  vendedor_id,
  periodo,
  valor_comissao as valor,
  editado_por,
  editado_em
FROM comissoes_vendas
WHERE editado_por IS NOT NULL

UNION ALL

SELECT 
  'Lançamento Manual' as tipo_lancamento,
  id,
  vendedor_id,
  periodo,
  valor,
  editado_por,
  editado_em
FROM lancamentos_manuais_comissoes
WHERE editado_por IS NOT NULL

UNION ALL

SELECT 
  'Pagamento' as tipo_lancamento,
  id,
  vendedor_id,
  periodo,
  valor,
  editado_por,
  editado_em
FROM pagamentos_comissoes
WHERE editado_por IS NOT NULL

ORDER BY editado_em DESC;
```

### 6. Dashboard de Comissões
```sql
-- Resumo para dashboard
SELECT 
  v.id as vendedor_id,
  v.nome as vendedor_nome,
  COUNT(DISTINCT r.id) as total_periodos,
  COALESCE(SUM(r.valor_liquido), 0) as total_comissoes,
  COALESCE(SUM(r.total_pago), 0) as total_pago,
  COALESCE(SUM(r.saldo_devedor), 0) as saldo_devedor_total
FROM vendedores v
LEFT JOIN relatorios_comissoes r ON v.id = r.vendedor_id
WHERE r.periodo >= DATE_FORMAT(NOW() - INTERVAL 12 MONTH, '%Y-%m')
GROUP BY v.id, v.nome
ORDER BY total_comissoes DESC;
```

---

## 📊 Índices Recomendados

```sql
-- Relatórios
CREATE INDEX idx_relatorios_vendedor_periodo ON relatorios_comissoes(vendedor_id, periodo);
CREATE INDEX idx_relatorios_status_periodo ON relatorios_comissoes(status, periodo);
CREATE INDEX idx_relatorios_data_geracao ON relatorios_comissoes(data_geracao DESC);

-- Comissões de Vendas
CREATE INDEX idx_comissoes_vendas_vendedor_periodo ON comissoes_vendas(vendedor_id, periodo);
CREATE INDEX idx_comissoes_vendas_periodo ON comissoes_vendas(periodo);
CREATE INDEX idx_comissoes_vendas_venda ON comissoes_vendas(venda_id);
CREATE INDEX idx_comissoes_vendas_data ON comissoes_vendas(data_venda);
CREATE INDEX idx_comissoes_vendas_regra ON comissoes_vendas(regra_aplicada);

-- Lançamentos Manuais
CREATE INDEX idx_lancamentos_vendedor_periodo ON lancamentos_manuais_comissoes(vendedor_id, periodo);
CREATE INDEX idx_lancamentos_periodo_tipo ON lancamentos_manuais_comissoes(periodo, tipo);
CREATE INDEX idx_lancamentos_data ON lancamentos_manuais_comissoes(data);

-- Pagamentos
CREATE INDEX idx_pagamentos_vendedor_periodo ON pagamentos_comissoes(vendedor_id, periodo);
CREATE INDEX idx_pagamentos_periodo ON pagamentos_comissoes(periodo);
CREATE INDEX idx_pagamentos_data ON pagamentos_comissoes(data DESC);
CREATE INDEX idx_pagamentos_forma ON pagamentos_comissoes(forma_pagamento);
```

---

## ⚙️ Triggers e Procedures

### 1. Trigger: Recalcular Totalizadores ao Editar Lançamento

```sql
DELIMITER $$

-- Trigger ao editar comissão de venda (transferir período)
CREATE TRIGGER trg_after_update_comissao_venda
AFTER UPDATE ON comissoes_vendas
FOR EACH ROW
BEGIN
  -- Se o período mudou, recalcular ambos os períodos
  IF OLD.periodo != NEW.periodo THEN
    -- Recalcular período antigo
    CALL recalcular_periodo(OLD.vendedor_id, OLD.periodo);
    
    -- Recalcular período novo
    CALL recalcular_periodo(NEW.vendedor_id, NEW.periodo);
  END IF;
END$$

-- Trigger ao editar lançamento manual
CREATE TRIGGER trg_after_update_lancamento_manual
AFTER UPDATE ON lancamentos_manuais_comissoes
FOR EACH ROW
BEGIN
  IF OLD.periodo != NEW.periodo THEN
    CALL recalcular_periodo(OLD.vendedor_id, OLD.periodo);
    CALL recalcular_periodo(NEW.vendedor_id, NEW.periodo);
  END IF;
END$$

-- Trigger ao editar pagamento
CREATE TRIGGER trg_after_update_pagamento
AFTER UPDATE ON pagamentos_comissoes
FOR EACH ROW
BEGIN
  IF OLD.periodo != NEW.periodo THEN
    CALL recalcular_periodo(OLD.vendedor_id, OLD.periodo);
    CALL recalcular_periodo(NEW.vendedor_id, NEW.periodo);
  END IF;
END$$

DELIMITER ;
```

### 2. Procedure: Recalcular Período

```sql
DELIMITER $$

CREATE PROCEDURE recalcular_periodo(
  IN p_vendedor_id VARCHAR(50),
  IN p_periodo VARCHAR(7)
)
BEGIN
  DECLARE v_valor_liquido DECIMAL(15,2);
  DECLARE v_total_pago DECIMAL(15,2);
  DECLARE v_saldo_devedor DECIMAL(15,2);
  
  -- Calcular valor líquido
  SET v_valor_liquido = calcular_valor_liquido(p_periodo, p_vendedor_id);
  
  -- Calcular total pago
  SELECT COALESCE(SUM(valor), 0) INTO v_total_pago
  FROM pagamentos_comissoes
  WHERE periodo = p_periodo AND vendedor_id = p_vendedor_id;
  
  -- Calcular saldo devedor
  SET v_saldo_devedor = v_valor_liquido - v_total_pago;
  
  -- Atualizar relatório
  UPDATE relatorios_comissoes
  SET 
    valor_liquido = v_valor_liquido,
    total_pago = v_total_pago,
    saldo_devedor = v_saldo_devedor,
    updated_at = NOW()
  WHERE vendedor_id = p_vendedor_id AND periodo = p_periodo;
END$$

DELIMITER ;
```

### 3. Procedure: Transportar Saldo para Próximo Período

```sql
DELIMITER $$

CREATE PROCEDURE transportar_saldo_proximo_periodo(
  IN p_vendedor_id VARCHAR(50),
  IN p_periodo_atual VARCHAR(7)
)
BEGIN
  DECLARE v_saldo_devedor DECIMAL(15,2);
  DECLARE v_periodo_seguinte VARCHAR(7);
  DECLARE v_existe_periodo_seguinte INT;
  
  -- Buscar saldo devedor do período atual
  SELECT saldo_devedor INTO v_saldo_devedor
  FROM relatorios_comissoes
  WHERE vendedor_id = p_vendedor_id AND periodo = p_periodo_atual;
  
  -- Calcular período seguinte
  SET v_periodo_seguinte = DATE_FORMAT(
    DATE_ADD(STR_TO_DATE(CONCAT(p_periodo_atual, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH),
    '%Y-%m'
  );
  
  -- Verificar se período seguinte já existe
  SELECT COUNT(*) INTO v_existe_periodo_seguinte
  FROM relatorios_comissoes
  WHERE vendedor_id = p_vendedor_id AND periodo = v_periodo_seguinte;
  
  -- Se não existe, criar
  IF v_existe_periodo_seguinte = 0 THEN
    INSERT INTO relatorios_comissoes (
      id,
      vendedor_id,
      periodo,
      tipo_periodo,
      status,
      data_geracao,
      saldo_anterior,
      valor_liquido,
      total_pago,
      saldo_devedor
    ) VALUES (
      CONCAT('REL-', v_periodo_seguinte, '-', SUBSTRING(UUID(), 1, 8)),
      p_vendedor_id,
      v_periodo_seguinte,
      'mensal',
      'aberto',
      NOW(),
      v_saldo_devedor, -- ← Transportar saldo
      v_saldo_devedor, -- Inicialmente igual ao saldo anterior
      0,
      v_saldo_devedor
    );
  ELSE
    -- Se já existe, atualizar saldo anterior
    UPDATE relatorios_comissoes
    SET 
      saldo_anterior = v_saldo_devedor,
      valor_liquido = valor_liquido + v_saldo_devedor,
      saldo_devedor = saldo_devedor + v_saldo_devedor
    WHERE vendedor_id = p_vendedor_id AND periodo = v_periodo_seguinte;
  END IF;
END$$

DELIMITER ;
```

### 4. Procedure: Fechar Período

```sql
DELIMITER $$

CREATE PROCEDURE fechar_periodo(
  IN p_relatorio_id VARCHAR(50),
  IN p_usuario VARCHAR(100)
)
BEGIN
  DECLARE v_vendedor_id VARCHAR(50);
  DECLARE v_periodo VARCHAR(7);
  DECLARE v_saldo_devedor DECIMAL(15,2);
  
  -- Buscar dados do período
  SELECT vendedor_id, periodo, saldo_devedor 
  INTO v_vendedor_id, v_periodo, v_saldo_devedor
  FROM relatorios_comissoes
  WHERE id = p_relatorio_id;
  
  -- Recalcular totalizadores
  CALL recalcular_periodo(v_vendedor_id, v_periodo);
  
  -- Fechar período
  UPDATE relatorios_comissoes
  SET 
    status = 'fechado',
    data_fechamento = NOW()
  WHERE id = p_relatorio_id;
  
  -- Se houver saldo devedor, transportar para próximo período
  IF v_saldo_devedor > 0 THEN
    CALL transportar_saldo_proximo_periodo(v_vendedor_id, v_periodo);
  END IF;
END$$

DELIMITER ;
```

---

## 🔐 Permissões e Segurança

### Roles Recomendadas

```sql
-- Role: Vendedor (somente leitura das próprias comissões)
GRANT SELECT ON relatorios_comissoes TO role_vendedor;
GRANT SELECT ON comissoes_vendas TO role_vendedor;
GRANT SELECT ON lancamentos_manuais_comissoes TO role_vendedor;
GRANT SELECT ON pagamentos_comissoes TO role_vendedor;

-- Role: Backoffice (leitura completa + edição de lançamentos)
GRANT SELECT, INSERT, UPDATE ON relatorios_comissoes TO role_backoffice;
GRANT SELECT, INSERT, UPDATE ON comissoes_vendas TO role_backoffice;
GRANT SELECT, INSERT, UPDATE, DELETE ON lancamentos_manuais_comissoes TO role_backoffice;
GRANT SELECT, INSERT, UPDATE ON pagamentos_comissoes TO role_backoffice;

-- Role: Financeiro (controle total)
GRANT ALL PRIVILEGES ON relatorios_comissoes TO role_financeiro;
GRANT ALL PRIVILEGES ON comissoes_vendas TO role_financeiro;
GRANT ALL PRIVILEGES ON lancamentos_manuais_comissoes TO role_financeiro;
GRANT ALL PRIVILEGES ON pagamentos_comissoes TO role_financeiro;
```

---

## 📝 Exemplos de Uso

### 1. Criar Novo Período
```sql
INSERT INTO relatorios_comissoes (
  id, vendedor_id, periodo, tipo_periodo, status, data_geracao, saldo_anterior
) VALUES (
  'REL-2025-11-001', 'VEND-001', '2025-11', 'mensal', 'aberto', NOW(), 504.00
);
```

### 2. Registrar Comissão de Venda
```sql
INSERT INTO comissoes_vendas (
  id, venda_id, vendedor_id, periodo, oc_cliente, cliente_id, cliente_nome,
  data_venda, valor_total_venda, percentual_comissao, valor_comissao,
  regra_aplicada, criado_em
) VALUES (
  'CV-100', 'VD-100', 'VEND-001', '2025-11', 'OC-100', 'CLI-001', 'Cliente Teste',
  '2025-11-05', 10000.00, 8.0, 800.00, 'aliquota_fixa_vendedor', NOW()
);
```

### 3. Transferir Lançamento entre Períodos (Edição)
```sql
UPDATE comissoes_vendas
SET 
  periodo = '2025-11',
  editado_por = 'backoffice@empresa.com',
  editado_em = NOW()
WHERE id = 'CV-100';
-- Trigger recalcula automaticamente ambos os períodos
```

### 4. Adicionar Lançamento Manual
```sql
INSERT INTO lancamentos_manuais_comissoes (
  id, vendedor_id, periodo, data, tipo, valor, descricao, criado_por, criado_em
) VALUES (
  'LC-100', 'VEND-001', '2025-11', '2025-11-10', 'credito', 500.00, 
  'Bonificação por meta', 'gestor@empresa.com', NOW()
);
```

### 5. Registrar Pagamento
```sql
INSERT INTO pagamentos_comissoes (
  id, vendedor_id, periodo, data, valor, forma_pagamento, 
  comprovante, realizado_por, realizado_em
) VALUES (
  'PG-100', 'VEND-001', '2025-11', '2025-12-05', 1500.00, 'PIX',
  'PIX-20251205-001', 'financeiro@empresa.com', NOW()
);
```

### 6. Fechar Período e Transportar Saldo
```sql
CALL fechar_periodo('REL-2025-11-001', 'gestor@empresa.com');
-- Fecha o período e cria automaticamente 2025-12 com saldo transportado
```

---

## 🎯 Resumo das Mudanças

### ✅ O que foi OTIMIZADO

1. **Estrutura mais leve** - Relatório armazena apenas metadados e totais finais
2. **Lançamentos independentes** - Comissões, lançamentos e pagamentos têm campo `periodo` editável
3. **Transferência fácil** - Mudança de período via UPDATE simples
4. **Saldo transportado** - Campo `saldo_anterior` carrega saldo devedor do período anterior
5. **Auditoria completa** - Campos `editado_por` e `editado_em` em todos os lançamentos
6. **Cálculos em tempo real** - Totalizadores calculados via queries quando necessário
7. **Performance mantida** - Valores finais armazenados para evitar recálculos constantes

### ✅ O que foi ADICIONADO

- ✅ Campo `periodo` em todas as tabelas de lançamentos
- ✅ Campo `vendedor_id` em todas as tabelas de lançamentos
- ✅ Campo `saldo_anterior` em relatórios
- ✅ Campos `editado_por` e `editado_em` em todos os lançamentos
- ✅ Triggers de recálculo automático ao editar
- ✅ Procedures para transportar saldo e fechar período

### ❌ O que foi REMOVIDO

- ❌ Campos redundantes do relatório (vendedor_nome, arrays de lançamentos, totalizadores calculáveis)
- ❌ FK física entre lançamentos e relatórios (agora é lógica via `periodo`)

---

**Versão:** 2.0 (Otimizada)  
**Data:** 31/10/2025  
**Autor:** Sistema de Gestão Comercial
