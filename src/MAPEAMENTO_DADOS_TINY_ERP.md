# 📊 Mapeamento de Dados - Integração Tiny ERP

## 🔴 PROBLEMA IDENTIFICADO

O sistema estava **SIMULANDO** o envio de pedidos ao Tiny ERP, mas **NÃO estava fazendo a chamada real** à API.

## 🔍 Análise do Código Atual

### Função `enviarVendaParaTiny` em `/services/tinyERPSync.ts`

**Código ATUAL (linhas 475-496):**
```typescript
async enviarVendaParaTiny(venda: Venda, tinyToken: string): Promise<string | null> {
  try {
    toast.info(`Enviando pedido ${venda.numero} para o Tiny ERP...`);

    // MOCK: Simular envio para o Tiny
    // Em produção, fazer requisição real à API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simular ID retornado pelo Tiny
    const erpPedidoId = `tiny-${Date.now()}`;

    console.log(`Pedido enviado para Tiny ERP. ID: ${erpPedidoId}`);
    toast.success(`Pedido enviado para o Tiny ERP com sucesso!`);

    return erpPedidoId;

  } catch (error) {
    console.error('Erro ao enviar venda para Tiny:', error);
    toast.error('Erro ao enviar pedido para o Tiny ERP');
    return null;
  }
}
```

**PROBLEMA:** Esta função apenas:
1. Espera 1 segundo (simulando)
2. Retorna um ID mockado
3. **NUNCA faz chamada HTTP para a API do Tiny**

---

## 📡 API do Tiny ERP - Estrutura Real

### Endpoint de Criação de Pedido

```
URL: https://api.tiny.com.br/api2/pedido.incluir.php
Método: POST
Content-Type: multipart/form-data
```

### Parâmetros da Requisição

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `token` | string | ✅ Sim | Token de API do Tiny ERP |
| `formato` | string | ✅ Sim | Formato da resposta: `json` ou `xml` |
| `pedido` | XML string | ✅ Sim | XML com dados do pedido |

### Estrutura XML do Pedido

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <!-- Data do pedido -->
  <data_pedido>DD/MM/YYYY</data_pedido>
  
  <!-- Dados do cliente -->
  <cliente>
    <codigo>CODIGO_CLIENTE</codigo>
    <nome>RAZAO_SOCIAL</nome>
    <tipo_pessoa>J ou F</tipo_pessoa>
    <cpf_cnpj>00.000.000/0001-00</cpf_cnpj>
    <ie>INSCRICAO_ESTADUAL</ie>
    <endereco>RUA EXEMPLO</endereco>
    <numero>123</numero>
    <bairro>BAIRRO</bairro>
    <cep>00000-000</cep>
    <cidade>CIDADE</cidade>
    <uf>SP</uf>
  </cliente>
  
  <!-- Itens do pedido -->
  <itens>
    <item>
      <codigo>SKU_001</codigo>
      <descricao>PRODUTO EXEMPLO</descricao>
      <unidade>UN</unidade>
      <quantidade>10</quantidade>
      <valor_unitario>100.00</valor_unitario>
    </item>
    <item>
      <codigo>SKU_002</codigo>
      <descricao>OUTRO PRODUTO</descricao>
      <unidade>KG</unidade>
      <quantidade>5</quantidade>
      <valor_unitario>50.00</valor_unitario>
    </item>
  </itens>
  
  <!-- Condição de pagamento -->
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>1250.00</valor>
      <forma_pagamento>boleto</forma_pagamento>
    </parcela>
  </parcelas>
  
  <!-- Informações adicionais -->
  <obs>OBSERVAÇÕES DO PEDIDO</obs>
  <obs_internas>OBSERVAÇÕES INTERNAS</obs_internas>
  
  <!-- Número da OC do cliente (opcional) -->
  <numero_ordem_compra>OC-12345</numero_ordem_compra>
  
  <!-- Natureza da operação -->
  <natureza_operacao>VENDA</natureza_operacao>
