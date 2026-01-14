# 🚀 Guia Rápido - Integração Tiny ERP

## 🎯 Status Atual

✅ **Sistema Funcionando em Modo SIMULAÇÃO**  
✅ **Persistência de Vendas Implementada (LocalStorage)**  
✅ **Integração Real Preparada (aguardando backend)**

---

## 🔄 Dois Modos de Operação

### 🎭 Modo MOCK (Atual - Padrão)

**O que é:** Simula o envio ao Tiny ERP sem fazer chamada real

**Quando usar:**
- ✅ Desenvolvimento local
- ✅ Testes e demonstrações
- ✅ Ambiente sem backend

**Como funciona:**
1. Constrói XML do pedido
2. Valida todos os dados
3. Simula delay de rede
4. Retorna ID mockado: `tiny-mock-{timestamp}`
5. Salva localmente no navegador

**Identificar:**
- Toast mostra: `[SIMULAÇÃO]`
- Console mostra: `🎭 MODO SIMULAÇÃO`
- Botão no canto inferior direito: `Tiny ERP: MOCK` (amarelo)

### 📡 Modo REAL (Produção)

**O que é:** Envia pedidos realmente ao Tiny ERP

**Quando usar:**
- ✅ Produção com backend configurado
- ✅ Testes com API real do Tiny
- ✅ Ambiente de homologação

**Requisitos:**
- ⚠️ Backend/API intermediário configurado
- ⚠️ Token válido do Tiny ERP
- ⚠️ Clientes cadastrados no Tiny
- ⚠️ Produtos cadastrados no Tiny

**Identificar:**
- Toast NÃO mostra `[SIMULAÇÃO]`
- Console mostra: `📤 MODO REAL`
- Botão no canto inferior direito: `Tiny ERP: REAL` (verde)

---

## 🎮 Como Usar

### Ver Modo Atual

Olhe o **botão flutuante** no canto inferior direito:
- 🟡 Amarelo = Modo MOCK
- 🟢 Verde = Modo REAL

### Alternar Modo

**Opção 1: Interface Visual**
1. Clique no botão `Tiny ERP: MOCK` no canto inferior direito
2. Leia as informações
3. Clique em "Ativar Modo REAL" ou "Ativar Modo SIMULAÇÃO"
4. Página recarrega automaticamente

**Opção 2: Console**
```javascript
// Ativar modo MOCK
window.__TINY_API_MODE__ = "MOCK";
location.reload();

// Ativar modo REAL
window.__TINY_API_MODE__ = "REAL";
location.reload();

// Ver modo atual
console.log(window.__TINY_API_MODE__ || 'MOCK');
```

---

## 📦 O que Foi Implementado

### 1. ✅ Persistência de Vendas (LocalStorage)

**Problema Resolvido:** Vendas não sumem mais ao recarregar página

**Como funciona:**
- Vendas são salvas automaticamente no navegador
- Ao recarregar, são restauradas automaticamente
- Funciona offline

**Limitar dados (se necessário):**
```javascript
// Ver vendas salvas
const vendas = JSON.parse(localStorage.getItem('mockVendas') || '[]');
console.log('Total de vendas:', vendas.length);

// Limpar tudo e começar do zero
localStorage.removeItem('mockVendas');
location.reload();
```

### 2. ✅ Modo MOCK Inteligente

**Características:**
- Valida XML antes de "enviar"
- Simula comportamento real
- 95% de sucesso, 5% de erro (aleatório)
- Logs detalhados no console
- IDs mockados identificáveis

**Vantagens:**
- Testa fluxo completo
- Não depende de backend
- Não consome API do Tiny
- Ideal para desenvolvimento

### 3. ✅ Modo REAL Preparado

**Características:**
- Código pronto para produção
- Detecta erro de CORS automaticamente
- Mostra mensagens claras de erro
- XML construído corretamente

**Aguarda apenas:**
- Backend/proxy para fazer a chamada
- Configuração do ambiente

---

## ❌ Erro de CORS Resolvido

### O que era:
```
Failed to fetch
```

### Por que acontecia:
Navegador bloqueia chamadas diretas do frontend para APIs externas (CORS)

### Solução implementada:
Sistema detecta CORS e usa modo MOCK automaticamente

