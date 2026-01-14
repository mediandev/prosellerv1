# 📊 Resumo Visual - Mapeamento de Dados Tiny ERP

## 🎯 Fluxo Completo: Sistema → Tiny ERP

```
┌─────────────────────────────────────────────────────────────────┐
│                   CRIAR PEDIDO NO SISTEMA                       │
│                                                                 │
│  • Selecionar cliente                                          │
│  • Adicionar produtos                                          │
│  • Configurar condições comerciais                            │
│  • Salvar pedido                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              ENVIO AUTOMÁTICO HABILITADO?                       │
│                                                                 │
│  Verifica: empresa.integracoesERP[0].envioAutomatico.habilitado│
└────────┬────────────────────────────────────────┬───────────────┘
         │ SIM                                    │ NÃO
         ▼                                        ▼
┌─────────────────────┐                  ┌──────────────────────┐
│  CONSTRUIR XML      │                  │  PEDIDO SALVO        │
│                     │                  │  (sem envio ao ERP)  │
│  • Data do pedido   │                  └──────────────────────┘
│  • Dados do cliente │
│  • Itens            │
│  • Condições        │
│  • Observações      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│            ENVIAR REQUISIÇÃO HTTP POST                          │
│                                                                 │
│  URL: https://api.tiny.com.br/api2/pedido.incluir.php         │
│  Method: POST                                                   │
│  Content-Type: multipart/form-data                            │
│                                                                 │
│  FormData:                                                      │
│    • token: abc123token456                                      │
│    • formato: json                                              │
│    • pedido: [XML]                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────┴────────────┐
            │                         │
        SUCESSO                    ERRO
            │                         │
            ▼                         ▼
┌───────────────────────┐   ┌──────────────────────────┐
│  RESPONSE 200 OK      │   │  RESPONSE COM ERRO       │
│                       │   │                          │
│  {                    │   │  {                       │
│    "retorno": {       │   │    "retorno": {          │
│      "status": "1",   │   │      "status": "3",      │
│      "registros": [   │   │      "erros": [          │
│        {              │   │        {                 │
│          "registro": {│   │          "erro": "..."   │
│            "id": "123"│   │        }                 │
│          }            │   │      ]                   │
│        }              │   │    }                     │
│      ]                │   │  }                       │
│    }                  │   │                          │
│  }                    │   └──────────┬───────────────┘
└──────────┬────────────┘              │
           │                           │
           ▼                           ▼
┌───────────────────────┐   ┌──────────────────────────┐
│  SALVAR ID DO TINY    │   │  REGISTRAR ERRO          │
│                       │   │                          │
│  venda.integracaoERP  │   │  toast.error("Erro...")  │
│    = {                │   │                          │
│      erpPedidoId,     │   │  venda.integracaoERP     │
│      erpNumero,       │   │    = {                   │
│      sincronizacao... │   │      erroSincronizacao   │
│    }                  │   │    }                     │
└───────────────────────┘   └──────────────────────────┘
```

---

## 📦 Estrutura do Objeto Venda → XML

### Objeto JavaScript (Venda)
```javascript
{
  // ┌─────────────────────────────────────┐
  // │ CABEÇALHO DO PEDIDO                │
  // └─────────────────────────────────────┘
  id: "venda-1762132949546",
  numero: "PV-2025-0001",                    → <numero_ordem_compra>
  dataPedido: "2025-11-03T10:30:00",         → <data_pedido> (formatado DD/MM/YYYY)
  
  // ┌─────────────────────────────────────┐
  // │ DADOS DO CLIENTE                   │
  // └─────────────────────────────────────┘
  clienteId: "cli-001",                      → <cliente><codigo>
  nomeCliente: "EMPRESA EXEMPLO LTDA",       → <cliente><nome>
  cnpjCliente: "12.345.678/0001-90",         → <cliente><cpf_cnpj> (sem formatação)
  inscricaoEstadualCliente: "123456789",     → <cliente><ie>
  
  // ┌─────────────────────────────────────┐
  // │ ITENS DO PEDIDO                    │
  // └─────────────────────────────────────┘
  itens: [
    {
      codigoSku: "PROD-001",                 → <item><codigo>
      descricaoProduto: "PRODUTO EXEMPLO",   → <item><descricao>
      unidade: "UN",                         → <item><unidade>
      quantidade: 10,                        → <item><quantidade>
      valorUnitario: 100.00                  → <item><valor_unitario>
    },
    { ... }
  ],
  
  // ┌─────────────────────────────────────┐
  // │ TOTAIS E CONDIÇÕES                 │
  // └─────────────────────────────────────┘
  valorPedido: 1250.00,                      → <parcela><valor>
  
  // ┌─────────────────────────────────────┐
  // │ OBSERVAÇÕES                        │
  // └─────────────────────────────────────┘
  observacoesNotaFiscal: "Entrega...",       → <obs>
  observacoesInternas: "Cliente VIP",        → <obs_internas>
  ordemCompraCliente: "OC-12345",            → <numero_ordem_compra> (prioridade)
  
  // ┌─────────────────────────────────────┐
  // │ OPERAÇÃO FISCAL                    │
  // └─────────────────────────────────────┘
  nomeNaturezaOperacao: "VENDA"              → <natureza_operacao>
}
```

