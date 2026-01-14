# 🔧 Troubleshooting - Integração Tiny ERP

## 🎉 NOVIDADE: Cadastro Automático (ATUALIZADO)

A partir de **29/11/2025**, o sistema agora **tenta criar automaticamente** clientes e produtos no Tiny ERP antes de enviar o pedido! 

### ✅ Correções Aplicadas:
- **URL corrigida**: Usa `contato.incluir.php` (não `cliente.incluir.php`)
- **Tag XML correta**: Usa `<contato>` (não `<cliente>`)
- **FormData correto**: `formData.append('contato', xml)`
- **Escape de caracteres especiais**: Nomes com "&" e outros são tratados
- **Código do cliente**: Remove duplicação de prefixo

Isso significa que na maioria dos casos, **você não precisa mais fazer nada manualmente** - o sistema resolve o problema automaticamente.

Se ainda assim o erro ocorrer, siga as instruções abaixo.

---

## 🚨 Erro: \"ERRO JSON mal formado ou inválido\"

### ⚠️ IMPORTANTE: Esta mensagem de erro é ENGANADORA!

O Tiny ERP usa a mensagem **"JSON mal formado ou inválido"** para diversos problemas de validação, **NÃO apenas para erros de formato XML**. Na maioria dos casos, o XML gerado pelo sistema está **perfeitamente correto**, mas algum **dado não está cadastrado** no Tiny ERP ou está inválido.

### Descrição do Erro
Ao tentar enviar um pedido para o Tiny ERP, você recebe o erro:
```
ERRO JSON mal formado ou inválido
```

**O que realmente significa:** Cliente ou produtos não cadastrados no Tiny ERP, ou algum dado inválido.

### 🔍 Causas Comuns (em ordem de probabilidade)

#### 1️⃣ Cliente não cadastrado no Tiny ERP ⭐ MAIS COMUM
**Sintoma:** O cliente existe no sistema, mas não está cadastrado no Tiny ERP.

**Como identificar:**
- Verifique o console do navegador (F12)
- Procure por `[TINY XML] Validações:`
- Anote o CPF/CNPJ e nome do cliente

**Solução:**
1. Acesse https://tiny.com.br/ e faça login
2. Vá em **Cadastros → Clientes**
3. Cadastre o cliente com o **mesmo CPF/CNPJ** usado no sistema
4. Certifique-se de que o **tipo de pessoa** (Física/Jurídica) está correto:
   - **CPF** (11 dígitos) = Pessoa Física
   - **CNPJ** (14 dígitos) = Pessoa Jurídica
5. Tente enviar o pedido novamente

**Exemplo:**
```
Cliente: BANCO DO BRASIL SA
CPF/CNPJ: 00000000000191 (14 dígitos = CNPJ)
Tipo: Pessoa Jurídica
→ Este cliente DEVE estar cadastrado no Tiny ERP!
```

#### 2️⃣ Produto(s) não cadastrado(s) no Tiny ERP ⭐ MUITO COMUM
**Sintoma:** Um ou mais produtos do pedido não existem no Tiny ERP.

**Como identificar:**
- Verifique o console do navegador (F12)
- Procure por "Item 1: SKU..." nos logs
- Anote os códigos SKU de todos os produtos

**Solução:**
1. Acesse o Tiny ERP
2. Vá em **Cadastros → Produtos**
3. Cadastre **TODOS os produtos** usados no pedido
4. **IMPORTANTE:** Use os **mesmos códigos SKU** do sistema
5. Configure a unidade de medida (UN, CX, KG, etc)

**Exemplo:**
```
Item 1: SKU "1" - DAP Antiperspirante Creme Sem Perfume 55g
→ Este produto DEVE estar cadastrado no Tiny ERP com SKU "1"!
```

#### 3️⃣ CPF/CNPJ inválido ou mal formatado
**Sintoma:** O CPF/CNPJ do cliente contém caracteres inválidos ou está incompleto.

**Como identificar:**
- Verifique os logs: procure por "cpfCnpj" nos logs do console
- O sistema já limpa caracteres especiais automaticamente

