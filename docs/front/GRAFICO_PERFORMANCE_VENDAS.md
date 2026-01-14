# Gráfico de Performance de Vendas - Documentação Completa

## Visão Geral

O gráfico de Performance de Vendas foi reformulado para fornecer uma visualização clara da evolução das vendas acumuladas ao longo do período selecionado, com linha de meta exibida apenas quando o período é compatível com metas mensais.

## Componentes do Gráfico

### 1. Linha de Vendas Acumuladas
- **Representação**: Linha sólida azul ou verde com pontos marcadores
- **Significado**: Evolução do total vendido acumulado ao longo do período
- **Características**:
  - **Azul (#3b82f6)**: Quando ainda não atingiu a meta (ou meta não aplicável)
  - **Verde (#22c55e)**: Quando a meta foi atingida/superada
  - Pontos marcadores (r: 5) em cada período
  - Espessura de 3px para destaque
  - Área preenchida com gradiente sutil abaixo da linha

### 2. Linha de Meta do Período (Condicional)
- **Representação**: Linha tracejada horizontal laranja ou verde
- **Significado**: Valor da meta para o período completo
- **Quando é exibida**: 
  - ✅ **Mês Atual** (current_month): Meta mensal
  - ✅ **90 dias** (trimestre): Meta trimestral (3x meta mensal)
  - ✅ **365 dias** (ano): Meta anual (12x meta mensal)
  - ❌ **7 dias**: NÃO exibida (período parcial)
  - ❌ **30 dias**: NÃO exibida (não é mês completo do calendário)
  - ❌ **Custom**: NÃO exibida (período arbitrário)
- **Características**:
  - **Laranja (#f59e0b)**: Meta ainda não atingida
  - **Verde (#22c55e)**: Meta atingida
  - Padrão tracejado (5px traço, 5px espaço)
  - Label indicando o valor: "Meta: R$ XXk"
  - Fixa no eixo Y do valor da meta

## Lógica de Exibição da Meta

### Períodos Compatíveis
```typescript
const isPeriodoComMeta = period === "current_month" || 
                         period === "90" || 
                         period === "365";
```

### Cálculo da Meta por Período
```typescript
switch (period) {
  case "current_month":
    return metaMensal;           // 1x meta mensal
  case "90":
    return metaMensal * 3;       // 3x meta mensal (trimestre)
  case "365":
    return metaMensal * 12;      // 12x meta mensal (ano)
  default:
    return metaMensal;
}
```

## Comportamento Dinâmico

### Período: Últimos 7 dias
```
┌─────────────────────────────────────────┐
│ Performance de Vendas                   │
│ Evolução das vendas acumuladas no       │
│ período selecionado                     │
├─────────────────────────────────────────┤
│                             ●───────●   │
│                    ●───────●            │
│           ●───────●                     │
│  ●───────●                (linha azul)  │
│  Seg Ter Qua Qui Sex Sáb Dom           │
│                                         │
│  SEM LINHA DE META                     │
└─────────────────────────────────────────┘
```

### Período: Mês Atual (Meta NÃO Atingida)
```
┌─────────────────────────────────────────┐
│ Performance de Vendas                   │
│ Evolução vs meta mensal R$ 169.000     │
├─────────────────────────────────────────┤
│                                         │
│     ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Meta: R$ 169k (🟠) │
│                      ●─────●            │
│              ●──────●        (linha     │
│      ●──────●                azul)      │
│  ●──●                                   │
│  Sem1 Sem2 Sem3 Sem4                   │
└─────────────────────────────────────────┘
```

### Período: Mês Atual (Meta Atingida)
```
┌─────────────────────────────────────────┐
│ Performance de Vendas                   │
│ Evolução vs meta mensal R$ 169.000     │
├─────────────────────────────────────────┤
│                              ●────●     │
│                      ●──────●           │
│              ●──────●        (linha     │
│     ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Meta: R$ 169k (🟢) │
│  ●──●                        verde)     │
│  Sem1 Sem2 Sem3 Sem4                   │
└─────────────────────────────────────────┘
```

### Período: Trimestre (90 dias)
```
┌─────────────────────────────────────────┐
│ Performance de Vendas                   │
│ Evolução vs meta trimestral R$ 507.000 │
├─────────────────────────────────────────┤
│                              ●          │
│                      ●──────●           │
│     ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Meta: R$ 507k (🟠) │
│  ●──────●                    (linha     │
│  Mês1   Mês2   Mês3          azul)     │
│                                         │
│  Meta = 169k × 3 meses = 507k          │
└─────────────────────────────────────────┘
```

### Período: Ano (365 dias)
```
┌─────────────────────────────────────────┐
│ Performance de Vendas                   │
│ Evolução vs meta anual R$ 2.028.000    │
├─────────────────────────────────────────┤
│              ●──●──●──●                 │
│          ●──●                           │
│  ●──●──●                    (linha      │
│     ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ Meta: R$ 2.028k    │
│  Jan Fev ... Out Nov Dez    azul)      │
│                                         │
│  Meta = 169k × 12 meses = 2.028k       │
└─────────────────────────────────────────┘
```

## Lógica de Cores

### Linha de Vendas Acumuladas
```typescript
const metaAtingida = isPeriodoComMeta && 
                     vendasAcumuladas[último] >= metaPeriodo;
const corLinha = metaAtingida ? "#22c55e" : "#3b82f6";
```

### Linha de Meta
```typescript
const corMeta = metaAtingida ? "#22c55e" : "#f59e0b";
```

## Cálculo de Vendas Acumuladas

```typescript
let acumulado = 0;
const dataWithAccumulated = grouped.map(g => {
  acumulado += g.vendas;
  return {
    periodo: g.periodo,
    vendasAcumuladas: acumulado
  };
});
```

**Exemplo prático** (Mês Atual - 4 semanas):
```
Sem 1: R$ 78.000  → Acumulado: R$ 78.000
Sem 2: R$ 92.000  → Acumulado: R$ 170.000
Sem 3: R$ 105.250 → Acumulado: R$ 275.250
Sem 4: R$ 112.000 → Acumulado: R$ 387.250

Meta Mensal: R$ 169.000
Status: ✓ Meta atingida na Semana 2!
```

## Integração com Sistema de Permissões

### Para Vendedor Logado
```typescript
// Meta individual
metaMensal = obterMetaVendedor(usuario.id); // Ex: R$ 35.000

// Para trimestre
metaTrimestral = 35.000 × 3 = R$ 105.000

// Para ano
metaAnual = 35.000 × 12 = R$ 420.000
```

**Exemplo**: João Silva (Meta R$ 35.000/mês)
- **Mês atual**: Meta de R$ 35.000
- **Trimestre**: Meta de R$ 105.000
- **Ano**: Meta de R$ 420.000

### Para Backoffice com Filtros
```typescript
// Soma das metas dos vendedores filtrados
metaMensal = soma([João: 35k, Maria: 30k]) = R$ 65.000

// Para trimestre
metaTrimestral = 65.000 × 3 = R$ 195.000
```

**Exemplo**: Filtro João + Maria
- **Mês atual**: Meta combinada R$ 65.000
- **Trimestre**: Meta combinada R$ 195.000
- **Ano**: Meta combinada R$ 780.000

### Para Backoffice sem Filtros
```typescript
// Meta total da equipe
metaMensal = obterMetaMensalTotal(); // R$ 169.000

// Para trimestre
metaTrimestral = 169.000 × 3 = R$ 507.000

// Para ano  
metaAnual = 169.000 × 12 = R$ 2.028.000
```

## Descrição Dinâmica do Card

A descrição muda automaticamente baseada no período:

### Sem Meta (7 dias, 30 dias, custom)
```
"Evolução das vendas acumuladas no período selecionado"
```

### Com Meta - Mês Atual
```
"Evolução das vendas acumuladas vs meta mensal de R$ 169.000"
```

### Com Meta - Trimestre
```
"Evolução das vendas acumuladas vs meta trimestral de R$ 507.000"
```

### Com Meta - Ano
```
"Evolução das vendas acumuladas vs meta anual de R$ 2.028.000"
```

## Tooltip Interativo

Ao passar o mouse sobre qualquer ponto do gráfico:

```
┌─────────────────────────┐
│ Sem 3                   │
├─────────────────────────┤
│ Vendas Acumuladas       │
│ R$ 275.250              │
└─────────────────────────┘
```

## Casos de Uso

### Caso 1: Acompanhamento Semanal (7 dias)
**Cenário**: Vendedor quer ver evolução da semana atual

**Visualização**:
- Linha acumulada mostrando crescimento diário
- SEM linha de meta (período não compatível)
- Foco na tendência de crescimento

**Interpretação**:
- Linha ascendente → Bom ritmo de vendas
- Linha estável → Vendas estagnadas
- Identificar dias de pico

### Caso 2: Performance Mensal
**Cenário**: Gestor quer ver se equipe vai bater meta do mês

**Visualização**:
- Linha acumulada por semana (4 pontos)
- Linha de meta mensal fixa (ex: R$ 169.000)
- Cor indica status (azul ou verde)

**Interpretação**:
- Linha abaixo da meta → Equipe precisa acelerar
- Linha cruza a meta → Meta atingida! 🎉
- Ver em qual semana atingiu a meta

### Caso 3: Análise Trimestral
**Cenário**: Diretoria quer ver performance do trimestre

**Visualização**:
- Linha acumulada por mês (3 pontos)
- Linha de meta trimestral (3× meta mensal)
- Visão macro do período

**Interpretação**:
- Comparar com meta de 3 meses
- Identificar meses fortes/fracos
- Projetar resultado final do trimestre

### Caso 4: Visão Anual
**Cenário**: CEO quer ver performance do ano

**Visualização**:
- Linha acumulada por mês (12 pontos)
- Linha de meta anual (12× meta mensal)
- Visão estratégica completa

**Interpretação**:
- Avaliar sazonalidade
- Identificar períodos críticos
- Planejar ações para próximo ano

## Vantagens do Novo Design

### ✅ Clareza
- Foco na evolução acumulada
- Meta visível apenas quando faz sentido
- Sem poluição visual

### ✅ Adaptabilidade
- Funciona para qualquer período
- Meta calculada automaticamente
- Descrição contextual

### ✅ Insights Rápidos
- Ver tendência de crescimento
- Identificar quando atingiu meta
- Comparar períodos facilmente

### ✅ Inteligência
- Não mostra meta em períodos incompatíveis
- Multiplica meta para trimestre/ano
- Respeita permissões de usuário

## Exemplos de Multiplicação de Meta

### Vendedor Individual (Meta: R$ 35.000/mês)

| Período | Cálculo | Meta Exibida | Linha Visível? |
|---------|---------|--------------|----------------|
| 7 dias | N/A | - | ❌ Não |
| 30 dias | N/A | - | ❌ Não |
| Mês Atual | 35.000 × 1 | R$ 35.000 | ✅ Sim |
| Trimestre | 35.000 × 3 | R$ 105.000 | ✅ Sim |
| Ano | 35.000 × 12 | R$ 420.000 | ✅ Sim |

### Equipe Completa (Meta: R$ 169.000/mês)

| Período | Cálculo | Meta Exibida | Linha Visível? |
|---------|---------|--------------|----------------|
| 7 dias | N/A | - | ❌ Não |
| 30 dias | N/A | - | ❌ Não |
| Mês Atual | 169.000 × 1 | R$ 169.000 | ✅ Sim |
| Trimestre | 169.000 × 3 | R$ 507.000 | ✅ Sim |
| Ano | 169.000 × 12 | R$ 2.028.000 | ✅ Sim |

### Filtro João + Maria (Meta: R$ 65.000/mês)

| Período | Cálculo | Meta Exibida | Linha Visível? |
|---------|---------|--------------|----------------|
| 7 dias | N/A | - | ❌ Não |
| 30 dias | N/A | - | ❌ Não |
| Mês Atual | 65.000 × 1 | R$ 65.000 | ✅ Sim |
| Trimestre | 65.000 × 3 | R$ 195.000 | ✅ Sim |
| Ano | 65.000 × 12 | R$ 780.000 | ✅ Sim |

## Responsividade

- **Desktop**: Gráfico com 350px de altura, labels legíveis
- **Tablet**: Mantém proporções, reduz tamanho de fonte se necessário
- **Mobile**: ResponsiveContainer adapta largura automaticamente

## Configuração Visual

### Gradiente da Área
```typescript
<linearGradient id="colorVendasAcumuladas" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor={cor} stopOpacity={0.3}/>
  <stop offset="95%" stopColor={cor} stopOpacity={0}/>
</linearGradient>
```

### Pontos da Linha
```typescript
dot={{ fill: cor, r: 5 }}          // Ponto normal
activeDot={{ r: 7 }}                // Ponto ao passar mouse
```

### Linha de Meta
```typescript
strokeDasharray="5 5"               // Padrão tracejado
strokeWidth={2}                     // Espessura da linha
```

## Manutenção

### Adicionar Novo Período Compatível com Meta
```typescript
const isPeriodoComMeta = period === "current_month" || 
                         period === "90" || 
                         period === "365" ||
                         period === "semestre"; // Novo período

// Adicionar cálculo da meta
switch (period) {
  case "semestre":
    return metaMensal * 6; // 6 meses
}
```

### Modificar Cores
```typescript
// Linha de vendas
stroke={metaAtingida ? "#22c55e" : "#3b82f6"}

// Linha de meta
stroke={metaAtingida ? "#22c55e" : "#f59e0b"}
```

### Ajustar Altura do Gráfico
```typescript
<ResponsiveContainer width="100%" height={350}>
```

## Troubleshooting

### Problema: Meta não aparece no mês atual
**Solução**: Verificar se `isPeriodoComMeta` está true para "current_month"
```typescript
console.log('Período:', period);
console.log('Compatível com meta?', isPeriodoComMeta);
console.log('Meta calculada:', metaPeriodo);
```

### Problema: Meta calculada incorretamente para trimestre
**Solução**: Verificar multiplicador no switch
```typescript
case "90":
  return metaMensal * 3; // Deve ser 3 para trimestre
```

### Problema: Linha não muda de cor ao atingir meta
**Solução**: Verificar cálculo de `metaAtingida`
```typescript
console.log('Último valor acumulado:', data[data.length - 1].vendasAcumuladas);
console.log('Meta do período:', metaPeriodo);
console.log('Meta atingida?', metaAtingida);
```

## Benefícios da Arquitetura

1. **Simplicidade**: Apenas uma linha de vendas acumuladas
2. **Clareza**: Meta só aparece quando faz sentido
3. **Flexibilidade**: Suporta qualquer período
4. **Escalabilidade**: Fácil adicionar novos períodos
5. **Manutenibilidade**: Código limpo e bem documentado
