# 🧪 Teste de Integração Real com Tiny ERP

## ✅ CORREÇÃO IMPLEMENTADA

A integração com o Tiny ERP agora faz **chamadas REAIS** à API, não mais simulação.

## 📊 Mapeamento de Dados Transmitidos

### Dados que SÃO enviados ao Tiny ERP:

#### 1. Informações Básicas do Pedido
```xml
<data_pedido>03/11/2025</data_pedido>
<numero_ordem_compra>PV-2025-0001</numero_ordem_compra>
<natureza_operacao>VENDA DE MERCADORIA</natureza_operacao>
```

**Origem dos dados:**
- `data_pedido`: `venda.dataPedido` formatado para DD/MM/YYYY
- `numero_ordem_compra`: `venda.ordemCompraCliente` (se preenchido) ou `venda.numero`
- `natureza_operacao`: `venda.nomeNaturezaOperacao`

#### 2. Dados do Cliente
```xml
<cliente>
  <codigo>cli-001</codigo>
  <nome>EMPRESA EXEMPLO LTDA</nome>
  <tipo_pessoa>J</tipo_pessoa>
  <cpf_cnpj>12345678000190</cpf_cnpj>
  <ie>123456789</ie>
</cliente>
```

**Origem dos dados:**
- `codigo`: `venda.clienteId`
- `nome`: `venda.nomeCliente`
- `tipo_pessoa`: Fixo `J` (Jurídica) - todos os clientes são PJ
- `cpf_cnpj`: `venda.cnpjCliente` sem formatação
- `ie`: `venda.inscricaoEstadualCliente` (se preenchido)

⚠️ **IMPORTANTE:** O endereço do cliente **NÃO** está sendo enviado porque a `Venda` não possui esses dados. O Tiny ERP provavelmente buscará pelo `codigo` do cliente.

#### 3. Itens do Pedido
```xml
<itens>
  <item>
    <codigo>PROD-001</codigo>
    <descricao>PRODUTO EXEMPLO 10KG</descricao>
    <unidade>UN</unidade>
    <quantidade>10</quantidade>
    <valor_unitario>100.00</valor_unitario>
  </item>
  <item>
    <codigo>PROD-002</codigo>
    <descricao>OUTRO PRODUTO 5KG</descricao>
    <unidade>KG</unidade>
    <quantidade>5</quantidade>
    <valor_unitario>50.00</valor_unitario>
  </item>
</itens>
```

**Origem dos dados:**
- `codigo`: `item.codigoSku`
- `descricao`: `item.descricaoProduto`
- `unidade`: `item.unidade`
- `quantidade`: `item.quantidade`
- `valor_unitario`: `item.valorUnitario` (já com desconto aplicado)

✅ **Cada item é enviado corretamente com todos os dados necessários**

#### 4. Condição de Pagamento
```xml
<parcelas>
  <parcela>
    <dias>0</dias>
    <valor>1250.00</valor>
  </parcela>
</parcelas>
```

**Origem dos dados:**
- `dias`: Fixo em `0` (à vista) - **SIMPLIFICADO**
- `valor`: `venda.valorPedido` (valor total)

⚠️ **LIMITAÇÃO ATUAL:** A condição de pagamento está simplificada como "à vista". Para enviar parcelas detalhadas, seria necessário:
1. Buscar dados completos da condição de pagamento (`mockCondicoesPagamento`)
2. Mapear as parcelas corretamente
3. Calcular o valor de cada parcela

#### 5. Observações
```xml
<obs>Entrega em horário comercial</obs>
<obs_internas>Cliente VIP - prioridade</obs_internas>
```

**Origem dos dados:**
- `obs`: `venda.observacoesNotaFiscal`
- `obs_internas`: `venda.observacoesInternas`

✅ **Observações são enviadas corretamente quando preenchidas**

---

## 🔍 Exemplo Completo de XML Gerado