</pedido>
```

### Resposta da API

**Sucesso:**
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

**Erro:**
```json
{
  "retorno": {
    "status_processamento": "3",
    "status": "Erro",
    "erros": [
      {
        "erro": "Descrição do erro"
      }
    ]
  }
}
```

---

## 🔄 Mapeamento de Dados: Sistema → Tiny ERP

### 1. Dados da Venda

| Campo Sistema (Venda) | Campo Tiny (XML) | Transformação | Exemplo |
|----------------------|------------------|---------------|---------|
| `venda.dataPedido` | `<data_pedido>` | Formatar para DD/MM/YYYY | `03/11/2025` |
| `venda.numero` | `<numero_ordem_compra>` | Usar como referência | `PV-2025-0001` |
| `venda.ordemCompraCliente` | `<numero_ordem_compra>` | Se preenchido, usar este | `OC-12345` |
| `venda.valorPedido` | Calculado nos itens | Soma automática | `1250.00` |
| `venda.observacoesNotaFiscal` | `<obs>` | Direto | `Entrega em horário comercial` |
| `venda.observacoesInternas` | `<obs_internas>` | Direto | `Cliente VIP` |
| `venda.nomeNaturezaOperacao` | `<natureza_operacao>` | Direto | `VENDA` |

### 2. Dados do Cliente

| Campo Sistema (Cliente) | Campo Tiny (XML) | Transformação | Exemplo |
|------------------------|------------------|---------------|---------|
| `venda.clienteId` | `<cliente><codigo>` | ID do cliente | `cli-001` |
| `venda.nomeCliente` | `<cliente><nome>` | Razão Social | `EMPRESA EXEMPLO LTDA` |
| `venda.cnpjCliente` | `<cliente><cpf_cnpj>` | Remover formatação | `12345678000190` |
| `venda.inscricaoEstadualCliente` | `<cliente><ie>` | Direto | `123456789` |
| Cliente.endereco.logradouro | `<cliente><endereco>` | Concatenar tipo + nome | `Rua das Flores` |
| Cliente.endereco.numero | `<cliente><numero>` | Direto | `123` |
| Cliente.endereco.bairro | `<cliente><bairro>` | Direto | `Centro` |
| Cliente.endereco.cep | `<cliente><cep>` | Remover formatação | `01310100` |
| Cliente.endereco.municipio | `<cliente><cidade>` | Direto | `São Paulo` |
| Cliente.endereco.uf | `<cliente><uf>` | Direto | `SP` |
| Cliente.tipoPessoa | `<cliente><tipo_pessoa>` | `Jurídica` → `J`, `Física` → `F` | `J` |

### 3. Itens do Pedido

| Campo Sistema (ItemVenda) | Campo Tiny (XML) | Transformação | Exemplo |
|--------------------------|------------------|---------------|---------|
| `item.codigoSku` | `<item><codigo>` | Direto | `PROD-001` |
| `item.descricaoProduto` | `<item><descricao>` | Direto | `PRODUTO EXEMPLO 10KG` |
| `item.unidade` | `<item><unidade>` | Direto | `UN`, `KG`, `CX` |
| `item.quantidade` | `<item><quantidade>` | Direto | `10` |
| `item.valorUnitario` | `<item><valor_unitario>` | Formato decimal | `100.00` |

**Observações:**
- ✅ O Tiny calcula automaticamente o subtotal: `quantidade * valor_unitario`
- ✅ O Tiny calcula automaticamente o total do pedido: soma de todos os subtotais
- ❌ **NÃO enviar** descontos já aplicados no `valorUnitario`
- ✅ O `valorUnitario` já deve vir com desconto aplicado do sistema

### 4. Condição de Pagamento

| Campo Sistema | Campo Tiny (XML) | Transformação | Exemplo |
|--------------|------------------|---------------|---------|
| `venda.condicaoPagamentoId` | `<parcelas>` | Precisa buscar detalhes | - |
| `venda.valorPedido` | `<parcela><valor>` | Valor total ou por parcela | `1250.00` |
| CondicaoPagamento.dias | `<parcela><dias>` | Dias para vencimento | `30` |
| CondicaoPagamento.formaPagamento | `<parcela><forma_pagamento>` | Mapear forma | `boleto` |

**Mapeamento de Formas de Pagamento:**
| Sistema | Tiny ERP |
|---------|----------|
| `Boleto` | `boleto` |
| `Cartão de Crédito` | `cartao_credito` |
| `Cartão de Débito` | `cartao_debito` |
| `Dinheiro` | `dinheiro` |
| `PIX` | `pix` |
| `Transferência` | `transferencia_bancaria` |

---

## 💻 Código de Implementação Real

### Implementação Completa da Função

```typescript
/**
 * Enviar venda para o Tiny ERP (CHAMADA REAL)
 */
