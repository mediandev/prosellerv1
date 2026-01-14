# 💾 Sistema de Persistência com LocalStorage

## ❌ Problema Identificado

**Sintoma:** Vendas criadas desapareciam após recarregar a página.

**Causa:** Os dados mockados eram armazenados apenas em memória (variável JavaScript). Quando a página era recarregada, o arquivo `/data/mockVendas.ts` era reimportado com os dados iniciais, **perdendo todas as vendas criadas durante a sessão**.

## ✅ Solução Implementada

Implementamos um sistema de **persistência automática usando LocalStorage** para salvar as vendas no navegador.

### Como Funciona

```
┌─────────────────────────────────────────────────────────────┐
│                  CRIAR/EDITAR VENDA                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Adicionar/Atualizar em mockVendas                │
│                   (array em memória)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         salvarVendasNoLocalStorage(mockVendas)              │
│                                                             │
│  localStorage.setItem('mockVendas', JSON.stringify(vendas)) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ LOCALSTORAGE │
                  │  (Navegador) │
                  └──────┬───────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    RECARREGAR                      FECHAR/ABRIR
      PÁGINA                          NAVEGADOR
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         carregarVendasDoLocalStorage()                      │
│                                                             │
│  const vendas = localStorage.getItem('mockVendas')         │
│  return vendas ? JSON.parse(vendas) : vendasIniciais       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              VENDAS RESTAURADAS ✅                          │
│         (incluindo as criadas anteriormente)                │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Arquivos Modificados

### 1. `/data/mockVendas.ts`

**Adicionado:**

```typescript
// Função para carregar vendas do localStorage
function carregarVendasDoLocalStorage(): Venda[] {
  if (typeof window === 'undefined') return vendasIniciais;
  
  try {
    const vendasSalvas = localStorage.getItem('mockVendas');
    if (vendasSalvas) {
      const vendas = JSON.parse(vendasSalvas);
      // Converter strings de data de volta para objetos Date
      return vendas.map((v: any) => ({
        ...v,
        dataPedido: new Date(v.dataPedido),
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        integracaoERP: v.integracaoERP ? {
          ...v.integracaoERP,
          dataSincronizacao: v.integracaoERP.dataSincronizacao 
            ? new Date(v.integracaoERP.dataSincronizacao) 
            : undefined,
          dataFaturamento: v.integracaoERP.dataFaturamento 
            ? new Date(v.integracaoERP.dataFaturamento) 
            : undefined,
        } : undefined,
      }));
    }
  } catch (error) {
    console.error('Erro ao carregar vendas do localStorage:', error);
  }
  
  return vendasIniciais;
}

// Função para salvar vendas no localStorage
export function salvarVendasNoLocalStorage(vendas: Venda[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('mockVendas', JSON.stringify(vendas));
    console.log('💾 Vendas salvas no localStorage:', vendas.length, 'vendas');
  } catch (error) {
    console.error('Erro ao salvar vendas no localStorage:', error);
  }
}

// Exportar array com dados do localStorage
export const mockVendas: Venda[] = carregarVendasDoLocalStorage();

// Nota: O salvamento no localStorage é feito manualmente após modificações
// chamando salvarVendasNoLocalStorage(mockVendas) nos pontos de modificação
```

**⚠️ IMPORTANTE:** A versão inicial tentou usar um `Proxy` para salvar automaticamente, mas isso causava loops infinitos. A versão corrigida usa salvamento manual explícito.

### 2. `/components/SaleFormPage.tsx`

**Adicionado após salvar venda:**

```typescript
// Salvar vendas no localStorage para persistência
const { salvarVendasNoLocalStorage } = await import('../data/mockVendas');
salvarVendasNoLocalStorage(mockVendas);
```

## 🔄 Fluxo Completo

### Ao Criar uma Venda

1. Usuário preenche formulário e clica em "Salvar"
2. Venda é criada e adicionada ao array `mockVendas` em memória
3. **Função `salvarVendasNoLocalStorage()` é chamada**
4. Array completo é serializado para JSON
5. JSON é salvo no `localStorage` do navegador
6. ✅ Venda fica persistida mesmo após recarregar

### Ao Recarregar a Página

1. Navegador recarrega aplicação
2. Arquivo `/data/mockVendas.ts` é importado
3. **Função `carregarVendasDoLocalStorage()` é executada**
4. Verifica se existe `localStorage.getItem('mockVendas')`
5. Se existe: deserializa JSON e reconstroi objetos Date
6. Se não existe: usa dados iniciais padrão
7. ✅ Vendas anteriores são restauradas

## 🎯 Vantagens

✅ **Persistência Automática:** Vendas não são perdidas ao recarregar  
✅ **Transparente:** Funciona automaticamente, sem ação do usuário  
✅ **Compatível:** Funciona em todos os navegadores modernos  
✅ **Sem Backend:** Não precisa de banco de dados para desenvolvimento  
✅ **Rápido:** Leitura/escrita instantânea  

## ⚠️ Limitações

❌ **Apenas Navegador:** Dados ficam apenas no navegador do usuário  
❌ **Não Compartilhado:** Cada navegador/computador tem seus próprios dados  
❌ **Pode ser Limpo:** Usuário pode limpar cache/dados do navegador  
❌ **Limite de Tamanho:** ~5-10MB por domínio (suficiente para centenas de vendas)  
❌ **Não é Produção:** Para produção, usar banco de dados real  

## 🛠️ Comandos Úteis

### Verificar Vendas Salvas

Abra o **Console do Navegador (F12)** e execute:

```javascript
// Ver vendas salvas
const vendas = JSON.parse(localStorage.getItem('mockVendas') || '[]');
console.log('Vendas salvas:', vendas);
console.log('Total:', vendas.length);
```

### Limpar Vendas do LocalStorage

Para começar do zero (apagar todas as vendas criadas):

```javascript
// Limpar vendas
localStorage.removeItem('mockVendas');
console.log('✅ Vendas removidas do localStorage');

