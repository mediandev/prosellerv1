# 🗺️ Roadmap de Desenvolvimento - ProSeller V1

**Data de Criação:** 2025-01-16  
**Versão:** 1.0  
**Status:** 📋 Planejamento

---

## 📋 Sumário Executivo

Este roadmap detalha todas as etapas necessárias para integrar completamente o frontend React com o banco de dados Supabase, seguindo a arquitetura em camadas definida nas regras do projeto (Edge Functions → RPC → Tabelas com RLS).

### Objetivos Principais

1. ✅ Aplicar migrations do banco de dados
2. 🔧 Criar Edge Functions para todas as operações
3. 🔧 Criar Funções RPC faltantes
4. 🔧 Atualizar frontend para usar novas APIs
5. ✅ Implementar autenticação completa
6. ✅ Testar e validar integração

---

## 🎯 Fases do Desenvolvimento

### **FASE 1: Preparação e Aplicação de Migrations** ⏱️ ~2-3 dias

#### 1.1 Revisão e Aprovação de Migrations

- [ ] Revisar todas as migrations SQL criadas
- [ ] Validar impactos em dados existentes
- [ ] Criar backup completo do banco
- [ ] Aprovar migrations para aplicação

**Arquivos:**
- `supabase/migrations/001_fix_campos_obrigatorios.sql`
- `supabase/migrations/002_fix_relacoes_fks.sql`
- `supabase/migrations/003_add_indices.sql`
- `supabase/migrations/004_fix_rls_policies.sql`

#### 1.2 Aplicação em Ambiente de Desenvolvimento

- [ ] Aplicar migrations em ordem sequencial
- [ ] Validar que todas aplicaram com sucesso
- [ ] Verificar integridade de dados
- [ ] Testar queries básicas

**Comandos:**
```bash
# Via Supabase CLI
supabase db reset
supabase migration up

# Ou via SQL direto
psql -h <host> -U <user> -d <database> -f supabase/migrations/001_fix_campos_obrigatorios.sql
# ... (repetir para cada migration)
```

#### 1.3 Validação Pós-Migration

- [ ] Verificar campos adicionados
- [ ] Verificar Foreign Keys criadas
- [ ] Verificar índices criados
- [ ] Verificar políticas RLS
- [ ] Testar permissões (vendedor vs backoffice)

**Checklist:**
- [ ] Campos obrigatórios presentes em todas as tabelas
- [ ] FKs impedem inserções inválidas
- [ ] Índices melhoram performance de queries
- [ ] RLS bloqueia acesso não autorizado

---

### **FASE 2: Criação de Funções RPC** ⏱️ ~5-7 dias

#### 2.1 Funções RPC para Usuários

**Arquivo:** `supabase/migrations/005_rpc_usuarios.sql`

- [ ] `create_user` - Criar usuário
- [ ] `update_user` - Atualizar usuário
- [ ] `delete_user` - Deletar usuário (soft delete)
- [ ] `get_user_by_id` - Buscar usuário por ID
- [ ] `list_users` - Listar usuários (com filtros)

**Responsabilidades:**
- Validação de email único
- Validação de tipo (backoffice/vendedor)
- Soft delete
- Auditoria (created_at, updated_at)

#### 2.2 Funções RPC para Vendedores

**Arquivo:** `supabase/migrations/006_rpc_vendedores.sql`

- [ ] `create_vendedor` - Criar vendedor
- [ ] `update_vendedor` - Atualizar vendedor
- [ ] `delete_vendedor` - Deletar vendedor (soft delete)
- [ ] `get_vendedor_by_id` - Buscar vendedor por ID
- [ ] `list_vendedores` - Listar vendedores (com filtros)
- [ ] `get_vendedor_completo` - Buscar vendedor com todos os dados relacionados

**Responsabilidades:**
- Validação de CPF/CNPJ
- Criação automática de iniciais
- Validação de dados bancários (se JSONB)
- Relação com tabela `user`

#### 2.3 Funções RPC para Clientes

**Arquivo:** `supabase/migrations/007_rpc_clientes.sql`

- [ ] `create_cliente` - Criar cliente
- [ ] `update_cliente` - Atualizar cliente
- [ ] `delete_cliente` - Deletar cliente (soft delete)
- [ ] `get_cliente_by_id` - Buscar cliente por ID
- [ ] `list_clientes` - Listar clientes (já existe, revisar)
- [ ] `aprovar_cliente` - Aprovar cliente pendente
- [ ] `rejeitar_cliente` - Rejeitar cliente pendente
- [ ] `get_cliente_completo` - Buscar cliente com contatos, endereços, etc.