### XML Gerado
```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  ┌──────────────────────────────────────────┐
  │ CABEÇALHO                                │
  └──────────────────────────────────────────┘
  <data_pedido>03/11/2025</data_pedido>
  <numero_ordem_compra>PV-2025-0001</numero_ordem_compra>
  <natureza_operacao>VENDA</natureza_operacao>
  
  ┌──────────────────────────────────────────┐
  │ CLIENTE                                  │
  └──────────────────────────────────────────┘
  <cliente>
    <codigo>cli-001</codigo>
    <nome>EMPRESA EXEMPLO LTDA</nome>
    <tipo_pessoa>J</tipo_pessoa>
    <cpf_cnpj>12345678000190</cpf_cnpj>
    <ie>123456789</ie>
  </cliente>
  
  ┌──────────────────────────────────────────┐
  │ ITENS                                    │
  └──────────────────────────────────────────┘
  <itens>
    <item>
      <codigo>PROD-001</codigo>
      <descricao>PRODUTO EXEMPLO</descricao>
      <unidade>UN</unidade>
      <quantidade>10</quantidade>
      <valor_unitario>100.00</valor_unitario>
    </item>
    <!-- mais itens... -->
  </itens>
  
  ┌──────────────────────────────────────────┐
  │ PAGAMENTO                                │
  └──────────────────────────────────────────┘
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>1250.00</valor>
    </parcela>
  </parcelas>
  
  ┌──────────────────────────────────────────┐
  │ OBSERVAÇÕES                              │
  └──────────────────────────────────────────┘
  <obs>Entrega em horário comercial</obs>
  <obs_internas>Cliente VIP</obs_internas>
</pedido>
```

---

## 🔄 Transformações Aplicadas

### 1. Data
```
Entrada:  new Date("2025-11-03T10:30:00")
Saída:    "03/11/2025"
Função:   .toLocaleDateString('pt-BR')
```

### 2. CNPJ
```
Entrada:  "12.345.678/0001-90"
Saída:    "12345678000190"
Função:   .replace(/\D/g, '')
```

### 3. Valores Monetários
```
Entrada:  100
Saída:    "100.00"
Função:   .toFixed(2)
```

### 4. Textos (Escape XML)
```
Entrada:  "Produto & Serviço <Premium>"
Saída:    "Produto & Serviço <Premium>"
Função:   escaparXML()
```

**Caracteres escapados:**
- `&` → `&`
- `<` → `<`
- `>` → `>`
- `"` → `&quot;`
- `'` → `&apos;`

---

## 📊 Tabela de Mapeamento Completo

| Dado do Sistema | Tipo | Obrigatório | Campo XML | Transformação | Exemplo |
|----------------|------|-------------|-----------|---------------|---------|
| **CABEÇALHO** |
| `venda.dataPedido` | Date | ✅ | `<data_pedido>` | DD/MM/YYYY | `03/11/2025` |
| `venda.numero` | string | ✅ | `<numero_ordem_compra>` | Direto | `PV-2025-0001` |
| `venda.ordemCompraCliente` | string | ⬜ | `<numero_ordem_compra>` | Prioridade sobre `numero` | `OC-12345` |
| `venda.nomeNaturezaOperacao` | string | ⬜ | `<natureza_operacao>` | Direto | `VENDA` |
| **CLIENTE** |
| `venda.clienteId` | string | ✅ | `<cliente><codigo>` | Direto | `cli-001` |
| `venda.nomeCliente` | string | ✅ | `<cliente><nome>` | Escape XML | `EMPRESA LTDA` |
| Fixo: `"J"` | string | ✅ | `<cliente><tipo_pessoa>` | Fixo | `J` |
| `venda.cnpjCliente` | string | ✅ | `<cliente><cpf_cnpj>` | Remove formatação | `12345678000190` |
| `venda.inscricaoEstadualCliente` | string | ⬜ | `<cliente><ie>` | Direto | `123456789` |
| **ITENS** |
| `item.codigoSku` | string | ✅ | `<item><codigo>` | Escape XML | `PROD-001` |
| `item.descricaoProduto` | string | ✅ | `<item><descricao>` | Escape XML | `PRODUTO EXEMPLO` |
| `item.unidade` | string | ✅ | `<item><unidade>` | Direto | `UN` |
| `item.quantidade` | number | ✅ | `<item><quantidade>` | Direto | `10` |
| `item.valorUnitario` | number | ✅ | `<item><valor_unitario>` | .toFixed(2) | `100.00` |
| **PAGAMENTO** |
| Fixo: `0` | number | ✅ | `<parcela><dias>` | Fixo | `0` |
| `venda.valorPedido` | number | ✅ | `<parcela><valor>` | .toFixed(2) | `1250.00` |
| **OBSERVAÇÕES** |
| `venda.observacoesNotaFiscal` | string | ⬜ | `<obs>` | Escape XML | `Entrega urgente` |
| `venda.observacoesInternas` | string | ⬜ | `<obs_internas>` | Escape XML | `Cliente VIP` |

