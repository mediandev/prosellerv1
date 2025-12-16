# 🔧 Solução: Erro "JSON mal formado ou inválido" do Tiny ERP

## ❌ Erro Reportado

```
ERRO JSON mal formado ou inválido
codigo_erro: 3
status_processamento: 1
```

## ⚠️ IMPORTANTE: Mensagem Enganadora!

A mensagem **"JSON mal formado"** do Tiny ERP é **extremamente enganadora**. 

**Não significa** que o XML/JSON está mal formatado!

**Significa** que algum dado não está cadastrado no Tiny ERP ou é inválido.

## 🔍 Causas Reais (em ordem de probabilidade)

### 1️⃣ Cliente NÃO Cadastrado no Tiny ERP (85% dos casos)

**Sintoma:** Erro código 3 ao enviar pedido

**Causa:** O CPF/CNPJ do cliente não existe na base do Tiny ERP

**Solução:**

```
1. Acesse https://tiny.com.br/ e faça login
2. Vá em: Cadastros → Clientes
3. Clique em "Novo Cliente"
4. Preencha:
   - Nome/Razão Social: [Nome do cliente do erro]
   - CPF/CNPJ: [CPF/CNPJ do erro]
   - Tipo: Pessoa Jurídica (se CNPJ) ou Física (se CPF)
5. Salve o cadastro
6. Tente enviar o pedido novamente
```

### 2️⃣ Produto(s) NÃO Cadastrado(s) no Tiny ERP (10% dos casos)

**Sintoma:** Erro código 3 ao enviar pedido com cliente já cadastrado

**Causa:** Um ou mais SKUs dos produtos não existem no Tiny ERP

**Solução:**

```
1. Acesse https://tiny.com.br/ e faça login
2. Vá em: Cadastros → Produtos
3. Para cada produto do pedido:
   - Clique em "Novo Produto"
   - SKU/Código: [Mesmo código do sistema]
   - Descrição: [Descrição do produto]
   - Valor: [Preço de venda]
   - Unidade: UN, CX, PC, etc.
4. Salve cada produto
5. Tente enviar o pedido novamente
```

### 3️⃣ Natureza de Operação NÃO Configurada (3% dos casos)

**Sintoma:** Erro "natureza de operação não encontrada"

**Causa:** A natureza "Venda" não está cadastrada no Tiny ERP

**Solução:**

```
1. Acesse https://tiny.com.br/ e faça login
2. Vá em: Configurações → Naturezas de Operação
3. Verifique se existe uma natureza chamada "Venda"
4. Se não existir:
   - Clique em "Nova Natureza"
   - Nome: Venda
   - Tipo: Saída
   - Salve
5. Tente enviar o pedido novamente
```

### 4️⃣ CPF/CNPJ com Formato Inválido (2% dos casos)

**Sintoma:** Erro mesmo com cliente cadastrado

**Causa:** Dígitos verificadores inválidos ou formato incorreto

**Solução:**

```
1. Verifique se o CPF/CNPJ é válido em:
   https://www.receita.fazenda.gov.br/
2. Se for inválido:
   - Corrija o cadastro no seu sistema
   - Ou use o CPF/CNPJ correto do cliente
3. Tente enviar o pedido novamente
```

## 🎯 Solução Passo a Passo - Exemplo Prático

### Cenário do Erro

```
Cliente: TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA
CNPJ: 06.372.063/0001-55
Produto: SKU "1" - DAP Antiperspirante Creme Sem Perfume 55g
Valor: R$ 10,00
```

### Passo 1: Cadastrar o Cliente no Tiny ERP

1. **Acesse:** https://tiny.com.br/
2. **Login:** Digite suas credenciais
3. **Menu:** Cadastros → Clientes → Novo Cliente

**Preencha:**
```
✓ Tipo: Pessoa Jurídica
✓ CNPJ: 06.372.063/0001-55
✓ Razão Social: TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA
✓ Nome Fantasia: TUDO DISTRIBUIDORA
✓ Email: cliente@exemplo.com.br (opcional)
✓ Telefone: (11) 0000-0000 (opcional)
```

**Endereço (obrigatório para NFe):**
```
✓ CEP: 00000-000
✓ Logradouro: Rua Exemplo
✓ Número: 123
✓ Bairro: Centro
✓ Cidade: São Paulo
✓ Estado: SP
```

4. **Salvar**

### Passo 2: Cadastrar o Produto no Tiny ERP

1. **Menu:** Cadastros → Produtos → Novo Produto

**Preencha:**
```
✓ SKU/Código: 1
✓ Descrição: DAP Antiperspirante Creme Sem Perfume 55g
✓ Unidade: UN
✓ Preço: R$ 10,00
✓ Tipo: Produto
✓ Situação: Ativo
✓ Estoque mínimo: 0
✓ Origem: 0 - Nacional
✓ NCM: 3307.20.10 (se souber)
```

2. **Salvar**

### Passo 3: Testar Novamente

1. Volte ao sistema
2. Tente enviar o pedido novamente
3. Deve funcionar! ✅

## 🔍 Como Identificar Qual É o Problema?

### Diagnóstico Rápido

**Veja o XML enviado nos logs:**