**Responsabilidades:**
- Validação de CPF/CNPJ
- Geração automática de código (se modo automático)
- Criação de registros relacionados (contato, endereço)
- Workflow de aprovação
- Atribuição de vendedores

#### 2.4 Funções RPC para Produtos

**Arquivo:** `supabase/migrations/008_rpc_produtos.sql`

- [ ] `create_produto` - Criar produto
- [ ] `update_produto` - Atualizar produto
- [ ] `delete_produto` - Deletar produto (soft delete)
- [ ] `get_produto_by_id` - Buscar produto por ID
- [ ] `list_produtos` - Listar produtos (já existe, revisar)
- [ ] `search_produtos` - Buscar produtos (por SKU, descrição, etc.)

**Responsabilidades:**
- Validação de SKU único
- Desnormalização de nomes (marca, tipo, unidade)
- Validação de pesos (bruto >= líquido)
- Atualização de campos calculados

#### 2.5 Funções RPC para Pedidos/Vendas

**Arquivo:** `supabase/migrations/009_rpc_pedidos.sql`

- [ ] `create_pedido_venda` - Criar pedido de venda
- [ ] `update_pedido_venda` - Atualizar pedido
- [ ] `delete_pedido_venda` - Deletar pedido (soft delete)
- [ ] `get_pedido_venda_by_id` - Buscar pedido por ID
- [ ] `list_pedidos_venda` - Listar pedidos (já existe, revisar)
- [ ] `calcular_totais_pedido` - Calcular totais do pedido

**Responsabilidades:**
- Criação atômica de pedido + produtos
- Cálculo automático de totais
- Desnormalização de dados (nomes, etc.)
- Validação de estoque (se aplicável)
- Geração de comissão (trigger ou função)

#### 2.6 Funções RPC para Comissões (Novo Modelo)

**Arquivo:** `supabase/migrations/010_rpc_comissoes.sql`

- [ ] `create_comissao_venda` - Criar comissão individual
- [ ] `update_comissao_venda` - Editar comissão (transferir período)
- [ ] `create_lancamento_manual` - Criar lançamento manual
- [ ] `update_lancamento_manual` - Editar lançamento manual
- [ ] `create_pagamento_periodo` - Registrar pagamento
- [ ] `update_pagamento_periodo` - Editar pagamento
- [ ] `create_relatorio_periodo_comissoes` - Criar relatório
- [ ] `update_relatorio_periodo_comissoes` - Atualizar relatório
- [ ] `get_relatorio_comissoes_completo` - Buscar relatório completo
- [ ] `calcular_valor_liquido_periodo` - Calcular valor líquido
- [ ] `fechar_periodo_comissoes` - Fechar período e transportar saldo

**Responsabilidades:**
- Modelo de períodos (mensal/anual)
- Transferência de lançamentos entre períodos
- Cálculo de saldo transportado
- Auditoria de edições
- Validação de regras de comissão

#### 2.7 Funções RPC para Metas

**Arquivo:** `supabase/migrations/011_rpc_metas.sql`

- [ ] `create_meta_vendedor` - Criar meta
- [ ] `update_meta_vendedor` - Atualizar meta
- [ ] `delete_meta_vendedor` - Deletar meta
- [ ] `get_meta_vendedor` - Buscar meta específica
- [ ] `list_metas_vendedor` - Listar metas de um vendedor
- [ ] `calcular_progresso_meta` - Calcular progresso da meta

**Responsabilidades:**
- Validação de mês (1-12)
- Validação de valores positivos
- Cálculo de progresso em tempo real

---

### **FASE 3: Criação de Edge Functions** ⏱️ ~7-10 dias

#### 3.1 Estrutura Base de Edge Functions

**Arquivo:** `supabase/functions/_shared/auth.ts`

- [ ] Helper para validação de JWT
- [ ] Helper para verificar tipo de usuário
- [ ] Helper para verificar permissões
- [ ] Helper para tratamento de erros

**Arquivo:** `supabase/functions/_shared/validation.ts`

- [ ] Schemas de validação (Zod ou similar)
- [ ] Validação de CPF/CNPJ
- [ ] Validação de email
- [ ] Validação de valores monetários

**Arquivo:** `supabase/functions/_shared/types.ts`

