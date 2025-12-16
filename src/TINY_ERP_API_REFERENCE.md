# 📖 Referência Rápida - API Tiny ERP

## ⚠️ Erros Comuns e Soluções

### 1. "File not found" (HTTP 404)

**Causa**: URL do endpoint está incorreta

**Soluções**:
- ✅ Use `contato.incluir.php` (NÃO `cliente.incluir.php`)
- ✅ Use `produto.incluir.php`
- ✅ Use `pedido.incluir.php`

**Exemplo correto**:
```javascript
fetch('https://api.tiny.com.br/api2/contato.incluir.php', {
  method: 'POST',
  body: formData
});
```

---

### 2. "ERRO JSON mal formado ou inválido"

**Causa**: Esta mensagem é **ENGANADORA**! Não significa que o JSON está mal formatado.

**Causas reais** (em ordem de frequência):
1. ✅ Cliente não cadastrado no Tiny ERP
2. ✅ Produto não cadastrado no Tiny ERP
3. ✅ Natureza de operação não existe
4. ✅ CPF/CNPJ inválido
5. ✅ Campo obrigatório faltando

**Solução**: Cadastre primeiro o cliente e produtos no Tiny ERP antes de enviar pedidos.

---

### 3. Cliente não aparece no Tiny ERP

**Causa**: Nome do campo no FormData está incorreto

**Soluções**:
- ✅ Use `formData.append('contato', xmlDoContato)` (NÃO `'cliente'`)
- ✅ XML deve usar tag `<contato>`, não `<cliente>`

**Exemplo correto**:
```javascript
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<contato>
  <nome>Nome do Cliente</nome>
  <tipo_pessoa>J</tipo_pessoa>
  <cpf_cnpj>00000000000191</cpf_cnpj>
</contato>`;

formData.append('contato', xml); // ← IMPORTANTE: usar 'contato'
```

---

## 📋 Estrutura Correta dos XMLs

### Contato (Cliente)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<contato>
  <sequencia>1</sequencia>
  <codigo>CODIGO_UNICO</codigo>
  <nome>NOME DO CLIENTE</nome>
  <tipo_pessoa>J</tipo_pessoa>
  <cpf_cnpj>00000000000191</cpf_cnpj>
  <ie>ISENTO</ie>
  <endereco>Rua Exemplo</endereco>
  <numero>123</numero>
  <bairro>Centro</bairro>
  <cep>12345678</cep>
  <cidade>São Paulo</cidade>
  <uf>SP</uf>
</contato>
```

**Campos obrigatórios**:
- `nome`
- `tipo_pessoa` (F ou J)
- `cpf_cnpj` (11 dígitos para CPF, 14 para CNPJ)

---

### Produto

```xml
<?xml version="1.0" encoding="UTF-8"?>
<produto>
  <sequencia>1</sequencia>
  <nome>Nome do Produto</nome>
  <codigo>SKU123</codigo>
  <unidade>UN</unidade>
  <preco>100.00</preco>
  <tipo>P</tipo>
  <situacao>A</situacao>
</produto>
```

**Campos obrigatórios**:
- `nome`
- `codigo`
- `unidade`
- `tipo` (P = Produto)

---

### Pedido

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>29/11/2025</data_pedido>
  <cliente>
    <codigo>CODIGO_DO_CLIENTE</codigo>
    <nome>Nome do Cliente</nome>
    <tipo_pessoa>J</tipo_pessoa>
    <cpf_cnpj>00000000000191</cpf_cnpj>
  </cliente>
  <itens>
    <item>
      <codigo>SKU123</codigo>
      <descricao>Nome do Produto</descricao>
      <unidade>UN</unidade>
      <quantidade>1</quantidade>
      <valor_unitario>100.00</valor_unitario>
    </item>
  </itens>
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>100.00</valor>
    </parcela>
  </parcelas>
  <numero_ordem_compra>OC123</numero_ordem_compra>
  <natureza_operacao>Venda</natureza_operacao>
</pedido>
```

**Campos obrigatórios**:
- `data_pedido` (formato DD/MM/YYYY)
- `cliente` com código, nome, tipo_pessoa e cpf_cnpj
- `itens` com ao menos 1 item
- Cada item deve ter: codigo, descricao, unidade, quantidade, valor_unitario

---

## 🔐 Autenticação

Todos os endpoints requerem:

```javascript
const formData = new FormData();
formData.append('token', 'SEU_TOKEN_AQUI');
formData.append('formato', 'json');
formData.append('contato', xml); // ou 'produto', 'pedido'
```

**Obter token**: Tiny ERP → Configurações → API → Gerar Token

---

## ✅ Respostas da API

### Sucesso

```json
{
  "retorno": {
    "status_processamento": "1",
    "status": "OK",
    "registros": [
      {
        "registro": {
          "sequencia": 1,
          "id": "123456789"
        }
      }
    ]
  }
}
```

### Erro

```json
{
  "retorno": {
    "status_processamento": "3",
    "status": "Erro",
    "codigo_erro": "3",
    "erros": [
      {
        "erro": "Descrição do erro"
      }
    ]
  }
}
```

**Status de processamento**:
- `1` = Sucesso
- `2` = Processando (raro)
- `3` = Erro

---

## 🛠️ Debugging

### Checklist de Verificação

1. ✅ URL do endpoint está correta?
2. ✅ Método HTTP é POST?
3. ✅ FormData tem os 3 campos (token, formato, xml)?
4. ✅ XML está bem formatado com declaração `<?xml ...>`?
5. ✅ Tags do XML estão corretas (contato, produto, pedido)?
6. ✅ Cliente/Produto já existe no Tiny ERP?
7. ✅ CPF/CNPJ tem 11 ou 14 dígitos (sem formatação)?
8. ✅ Campos obrigatórios estão presentes?

### Logs Úteis

```javascript
console.log('XML enviado:', xml);
console.log('Response text:', await response.text());
console.log('Response status:', response.status);
```

---

## 📚 Links Úteis

- [Documentação Oficial](https://tiny.com.br/api-docs)
- [Login Tiny ERP](https://www.tiny.com.br/)
- [Status da API](https://status.tiny.com.br/)

---

**Última atualização**: 29 Novembro 2025
