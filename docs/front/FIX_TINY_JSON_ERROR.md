# 🔧 Correção: Erro "JSON mal formado ou inválido" - Tiny ERP

## 📋 Resumo do Problema

Ao enviar pedidos para o Tiny ERP, estava ocorrendo o erro:
```
ERRO JSON mal formado ou inválido
codigo_erro: "3"
status_processamento: 1
```

## 🔍 Causa Raiz Identificada

O campo `unidade` dos itens da venda estava **undefined** porque:

1. No arquivo `/components/SaleFormPage.tsx` (linha 512), estava sendo usado:
   ```typescript
   unidade: produto.unidade  // ❌ ERRADO - propriedade não existe
   ```

2. Mas no tipo `Produto` (arquivo `/types/produto.ts`), a propriedade correta é:
   ```typescript
   siglaUnidade: string;  // ✅ CORRETO
   ```

3. Isso causava que todos os itens fossem criados com `unidade: undefined`, gerando XML inválido.

## ✅ Correções Implementadas

### 1. Correção no SaleFormPage.tsx
**Arquivo:** `/components/SaleFormPage.tsx` (linha 512)

**Antes:**
```typescript
unidade: produto.unidade,
```

**Depois:**
```typescript
unidade: produto.siglaUnidade || 'UN', // Usar siglaUnidade do produto, ou 'UN' como fallback
```

### 2. Melhorias no construirPedidoXML
**Arquivo:** `/services/tinyERPSync.ts`

✅ Adicionadas validações de campos obrigatórios:
- Nome do cliente
- CPF/CNPJ do cliente
- Itens (pelo menos 1)
- Para cada item: SKU, descrição, quantidade, valor

✅ Detecção automática de tipo de pessoa:
```typescript
const cpfCnpjLimpo = venda.cnpjCliente.replace(/\D/g, '');
const tipoPessoa = cpfCnpjLimpo.length === 14 ? 'J' : 'F';
```

✅ Fallback robusto para unidade:
```typescript
const unidade = item.unidade || (item as any).unidade || 'UN';
```

✅ Logs detalhados do XML gerado para debug

### 3. Melhorias no Backend
**Arquivo:** `/supabase/functions/server/index.tsx`

✅ Validação da estrutura do XML:
- Verifica presença das tags `<pedido>` e `</pedido>`
- Verifica presença das tags `<itens>` e `</itens>`

✅ Melhor parsing da resposta do Tiny ERP:
- Captura o texto da resposta antes de fazer parse
- Tratamento de erro quando o JSON é inválido
- Logs detalhados dos erros

✅ Mensagens de erro contextualizadas:
- Detecta especificamente o erro "JSON mal formado"
- Fornece sugestões de solução no console

### 4. Melhorias no API Service
**Arquivo:** `/services/api.ts`

✅ Melhor tratamento de erros HTTP:
- Captura resposta como texto primeiro
- Tenta fazer parse do JSON
- Se falhar, retorna erro com o texto original

✅ Propagação completa de erros:
- Inclui `erros`, `codigo_erro`, `status_processamento`
- Mantém detalhes originais da API

### 5. Logs e Diagnóstico Aprimorados

✅ **No Frontend** (`tinyERPSync.ts`):
```
🔍 Validando dados antes de construir XML...
⚠️ Itens sem unidade detectados: [...]
📄 XML gerado: ...
[TINY XML] XML completo gerado: ...
[TINY XML] Validações: { cliente, cpfCnpj, tipoPessoa, totalItens, ... }
```

✅ **No Backend** (`index.tsx`):
```
[TINY ERP] Buscando configuração com chave: ...
[TINY ERP] Token (primeiros 10 chars): ...
[TINY ERP] XML completo: ...
[TINY ERP] Response completa: ...
⚠️ ERRO DE FORMATO - Verificar XML enviado!
```

## 📚 Documentação Criada

### 1. Troubleshooting Guide
**Arquivo:** `/TROUBLESHOOTING_TINY_ERP.md`

Guia completo com:
- Causas comuns do erro
- Checklist de verificação
- Como investigar erros
- Exemplo de XML válido
- Melhorias implementadas

## 🧪 Como Testar

1. **Criar um novo pedido:**
   - Selecione um cliente cadastrado
   - Adicione produtos
   - Verifique no console do navegador os logs `[TINY XML]`
   - Confirme que todos os itens têm `unidade` definida

2. **Verificar no Console:**
   ```
   [TINY XML] XML completo gerado: ...
   [TINY XML] Validações: {
     cliente: "Nome do Cliente",
     cpfCnpj: "12345678000199",
     tipoPessoa: "J",
     totalItens: 2,
     valorPedido: 1000.00,
     dataFormatada: "20/01/2024"
   }
   ```

3. **Enviar para o Tiny ERP:**
   - O pedido deve ser enviado com sucesso
   - Se houver erro, mensagens claras serão exibidas no console

## 🔄 Fluxo de Validação

```
1. Usuário adiciona produto ao pedido
   ↓
2. SaleFormPage.tsx cria ItemVenda
   - ✅ Usa produto.siglaUnidade (CORRETO)
   - ✅ Fallback para 'UN' se vazio
   ↓
3. Usuário clica em "Enviar para Tiny"
   ↓
4. tinyERPSync valida dados
   - ✅ Verifica campos obrigatórios
   - ✅ Confirma que itens têm unidade
   ↓
5. Constrói XML
   - ✅ Valida cada item
   - ✅ Escapar caracteres especiais
   - ✅ Detecta tipo de pessoa (F/J)
   ↓
6. Backend valida XML
   - ✅ Verifica estrutura básica
   - ✅ Confirma tags obrigatórias
   ↓
7. Envia para Tiny ERP API
   ↓
8. Processa resposta
   - ✅ Parse cuidadoso do JSON
   - ✅ Detecta erros específicos
   - ✅ Mensagens de erro claras
```

## 🎯 Resultado Esperado

Com todas as correções implementadas:

✅ Itens de venda sempre terão unidade definida  
✅ XML gerado será válido  
✅ Erros serão detectados antes de enviar  
✅ Mensagens de erro serão claras e acionáveis  
✅ Logs detalhados facilitarão diagnóstico  

## 🔮 Melhorias Futuras Sugeridas

1. **Validação de CPF/CNPJ:** Adicionar validação de dígitos verificadores
2. **Sincronização de Cadastros:** Buscar produtos/clientes do Tiny ERP automaticamente
3. **Preview do XML:** Mostrar XML antes de enviar (modal de confirmação)
4. **Testes Automatizados:** Criar testes unitários para construção do XML
5. **Modo Sandbox:** Ambiente de testes do Tiny ERP

## 📞 Suporte

Se o erro persistir após essas correções:

1. ✅ Verifique os logs no console (F12)
2. ✅ Consulte `/TROUBLESHOOTING_TINY_ERP.md`
3. ✅ Copie o XML gerado e teste diretamente na API do Tiny
4. ✅ Verifique se cliente e produtos estão cadastrados no Tiny ERP

---

**Data da Correção:** 2024-01-20  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