- [ ] Tipos TypeScript compartilhados
- [ ] Interfaces de request/response
- [ ] Tipos de erro padronizados

#### 3.2 Edge Functions para Usuários

**Arquivo:** `supabase/functions/create-user/index.ts`

- [ ] Validação de input
- [ ] Verificação de email único
- [ ] Chamada RPC `create_user`
- [ ] Retorno formatado

**Arquivo:** `supabase/functions/update-user/index.ts`
**Arquivo:** `supabase/functions/delete-user/index.ts`
**Arquivo:** `supabase/functions/get-user/index.ts`
**Arquivo:** `supabase/functions/list-users/index.ts`

#### 3.3 Edge Functions para Vendedores

**Arquivo:** `supabase/functions/create-vendedor/index.ts`

- [ ] Validação de dados completos
- [ ] Validação de CPF/CNPJ
- [ ] Criação de usuário associado (se necessário)
- [ ] Chamada RPC `create_vendedor`
- [ ] Retorno formatado

**Arquivo:** `supabase/functions/update-vendedor/index.ts`
**Arquivo:** `supabase/functions/delete-vendedor/index.ts`
**Arquivo:** `supabase/functions/get-vendedor/index.ts`
**Arquivo:** `supabase/functions/list-vendedores/index.ts`

#### 3.4 Edge Functions para Clientes

**Arquivo:** `supabase/functions/create-cliente/index.ts`

- [ ] Validação de dados cadastrais
- [ ] Validação de CPF/CNPJ
- [ ] Validação de endereço
- [ ] Validação de contatos
- [ ] Chamada RPC `create_cliente`
- [ ] Retorno formatado

**Arquivo:** `supabase/functions/update-cliente/index.ts`
**Arquivo:** `supabase/functions/delete-cliente/index.ts`
**Arquivo:** `supabase/functions/get-cliente/index.ts`
**Arquivo:** `supabase/functions/list-clientes/index.ts` (atualizar existente)
**Arquivo:** `supabase/functions/aprovar-cliente/index.ts`
**Arquivo:** `supabase/functions/rejeitar-cliente/index.ts`

#### 3.5 Edge Functions para Produtos

**Arquivo:** `supabase/functions/create-produto/index.ts`

- [ ] Validação de dados do produto
- [ ] Validação de SKU único
- [ ] Validação de pesos
- [ ] Chamada RPC `create_produto`
- [ ] Retorno formatado

**Arquivo:** `supabase/functions/update-produto/index.ts`
**Arquivo:** `supabase/functions/delete-produto/index.ts`
**Arquivo:** `supabase/functions/get-produto/index.ts`
**Arquivo:** `supabase/functions/list-produtos/index.ts` (atualizar existente)
**Arquivo:** `supabase/functions/search-produtos/index.ts`

#### 3.6 Edge Functions para Pedidos/Vendas

**Arquivo:** `supabase/functions/create-pedido-venda/index.ts`

- [ ] Validação de dados do pedido
- [ ] Validação de itens
- [ ] Validação de totais
- [ ] Chamada RPC `create_pedido_venda`
- [ ] Retorno formatado

**Arquivo:** `supabase/functions/update-pedido-venda/index.ts`
**Arquivo:** `supabase/functions/delete-pedido-venda/index.ts`
**Arquivo:** `supabase/functions/get-pedido-venda/index.ts`
**Arquivo:** `supabase/functions/list-pedidos-venda/index.ts` (atualizar existente)

#### 3.7 Edge Functions para Comissões

**Arquivo:** `supabase/functions/create-comissao-venda/index.ts`
**Arquivo:** `supabase/functions/update-comissao-venda/index.ts`
**Arquivo:** `supabase/functions/create-lancamento-manual/index.ts`
**Arquivo:** `supabase/functions/update-lancamento-manual/index.ts`
**Arquivo:** `supabase/functions/create-pagamento-periodo/index.ts`
**Arquivo:** `supabase/functions/update-pagamento-periodo/index.ts`
**Arquivo:** `supabase/functions/create-relatorio-comissoes/index.ts`
**Arquivo:** `supabase/functions/update-relatorio-comissoes/index.ts`
**Arquivo:** `supabase/functions/get-relatorio-comissoes-completo/index.ts`
**Arquivo:** `supabase/functions/fechar-periodo-comissoes/index.ts`

#### 3.8 Edge Functions para Metas

