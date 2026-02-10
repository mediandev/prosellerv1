# Edge Function: Integração com Tiny ERP

## Atualização (Edge Function v2 - Token por Empresa + Natureza por Empresa)

Para o fluxo **"Enviar ao ERP"** usamos a Edge Function:

`tiny-enviar-pedido-venda-v1`

Principais diferenças em relação a abordagens antigas:

- O **token do Tiny** não vem mais no request. Ele é derivado do pedido via `pedido_venda.empresa_faturamento_id` → `ref_empresas_subsidiarias.chave_api`.
- A **Natureza de Operação enviada ao Tiny** (`<natureza_operacao>...</natureza_operacao>`) é resolvida por empresa via tabela **`tiny_empresa_natureza_operacao`**.
- O envio ao Tiny é feito com **XML + FormData** (não `JSON.stringify`).

## Visão Geral

Esta Edge Function realiza a integração entre o sistema ProSeller e o Tiny ERP, enviando pedidos de venda criados no Supabase para o Tiny e atualizando o registro local com o ID e número do pedido gerado no Tiny.

## Localização

```
supabase/functions/<sua-funcao>/index.ts
```

## Fluxo de Execução

### 1. **Inicialização e CORS**

A função começa configurando os headers CORS para permitir requisições cross-origin:

```typescript
const CORS_BASE = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};
```

### 2. **Validação do Request**

- Verifica se é uma requisição OPTIONS (preflight CORS)
- Gera um `traceId` único para rastreamento de logs
- Valida variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Cria cliente Supabase com timeout e headers de trace

### 3. **Parse e Validação dos Dados de Entrada**

A função espera receber um JSON com:

```typescript
{
  pedido_venda_ID: number;    // ID do pedido no Supabase
  dry_run?: boolean;          // (Opcional) Se true, gera XMLs e não chama o Tiny
}
```

**Validações:**
- `pedido_venda_ID` é obrigatório
- `pedido_venda_ID` deve ser numérico
- O pedido deve ter `empresa_faturamento_id` preenchido
- A empresa deve ter `ref_empresas_subsidiarias.chave_api` configurada (token do Tiny)
- Deve existir mapeamento em `tiny_empresa_natureza_operacao` para a natureza do pedido e a empresa

### 4. **Busca de Dados do Pedido**

A função busca os dados principais do pedido na tabela `pedido_venda`:

```sql
SELECT cliente_id, vendedor_uuid, ordem_cliente, observacao, 
       observacao_interna, natureza_operacao
FROM pedido_venda
WHERE pedido_venda_ID = ?
```

### 5. **Consultas Paralelas (Otimização)**

Para melhor performance, a função executa 4 consultas em paralelo:

1. **Natureza de Operação**: Verifica se a natureza gera comissão
   ```sql
   SELECT tem_comissao FROM natureza_operacao WHERE nome = ?
   ```

2. **Cliente Completo**: Busca todos os dados do cliente
   ```sql
   SELECT * FROM cliente_completo WHERE cliente_id = ?
   ```

3. **Detalhes do Pedido**: Busca a condição de pagamento
   ```sql
   SELECT id_condicao FROM detalhes_pedido_venda WHERE pedido_venda_id = ?
   ```

4. **Itens do Pedido**: Busca os produtos do pedido
   ```sql
   SELECT quantidade, valor_unitario, produto_id, descricao 
   FROM pedido_venda_produtos 
   WHERE pedido_venda_id = ?
   ```

### 6. **Busca de SKUs dos Produtos**

Para cada produto único no pedido, busca o código SKU:

```sql
SELECT produto_id, codigo_sku 
FROM produto 
WHERE produto_id IN (...)
```

Cria um mapa `skuMap` para associar `produto_id` → `codigo_sku`.

### 7. **Busca de Condição de Pagamento**

Busca os detalhes da condição de pagamento:

```sql
SELECT intervalo_parcela, Desconto 
FROM Condicao_De_Pagamento 
WHERE Condição_ID = ?
```

### 8. **Cálculos Financeiros**

