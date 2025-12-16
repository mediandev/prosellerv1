# Guia de Teste - Sistema de Metas Dinâmicas

## Como Testar o Sistema

### 1. Testar como Backoffice (Visão Geral)

**Login**: Use usuário backoffice (admin@empresa.com)

**O que verificar**:
- ✅ Dashboard mostra meta total de todos os vendedores (R$ 169.000/mês)
- ✅ Gráfico "Performance de Vendas" mostra metas calculadas automaticamente
- ✅ Card "Meta do Período" mostra porcentagem sobre meta total
- ✅ Card "Vendedores Ativos" está visível

**Metas semanais esperadas (período 30 dias)**:
- Semana 1: R$ 42.250
- Semana 2: R$ 42.250
- Semana 3: R$ 42.250
- Semana 4: R$ 42.250

**Metas diárias esperadas (período 7 dias)**:
- Segunda a Sexta: R$ 7.682/dia
- Sábado: R$ 4.609/dia
- Domingo: R$ 3.073/dia

### 2. Testar como Vendedor Individual

**Login**: Use qualquer vendedor (ex: joao@empresa.com - senha: senha123)

**João Silva (user-2)**:
- Meta mensal: R$ 35.000
- Metas semanais: R$ 8.750/semana
- Metas diárias: R$ 1.591/dia (seg-sex)

**O que verificar**:
- ✅ Dashboard mostra apenas sua meta individual (R$ 35.000)
- ✅ Gráfico mostra apenas suas vendas e metas
- ✅ Card "Meta do Período" calcula sobre sua meta individual
- ✅ Card "Vendedores Ativos" está OCULTO

### 3. Testar Filtros de Vendedores (Backoffice)

**Cenário**: Filtrar apenas João Silva e Maria Santos

**Metas esperadas**:
- Meta total: R$ 35.000 + R$ 30.000 = R$ 65.000/mês
- Metas semanais: R$ 16.250/semana
- Metas diárias: R$ 2.955/dia (seg-sex)

**Como testar**:
1. Faça login como backoffice
2. Clique em "Filtros" no dashboard
3. Selecione "João Silva" e "Maria Santos"
4. Verifique que as metas foram ajustadas

### 4. Verificar Sincronização de Dados

**Arquivo**: `/services/metasService.ts`

Verificar que as metas correspondem:
```typescript
João Silva: R$ 35.000 ✓
Maria Santos: R$ 30.000 ✓
Carlos Oliveira: R$ 28.000 ✓
Ana Paula: R$ 25.000 ✓
Pedro Costa: R$ 23.000 ✓
Fernanda Lima: R$ 28.000 ✓
Total: R$ 169.000 ✓
```

### 5. Testar Diferentes Períodos

**Período de 7 dias**:
- Deve mostrar metas diárias (Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
- Sábado e domingo com metas reduzidas

**Período de 30 dias / Mês atual**:
- Deve mostrar metas semanais (Sem 1, Sem 2, Sem 3, Sem 4)
- Distribuição uniforme

**Período de 90 dias**:
- Usa dados mockados (não calcula dinamicamente ainda)

**Período de 365 dias**:
- Usa dados mockados (não calcula dinamicamente ainda)

## Cenários de Teste Detalhados

### Cenário 1: Vendedor vê apenas suas metas

**Usuário**: João Silva (joao@empresa.com)

**Passos**:
1. Login no sistema
2. Ir para Dashboard
3. Verificar card "Meta do Período"

**Resultado esperado**:
- Meta mensal: R$ 35.000
- Se vendeu R$ 32.400, mostra 92% da meta
- Gráfico mostra apenas vendas de João Silva
- Linha de meta ajustada para R$ 8.750/semana

### Cenário 2: Backoffice filtra equipe específica

**Usuário**: Admin (admin@empresa.com)

**Passos**:
1. Login no sistema
2. Ir para Dashboard
3. Abrir filtros avançados
4. Selecionar: João Silva, Maria Santos, Carlos Oliveira

**Resultado esperado**:
- Meta total: R$ 93.000 (35k + 30k + 28k)
- Metas semanais: R$ 23.250/semana
- Porcentagem de meta calculada sobre R$ 93.000

### Cenário 3: Comparação período atual vs anterior

**Usuário**: Admin (admin@empresa.com)

**Passos**:
1. Selecionar período "Últimos 30 dias"
2. Verificar métricas com comparação

**Resultado esperado**:
- Vendas atuais comparadas com período anterior
- Meta permanece a mesma (R$ 169.000)
- Mudança percentual mostra variação de performance

## Validações Importantes

### ✅ Checklist de Validação

- [ ] Meta total de todos vendedores = R$ 169.000
- [ ] João Silva meta individual = R$ 35.000
- [ ] Maria Santos meta individual = R$ 30.000
- [ ] Gráfico 7 dias mostra 7 pontos de meta
- [ ] Gráfico 30 dias mostra 4 pontos de meta (semanas)
- [ ] Vendedor não vê card "Vendedores Ativos"
- [ ] Filtros ajustam metas automaticamente
- [ ] Porcentagem de meta calcula corretamente
- [ ] Metas sincronizadas entre GoalsTracking e metasService

## Problemas Conhecidos e Soluções

### Problema: Meta aparece como 0

**Causa**: ID do vendedor não corresponde ao sistema
**Solução**: Verificar mapeamento em `VENDEDOR_TO_USER_ID`

### Problema: Meta não muda ao aplicar filtro

**Causa**: Filtros não estão sendo propagados corretamente
**Solução**: Verificar `onFiltersChange` no DashboardMetrics

### Problema: Metas semanais diferentes entre gráfico e métricas

**Causa**: Diferentes fontes de dados
**Solução**: Ambos devem usar `metasService.ts`

## Próximos Passos de Teste

1. **Teste de Performance**: Verificar recálculo com muitos filtros
2. **Teste de Integração**: Adicionar novo vendedor e verificar propagação
3. **Teste de Edge Cases**: Vendedor sem meta, meta zerada, etc.
4. **Teste de Responsividade**: Verificar em mobile e desktop

## Logs Úteis para Debug

Adicionar no console do navegador:

```javascript
// Ver meta do vendedor logado
import { obterMetaVendedor } from './services/metasService';
console.log('Meta vendedor:', obterMetaVendedor('user-2'));

// Ver meta total
import { obterMetaMensalTotal } from './services/metasService';
console.log('Meta total:', obterMetaMensalTotal());

// Ver metas semanais
import { calcularMetasSemanais30Dias } from './services/metasService';
console.log('Metas semanais:', calcularMetasSemanais30Dias(35000, 'uniforme'));
```

## Contatos e Suporte

Em caso de dúvidas sobre o sistema de metas dinâmicas, consultar:
- `/SISTEMA_METAS_DINAMICAS.md` - Documentação completa
- `/services/metasService.ts` - Código fonte do serviço
- `/components/SalesChart.tsx` - Implementação no gráfico
- `/components/DashboardMetrics.tsx` - Implementação nas métricas