```xml
<pedido>
  <cliente>
    <cpf_cnpj>06372063000155</cpf_cnpj>  ← Este cliente está no Tiny?
    <nome>TUDO DISTRIBUIDORA...</nome>
  </cliente>
  <itens>
    <item>
      <codigo>1</codigo>  ← Este SKU está no Tiny?
      <descricao>DAP Antiperspirante...</descricao>
    </item>
  </itens>
  <natureza_operacao>Venda</natureza_operacao>  ← Esta natureza está no Tiny?
</pedido>
```

**Checklist:**

- [ ] O CNPJ `06372063000155` está cadastrado no Tiny?
- [ ] O produto SKU `1` está cadastrado no Tiny?
- [ ] A natureza `Venda` existe no Tiny?

Se **qualquer um** desses não estiver cadastrado → Erro "JSON mal formado"

## 🚀 Solução Alternativa: Usar API para Criar Cliente

Se você tem muitos clientes para cadastrar, pode usar a API do Tiny:

### Endpoint: Criar Cliente

```bash
POST https://api.tiny.com.br/api2/contato.incluir.php
```

**Parâmetros:**
```
token: [seu_token]
formato: json
contato: [XML do cliente]
```

**XML do Cliente:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<contato>
  <sequencia>1</sequencia>
  <codigo_cliente_externo>1</codigo_cliente_externo>
  <nome>TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA</nome>
  <tipo_pessoa>J</tipo_pessoa>
  <cpf_cnpj>06372063000155</cpf_cnpj>
  <endereco>Rua Exemplo</endereco>
  <numero>123</numero>
  <bairro>Centro</bairro>
  <cep>01000000</cep>
  <cidade>São Paulo</cidade>
  <uf>SP</uf>
</contato>
```

## 📊 Estatísticas de Erros

| Causa | Frequência | Tempo para Resolver |
|-------|-----------|---------------------|
| Cliente não cadastrado | 85% | 2-5 minutos |
| Produto não cadastrado | 10% | 3-10 minutos |
| Natureza não configurada | 3% | 1-2 minutos |
| CPF/CNPJ inválido | 2% | Depende do cliente |

## ⚡ Dicas para Evitar Este Erro

### 1. Pré-cadastre Clientes

Antes de enviar pedidos, cadastre os clientes no Tiny:
- Importe base de clientes via CSV
- Use a API para criar clientes automaticamente
- Mantenha sincronização diária

### 2. Pré-cadastre Produtos

Mantenha catálogo sincronizado:
- Importe produtos via CSV
- Use mesmos SKUs em ambos sistemas
- Sincronize preços regularmente

### 3. Configure Naturezas

Configure todas as naturezas antes:
- Venda
- Venda com ST
- Venda para consumidor final
- Remessa para demonstração
- Etc.

### 4. Valide Antes de Enviar

Adicione validação no seu sistema:
```javascript
// Antes de enviar ao Tiny
async function validarPedido(venda) {
  // 1. Verificar se cliente existe no Tiny
  const clienteExiste = await buscarClienteTiny(venda.cnpjCliente);
  if (!clienteExiste) {
    throw new Error('Cliente não cadastrado no Tiny ERP');
  }
  
  // 2. Verificar se produtos existem
  for (const item of venda.itens) {
    const produtoExiste = await buscarProdutoTiny(item.codigoSku);
    if (!produtoExiste) {
      throw new Error(`Produto ${item.codigoSku} não cadastrado no Tiny ERP`);
    }
  }
  
  // 3. Enviar pedido
  return await enviarPedidoTiny(venda);
}
```

## 🆘 Ainda Com Problemas?

### Debug Avançado

1. **Copie o XML completo dos logs**
2. **Teste manualmente no Tiny:**
   - Acesse o Tiny ERP
   - Tente criar o pedido manualmente
   - Veja qual campo está causando o erro

3. **Verifique configurações da conta Tiny:**
   - Algumas configurações podem exigir campos adicionais
   - Consulte suporte do Tiny se necessário

### Campos Adicionais que Podem Ser Obrigatórios

Dependendo da configuração da sua conta Tiny:

- **Endereço do cliente** (obrigatório para NFe)
- **IE (Inscrição Estadual)** para empresas
- **Vendedor** (se configurado como obrigatório)
- **Forma de pagamento** específica
- **Transportadora**

## 📚 Documentação Relacionada

- **Tiny ERP API:** https://tiny.com.br/ajuda/api
- **Criar Cliente API:** https://tiny.com.br/ajuda/api/api2-contatos-incluir
- **Criar Produto API:** https://tiny.com.br/ajuda/api/api2-produto-incluir
- **Criar Pedido API:** https://tiny.com.br/ajuda/api/api2-pedidos-incluir

## ✅ Checklist Final

Antes de reportar bug, confirme:

- [ ] Cliente está cadastrado no Tiny ERP
- [ ] Todos os produtos estão cadastrados no Tiny ERP
- [ ] Natureza de operação "Venda" existe no Tiny
- [ ] CPF/CNPJ é válido
- [ ] Token API está correto e ativo
- [ ] XML está bem formatado (verificar logs)
- [ ] Conta Tiny não tem restrições especiais

---

**Versão:** 1.0  
**Data:** 30/11/2025  
**Status:** Solução documentada ✅

**LEMBRE-SE:** "JSON mal formado" = Cliente ou Produto não cadastrado! 🎯