async enviarVendaParaTiny(venda: Venda, tinyToken: string): Promise<string | null> {
  try {
    console.log('📤 Iniciando envio real para Tiny ERP...');
    console.log('Venda:', venda);
    
    toast.info(`Enviando pedido ${venda.numero} para o Tiny ERP...`);

    // 1. Construir XML do pedido
    const pedidoXML = this.construirPedidoXML(venda);
    
    console.log('📄 XML gerado:', pedidoXML);

    // 2. Preparar requisição
    const url = 'https://api.tiny.com.br/api2/pedido.incluir.php';
    const formData = new FormData();
    formData.append('token', tinyToken);
    formData.append('formato', 'json');
    formData.append('pedido', pedidoXML);

    console.log('🌐 Enviando para:', url);
    console.log('🔑 Token:', tinyToken.substring(0, 10) + '...');

    // 3. Fazer requisição à API
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    console.log('📡 Response status:', response.status);

    // 4. Parse da resposta
    const data = await response.json();
    
    console.log('📥 Response data:', data);

    // 5. Verificar se houve erro
    if (data.retorno.status_processamento === '3') {
      const erro = data.retorno.erros[0].erro;
      console.error('❌ Erro da API Tiny:', erro);
      toast.error(`Erro do Tiny ERP: ${erro}`);
      throw new Error(erro);
    }

    // 6. Extrair ID do pedido
    const erpPedidoId = data.retorno.registros[0].registro.id;
    const erpNumero = data.retorno.registros[0].registro.numero_pedido || erpPedidoId;
    
    console.log(`✅ Pedido enviado com sucesso!`);
    console.log(`   ID Tiny: ${erpPedidoId}`);
    console.log(`   Número Tiny: ${erpNumero}`);
    
    toast.success(`Pedido enviado para o Tiny ERP com sucesso! (ID: ${erpPedidoId})`);

    return erpPedidoId;

  } catch (error) {
    console.error('❌ Erro ao enviar venda para Tiny:', error);
    
    if (error instanceof Error) {
      toast.error(`Erro ao enviar pedido: ${error.message}`);
    } else {
      toast.error('Erro desconhecido ao enviar pedido para o Tiny ERP');
    }
    
    throw error;
  }
}

/**
 * Construir XML do pedido para o Tiny ERP
 */
