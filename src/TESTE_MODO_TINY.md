# 🧪 Teste: Verificar Modo Tiny ERP

## Como Testar o Modo Atual

### 1. Abrir Console do Navegador
Pressione **F12** ou clique com botão direito → **Inspecionar** → aba **Console**

### 2. Executar Comandos de Verificação

```javascript
// Ver modo atual no localStorage
console.log('localStorage:', localStorage.getItem('tinyERPMode'));

// Ver modo atual na window
console.log('window:', window.__TINY_API_MODE__);

// Ver se estão sincronizados
console.log('Sincronizados?', localStorage.getItem('tinyERPMode') === window.__TINY_API_MODE__);
```

### 3. Resultado Esperado (Modo MOCK)

```
localStorage: "MOCK"
window: "MOCK"
Sincronizados?: true
```

### 4. Forçar Modo MOCK (se necessário)

```javascript
// Definir MOCK
localStorage.setItem('tinyERPMode', 'MOCK');
window.__TINY_API_MODE__ = 'MOCK';

// Disparar evento de mudança (atualiza o indicador visual)
window.dispatchEvent(new CustomEvent('tinyERPModeChanged', { detail: 'MOCK' }));

console.log('✅ Modo MOCK ativado!');
```

### 5. Verificar Indicador Visual

Olhe no **canto inferior direito** da tela:
- ✅ **Deve mostrar:** `Tiny ERP: MOCK` (amarelo/laranja)
- ❌ **NÃO deve mostrar:** `Tiny ERP: REAL` (verde)

---

## Teste Completo de Envio de Pedido

### Pré-requisitos
- Estar em modo MOCK
- Estar logado como backoffice
- Ter ao menos 1 cliente cadastrado

### Passos

1. **Ir para Vendas → Nova Venda**

2. **Preencher dados mínimos:**
   - Cliente
   - 1 produto
   - Quantidade
   - Forma de pagamento

3. **Clicar em "Salvar Venda"**

4. **Observar console (F12):**

#### Resultado Esperado (SUCESSO):

```
🔎 Buscando configuração ERP para empresa...
📤 Envio automático habilitado? true
Tentativa 1/3 de enviar pedido PV-2025-XXXX ao ERP
🎭 MODO SIMULAÇÃO - Enviando pedido para Tiny ERP (MOCK)
📄 XML que seria enviado: ...
✅ Pedido PV-2025-XXXX enviado com sucesso ao ERP. ID: tiny-mock-XXXXXXXXXX
```

#### Toast Visual:
- 🔵 "Enviando pedido ao ERP... (SIMULAÇÃO)"
- ✅ "[SIMULAÇÃO] Pedido registrado no sistema local!"

#### ❌ Resultado INCORRETO (se aparecer CORS):

```
❌ Erro ao enviar venda para Tiny: TypeError: Failed to fetch
🚨 ERRO DE CORS DETECTADO!
```

**Se viu isso:**
1. O modo não está em MOCK
2. Execute o passo 4 acima (Forçar Modo MOCK)
3. Tente criar o pedido novamente

---

## Debug Avançado

### Ver Todas as Configurações

```javascript
// Ver configuração completa do Tiny ERP
const checkTinyMode = () => {
  const ls = localStorage.getItem('tinyERPMode');
  const win = window.__TINY_API_MODE__;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Configuração Tiny ERP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('localStorage.tinyERPMode:', ls || '(não definido)');
  console.log('window.__TINY_API_MODE__:', win || '(não definido)');
  console.log('Sincronizado:', ls === win ? '✅ SIM' : '❌ NÃO');
  console.log('Modo efetivo:', ls || win || 'MOCK (padrão)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!ls && !win) {
    console.warn('⚠️ Nenhum modo configurado! Será usado MOCK como padrão.');
  }
  
  if (ls !== win) {
    console.error('❌ ATENÇÃO: localStorage e window estão dessincronizados!');
    console.log('💡 Corrigindo...');
    const correct = ls || win || 'MOCK';
    localStorage.setItem('tinyERPMode', correct);
    window.__TINY_API_MODE__ = correct;
    console.log('✅ Sincronizado para:', correct);
  }
};

checkTinyMode();
```

### Limpar Tudo e Reiniciar

```javascript
// Limpar configuração
localStorage.removeItem('tinyERPMode');
delete window.__TINY_API_MODE__;

// Recarregar página
console.log('🔄 Recarregando página em 2 segundos...');
setTimeout(() => location.reload(), 2000);
```