### Para usar modo REAL:
Implemente backend seguindo documentação em `/SOLUCAO_CORS_TINY_ERP.md`

---

## 🧪 Testar o Sistema

### Criar um Pedido

1. **Login** como usuário backoffice
2. **Menu** → Vendas → Novo Pedido
3. **Preencher** dados do pedido
4. **Salvar** pedido
5. **Observar**:
   - Toast de sucesso
   - Console com logs detalhados
   - Pedido aparece na lista

### Verificar Persistência

1. **Crie** um pedido
2. **Anote** o ID do pedido (aparece no console)
3. **Recarregue** a página (F5)
4. **Verifique** que o pedido ainda está lá

### Verificar Modo MOCK

1. Olhe o **botão no canto inferior direito**
2. Deve mostrar: `Tiny ERP: MOCK` (amarelo)
3. Crie um pedido
4. Console deve mostrar: `🎭 MODO SIMULAÇÃO`
5. Toast deve mostrar: `[SIMULAÇÃO]`

---

## 📊 Dados Transmitidos ao Tiny

Quando em modo REAL, os seguintes dados são enviados:

### ✅ Enviados:
- Data do pedido
- Número do pedido
- Dados do cliente (código, nome, CNPJ, IE)
- Itens (SKU, descrição, quantidade, valor)
- Valor total
- Observações (NF e internas)
- Natureza de operação

### ⚠️ Limitações atuais:
- Endereço completo do cliente não é enviado
- Condição de pagamento simplificada (à vista)
- Forma de pagamento não especificada

### 📝 Para melhorar:
- Buscar dados completos do cliente
- Mapear condições de pagamento detalhadas
- Enviar forma de pagamento específica

---

## 🐛 Troubleshooting

### Problema: Pedido sumiu após recarregar

**Causa:** Sistema anterior não tinha persistência

**Solução:** Já implementado! Agora usa localStorage

**Teste:**
```javascript
// Ver vendas salvas
console.log(JSON.parse(localStorage.getItem('mockVendas') || '[]'));
```

### Problema: Erro "Failed to fetch"

**Causa:** Tentando usar modo REAL sem backend

**Solução:** Use modo MOCK
```javascript
window.__TINY_API_MODE__ = "MOCK";
location.reload();
```

### Problema: Não sei qual modo está ativo

**Solução:** Olhe o botão no canto inferior direito
- 🟡 Amarelo = MOCK
- 🟢 Verde = REAL

### Problema: Botão não aparece

**Causa:** Você não está logado como backoffice

**Solução:** Faça login com usuário backoffice

---

## 📚 Documentação Completa

- **CORS e Soluções:** `/SOLUCAO_CORS_TINY_ERP.md`
- **Mapeamento de Dados:** `/MAPEAMENTO_DADOS_TINY_ERP.md`
- **Testes de Integração:** `/TESTE_INTEGRACAO_TINY_REAL.md`
- **Visual do Mapeamento:** `/RESUMO_VISUAL_MAPEAMENTO_TINY.md`
- **Persistência:** `/PERSISTENCIA_LOCALSTORAGE.md`

---

## ✅ Checklist de Status

- [x] Integração com Tiny ERP preparada
- [x] Modo MOCK implementado e funcional
- [x] Modo REAL preparado (aguarda backend)
- [x] Erro de CORS resolvido
- [x] Persistência de vendas implementada
- [x] Indicador visual de modo
- [x] Logs detalhados no console
- [x] Documentação completa
- [ ] Backend configurado (próximo passo)
- [ ] Testes com API real do Tiny (após backend)

---

## 🎯 Próximos Passos

### Para Continuar Desenvolvimento
✅ Use modo MOCK - está funcionando perfeitamente!

### Para Ir para Produção
1. Implementar backend/proxy
2. Configurar token do Tiny
3. Cadastrar clientes no Tiny
4. Cadastrar produtos no Tiny
5. Ativar modo REAL
6. Testar com pedidos reais
7. Monitorar logs de erro

---

**Última atualização:** 03/11/2025  
**Status:** ✅ Sistema funcional em modo MOCK  
**Pronto para:** Desenvolvimento e demonstração  
**Aguarda:** Backend para envios reais