**Solução:**
- Verifique o cadastro do cliente no sistema
- Certifique-se de que o CPF/CNPJ está **completo** e **válido**
- CPF deve ter 11 dígitos, CNPJ deve ter 14 dígitos

#### 4️⃣ Natureza de Operação não configurada
**Sintoma:** A natureza de operação usada não existe no Tiny ERP.

**Como identificar:**
- Verifique os logs: procure por "natureza_operacao" no XML
- Anote o nome da natureza de operação

**Solução:**
1. Acesse o Tiny ERP
2. Vá em **Configurações → Naturezas de Operação**
3. Verifique se a natureza existe
4. Se não existir, crie uma nova ou use "Venda" como padrão

#### 5️⃣ Campo \"unidade\" ausente nos produtos
**Sintoma:** Alguns produtos não têm a unidade de medida definida.

**Status:** ✅ **JÁ CORRIGIDO** - O sistema agora usa "UN" como padrão quando a unidade não está definida

**O que fazer se o erro persistir:**
- Verifique se os produtos no Tiny ERP têm unidade de medida definida
- Use unidades válidas: UN, CX, KG, LT, MT, etc

#### 6️⃣ Inscrição Estadual inválida
**Sintoma:** A IE do cliente está mal formatada ou é inválida.

**Solução:**
- Verifique a Inscrição Estadual no cadastro do cliente
- Se o cliente for Isento, deixe o campo vazio ou configure como "ISENTO"

### 📋 Checklist de Verificação

Antes de enviar um pedido, verifique:

- [ ] ✅ **Cliente está cadastrado no Tiny ERP** com o mesmo CPF/CNPJ
- [ ] ✅ **Todos os produtos estão cadastrados no Tiny ERP** com os mesmos SKUs
- [ ] ✅ CPF/CNPJ do cliente é válido e está completo
- [ ] ✅ Tipo de pessoa (F/J) está correto baseado no documento
- [ ] ✅ Inscrição Estadual está correta (ou vazia se isento)
- [ ] ✅ Todos os produtos têm unidade de medida definida
- [ ] ✅ Token do Tiny ERP está configurado corretamente
- [ ] ✅ Empresa de faturamento está selecionada no pedido
- [ ] ✅ Natureza de operação existe no Tiny ERP

### 🔎 Como Investigar o Erro

1. **Abra o Console do Navegador** (Pressione F12)
2. Procure por logs com `[TINY ERP]` ou `[TINY XML]`
3. Encontre a seção "🔍 CAUSAS MAIS COMUNS" que mostra:
   - Nome do cliente
   - CPF/CNPJ
   - Lista de produtos (SKUs)
4. Acesse o Tiny ERP e verifique se:
   - O cliente existe com este CPF/CNPJ
   - Os produtos existem com estes SKUs
5. Cadastre o que estiver faltando
6. Tente enviar o pedido novamente

### 📄 Exemplo de XML Válido

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>29/11/2025</data_pedido>
  <cliente>
    <codigo>cliente-1763233276580</codigo>
    <nome>BANCO DO BRASIL SA</nome>
    <tipo_pessoa>J</tipo_pessoa>
    <cpf_cnpj>00000000000191</cpf_cnpj>
  </cliente>
  <itens>
    <item>
      <codigo>1</codigo>
      <descricao>DAP Antiperspirante Creme Sem Perfume 55g</descricao>
      <unidade>UN</unidade>
      <quantidade>1</quantidade>
      <valor_unitario>10.00</valor_unitario>
    </item>
  </itens>
  <parcelas>
    <parcela>
      <dias>0</dias>
      <valor>9.80</valor>
    </parcela>
  </parcelas>
  <numero_ordem_compra>2025a</numero_ordem_compra>
  <natureza_operacao>Venda</natureza_operacao>