Para o pedido `PV-2025-0001` com 2 itens:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>03/11/2025</data_pedido>
  <cliente>
    <codigo>cli-001</codigo>
    <nome>EMPRESA EXEMPLO LTDA</nome>
    <tipo_pessoa>J</tipo_pessoa>
    <cpf_cnpj>12345678000190</cpf_cnpj>
    <ie>123456789</ie>
  </cliente>
  <itens>
    <item>
      <codigo>PROD-001</codigo>
      <descricao>PRODUTO EXEMPLO 10KG</descricao>
      <unidade>UN</unidade>
      <quantidade>10</quantidade>
      <valor_unitario>100.00</valor_unitario>
    </item>
    <item>
      <codigo>PROD-002</codigo>
      <descricao>OUTRO PRODUTO 5KG</descricao>
      <unidade>KG</unidade>
      <quantidade>5</quantidade>
      <valor_unitario>50.00</valor_unitario>
    </item>
  </itens>
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>1250.00</valor>
    </parcela>
  </parcelas>
  <obs>Entrega em horário comercial</obs>
  <obs_internas>Cliente VIP - prioridade</obs_internas>
  <numero_ordem_compra>PV-2025-0001</numero_ordem_compra>
  <natureza_operacao>VENDA DE MERCADORIA</natureza_operacao>
</pedido>
```

---

## 📡 Requisição HTTP Enviada

### Endpoint
```
POST https://api.tiny.com.br/api2/pedido.incluir.php
```

### Headers
```
Content-Type: multipart/form-data
```

### Body (FormData)
```
token: abc123token456
formato: json
pedido: [XML acima]
```

---

## 📥 Resposta Esperada do Tiny ERP

### Sucesso
```json
{
  "retorno": {
    "status_processamento": "1",
    "status": "OK",
    "registros": [
      {
        "registro": {
          "id": "123456789",
          "numero_pedido": "TINY-2025-0001"
        }
      }
    ]
  }
}
```

### Erro - Cliente não encontrado
```json
{
  "retorno": {
    "status_processamento": "3",
    "status": "Erro",
    "erros": [
      {
        "erro": "Cliente não encontrado no sistema Tiny ERP (codigo: cli-001)"
      }
    ]
  }
}
```

### Erro - Produto não encontrado
```json
{
  "retorno": {
    "status_processamento": "3",
    "status": "Erro",
    "erros": [
      {
        "erro": "Produto não encontrado (codigo: PROD-001)"
      }
    ]
  }
}
```

### Erro - Token inválido
```json
{
  "retorno": {
    "status_processamento": "3",
    "status": "Erro",
    "erros": [
      {
        "erro": "Token de acesso inválido"
      }
    ]
  }
}
```

---

## 🔴 Possíveis Problemas e Soluções

### Problema 1: Cliente não cadastrado no Tiny

**Sintoma:**
```
❌ Erro da API Tiny: Cliente não encontrado no sistema Tiny ERP
```

**Causa:** O código do cliente (`venda.clienteId`) não existe no Tiny ERP.

**Soluções:**
1. **Cadastrar cliente no Tiny manualmente** com o código `cli-001`
2. **Usar código de cliente existente no Tiny**
3. **Implementar sincronização automática de clientes** antes de enviar pedido
4. **Enviar dados completos do cliente no XML** (incluindo endereço) para criar automaticamente

**Código para enviar cliente completo:**
```xml
<cliente>
  <codigo>cli-001</codigo>
  <nome>EMPRESA EXEMPLO LTDA</nome>
  <tipo_pessoa>J</tipo_pessoa>
  <cpf_cnpj>12345678000190</cpf_cnpj>
  <ie>123456789</ie>
  <endereco>Rua das Flores</endereco>
  <numero>123</numero>
  <complemento>Sala 10</complemento>
  <bairro>Centro</bairro>
  <cep>01310100</cep>
  <cidade>São Paulo</cidade>
  <uf>SP</uf>
  <fone>(11) 98765-4321</fone>
  <email>contato@empresa.com</email>
</cliente>
```

### Problema 2: Produto não cadastrado no Tiny

**Sintoma:**
```
❌ Erro da API Tiny: Produto não encontrado (codigo: PROD-001)
```

**Causa:** O SKU do produto não existe no Tiny ERP.

**Soluções:**
1. **Cadastrar produto no Tiny manualmente** com o SKU correto
2. **Usar SKU existente no Tiny**
3. **Implementar sincronização automática de produtos**
4. **Mapear SKUs do sistema para SKUs do Tiny**

### Problema 3: Token inválido

**Sintoma:**
```
❌ Erro da API Tiny: Token de acesso inválido
```

**Causa:** Token configurado está incorreto ou expirado.

**Solução:**
1. Acessar o Tiny ERP
2. Ir em **Configurações → Integrações → API**
3. Gerar novo token
4. Atualizar em **Configurações → Empresas → [Empresa] → Integrações ERP**

### Problema 4: CORS (Cross-Origin Request)

**Sintoma:**
```
Access to fetch at 'https://api.tiny.com.br' from origin 'http://localhost' has been blocked by CORS policy
```

**Causa:** Navegador bloqueia requisições cross-origin.

**Soluções:**
1. **Usar proxy de backend** - criar endpoint no servidor que faz a chamada
2. **Configurar CORS no Tiny** (se possível)
3. **Usar extensão de navegador** para desenvolvimento (temporário)

---

## 🧪 Como Testar

### 1. Verificar os Logs no Console

Ao criar um pedido, abra o **Console do Navegador (F12)** e observe:

```
📤 Iniciando envio real para Tiny ERP...
Venda: { id: "venda-...", numero: "PV-2025-0001", ... }
📄 XML gerado: <?xml version="1.0" ...
🌐 Enviando para: https://api.tiny.com.br/api2/pedido.incluir.php
🔑 Token: abc123token...
📡 Response status: 200
📥 Response data: { retorno: { ... } }
✅ Pedido enviado com sucesso!
   ID Tiny: 123456789
   Número Tiny: TINY-2025-0001