Após recarregar:
- Sistema deve inicializar automaticamente em MOCK
- Indicador deve mostrar "Tiny ERP: MOCK"
- Console deve mostrar: `🔧 Inicializando Tiny ERP em modo MOCK (padrão)`

---

## Situações e Soluções

### Situação 1: Erro de CORS ao criar pedido

**Sintoma:**
```
❌ Erro ao enviar venda para Tiny: TypeError: Failed to fetch
🚨 ERRO DE CORS DETECTADO!
```

**Causa:** Sistema está em modo REAL

**Solução:**
```javascript
localStorage.setItem('tinyERPMode', 'MOCK');
window.__TINY_API_MODE__ = 'MOCK';
window.dispatchEvent(new CustomEvent('tinyERPModeChanged', { detail: 'MOCK' }));
```

### Situação 2: Indicador mostra "REAL" mas deveria ser "MOCK"

**Solução:**
1. Clique no indicador "Tiny ERP: REAL"
2. Clique em "Ativar Modo SIMULAÇÃO"
3. Confirme o alert
4. Verifique se mudou para "Tiny ERP: MOCK"

### Situação 3: Indicador não aparece

**Possíveis causas:**
- Não está logado como backoffice
- Indicador está no canto inferior direito (pode estar fora da tela)
- Erro no componente TinyERPModeIndicator

**Verificação:**
```javascript
// Ver se o componente está montado
console.log('Indicador:', document.querySelector('[class*="TinyERP"]'));
```

### Situação 4: Múltiplas tentativas de envio (retry)

**Sintoma:**
```
❌ Tentativa 1 falhou: Failed to fetch
❌ Tentativa 2 falhou: Failed to fetch
❌ Tentativa 3 falhou: Failed to fetch
```

**Causa:** Bug no cancelamento de retry (CORRIGIDO)

**Verificação:** Com a correção implementada, deve aparecer apenas:
```
❌ Tentativa 1 falhou: Failed to fetch
🚨 ERRO DE CORS DETECTADO - Cancelando todos os retries
```

Se ainda aparecer Tentativa 2 ou 3, reporte o bug.

---

## Checklist de Funcionamento Correto

Execute este checklist para garantir que tudo está OK:

### ✅ Modo MOCK

- [ ] localStorage.getItem('tinyERPMode') retorna "MOCK"
- [ ] window.__TINY_API_MODE__ é "MOCK"
- [ ] Indicador visual mostra "Tiny ERP: MOCK" (amarelo)
- [ ] Criar pedido funciona sem erros
- [ ] Toast mostra "[SIMULAÇÃO]"
- [ ] Console mostra "🎭 MODO SIMULAÇÃO"
- [ ] Não há erro de CORS

### ✅ Alternância de Modo

- [ ] Clicar no indicador abre dialog
- [ ] Pode alternar entre MOCK ↔ REAL
- [ ] Indicador muda de cor (amarelo ↔ verde)
- [ ] Console registra mudança de modo
- [ ] localStorage é atualizado
- [ ] window.__TINY_API_MODE__ é atualizado

### ✅ Proteção Contra CORS

- [ ] Modo REAL sem backend mostra erro claro
- [ ] Erro de CORS cancela retry imediatamente
- [ ] Mensagem instrui sobre alternância para MOCK
- [ ] Toast e console explicam a solução

---

## Comandos Úteis (Copiar e Colar)

### Ver Modo Atual
```javascript
console.log('Modo:', localStorage.getItem('tinyERPMode') || window.__TINY_API_MODE__ || 'MOCK');
```

### Ativar MOCK
```javascript
localStorage.setItem('tinyERPMode', 'MOCK');
window.__TINY_API_MODE__ = 'MOCK';
window.dispatchEvent(new CustomEvent('tinyERPModeChanged', { detail: 'MOCK' }));
console.log('✅ MOCK ativado');
```

### Ativar REAL (apenas se tiver backend!)
```javascript
localStorage.setItem('tinyERPMode', 'REAL');
window.__TINY_API_MODE__ = 'REAL';
window.dispatchEvent(new CustomEvent('tinyERPModeChanged', { detail: 'REAL' }));
console.log('⚠️ REAL ativado - Certifique-se de ter backend configurado!');
```

### Resetar Tudo
```javascript
localStorage.removeItem('tinyERPMode');
delete window.__TINY_API_MODE__;
location.reload();
```

---

**Data:** 03/11/2025  
**Versão do Sistema:** Com correção de CORS  
**Modo Recomendado:** MOCK (padrão)  
**Para Produção:** Configure backend primeiro, depois use REAL