</pedido>
```

### ⚙️ Melhorias Implementadas (Última Atualização: 29/11/2025)

#### ✅ Cadastro Automático de Clientes e Produtos 🆕
- **Criação automática de clientes no Tiny ERP** antes de enviar o pedido
- **Criação automática de produtos no Tiny ERP** antes de enviar o pedido
- Se o cliente ou produto já existir, o sistema ignora o erro e continua
- Notificação via toast quando cliente/produto é criado automaticamente
- Logs detalhados de cada tentativa de criação

#### ✅ Validações Adicionadas
- Validação de campos obrigatórios antes de construir o XML
- Verificação de CPF/CNPJ limpo (sem caracteres especiais)
- Validação de tamanho do CPF/CNPJ (11 ou 14 dígitos)
- Detecção automática de tipo de pessoa (F/J) baseado no tamanho do documento
- Fallback automático para unidade "UN" quando não definida
- Código de cliente único gerado automaticamente

#### ✅ Logs Melhorados
- Logs detalhados no console mostrando o XML gerado
- Mensagens de erro mais claras indicando a causa provável
- Informações sobre cada item do pedido com SKU, descrição e unidade
- Alerta claro que a mensagem "JSON mal formado" é enganadora
- Instruções passo a passo para resolver o problema
- Logs de criação automática de clientes e produtos

#### ✅ Tratamento de Erros
- Captura e parsing correto de erros do Tiny ERP
- Mensagens de erro contextualizadas
- Sugestões de solução diretamente no console
- Links para o Tiny ERP e instruções de cadastro
- Checklist de verificação automático
- Tentativa automática de resolver problemas de cadastro

### 🆘 Ainda com Problemas?

Se após seguir este guia o erro persistir:

1. **Copie o XML completo do console** (busque por `[TINY ERP] XML enviado:`)
2. **Verifique manualmente no Tiny ERP:**
   - O cliente existe com este CPF/CNPJ?
   - Todos os produtos existem com estes SKUs?
   - A natureza de operação existe?
3. **Teste diretamente na API do Tiny** usando Postman ou similar:
   - Endpoint: `https://api.tiny.com.br/api2/pedido.incluir.php`
   - Método: POST
   - Parâmetros: `token`, `formato=json`, `pedido=<XML>`
4. **Consulte a documentação do Tiny ERP:** https://tiny.com.br/api-docs
5. **Entre em contato com o suporte do Tiny ERP** se o XML parecer correto

### 💡 Dicas Importantes

1. **O erro "JSON mal formado" é ENGANADOR** - quase sempre significa que algo não está cadastrado no Tiny ERP
2. **SEMPRE verifique primeiro se o cliente existe no Tiny ERP**
3. **SEMPRE verifique se TODOS os produtos existem no Tiny ERP**
4. Use o console do navegador (F12) para ver o XML completo e os dados enviados
5. Cadastre no Tiny ERP primeiro, depois tente enviar o pedido

### 📚 Referências

- [Documentação da API Tiny ERP](https://tiny.com.br/api-docs)
- [Arquivo de configuração: `/services/tinyERPSync.ts`](/services/tinyERPSync.ts)
- [Servidor backend: `/supabase/functions/server/index.tsx`](/supabase/functions/server/index.tsx)

---

## 🚨 Outros Erros Comuns

### Erro: \"Tiny ERP not configured\"
**Causa:** A empresa selecionada não tem o Token do Tiny ERP configurado.

**Solução:**
1. Vá em **Cadastros → Empresas**
2. Edite a empresa
3. Na aba **"Integrações ERP"**, configure o Token do Tiny ERP
4. Salve as alterações

### Erro: \"Failed to fetch\" ou \"CORS Error\"
**Causa:** Tentativa de chamar a API do Tiny ERP diretamente do navegador.

**Solução:**
- O sistema já usa um backend proxy (Supabase Edge Functions)
- Certifique-se de que está em modo **REAL** (não MOCK)
- Verifique se o backend está funcionando: GET `/make-server-f9c0d131/health`

### Erro: \"Venda sem empresa de faturamento associada\"
**Causa:** O pedido não tem uma empresa de faturamento selecionada.

**Solução:**
1. Ao criar/editar o pedido, selecione uma **Empresa de Faturamento**
2. A empresa deve ter o Tiny ERP configurado

---

**Última atualização:** 29/11/2025  
**Versão:** 2.0 - Melhorado com mensagens mais claras sobre o erro "JSON mal formado"