**Arquivo:** `supabase/functions/create-meta-vendedor/index.ts`
**Arquivo:** `supabase/functions/update-meta-vendedor/index.ts`
**Arquivo:** `supabase/functions/delete-meta-vendedor/index.ts`
**Arquivo:** `supabase/functions/get-meta-vendedor/index.ts`
**Arquivo:** `supabase/functions/list-metas-vendedor/index.ts`

---

### **FASE 4: Atualização do Frontend** ⏱️ ~10-14 dias

#### 4.1 Atualização do Serviço de API

**Arquivo:** `src/services/api.ts`

- [ ] Remover implementações mock
- [ ] Implementar chamadas para Edge Functions
- [ ] Adicionar tratamento de erros adequado
- [ ] Adicionar retry logic
- [ ] Adicionar loading states

**Estrutura:**
```typescript
// Exemplo de implementação
export const api = {
  auth: {
    signup: async (email, password, nome, tipo) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, password, nome, tipo })
      });
      // ... tratamento
    }
  },
  // ... outras operações
};
```

#### 4.2 Atualização de Tipos TypeScript

**Arquivo:** `src/types/user.ts`

- [ ] Adicionar campos novos do banco
- [ ] Ajustar tipos conforme migrations
- [ ] Adicionar tipos de resposta da API

**Arquivo:** `src/types/seller.ts`
**Arquivo:** `src/types/customer.ts`
**Arquivo:** `src/types/produto.ts`
**Arquivo:** `src/types/venda.ts`
**Arquivo:** `src/types/comissao.ts`

#### 4.3 Atualização de Componentes - Usuários

**Arquivo:** `src/components/UserProfilePage.tsx`

- [ ] Atualizar para usar novos campos
- [ ] Adicionar campo `email`
- [ ] Adicionar campo `tipo`
- [ ] Adicionar campo `ativo`
- [ ] Adicionar campo `ultimo_acesso`

#### 4.4 Atualização de Componentes - Vendedores

**Arquivo:** `src/components/TeamManagement.tsx`

- [ ] Atualizar para usar novos campos
- [ ] Adicionar campos: `iniciais`, `data_admissao`, `status`
- [ ] Adicionar campos PJ: `cnpj`, `razao_social`, `inscricao_estadual`
- [ ] Adicionar campo `observacoes_internas`

**Arquivo:** `src/components/SellerFormPage.tsx`

- [ ] Atualizar formulário completo
- [ ] Adicionar validações de novos campos
- [ ] Integrar com Edge Functions

#### 4.5 Atualização de Componentes - Clientes

**Arquivo:** `src/components/CustomersListPage.tsx`

- [ ] Atualizar para usar novos campos
- [ ] Adicionar filtro por `status_aprovacao`
- [ ] Adicionar coluna de código
- [ ] Adicionar coluna de grupo/rede

**Arquivo:** `src/components/CustomerFormPage.tsx`

- [ ] Adicionar campos: `codigo`, `grupo_rede`
- [ ] Adicionar campos: `desconto_financeiro`, `pedido_minimo`
- [ ] Adicionar workflow de aprovação
- [ ] Adicionar campos de auditoria (criado_por, etc.)
- [ ] Integrar com Edge Functions de aprovação

**Arquivo:** `src/components/PendingCustomersApproval.tsx`

- [ ] Atualizar para usar novos campos de aprovação
- [ ] Adicionar botões de aprovar/rejeitar
- [ ] Adicionar campo de motivo de rejeição
- [ ] Integrar com Edge Functions

#### 4.6 Atualização de Componentes - Produtos

**Arquivo:** `src/components/ProductsListPage.tsx`

- [ ] Atualizar para usar novos campos
- [ ] Adicionar filtro por `situacao`
- [ ] Adicionar filtro por `disponivel`
- [ ] Adicionar coluna de foto

**Arquivo:** `src/components/ProductFormPage.tsx`

- [ ] Adicionar campo `foto`
- [ ] Adicionar campo `situacao`
- [ ] Adicionar campo `ativo`
- [ ] Adicionar campo `disponivel`
- [ ] Atualizar validações

#### 4.7 Atualização de Componentes - Vendas

**Arquivo:** `src/components/SalesPage.tsx`

- [ ] Atualizar para usar novos campos desnormalizados
- [ ] Adicionar colunas de nomes (cliente, vendedor, etc.)
- [ ] Atualizar filtros

**Arquivo:** `src/components/SaleFormPage.tsx`

