# 🧪 Como Testar as Correções do Tiny ERP

## ✅ Correções Aplicadas

As seguintes correções foram implementadas para resolver o erro "JSON mal formado":

### 1. **Correção do Prefixo Duplicado**
- ❌ **Problema**: `cliente-cliente-1763233276580` (prefixo duplicado)
- ✅ **Correção**: `cliente-1763233276580` (sem duplicação)
- 📍 **Arquivos**: `/services/tinyERPSync.ts` (linhas 694-702 e 991-1000)

### 2. **URL e Tags Corretas para Cliente**
- ❌ **Problema**: URL `cliente.incluir.php` e tag `<cliente>`
- ✅ **Correção**: URL `contato.incluir.php` e tag `<contato>`
- 📍 **Arquivo**: `/supabase/functions/server/index.tsx` (linha 3206)

### 3. **Escape de Caracteres Especiais**
- ❌ **Problema**: Nomes com `&`, `<`, `>` causavam erro XML
- ✅ **Correção**: Função `escapeXML()` aplicada a todos os campos
- 📍 **Arquivo**: `/supabase/functions/server/index.tsx` (linhas 3174-3181 e 3293-3300)

### 4. **Tratamento de Status Correto**
- ❌ **Problema**: Status `1` sendo tratado como erro
- ✅ **Correção**: Status `1` = sucesso, Status `3` = erro
- 📍 **Arquivo**: `/supabase/functions/server/index.tsx` (linhas 3231-3243)

---

## 🧪 Passo a Passo para Testar

### Passo 1: Limpar Cache do Navegador

**Por que?** Para garantir que o código antigo não está sendo usado.

1. Abra o DevTools (F12)
2. Clique com botão direito no ícone de Refresh
3. Selecione "Limpar cache e atualizar forçadamente"

### Passo 2: Abrir o Console

1. Pressione `F12` para abrir o DevTools
2. Vá na aba **Console**
3. Limpe o console (ícone 🚫 ou Ctrl+L)

### Passo 3: Tentar Enviar um Pedido

1. Vá para a tela de **Vendas**
2. Selecione um pedido que teve erro antes
3. Clique em **"Enviar ao ERP"**

### Passo 4: Verificar os Logs

**O que você DEVE ver agora:**

```
🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 INICIANDO CADASTRO AUTOMÁTICO NO TINY ERP
🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Verificando se o cliente precisa ser criado no Tiny ERP...
🔑 Código do cliente usado: cliente-1763233276580
🔑 venda.clienteId original: cliente-cliente-1763233276580
⚠️ Prefixo duplicado detectado e corrigido: cliente-1763233276580
👤 Tentando criar cliente no Tiny ERP: { codigo: "cliente-1763233276580", nome: "BANCO DO BRASIL SA", ... }
[API] tinyCriarCliente chamado: { empresaId: "...", clienteData: {...} }
[TINY ERP] HTTP Status: 200 OK
[TINY ERP] Status de processamento do cliente: 1
[TINY ERP] Cliente criado/atualizado com sucesso
✅ Cliente criado/atualizado no Tiny ERP

📦 Verificando se os produtos precisam ser criados no Tiny ERP...
📦 Tentando criar produto: { codigo: "1", nome: "DAP Antiperspirante...", ... }
[TINY ERP] HTTP Status: 200 OK
[TINY ERP] Status de processamento do produto: 1
[TINY ERP] Produto criado/atualizado com sucesso
✅ Produto criado/atualizado no Tiny ERP

🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 CADASTRO AUTOMÁTICO CONCLUÍDO
🤖 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 RESUMO DO PEDIDO QUE SERÁ ENVIADO AO TINY ERP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 EmpresaId: empresa-123
👤 Cliente: BANCO DO BRASIL SA
📋 CPF/CNPJ: 00000000000191
📦 Itens: 1
💰 Valor Total: 9.80
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[TINY ERP] XML enviado: <?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <cliente>
    <codigo>cliente-1763233276580</codigo>  ← SEM DUPLICAÇÃO!
    ...
  </cliente>
</pedido>
```