- **Valor Total do Pedido**: Soma de `quantidade × valor_unitario` de todos os itens
- **Desconto Extra**: Calculado como percentual do valor total (se houver)
- **Valor Total com Desconto**: `valorTotalPedido - descontoExtra`

Atualiza o campo `valor_total` na tabela `pedido_venda`.

### 9. **Geração de Parcelas**

Converte o campo `intervalo_parcela` da condição de pagamento em um array de parcelas:

- Se `intervalo_parcela` for um array, usa diretamente
- Se for um valor único, converte em array com um elemento
- Se for `null`, cria array vazio

Cada parcela contém:
- `dias`: Intervalo de dias para pagamento
- `valor`: Valor da parcela (valor total dividido pelo número de parcelas)
- `forma_pagamento`: "boleto"
- `meio_pagamento`: "Bradesco"

### 10. **Montagem do Payload para Tiny**

O Tiny recebe **XML** enviado via **POST + FormData**. A função gera:

- XML do **contato** (`<contato>...</contato>`), enviado para `contato.incluir.php`
- XML do **produto** (`<produto>...</produto>`) para cada SKU/código, enviado para `produto.incluir.php`
- XML do **pedido** (`<pedido>...</pedido>`), enviado para `pedido.incluir.php`

O campo **Natureza de Operação no Tiny** é enviado como:

```xml
<natureza_operacao>...</natureza_operacao>
```

E o valor é obtido de `tiny_empresa_natureza_operacao.tiny_valor` (por empresa).

```typescript
{
  pedido: {
    data_pedido: "DD/MM/YYYY",
    cliente: {
      codigo: cliente_id,
      nome: nome,
      nome_fantasia: nome_fantasia,
      tipo_pessoa: "F" | "J" | "E",  // Convertido de número
      cpf_cnpj: cpf_cnpj,
      ie: inscricao_estadual,
      endereco: rua,
      numero: numero,
      complemento: complemento,
      bairro: bairro,
      cep: cep,
      cidade: cidade,
      uf: uf,
      fone: telefone,
    },
    numero_ordem_compra: ordem_cliente,
    obs: observacao,
    obs_internas: observacao_interna,
    valor_desconto: descontoExtra,
    parcelas: [...],
    itens: [
      {
        item: {
          codigo: codigo_sku || produto_id,
          quantidade: quantidade,
          valor_unitario: valor_unitario,
          descricao: descricao,
        }
      }
    ],
    // Opcionalmente:
    id_vendedor?: string,
    nome_vendedor?: string,
  }
}
```

**Conversão de Tipo de Pessoa:**
- `1` → `"F"` (Física)
- `2` → `"J"` (Jurídica)
- `3` → `"E"` (Estrangeira)
- Outros → `""`

### 11. **Envio para API do Tiny**

Envia os XMLs via POST para a API do Tiny (FormData):

```
POST https://api.tiny.com.br/api2/pedido.incluir.php

FormData:
- token = <ref_empresas_subsidiarias.chave_api>
- formato = json
- pedido = <XML do pedido>
```

### 12. **Processamento da Resposta do Tiny**

A função trata diferentes formatos de resposta do Tiny:

**Formato 1 - Objeto único:**
```json
{
  "retorno": {
    "status": "OK",
    "registros": {
      "registro": {
        "id": "123",
        "numero": "456"
      }
    }
  }
}
```

**Formato 2 - Array de registros:**
```json
{
  "retorno": {
    "status": "OK",
    "registros": [
      {
        "registro": {
          "id": "123",
          "numero": "456"
        }
      }
    ]
  }
}
```

**Formato 3 - Array dentro de registro:**
```json
{
  "retorno": {
    "status": "OK",
    "registros": {
      "registro": [
        {
          "id": "123",
          "numero": "456"
        }
      ]
    }
  }
}
```

### 13. **Atualização no Supabase**

Se o pedido foi criado com sucesso no Tiny (`status === 'OK'` ou `'Processado'`), a função atualiza o registro no Supabase:

```sql
UPDATE pedido_venda
SET 
  id_tiny = '123',
  numero_pedido = '456'
WHERE pedido_venda_ID = ?
```

### 14. **Resposta da Função**