- [ ] Atualizar para usar novos campos
- [ ] Adicionar campos de totais calculados
- [ ] Adicionar campos desnormalizados
- [ ] Atualizar validações
- [ ] Integrar com Edge Functions

#### 4.8 Atualização de Componentes - Comissões

**Arquivo:** `src/components/CommissionsManagement.tsx`

- [ ] Atualizar para novo modelo de períodos
- [ ] Adicionar visualização de períodos
- [ ] Adicionar transferência entre períodos
- [ ] Adicionar saldo transportado

**Arquivo:** `src/components/SellerCommissionsPage.tsx`

- [ ] Atualizar para novo modelo
- [ ] Adicionar lançamentos manuais
- [ ] Adicionar pagamentos
- [ ] Adicionar relatórios de período

#### 4.9 Atualização de Componentes - Metas

**Arquivo:** `src/components/MetasManagement.tsx`

- [ ] Atualizar para usar UUID em vez de VARCHAR
- [ ] Atualizar para usar INTEGER em vez de VARCHAR para mês
- [ ] Adicionar validações

**Arquivo:** `src/components/GoalsTracking.tsx`

- [ ] Atualizar para novos tipos
- [ ] Adicionar cálculos de progresso

#### 4.10 Atualização de Autenticação

**Arquivo:** `src/contexts/AuthContext.tsx`

- [ ] Remover autenticação mock
- [ ] Implementar autenticação real com Supabase Auth
- [ ] Adicionar refresh token
- [ ] Adicionar logout
- [ ] Adicionar verificação de tipo de usuário

**Arquivo:** `src/components/LoginPage.tsx`

- [ ] Integrar com Supabase Auth
- [ ] Adicionar tratamento de erros
- [ ] Adicionar loading states

---

### **FASE 5: Testes e Validação** ⏱️ ~5-7 dias

#### 5.1 Testes Unitários

- [ ] Testes para funções RPC
- [ ] Testes para Edge Functions
- [ ] Testes para componentes React
- [ ] Testes para serviços de API

#### 5.2 Testes de Integração

- [ ] Teste completo de fluxo de criação de cliente
- [ ] Teste completo de fluxo de criação de venda
- [ ] Teste completo de fluxo de comissões
- [ ] Teste de aprovação de clientes
- [ ] Teste de permissões RLS

#### 5.3 Testes de Performance

- [ ] Teste de queries com índices
- [ ] Teste de carga em Edge Functions
- [ ] Teste de tempo de resposta
- [ ] Otimização de queries lentas

#### 5.4 Testes de Segurança

- [ ] Teste de RLS policies
- [ ] Teste de validação de inputs
- [ ] Teste de autenticação/autorização
- [ ] Teste de SQL injection
- [ ] Teste de XSS

#### 5.5 Testes de Usabilidade

- [ ] Teste com usuários reais
- [ ] Coleta de feedback
- [ ] Ajustes de UX
- [ ] Correção de bugs

---

### **FASE 6: Deploy e Monitoramento** ⏱️ ~2-3 dias

#### 6.1 Deploy em Produção

- [ ] Aplicar migrations em produção
- [ ] Deploy de Edge Functions
- [ ] Deploy de frontend
- [ ] Verificar funcionamento

#### 6.2 Monitoramento

- [ ] Configurar logs
- [ ] Configurar alertas
- [ ] Configurar métricas
- [ ] Dashboard de monitoramento

#### 6.3 Documentação Final

- [ ] Documentar APIs
- [ ] Documentar fluxos
- [ ] Documentar troubleshooting
- [ ] Atualizar README

---

## 📊 Cronograma Estimado

| Fase | Duração | Dependências |
|------|---------|--------------|
| Fase 1: Migrations | 2-3 dias | - |
| Fase 2: RPC Functions | 5-7 dias | Fase 1 |
| Fase 3: Edge Functions | 7-10 dias | Fase 2 |
| Fase 4: Frontend | 10-14 dias | Fase 3 |
| Fase 5: Testes | 5-7 dias | Fase 4 |
| Fase 6: Deploy | 2-3 dias | Fase 5 |
| **TOTAL** | **31-44 dias** | ~6-8 semanas |

---

## 🎯 Prioridades

### 🔴 Crítico (Fazer Primeiro)

1. **Aplicar Migrations** - Base para tudo
2. **Criar RPCs de CRUD Básico** - Clientes, Vendedores, Produtos
3. **Criar Edge Functions Básicas** - CRUD essencial
4. **Atualizar Frontend Básico** - Listagens e formulários principais