// Recarregar página para ver dados iniciais
location.reload();
```

### Restaurar Vendas Iniciais

```javascript
// Limpar e restaurar vendas padrão
localStorage.removeItem('mockVendas');
location.reload();
```

### Ver Tamanho dos Dados

```javascript
// Ver quanto espaço as vendas ocupam
const vendas = localStorage.getItem('mockVendas');
if (vendas) {
  const tamanhoKB = (vendas.length / 1024).toFixed(2);
  console.log(`Tamanho: ${tamanhoKB} KB`);
}
```

### Exportar Vendas (Backup)

```javascript
// Exportar vendas para arquivo JSON
const vendas = localStorage.getItem('mockVendas');
if (vendas) {
  const blob = new Blob([vendas], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vendas-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  console.log('✅ Vendas exportadas');
}
```

### Importar Vendas (Restaurar Backup)

```javascript
// 1. Primeiro, copie o conteúdo do arquivo JSON de backup
// 2. Execute no console:
const vendasBackup = [/* cole aqui o conteúdo do JSON */];
localStorage.setItem('mockVendas', JSON.stringify(vendasBackup));
location.reload();
console.log('✅ Vendas importadas do backup');
```

## 🐛 Troubleshooting

### Problema: Vendas ainda desaparecem

**Solução:**
1. Verifique se o localStorage está habilitado no navegador
2. Abra o Console (F12) e execute: `localStorage.setItem('teste', '123')`
3. Se der erro, o localStorage está bloqueado (modo privado/incognito)

### Problema: Erro ao salvar vendas

**Sintoma:** `QuotaExceededError` no console

**Causa:** LocalStorage cheio (limite de ~5-10MB)

**Solução:**
```javascript
// Limpar outros dados do localStorage
localStorage.clear();

// Ou remover apenas vendas antigas
const vendas = JSON.parse(localStorage.getItem('mockVendas') || '[]');
const vendasRecentes = vendas.filter(v => {
  const dias = (Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return dias < 90; // Manter apenas últimos 90 dias
});
localStorage.setItem('mockVendas', JSON.stringify(vendasRecentes));
```

### Problema: Datas aparecem como strings

**Causa:** JSON não serializa objetos Date

**Solução:** Já implementado! A função `carregarVendasDoLocalStorage()` converte strings de volta para Date automaticamente.

### Problema: Quero voltar aos dados iniciais

**Solução:**
```javascript
localStorage.removeItem('mockVendas');
location.reload();
```

## 📊 Estrutura de Dados no LocalStorage

### Chave: `mockVendas`

**Valor:** Array de objetos Venda serializado em JSON

```json
[
  {
    "id": "venda-1762132949546",
    "numero": "PV-2025-0001",
    "dataPedido": "2025-11-03T10:30:00.000Z",
    "clienteId": "cliente-1",
    "nomeCliente": "EMPRESA EXEMPLO LTDA",
    "cnpjCliente": "12.345.678/0001-90",
    "itens": [
      {
        "id": "item-1",
        "codigoSku": "PROD-001",
        "quantidade": 10,
        "valorUnitario": 100.00
      }
    ],
    "valorPedido": 1000.00,
    "status": "Em Análise",
    "createdAt": "2025-11-03T10:30:00.000Z",
    "updatedAt": "2025-11-03T10:30:00.000Z",
    "integracaoERP": {
      "erpPedidoId": "tiny-123456789",
      "sincronizacaoAutomatica": true,
      "tentativasSincronizacao": 0
    }
  }
]
```

## 🔐 Segurança

### O que NÃO fazer

❌ **Não armazenar dados sensíveis:** Senhas, tokens de API, etc.  
❌ **Não confiar 100%:** LocalStorage pode ser manipulado pelo usuário  
❌ **Não usar em produção:** Apenas para desenvolvimento/mockup  

### O que É Seguro

✅ **Dados de demonstração:** Perfeito para vendas de exemplo  
✅ **Protótipos:** Ótimo para testes e apresentações  
✅ **Desenvolvimento local:** Ideal para ambiente de dev  

## 🚀 Para Produção

Quando migrar para produção, substituir por:

1. **Backend com Banco de Dados:**
   - PostgreSQL
   - MySQL
   - MongoDB

2. **API REST:**
   ```typescript
   // Substituir
   mockVendas.push(venda);
   
   // Por
   await fetch('/api/vendas', {
     method: 'POST',
     body: JSON.stringify(venda)
   });
   ```

3. **ORM/Query Builder:**
   - Prisma
   - TypeORM
   - Drizzle

## 📝 Checklist de Migração para Produção

- [ ] Criar banco de dados
- [ ] Criar tabela de vendas
- [ ] Criar API de vendas (GET, POST, PUT, DELETE)
- [ ] Substituir `mockVendas` por chamadas à API
- [ ] Remover código do localStorage
- [ ] Implementar autenticação e autorização
- [ ] Implementar validações no backend
- [ ] Adicionar tratamento de erros robusto
- [ ] Implementar backup automático
- [ ] Configurar logs de auditoria

---

## 🎓 Resumo

✅ **Problema Resolvido:** Vendas agora são persistidas no navegador  
✅ **Automático:** Salva automaticamente ao criar/editar  
✅ **Restauração:** Carrega automaticamente ao recarregar página  
✅ **Simples:** Comandos fáceis para gerenciar dados  

**Nota:** Esta é uma solução para **desenvolvimento**. Em produção, use um banco de dados real.

---

**Documentação criada em:** 03/11/2025  
**Status:** ✅ Implementado e funcional