**Legenda:**
- ✅ Campo obrigatório
- ⬜ Campo opcional

---

## 🎯 Exemplo Real de Dados

### Entrada (JSON do Sistema)
```json
{
  "id": "venda-1762132949546",
  "numero": "PV-2025-0001",
  "dataPedido": "2025-11-03T10:30:00.000Z",
  "clienteId": "cli-001",
  "nomeCliente": "DISTRIBUIDORA ABC LTDA",
  "cnpjCliente": "12.345.678/0001-90",
  "inscricaoEstadualCliente": "123.456.789.123",
  "itens": [
    {
      "codigoSku": "CAFE-500G",
      "descricaoProduto": "CAFÉ TORRADO & MOÍDO 500G",
      "unidade": "PC",
      "quantidade": 100,
      "valorUnitario": 25.90
    },
    {
      "codigoSku": "ACUCAR-1KG",
      "descricaoProduto": "AÇÚCAR CRISTAL <PREMIUM> 1KG",
      "unidade": "PC",
      "quantidade": 50,
      "valorUnitario": 8.50
    }
  ],
  "valorPedido": 3015.00,
  "observacoesNotaFiscal": "Entrega até às 16h",
  "observacoesInternas": "Cliente importante - priorizar",
  "ordemCompraCliente": "OC-2025-ABC-001",
  "nomeNaturezaOperacao": "VENDA DE MERCADORIA"
}
```

### Saída (XML para Tiny)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>03/11/2025</data_pedido>
  <cliente>
    <codigo>cli-001</codigo>
    <nome>DISTRIBUIDORA ABC LTDA</nome>
    <tipo_pessoa>J</tipo_pessoa>
    <cpf_cnpj>12345678000190</cpf_cnpj>
    <ie>123.456.789.123</ie>
  </cliente>
  <itens>
    <item>
      <codigo>CAFE-500G</codigo>
      <descricao>CAFÉ TORRADO & MOÍDO 500G</descricao>
      <unidade>PC</unidade>
      <quantidade>100</quantidade>
      <valor_unitario>25.90</valor_unitario>
    </item>
    <item>
      <codigo>ACUCAR-1KG</codigo>
      <descricao>AÇÚCAR CRISTAL <PREMIUM> 1KG</descricao>
      <unidade>PC</unidade>
      <quantidade>50</quantidade>
      <valor_unitario>8.50</valor_unitario>
    </item>
  </itens>
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>3015.00</valor>
    </parcela>
  </parcelas>
  <obs>Entrega até às 16h</obs>
  <obs_internas>Cliente importante - priorizar</obs_internas>
  <numero_ordem_compra>OC-2025-ABC-001</numero_ordem_compra>
  <natureza_operacao>VENDA DE MERCADORIA</natureza_operacao>
</pedido>
```

**Observe:**
- ✅ `&` foi escapado para `&`
- ✅ `<` e `>` foram escapados para `<` e `>`
- ✅ CNPJ sem pontuação
- ✅ Data formatada corretamente
- ✅ Valores com 2 casas decimais

---

## ✅ Checklist de Validação

Antes de enviar ao Tiny, o sistema verifica:

- [ ] **Token existe e não está vazio**
- [ ] **Cliente ID está preenchido**
- [ ] **CNPJ tem 14 dígitos** (após remover formatação)
- [ ] **Data é válida**
- [ ] **Tem pelo menos 1 item**
- [ ] **Todos os itens têm SKU**
- [ ] **Todas as quantidades > 0**
- [ ] **Todos os valores > 0**
- [ ] **Valor total > 0**
- [ ] **XML é válido** (sem caracteres especiais não escapados)

---

## 🔍 Debug: Como Verificar os Dados

### No Console do Navegador
```javascript
// Antes do envio
console.log('📦 Venda:', venda);

// XML gerado
console.log('📄 XML:', pedidoXML);

// Token (parcial por segurança)
console.log('🔑 Token:', tinyToken.substring(0, 10) + '...');

// Resposta da API
console.log('📥 Response:', data);

// ID retornado
console.log('✅ ID Tiny:', erpPedidoId);
```

### Verificar XML Gerado
1. Copie o XML do console
2. Cole em validador online: https://www.xmlvalidation.com/
3. Confirme que está bem formatado

### Verificar Escape de Caracteres
```javascript
// Exemplos de escape
"Produto & Serviço"  → "Produto & Serviço"
"<Premium>"          → "<Premium>"
"João's Store"       → "João&apos;s Store"
"10" x 20""          → "10&quot; x 20&quot;"
```

---

**Documento criado em:** 03/11/2025  
**Última atualização:** 03/11/2025  
**Versão:** 1.0
