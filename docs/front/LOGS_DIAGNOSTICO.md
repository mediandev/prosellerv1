# 📋 Guia de Diagnóstico - Indicadores de Clientes

## Sistema de Logs Implementado

Implementei um sistema completo de logs detalhados para diagnosticar problemas nos indicadores de clientes individuais. Os logs estão divididos em **dois locais diferentes**:

### 1. 🌐 **Logs do Frontend** (Console do Navegador)

Estes logs aparecem no console do navegador e mostram o processamento dos dados no lado do cliente.

**Prefixos utilizados:**
- `[INDICADORES]` - Logs gerais do componente
- `[INDICADORES-ROI]` - Dados específicos de ROI
- `[INDICADORES-MIX]` - Dados específicos de MIX
- `[INDICADORES-LTV]` - Dados específicos de LTV  
- `[INDICADORES-PERFORMANCE]` - Dados de performance mensal

**Como visualizar:**
1. Abra as **Ferramentas do Desenvolvedor** (F12 ou Ctrl+Shift+I)
2. Vá para a aba **Console**
3. Abra um cliente individual na lista de clientes
4. Clique na aba **"Indicadores"**
5. Observe os logs com prefixos `[INDICADORES-...]`

### 2. 🖥️ **Logs do Backend** (Terminal do Supabase)

Estes logs aparecem no **terminal/console onde o servidor Supabase está rodando** e mostram todo o processamento no servidor.

**Prefixos utilizados:**
- `[INDICADORES]` - Logs gerais do endpoint
- `[ROI]` - Cálculos detalhados de ROI
- `[MIX]` - Cálculos detalhados de MIX

**Como visualizar:**
1. Localize o terminal/console onde você iniciou o servidor Supabase
2. Ou verifique os logs do Supabase Functions no dashboard do Supabase
3. Procure por logs com os prefixos acima
4. Os logs do backend são MUITO mais detalhados e mostram:
   - Todas as vendas carregadas
   - Filtros aplicados por cliente
   - Cálculo de receita por venda
   - Agrupamento por mês e trimestre
   - Totais calculados

## 📊 Informações que os Logs Fornecem

### ROI (Retorno sobre Investimento)
- Investimento total (atualmente 0, pois não há sistema de investimentos implementado)
- Receita gerada por vendas com natureza de operação que gera receita
- Percentual de ROI calculado
- **Detalhamento venda por venda** mostrando quais foram incluídas no cálculo

### MIX (Mix de Produtos)
- Total de produtos disponíveis no sistema
- Total de produtos ativos no mix do cliente
- Percentual do mix
- Comparação com mês anterior
- **Distribuição de status** (ativo, inativo, pendente)

### LTV (Lifetime Value)
- Receita total gerada pelo cliente
- Total de pedidos realizados
- Data do primeiro pedido
- Data do último pedido

### Performance Mensal
- Receita mês a mês nos últimos 12 meses
- Agrupamento por trimestre
- Média dos últimos 12 meses
- **Lista completa de meses com e sem receita**

## 🔍 Problemas Conhecidos e Como Diagnosticar

### 1. Gráfico "Performance Mensal" não mostra receita

**Verificar nos logs do backend:**
```
[ROI] 📊 Vendas com natureza que gera receita: X
[INDICADORES] 📊 Receita por mês: { ... }
[INDICADORES] 📋 Meses com receita > 0: X de 12
```

**Possíveis causas:**
- Nenhuma venda tem natureza de operação que gera receita
- As vendas não têm o campo `data` preenchido
- As vendas estão fora do período de 12 meses

**Como confirmar:**
- Verifique os logs `[ROI] 🔍 Analisando venda:` para ver se `geraReceita: true`
- Verifique se há vendas listadas em `[INDICADORES] 💵 Adicionando receita ao mês`

### 2. Card "MIX Cadastrado" mostra 0 produtos

**Verificar nos logs do backend:**
```
[MIX] 📦 Total de produtos disponíveis: X
[MIX] 📦 Produtos ativos no mix do cliente: X
[MIX] 📊 Distribuição de status: { ... }
```

**Possíveis causas:**
- Não há produtos marcados como `disponivel: true` e `ativo: true`
- Não há registros de status mix para o cliente na tabela KV
- O cliente não tem produtos cadastrados no mix

**Como confirmar:**
- Verifique `[INDICADORES] 📦 Total de produtos no sistema:`
- Verifique `[MIX] 📊 Status mix do cliente:`

## 🛠️ Próximos Passos para Debug

1. **Abra o cliente com problema** na aba Indicadores
2. **Copie TODOS os logs** do console do navegador que começam com `[INDICADORES]`
3. **Copie TODOS os logs** do terminal do servidor que começam com `[INDICADORES]`, `[ROI]`, `[MIX]`
4. Analise os logs procurando por:
   - ⚠️ Avisos de dados faltando
   - ❌ Erros
   - Valores zerados quando deveriam ter dados
   - Vendas não sendo contabilizadas

## 📝 Exemplo de Logs Normais

### Frontend (Console):
```
[INDICADORES] 🔍 Iniciando carregamento de indicadores para cliente: cliente-123
[INDICADORES] ✅ Indicadores recebidos do backend: { clienteId: 'cliente-123', ... }
[INDICADORES-ROI] 💰 Dados de ROI: { investimento: 0, receita: 50000, percentual: 0 }
[INDICADORES-MIX] 📦 Dados de MIX: { totalDisponivel: 100, totalAtivo: 45, percentual: 45 }
[INDICADORES-PERFORMANCE] 💰 Meses com receita > 0: 8 de 12
```

### Backend (Terminal):
```
[INDICADORES] 🔍 INÍCIO - Buscando indicadores do cliente: cliente-123
[INDICADORES] 📊 Total de vendas no sistema: 150
[INDICADORES] 📊 Vendas filtradas do cliente: 25
[ROI] 📊 Vendas com natureza que gera receita: 20
[ROI] 💰 Receita total calculada: 50000
[MIX] 📦 Total de produtos disponíveis: 100
[MIX] 📦 Total de produtos ativos no mix do cliente: 45
[INDICADORES] 📊 Receita por mês: { '2025-1': 5000, '2025-2': 8000, ... }
```

## ✅ Checklist de Verificação

- [ ] Os logs do frontend estão aparecendo no console do navegador?
- [ ] Os logs do backend estão aparecendo no terminal do Supabase?
- [ ] Há vendas sendo carregadas para o cliente?
- [ ] As vendas têm natureza de operação que gera receita?
- [ ] Há produtos disponíveis no sistema?
- [ ] O cliente tem status mix cadastrado?
- [ ] As vendas têm o campo `data` preenchido?
- [ ] As datas das vendas estão dentro dos últimos 12 meses?

---

**Nota:** Este sistema de logs foi implementado especificamente para diagnosticar problemas nos indicadores. Após identificar e corrigir os problemas, alguns logs podem ser removidos ou simplificados para melhorar a performance em produção.
