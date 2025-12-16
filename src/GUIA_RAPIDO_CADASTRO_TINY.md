# 🚀 Guia Rápido: Cadastrar Cliente e Produto no Tiny ERP

## ⚡ Solução Rápida para Erro "JSON mal formado"

Quando você vê este erro, significa que **cliente ou produto não está cadastrado no Tiny ERP**.

### 🎯 Passo a Passo (5 minutos)

---

## 📋 PARTE 1: Cadastrar o Cliente

### 1. Acesse o Tiny ERP

```
🌐 https://tiny.com.br/
```

### 2. Faça Login

- Digite seu email e senha
- Clique em "Entrar"

### 3. Vá para Cadastros → Clientes

```
Menu lateral → Cadastros → Clientes
```

ou acesse diretamente:
```
https://erp.tiny.com.br/cadastros#/contatos
```

### 4. Clique em "+ Novo Cliente"

Botão azul no canto superior direito

### 5. Preencha os Dados do Cliente

**EXEMPLO DO SEU ERRO:**

```
Cliente: TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA
CNPJ: 06.372.063/0001-55
```

**Preencha assim:**

| Campo | Valor |
|-------|-------|
| **Tipo** | ☑️ Pessoa Jurídica |
| **CNPJ** | `06.372.063/0001-55` |
| **Razão Social** | `TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA` |
| **Nome Fantasia** | `TUDO DISTRIBUIDORA` (opcional) |

**Endereço (obrigatório para NFe):**

| Campo | Valor de Exemplo |
|-------|------------------|
| **CEP** | `01310-100` |
| **Logradouro** | `Avenida Paulista` |
| **Número** | `1578` |
| **Bairro** | `Bela Vista` |
| **Cidade** | `São Paulo` |
| **Estado** | `SP` |

> 💡 **DICA:** Se o cliente não tiver endereço completo, use um endereço temporário válido

### 6. Salvar

Clique no botão **"Salvar"** (canto inferior direito)

✅ **CLIENTE CADASTRADO!**

---

## 📦 PARTE 2: Cadastrar o Produto

### 1. Vá para Cadastros → Produtos

```
Menu lateral → Cadastros → Produtos
```

ou acesse diretamente:
```
https://erp.tiny.com.br/cadastros#/produtos
```

### 2. Clique em "+ Novo Produto"

Botão azul no canto superior direito

### 3. Preencha os Dados do Produto

**EXEMPLO DO SEU ERRO:**

```
SKU: 1
Descrição: DAP Antiperspirante Creme Sem Perfume 55g
Valor: R$ 10,00
```

**Preencha assim:**

| Campo | Valor |
|-------|-------|
| **SKU/Código** | `1` |
| **Nome do Produto** | `DAP Antiperspirante Creme Sem Perfume 55g` |
| **Unidade** | `UN` (Unidade) |
| **Preço de Venda** | `10,00` |
| **Tipo** | Produto |
| **Situação** | ☑️ Ativo |

**Campos Opcionais (mas recomendados):**

| Campo | Valor de Exemplo |
|-------|------------------|
| **NCM** | `3307.20.10` (Desodorantes corporais) |
| **Origem** | `0 - Nacional` |
| **CFOP Padrão** | `5102` (Venda de mercadoria) |

> 💡 **DICA:** Se não souber o NCM, deixe em branco por enquanto

### 4. Salvar

Clique no botão **"Salvar"** (canto inferior direito)

✅ **PRODUTO CADASTRADO!**

---

## 🔄 PARTE 3: Tentar Enviar Pedido Novamente

### 1. Volte ao Sistema

### 2. Localize o Pedido

- Vá em "Vendas" no menu
- Encontre o pedido que deu erro

### 3. Tente Enviar Novamente

- Clique no botão de ação do pedido
- Selecione "Enviar para Tiny ERP"

### 4. Sucesso! ✅

O pedido deve ser enviado com sucesso agora!

---

## 🎯 Atalhos Importantes

| Ação | URL Direta |
|------|------------|
| Cadastrar Cliente | `https://erp.tiny.com.br/cadastros#/contatos/novo` |
| Cadastrar Produto | `https://erp.tiny.com.br/cadastros#/produtos/novo` |
| Lista de Clientes | `https://erp.tiny.com.br/cadastros#/contatos` |
| Lista de Produtos | `https://erp.tiny.com.br/cadastros#/produtos` |

---

## ❓ Perguntas Frequentes

### P: Preciso cadastrar TODOS os clientes antes?