---

## ✅ Checklist de Verificação

Use esta lista para confirmar que tudo está funcionando:

- [ ] **Log "INICIANDO CADASTRO AUTOMÁTICO" aparece?**
  - ✅ Sim → Sistema está tentando criar automaticamente
  - ❌ Não → Atualizar página com cache limpo (Ctrl+Shift+R)

- [ ] **Log "Prefixo duplicado detectado e corrigido" aparece?**
  - ✅ Sim → Correção está funcionando
  - ❌ Não → Verificar se venda.clienteId não está duplicado

- [ ] **Código do cliente no XML está correto?**
  - ✅ `cliente-1763233276580` (correto)
  - ❌ `cliente-cliente-1763233276580` (ainda duplicado)

- [ ] **Cliente foi criado no Tiny ERP?**
  - ✅ "Cliente criado/atualizado com sucesso" aparece
  - ❌ Erro ao criar → Ver logs específicos

- [ ] **Produtos foram criados no Tiny ERP?**
  - ✅ "Produto criado/atualizado com sucesso" para cada item
  - ❌ Erro ao criar → Ver logs específicos

- [ ] **Pedido foi enviado com sucesso?**
  - ✅ "Pedido criado com sucesso" + número do pedido
  - ❌ Ainda erro → Ver seção "Se o Erro Persistir"

---

## ❌ Se o Erro Persistir

### Cenário 1: Ainda vê "cliente-cliente-" duplicado

**Possível causa:** O `clienteId` no banco de dados já está duplicado.

**Solução:**
1. Verifique o log `🔑 venda.clienteId original:`
2. Se mostrar `cliente-cliente-...`, o problema está no banco
3. Execute no console do navegador:
   ```javascript
   // Forçar recarga dos dados
   window.location.reload(true);
   ```

### Cenário 2: Cliente não está sendo criado

**Possível causa:** Token do Tiny ERP inválido ou erro na API.

**Solução:**
1. Verifique se o log mostra `[TINY ERP] HTTP Status: 200 OK`
2. Se mostrar `404` ou `500`, o token pode estar incorreto
3. Vá em **Configurações → Integração ERP** e verifique o token

### Cenário 3: "Erro na validação" do Tiny ERP

**Possível causa:** Dados inválidos (CPF/CNPJ, Natureza de Operação).

**Solução:**
1. Verifique o CPF/CNPJ no log: deve ter 11 ou 14 dígitos
2. Verifique se a "Natureza de Operação" existe no Tiny ERP
3. Se necessário, cadastre manualmente no Tiny e tente novamente

---

## 🆘 Suporte

Se após seguir este guia o erro persistir:

1. **Copie TODOS os logs do console** (do início até o erro)
2. **Tire um print da tela de erro**
3. **Anote:**
   - Nome do cliente
   - CPF/CNPJ do cliente
   - Produtos do pedido
   - Valor do pedido

4. **Verifique manualmente no Tiny ERP:**
   - Login: https://www.tiny.com.br/
   - Vá em **Cadastros → Clientes/Contatos**
   - Busque pelo CPF/CNPJ
   - O cliente está cadastrado?

---

## 📚 Documentação Relacionada

- [`/INTEGRACAO_TINY_ERP.md`](INTEGRACAO_TINY_ERP.md) - Guia completo de integração
- [`/TINY_ERP_API_REFERENCE.md`](TINY_ERP_API_REFERENCE.md) - Referência da API
- [`/TROUBLESHOOTING_TINY_ERP.md`](TROUBLESHOOTING_TINY_ERP.md) - Resolução de problemas

---

**Última atualização:** 29/11/2025 - Correção completa de prefixo duplicado e cadastro automático