### 🟡 Importante (Fazer Depois)

1. **Sistema de Comissões** - Modelo novo complexo
2. **Workflow de Aprovação** - Clientes pendentes
3. **Sistema de Metas** - Cálculos e progresso
4. **Relatórios** - Dependem de dados corretos

### 🟢 Melhoria (Fazer Por Último)

1. **Otimizações de Performance**
2. **Melhorias de UX**
3. **Features Adicionais**
4. **Documentação Avançada**

---

## 📝 Checklist de Validação por Fase

### ✅ Fase 1 - Migrations

- [ ] Todas as migrations aplicadas sem erros
- [ ] Campos obrigatórios presentes
- [ ] Foreign Keys funcionando
- [ ] Índices criados
- [ ] RLS policies ativas
- [ ] Dados existentes preservados

### ✅ Fase 2 - RPC Functions

- [ ] Todas as funções RPC criadas
- [ ] Validações implementadas
- [ ] Tratamento de erros adequado
- [ ] Comentários de documentação
- [ ] Testes unitários passando

### ✅ Fase 3 - Edge Functions

- [ ] Todas as Edge Functions criadas
- [ ] Autenticação funcionando
- [ ] Validação de inputs
- [ ] CORS configurado
- [ ] Tratamento de erros
- [ ] Logs adequados

### ✅ Fase 4 - Frontend

- [ ] Todos os componentes atualizados
- [ ] Tipos TypeScript corretos
- [ ] Integração com APIs funcionando
- [ ] Loading states implementados
- [ ] Tratamento de erros no UI
- [ ] Validações de formulários

### ✅ Fase 5 - Testes

- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Performance adequada
- [ ] Segurança validada
- [ ] Usabilidade testada

### ✅ Fase 6 - Deploy

- [ ] Deploy em produção bem-sucedido
- [ ] Monitoramento configurado
- [ ] Documentação atualizada
- [ ] Equipe treinada

---

## 🚨 Riscos e Mitigações

### Riscos Identificados

1. **Quebra de Funcionalidades Existentes**
   - **Mitigação:** Testes extensivos antes de deploy
   - **Mitigação:** Deploy gradual com feature flags

2. **Performance Degradada**
   - **Mitigação:** Índices criados desde o início
   - **Mitigação:** Monitoramento de queries lentas

3. **Dados Perdidos Durante Migration**
   - **Mitigação:** Backup completo antes de aplicar
   - **Mitigação:** Validação de dados após migration

4. **Problemas de Segurança (RLS)**
   - **Mitigação:** Testes de permissões extensivos
   - **Mitigação:** Revisão de políticas RLS

5. **Complexidade do Modelo de Comissões**
   - **Mitigação:** Implementação incremental
   - **Mitigação:** Testes específicos para comissões

---

## 📚 Recursos e Referências

### Documentação

- `src/RELATORIO_ANALISE_BANCO_DADOS.md` - Análise completa do banco
- `src/DOCUMENTACAO_ALTERACOES_BANCO_DADOS.md` - Alterações propostas
- `.cursor/rules/backend-rule.mdc` - Regras de arquitetura
- `src/ESTRUTURA_COMISSOES_BD.md` - Estrutura de comissões

### Migrations

- `supabase/migrations/001_fix_campos_obrigatorios.sql`
- `supabase/migrations/002_fix_relacoes_fks.sql`
- `supabase/migrations/003_add_indices.sql`
- `supabase/migrations/004_fix_rls_policies.sql`

### Ferramentas

- Supabase Dashboard - Gerenciamento do banco
- Supabase CLI - Deploy de migrations e functions
- Postman/Insomnia - Teste de APIs
- Chrome DevTools - Debugging

---

## 🔄 Atualizações do Roadmap

Este roadmap deve ser atualizado conforme o progresso do desenvolvimento:

- **Data da Última Atualização:** 2025-01-16
- **Próxima Revisão:** Após conclusão da Fase 1
- **Responsável:** Equipe de Desenvolvimento

---

## 📞 Contatos e Suporte

- **Dúvidas sobre Banco de Dados:** Consultar relatórios de análise
- **Dúvidas sobre Arquitetura:** Consultar `backend-rule.mdc`
- **Problemas Técnicos:** Abrir issue no repositório

---

**Fim do Roadmap**