private construirPedidoXML(venda: Venda): string {
  // Formatar data para DD/MM/YYYY
  const dataFormatada = new Date(venda.dataPedido).toLocaleDateString('pt-BR');
  
  // Construir XML dos itens
  const itensXML = venda.itens.map(item => `
    <item>
      <codigo>${this.escaparXML(item.codigoSku)}</codigo>
      <descricao>${this.escaparXML(item.descricaoProduto)}</descricao>
      <unidade>${this.escaparXML(item.unidade)}</unidade>
      <quantidade>${item.quantidade}</quantidade>
      <valor_unitario>${item.valorUnitario.toFixed(2)}</valor_unitario>
    </item>`).join('');

  // Observações (incluir OC se configurado)
  const obs = venda.observacoesNotaFiscal || '';
  const obsInternas = venda.observacoesInternas || '';
  
  // Número da OC do cliente (se houver)
  const numeroOC = venda.ordemCompraCliente || venda.numero;

  // Construir XML completo
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>${dataFormatada}</data_pedido>
  <cliente>
    <codigo>${this.escaparXML(venda.clienteId)}</codigo>
    <nome>${this.escaparXML(venda.nomeCliente)}</nome>
    <tipo_pessoa>J</tipo_pessoa>
    <cpf_cnpj>${venda.cnpjCliente.replace(/\D/g, '')}</cpf_cnpj>
    ${venda.inscricaoEstadualCliente ? `<ie>${this.escaparXML(venda.inscricaoEstadualCliente)}</ie>` : ''}
  </cliente>
  <itens>${itensXML}
  </itens>
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>${venda.valorPedido.toFixed(2)}</valor>
    </parcela>
  </parcelas>
  ${obs ? `<obs>${this.escaparXML(obs)}</obs>` : ''}
  ${obsInternas ? `<obs_internas>${this.escaparXML(obsInternas)}</obs_internas>` : ''}
  ${numeroOC ? `<numero_ordem_compra>${this.escaparXML(numeroOC)}</numero_ordem_compra>` : ''}
  ${venda.nomeNaturezaOperacao ? `<natureza_operacao>${this.escaparXML(venda.nomeNaturezaOperacao)}</natureza_operacao>` : ''}
</pedido>`;

  return xml;
}

/**
 * Escapar caracteres especiais para XML
 */
private escaparXML(texto: string): string {
  return String(texto)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

---

## 📋 Exemplo de Dados Enviados

### Venda do Sistema

```typescript
{
  id: "venda-1762132949546",
  numero: "PV-2025-0001",
  
  // Cliente
  clienteId: "cli-001",
  nomeCliente: "EMPRESA PRINCIPAL LTDA",
  cnpjCliente: "12.345.678/0001-90",
  inscricaoEstadualCliente: "123456789",
  
  // Itens
  itens: [
    {
      codigoSku: "PROD-001",
      descricaoProduto: "PRODUTO EXEMPLO 10KG",
      unidade: "UN",
      quantidade: 10,
      valorUnitario: 100.00,
      subtotal: 1000.00
    },
    {
      codigoSku: "PROD-002",
      descricaoProduto: "OUTRO PRODUTO 5KG",
      unidade: "KG",
      quantidade: 5,
      valorUnitario: 50.00,
      subtotal: 250.00
    }
  ],
  
  // Totais
  valorPedido: 1250.00,
  dataPedido: new Date("2025-11-03"),
  ordemCompraCliente: "OC-12345",
  observacoesNotaFiscal: "Entrega em horário comercial",
  observacoesInternas: "Cliente VIP",
  nomeNaturezaOperacao: "VENDA"
}
```

### XML Enviado ao Tiny

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>03/11/2025</data_pedido>
  <cliente>
    <codigo>cli-001</codigo>
    <nome>EMPRESA PRINCIPAL LTDA</nome>
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
  <obs_internas>Cliente VIP</obs_internas>
  <numero_ordem_compra>OC-12345</numero_ordem_compra>
  <natureza_operacao>VENDA</natureza_operacao>
</pedido>
```

### Resposta Esperada do Tiny

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

---

## 🔴 Dados que FALTAM no Mapeamento Atual

### 1. Endereço Completo do Cliente

**Problema:** A venda não possui dados completos do endereço do cliente.

**Solução:** Precisamos buscar os dados do cliente completo quando criar o XML:

```typescript
// Buscar cliente completo para obter endereço
import { mockCustomers } from '../data/mockCustomers';

const cliente = mockCustomers.find(c => c.id === venda.clienteId);

if (cliente) {
  xml += `
    <endereco>${this.escaparXML(cliente.endereco.logradouro)}</endereco>
    <numero>${this.escaparXML(cliente.endereco.numero)}</numero>
    <bairro>${this.escaparXML(cliente.endereco.bairro)}</bairro>
    <cep>${cliente.endereco.cep.replace(/\D/g, '')}</cep>
    <cidade>${this.escaparXML(cliente.endereco.municipio)}</cidade>
    <uf>${this.escaparXML(cliente.endereco.uf)}</uf>
  `;
}
```

### 2. Condição de Pagamento Detalhada

**Problema:** A venda possui apenas o nome da condição, mas não os detalhes (parcelas, dias, forma).

**Solução:** Precisamos buscar a condição de pagamento completa:

```typescript
import { mockCondicoesPagamento } from '../data/mockCondicoesPagamento';

const condicao = mockCondicoesPagamento.find(c => c.id === venda.condicaoPagamentoId);

if (condicao && condicao.parcelas) {
  const parcelasXML = condicao.parcelas.map(p => `
    <parcela>
      <dias>${p.dias}</dias>
      <valor>${(venda.valorPedido / condicao.parcelas.length).toFixed(2)}</valor>
      <forma_pagamento>boleto</forma_pagamento>
    </parcela>`).join('');
  
  xml += `<parcelas>${parcelasXML}</parcelas>`;
}
```

---

## ✅ Checklist de Validação

Antes de enviar ao Tiny ERP, validar:

- [ ] Token de API configurado
- [ ] CNPJ do cliente válido (14 dígitos)
- [ ] Data do pedido válida
- [ ] Pelo menos 1 item no pedido
- [ ] Todos os itens têm SKU, quantidade e valor
- [ ] Valor total > 0
- [ ] Cliente existe no sistema
- [ ] Condição de pagamento configurada

---

## 🚨 Erros Comuns e Soluções

### Erro: "Cliente não encontrado"
**Causa:** Cliente não cadastrado no Tiny ERP  
**Solução:** Criar cliente no Tiny antes de enviar pedido, ou usar código existente

### Erro: "Produto não encontrado"
**Causa:** SKU não cadastrado no Tiny ERP  
**Solução:** Verificar se SKU está correto, ou cadastrar produto no Tiny

### Erro: "Token inválido"
**Causa:** Token de API incorreto ou expirado  
**Solução:** Verificar token nas configurações, gerar novo se necessário

### Erro: "XML inválido"
**Causa:** Caracteres especiais não escapados  
**Solução:** Usar função `escaparXML()` em todos os campos de texto

### Erro: "Valor inválido"
**Causa:** Formato numérico incorreto  
**Solução:** Usar `.toFixed(2)` para valores monetários

---

## 📊 Logs de Debug Recomendados

```typescript
console.log('🔍 DEBUG ENVIO TINY ERP');
console.log('=======================');
console.log('📦 Venda:', {
  id: venda.id,
  numero: venda.numero,
  cliente: venda.nomeCliente,
  valorTotal: venda.valorPedido,
  qtdItens: venda.itens.length
});
console.log('📄 XML:', pedidoXML);
console.log('🔑 Token:', tinyToken.substring(0, 10) + '***');
console.log('🌐 URL:', url);
console.log('📡 Response:', data);
console.log('=======================');
```

---

## 🎯 Próximos Passos

1. ✅ Implementar chamada real à API
2. ✅ Adicionar busca de dados completos do cliente
3. ✅ Adicionar busca de condição de pagamento detalhada
4. ✅ Implementar função de escape de XML
5. ✅ Adicionar logs detalhados
6. ✅ Tratar todos os erros possíveis
7. ✅ Testar com token real do Tiny
8. ✅ Validar XML gerado
9. ✅ Documentar todos os campos enviados

---

**Documentação criada em:** 03/11/2025  
**Última atualização:** 03/11/2025  
**Status:** 🔴 Implementação necessária - atualmente em modo MOCK