```

### 2. Verificar Notificações Toast

Você verá as seguintes notificações:
1. ℹ️ "Enviando pedido PV-2025-0001 para o Tiny ERP..."
2. ✅ "Pedido enviado para o Tiny ERP com sucesso! (ID: 123456789)"

Se houver erro:
1. ❌ "Erro do Tiny ERP: [mensagem do erro]"

### 3. Verificar no Tiny ERP

1. Acesse sua conta no Tiny ERP
2. Vá em **Pedidos de Venda**
3. Procure pelo pedido com número de referência `PV-2025-0001`
4. Verifique se todos os dados foram importados corretamente

### 4. Verificar na Página "Tiny ERP" do Sistema

1. Acesse **Menu → Tiny ERP**
2. Verifique se o pedido aparece na lista
3. Confirme que o ID do Tiny está preenchido
4. Verifique o status da sincronização

---

## 📋 Checklist de Pré-requisitos

Antes de testar, certifique-se de:

- [ ] **Token do Tiny ERP** está configurado corretamente
- [ ] **Cliente existe no Tiny** com o mesmo código (ou enviará dados completos)
- [ ] **Produtos existem no Tiny** com os mesmos SKUs
- [ ] **Empresa tem integração ERP ativa** (`integracoesERP[0].ativo = true`)
- [ ] **Envio automático está habilitado** (`envioAutomatico.habilitado = true`)
- [ ] **Navegador permite requisições HTTPS** (sem erro de CORS)

---

## 🎯 Comparação: Antes vs Depois

### ANTES (Modo MOCK)
```typescript
// ❌ Não fazia chamada real
await new Promise(resolve => setTimeout(resolve, 1000));
const erpPedidoId = `tiny-${Date.now()}`;
return erpPedidoId;
```

**Resultado:**
- ❌ Pedido não chegava no Tiny
- ❌ ID mockado: `tiny-1762132949546`
- ❌ Sem validação de dados
- ❌ Sem feedback de erros reais

### DEPOIS (Modo REAL)
```typescript
// ✅ Faz chamada real à API
const formData = new FormData();
formData.append('token', tinyToken);
formData.append('formato', 'json');
formData.append('pedido', pedidoXML);

const response = await fetch('https://api.tiny.com.br/api2/pedido.incluir.php', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
const erpPedidoId = data.retorno.registros[0].registro.id;
return erpPedidoId;
```

**Resultado:**
- ✅ Pedido chega no Tiny
- ✅ ID real retornado: `123456789`
- ✅ Validação completa de dados
- ✅ Feedback de erros reais da API

---

## 🔐 Segurança

### Dados Sensíveis

Os seguintes dados são enviados ao Tiny:
- ✅ CNPJ do cliente
- ✅ Inscrição Estadual
- ✅ Nome/Razão Social
- ✅ Valores dos produtos
- ✅ Valor total do pedido

⚠️ **Observação:** O token de API é enviado a cada requisição. Certifique-se de:
1. Usar HTTPS (já configurado)
2. Não expor o token em logs públicos
3. Armazenar token de forma segura
4. Renovar token periodicamente

---

## 📞 Suporte

### Tiny ERP
- **Documentação:** https://tiny.com.br/api-docs
- **Suporte:** https://tiny.com.br/suporte
- **Fórum:** https://comunidade.tiny.com.br

### Sistema
- **Logs:** Console do navegador (F12)
- **Histórico:** Página "Tiny ERP" → Histórico
- **Configurações:** Configurações → Integrações → Tiny ERP

---

**Documento criado em:** 03/11/2025  
**Status:** ✅ Integração REAL implementada e testável
