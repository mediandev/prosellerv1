# Roadmap - Listas de Preço

## ✅ Implementado (v1.0)

### Funcionalidades Core
- [x] Cadastro completo de listas de preço
- [x] Gestão de produtos com preços individuais
- [x] Regras de comissionamento (Fixa e Conforme Desconto)
- [x] Faixas de desconto customizáveis
- [x] Edição de listas existentes
- [x] Exclusão de listas
- [x] Interface visual com cards informativos
- [x] Validações de formulário
- [x] Tipos TypeScript completos
- [x] Dados mockados para demonstração
- [x] Integração com configurações

### Estrutura de Dados
- [x] Type Produto
- [x] Type ListaPreco
- [x] Type ProdutoPreco
- [x] Type FaixaDesconto
- [x] Mock de 12 produtos
- [x] Mock de 4 listas de preço

### Documentação
- [x] README completo com todas as funcionalidades
- [x] Exemplos de integração com vendas
- [x] Cálculos de comissão detalhados
- [x] Roadmap de melhorias futuras

## 🚀 Próximas Funcionalidades (v1.1)

### Alta Prioridade

#### 1. Histórico de Alterações
**Objetivo:** Rastrear mudanças de preços e regras

```typescript
interface HistoricoAlteracaoPreco {
  id: string;
  listaPrecoId: string;
  produtoId: string;
  precoAnterior: number;
  precoNovo: number;
  data: Date;
  usuario: string;
  motivo?: string;
}
```

**Benefícios:**
- Auditoria completa
- Análise de tendências de preço
- Justificativa de alterações

#### 2. Vigência de Listas
**Objetivo:** Controlar período de validade das listas

```typescript
interface ListaPreco {
  // ... campos existentes
  dataInicio?: Date;
  dataFim?: Date;
  status: 'ativa' | 'agendada' | 'expirada';
}
```

**Benefícios:**
- Campanhas promocionais com data de término
- Reajustes programados
- Transição automática entre tabelas

#### 3. Duplicação de Listas
**Objetivo:** Facilitar criação de novas listas baseadas em existentes

**Funcionalidades:**
- Botão "Duplicar" em cada lista
- Dialog para ajustar nome e fazer modificações
- Copiar todos os produtos e preços
- Opção de aplicar percentual de reajuste geral

**Benefícios:**
- Agilidade na criação de listas
- Manutenção de padrões
- Reajustes de preço facilitados

#### 4. Importação/Exportação
**Objetivo:** Integração com planilhas Excel/CSV

**Formatos:**
```csv
Código Produto,Nome Produto,Preço
PROD001,Notebook Dell,3500.00
PROD002,Mouse Logitech,450.00
```

**Benefícios:**
- Atualização em massa de preços
- Backup de dados
- Integração com outros sistemas

### Média Prioridade

#### 5. Pesquisa e Filtros Avançados
**Funcionalidades:**
- Busca por nome da lista
- Filtro por tipo de comissão
- Filtro por status (ativa/inativa)
- Ordenação por data de criação
- Filtro por produtos incluídos

#### 6. Comparação de Listas
**Objetivo:** Comparar preços entre diferentes listas

**Interface:**
```
┌─────────────────────────────────────────────────┐
│ Produto          │ Tabela A  │ Tabela B  │ Dif  │
├─────────────────────────────────────────────────┤
│ Notebook Dell    │ R$ 3.500  │ R$ 3.200  │ -8%  │
│ Mouse Logitech   │ R$ 450    │ R$ 400    │ -11% │
└─────────────────────────────────────────────────┘
```

**Benefícios:**
- Análise de competitividade
- Identificação de discrepâncias
- Suporte à decisão de preços

#### 7. Ajuste em Massa de Preços
**Funcionalidades:**
- Aplicar percentual de reajuste em todos os produtos
- Aplicar valor fixo de aumento/redução
- Arredondamento automático
- Prévia antes de confirmar

**Interface:**
```
Reajuste: [___] % ou R$ [___]
Produtos afetados: 12
Preview:
  - Notebook: R$ 3.500 → R$ 3.850 (+10%)
  - Mouse: R$ 450 → R$ 495 (+10%)
```

#### 8. Margens de Lucro
**Objetivo:** Integrar com custos de produtos

```typescript
interface ProdutoPreco {
  produtoId: string;
  preco: number;
  custoProduto?: number;
  margemLucro?: number; // calculado
}
```

**Visualização:**
- Indicador visual de margem (verde/amarelo/vermelho)
- Relatório de rentabilidade da lista
- Alertas de margem baixa

### Baixa Prioridade

#### 9. Regras de Preço Dinâmicas
**Objetivo:** Preços baseados em regras

```typescript
interface RegraPreco {
  tipo: 'percentual_sobre_custo' | 'valor_fixo' | 'baseado_em_outra_lista';
  valor: number;
  listaBaseId?: string;
}
```

**Exemplos:**
- "Custo + 40% de markup"
- "Tabela Premium -10%"
- "Preço fixo de R$ 100"

#### 10. Categorização de Produtos na Lista
**Objetivo:** Organizar produtos por categoria

**Interface:**
```
Categoria: Periféricos
  - Mouse Logitech: R$ 450
  - Teclado Keychron: R$ 680
  
Categoria: Notebooks
  - Dell Inspiron: R$ 3.500
```

**Benefícios:**
- Melhor visualização
- Busca mais fácil
- Regras por categoria