**Sucesso:**
```json
{
  "success": true,
  "trace_id": "uuid",
  "data": {
    "pedido_id": 123,
    "tiny_response": { ... }
  }
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

## Boas Práticas Implementadas

### 1. **Timeout em Operações**

Todas as operações assíncronas são envolvidas em `withTimeout()` para evitar que a função trave indefinidamente:

```typescript
async function withTimeout<T>(
  p: Promise<T>,
  label: string,
  ms = 25000
): Promise<T>
```

- Timeout padrão: 25 segundos
- Logs de sucesso/erro com duração
- Timeout customizado para leitura do request: 5 segundos

### 2. **Rastreamento com Trace ID**

Cada requisição recebe um `traceId` único (UUID) que é:
- Logado em todas as operações
- Enviado no header `X-Trace-Id` para o Supabase
- Retornado na resposta para facilitar debug

### 3. **Tratamento Robusto de Resposta do Tiny**

A função trata múltiplos formatos de resposta do Tiny, garantindo que o ID e número do pedido sejam extraídos corretamente independente da estrutura retornada.

### 4. **Cliente Supabase por Request**

O cliente Supabase é criado a cada requisição, evitando problemas de estado compartilhado.

### 5. **Logs Detalhados**

- ✅ Sucesso com duração
- ❌ Erros com duração
- 🌐 Operações de rede
- 📝 Atualizações no banco
- ⚠️ Avisos
- 💥 Erros críticos

### 6. **Validações em Camadas**

- Validação de variáveis de ambiente
- Validação de dados de entrada
- Validação de dados do banco
- Tratamento de erros em cada etapa

## Tratamento de Erros

A função trata erros em múltiplos níveis:

1. **Erros de Parse**: JSON inválido
2. **Erros de Validação**: Dados obrigatórios ausentes
3. **Erros de Banco**: Consultas que falham
4. **Erros de API**: Falha na comunicação com Tiny
5. **Erros de Timeout**: Operações que excedem o tempo limite

Todos os erros são logados com o `traceId` e retornam uma resposta JSON com `success: false`.

## Exemplo de Uso

### Request

```bash
POST https://<seu-projeto>.supabase.co/functions/v1/tiny-enviar-pedido-venda-v1
Content-Type: application/json
Authorization: Bearer <token>

{
  "pedido_venda_ID": 123,
  "dry_run": false
}
```

### Response (Sucesso)

```json
{
  "success": true,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "pedido_venda_ID": 123,
    "empresa_id": 10,
    "tiny": {
      "pedido_id": "789",
      "pedido_numero": "001234"
    }
  }
}
```

### Response (Erro)

```json
{
  "success": false,
  "error": "Erro cliente: Row not found"
}
```

## Dependências

- **Supabase JS Client**: `@supabase/supabase-js@2.7.1`
- **Deno Runtime**: Edge Functions do Supabase

## Tabelas Utilizadas

1. `pedido_venda` - Pedido principal
2. `natureza_operacao` - Configuração da natureza
3. `cliente_completo` - Dados completos do cliente
4. `detalhes_pedido_venda` - Detalhes e condição de pagamento
5. `pedido_venda_produtos` - Itens do pedido
6. `produto` - Informações dos produtos (SKU)
7. `Condicao_De_Pagamento` - Configuração de parcelas e descontos

## Observações Importantes

1. **API Token do Tiny**: É obtido da empresa do pedido (`ref_empresas_subsidiarias.chave_api`)
2. **Formato de Data**: A data do pedido é convertida para formato brasileiro (DD/MM/YYYY)
3. **Valores Monetários**: Todos os valores são formatados com 2 casas decimais
4. **SKU Fallback**: Se o produto não tiver SKU, usa o `produto_id` como código
5. **Atualização de Valor**: O `valor_total` do pedido é recalculado e atualizado antes do envio ao Tiny

## Melhorias Futuras

- [ ] Cache de consultas frequentes (natureza, condições de pagamento)
- [ ] Retry automático em caso de falha na API do Tiny
- [ ] Validação mais rigorosa dos dados antes do envio
- [ ] Suporte a múltiplas formas de pagamento
- [ ] Logs estruturados para análise (JSON logs)
- [ ] Métricas de performance (tempo médio de execução)