**R:** Não! Você pode cadastrar conforme os pedidos aparecem. Quando der erro, cadastre aquele cliente específico.

### P: E se eu tiver muitos produtos?

**R:** Você pode:
1. Cadastrar manualmente um por um
2. Importar em massa via CSV (Menu → Importar → Produtos)
3. Usar a API do Tiny para cadastro automático

### P: O que acontece se eu cadastrar um cliente que já existe?

**R:** O Tiny ERP vai avisar que já existe. Você pode atualizar os dados ou cancelar.

### P: Posso usar um CNPJ fictício para testes?

**R:** ❌ NÃO! O Tiny valida os dígitos verificadores do CNPJ. Use um CNPJ real e válido.

### P: Como importar clientes em massa?

**R:** 
1. Menu → Importar → Contatos
2. Baixe o modelo CSV
3. Preencha com seus clientes
4. Faça upload

---

## 🔍 Checklist Antes de Enviar Pedido

Antes de enviar um pedido para o Tiny ERP:

- [ ] Cliente está cadastrado no Tiny?
- [ ] Produtos estão cadastrados no Tiny?
- [ ] CNPJ/CPF é válido?
- [ ] Endereço do cliente está completo?
- [ ] Natureza de operação "Venda" existe?

---

## 💡 Dicas Profissionais

### 1. Manter Sincronização Diária

Configure importação automática:
- Importe clientes do seu sistema para o Tiny 1x por semana
- Mantenha catálogo de produtos sincronizado

### 2. Usar Códigos Consistentes

- Use o mesmo SKU em ambos os sistemas
- Evite espaços e caracteres especiais nos códigos

### 3. Validar Antes de Enviar

Antes de criar um pedido:
- Verifique se o cliente existe
- Verifique se todos os produtos existem
- Isso evita erros

### 4. Cadastro em Lote

Se você tem muitos clientes/produtos para cadastrar:
1. Use a importação CSV do Tiny
2. Ou use a API do Tiny para automação

---

## 🆘 Ainda Com Problemas?

### Debug Avançado

1. **Abra o Console** (F12 no navegador)
2. **Procure por:**
   ```
   📄 XML COMPLETO (para análise técnica):
   ```
3. **Copie o XML**
4. **Verifique:**
   - CNPJ está no formato correto?
   - Cliente tem nome?
   - Produtos têm SKU e descrição?

### Suporte Tiny ERP

Se o problema persistir:

📧 **Email:** suporte@tiny.com.br  
📞 **Telefone:** (11) 4950-9200  
💬 **Chat:** https://tiny.com.br/ (canto inferior direito)  
📚 **Central de Ajuda:** https://tiny.com.br/ajuda

---

## 📊 Exemplo Completo: Do Erro ao Sucesso

### ❌ ERRO INICIAL

```
❌ Erro ao enviar venda para Tiny: Error: ERRO JSON mal formado ou inválido
Cliente: TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA
CNPJ: 06.372.063/0001-55
Produto: SKU "1" - DAP Antiperspirante Creme Sem Perfume 55g
```

### 🔧 AÇÕES TOMADAS

1. ✅ Acessou https://tiny.com.br/
2. ✅ Cadastrou cliente:
   - CNPJ: 06.372.063/0001-55
   - Razão Social: TUDO DISTRIBUIDORA DE COSMETICOS E HIGIENE PESSOAL LTDA
   - Endereço: Av. Paulista, 1578 - São Paulo/SP
3. ✅ Cadastrou produto:
   - SKU: 1
   - Nome: DAP Antiperspirante Creme Sem Perfume 55g
   - Unidade: UN
   - Preço: R$ 10,00

### ✅ RESULTADO

```
✅ Pedido enviado para o Tiny ERP com sucesso! (ID: 12345678)
```

---

## 📝 Resumo

1. **Erro "JSON mal formado"** = Cliente ou Produto não cadastrado
2. **Solução:** Cadastrar no Tiny ERP (5 minutos)
3. **Prevenção:** Manter cadastros sincronizados

**Tempo total:** 5-10 minutos  
**Dificuldade:** Fácil ⭐⭐☆☆☆

---

**Versão:** 1.0  
**Data:** 30/11/2025  
**Autor:** Sistema de Gestão Comercial

**🎯 Veja também:**
- `/SOLUCAO_ERRO_JSON_MAL_FORMADO.md` - Documentação completa
- `/CORRECAO_VALIDACAO_CNPJ_COMPLETA.md` - Correção de validação CNPJ