#### 11. Alertas e Notificações
**Funcionalidades:**
- Alerta quando lista está próxima do vencimento
- Notificação de produto sem preço
- Alerta de margem de lucro baixa
- Notificação de listas não utilizadas

#### 12. Relatórios e Analytics
**Dashboards:**
- Listas mais utilizadas
- Produtos mais vendidos por lista
- Análise de rentabilidade
- Comparativo de comissões pagas
- Evolução de preços no tempo

## 🔧 Melhorias Técnicas

### Performance
- [ ] Paginação de produtos na lista
- [ ] Lazy loading de listas
- [ ] Cache de cálculos de comissão
- [ ] Otimização de queries

### UX/UI
- [ ] Arrastar e soltar produtos
- [ ] Atalhos de teclado
- [ ] Tour guiado para novos usuários
- [ ] Modo de visualização compacta
- [ ] Temas personalizáveis

### Segurança
- [ ] Permissões por usuário (quem pode editar listas)
- [ ] Log de auditoria
- [ ] Backup automático
- [ ] Versionamento de listas

### Integrações
- [ ] API REST para listas de preço
- [ ] Webhook para mudanças de preço
- [ ] Integração com ERP
- [ ] Sincronização com e-commerce

## 📊 Casos de Uso Avançados

### Caso 1: Tabelas Regionais
**Problema:** Preços diferentes por região

**Solução:**
```typescript
interface ListaPreco {
  // ... campos existentes
  regioes?: string[]; // ['Sul', 'Sudeste']
  freteDiferenciado?: boolean;
}
```

### Caso 2: Preços por Volume
**Problema:** Descontos progressivos por quantidade

**Solução:**
```typescript
interface FaixaVolume {
  quantidadeMin: number;
  quantidadeMax: number | null;
  desconto: number;
}

interface ProdutoPreco {
  produtoId: string;
  preco: number;
  faixasVolume?: FaixaVolume[];
}
```

**Exemplo:**
```
Notebook Dell:
  1-10 unidades: R$ 3.500
  11-50 unidades: R$ 3.300 (-5,7%)
  51+ unidades: R$ 3.100 (-11,4%)
```

### Caso 3: Combos e Kits
**Problema:** Preços especiais para conjunto de produtos

**Solução:**
```typescript
interface Combo {
  id: string;
  nome: string;
  produtos: Array<{
    produtoId: string;
    quantidade: number;
  }>;
  precoCombo: number;
  descontoAplicado: number;
}
```

### Caso 4: Preços Sazonais
**Problema:** Ajustes automáticos por época do ano

**Solução:**
```typescript
interface RegraPrecoSazonal {
  meses: number[]; // [6, 7, 8] = Jun, Jul, Ago
  ajustePercentual: number;
  aplicarAutomaticamente: boolean;
}
```

## 🎯 Métricas de Sucesso

### KPIs para Acompanhar

1. **Adoção**
   - Número de listas ativas
   - Número de produtos cadastrados
   - Vendas realizadas usando listas

2. **Eficiência**
   - Tempo médio para criar uma lista
   - Tempo médio para atualizar preços
   - Redução de erros em precificação

3. **Rentabilidade**
   - Margem média por lista
   - Comissões pagas vs. margem
   - Desconto médio aplicado

4. **Uso**
   - Listas mais utilizadas
   - Taxa de conversão por lista
   - Ticket médio por lista

## 💡 Ideias Futuras (Backlog)

### Inteligência Artificial
- Sugestão automática de preços baseada em histórico
- Previsão de demanda por produto
- Otimização de margens
- Análise de elasticidade de preço

### Gamificação
- Ranking de vendedores por lista
- Badges por metas de margem
- Desafios de vendas
- Recompensas por performance

### Mobile
- App mobile para consulta de preços
- Scanner de código de barras
- Aprovação de descontos via app
- Notificações push

### Colaboração
- Comentários em listas
- Aprovação de múltiplos níveis
- Workflow de aprovação de preços
- Compartilhamento entre equipes

## 📝 Notas de Implementação

### Priorização
1. Histórico de Alterações
2. Duplicação de Listas
3. Ajuste em Massa
4. Vigência de Listas
5. Importação/Exportação

### Dependências
- Backend/API para persistência
- Sistema de permissões de usuários
- Integração com módulo de produtos
- Integração com módulo de vendas

### Riscos e Mitigações
**Risco:** Alterações de preço afetando vendas em andamento
**Mitigação:** Congelar preços ao criar venda

**Risco:** Listas muito grandes (milhares de produtos)
**Mitigação:** Paginação e busca eficiente

**Risco:** Conflitos em edição simultânea
**Mitigação:** Lock otimista com versionamento

## 🔄 Processo de Evolução

### Sprint 1 (2 semanas)
- Histórico de alterações
- Duplicação de listas

### Sprint 2 (2 semanas)
- Ajuste em massa
- Importação/Exportação básica

### Sprint 3 (2 semanas)
- Vigência de listas
- Filtros avançados

### Sprint 4 (2 semanas)
- Comparação de listas
- Margens de lucro

## 📚 Recursos Adicionais

### Documentação Necessária
- [ ] Manual do usuário
- [ ] Guia de melhores práticas
- [ ] FAQ
- [ ] Vídeos tutoriais
- [ ] API Documentation

### Treinamento
- [ ] Webinar de lançamento
- [ ] Workshops práticos
- [ ] Materiais de referência rápida
- [ ] Casos de uso reais

---

**Versão:** 1.0  
**Última Atualização:** Outubro 2025  
**Próxima Revisão:** Dezembro 2025
