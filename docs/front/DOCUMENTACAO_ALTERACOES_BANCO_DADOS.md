# Documentação de Alterações no Banco de Dados

**Data:** 2025-01-16  
**Versão:** 1.0  
**Status:** ⚠️ **AGUARDANDO APROVAÇÃO PARA APLICAÇÃO**

---

## 📋 Sumário

Este documento descreve todas as alterações propostas no banco de dados Supabase para alinhar a estrutura com os tipos TypeScript do projeto ProSeller V1.

### Migrations Criadas

1. **001_fix_campos_obrigatorios.sql** - Adiciona campos obrigatórios faltantes
2. **002_fix_relacoes_fks.sql** - Corrige relações e Foreign Keys
3. **003_add_indices.sql** - Adiciona índices para performance
4. **004_fix_rls_policies.sql** - Corrige políticas RLS (segurança)

---

## 🔴 Alterações Críticas

### 1. Campos Obrigatórios Adicionados

#### Tabela: `user`
- ✅ `email` (TEXT) - Email do usuário
- ✅ `tipo` (TEXT) - Tipo: 'backoffice' ou 'vendedor'
- ✅ `ativo` (BOOLEAN) - Status ativo/inativo
- ✅ `data_cadastro` (TIMESTAMPTZ) - Data de cadastro
- ✅ `ultimo_acesso` (TIMESTAMPTZ) - Último acesso (opcional)

#### Tabela: `dados_vendedor`
- ✅ `iniciais` (TEXT) - Iniciais do vendedor
- ✅ `data_admissao` (DATE) - Data de admissão
- ✅ `status` (TEXT) - Status: 'ativo', 'inativo', 'excluido'
- ✅ `cnpj` (TEXT) - CNPJ separado
- ✅ `razao_social` (TEXT) - Razão social
- ✅ `inscricao_estadual` (TEXT) - Inscrição estadual
- ✅ `observacoes_internas` (TEXT) - Observações
- ✅ `created_at`, `updated_at`, `deleted_at` - Campos de auditoria

#### Tabela: `cliente`
- ✅ `codigo` (TEXT) - Código do cliente
- ✅ `grupo_rede` (TEXT) - Grupo/rede
- ✅ `desconto_financeiro` (NUMERIC) - Desconto financeiro
- ✅ `pedido_minimo` (NUMERIC) - Pedido mínimo
- ✅ `status_aprovacao` (TEXT) - Status: 'aprovado', 'pendente', 'rejeitado'
- ✅ `motivo_rejeicao` (TEXT) - Motivo da rejeição
- ✅ `aprovado_por` (UUID) - Quem aprovou
- ✅ `data_aprovacao` (DATE) - Data da aprovação
- ✅ `endereco_entrega_diferente` (BOOLEAN) - Flag de endereço diferente
- ✅ `created_at`, `updated_at`, `deleted_at` - Campos de auditoria
- ✅ `criado_por`, `atualizado_por` - Usuários de auditoria

#### Tabela: `produto`
- ✅ `foto` (TEXT) - URL da foto
- ✅ `situacao` (TEXT) - Situação: 'Ativo', 'Inativo', 'Excluído'
- ✅ `ativo` (BOOLEAN) - Status ativo
- ✅ `disponivel` (BOOLEAN) - Disponível para venda
- ✅ `created_at`, `updated_at`, `deleted_at` - Campos de auditoria
- ✅ `nome_marca`, `nome_tipo_produto`, `sigla_unidade` - Campos desnormalizados

#### Tabela: `pedido_venda`
- ✅ Múltiplos campos desnormalizados (nomes de cliente, vendedor, etc.)
- ✅ Campos de totais calculados
- ✅ `updated_at`, `created_by`, `deleted_at` - Campos de auditoria

#### Tabela: `pedido_venda_produtos`
- ✅ `numero` (INTEGER) - Ordenação dos itens
- ✅ Campos desnormalizados (SKU, EAN, etc.)
- ✅ Campos de cálculo (subtotal, pesos, etc.)

#### Tabela: `vendedor_comissão`
- ✅ `periodo` (TEXT) - Período da comissão
- ✅ `oc_cliente` (TEXT) - Ordem de compra
- ✅ `cliente_id` (BIGINT) - ID do cliente
- ✅ `cliente_nome` (TEXT) - Nome desnormalizado
- ✅ `percentual_comissao` (NUMERIC) - Percentual
- ✅ `regra_aplicada` (TEXT) - Regra aplicada
- ✅ Campos de auditoria da regra
- ✅ Campos de edição (`editado_por`, `editado_em`)

#### Tabela: `metas_vendedor`
- ✅ Correção de tipo: `vendedor_id` de VARCHAR para UUID
- ✅ Correção de tipo: `mes` de VARCHAR para INTEGER (1-12)

### 2. Foreign Keys Adicionadas

- ✅ `dados_vendedor.user_id` → `user.user_id`
- ✅ `pedido_venda.vendedor_uuid` → `dados_vendedor.user_id`
- ✅ `metas_vendedor.vendedor_id` → `dados_vendedor.user_id`
- ✅ `cliente.aprovado_por` → `user.user_id`
- ✅ `cliente.criado_por` → `user.user_id`
- ✅ `cliente.atualizado_por` → `user.user_id`
- ✅ `pedido_venda.created_by` → `user.user_id`
- ✅ `vendedor_comissão.cliente_id` → `cliente.cliente_id`
- ✅ `vendedor_comissão.lista_preco_id` → `listas_preco.id`
- ✅ `vendedor_comissão.editado_por` → `user.user_id`

### 3. Correções de Tipos

- ✅ `pedido_venda.lista_de_preco`: TEXT → BIGINT
- ✅ `pedido_venda.empresa_faturou`: TEXT → BIGINT (renomeado para `empresa_faturamento_id`)
- ✅ `metas_vendedor.vendedor_id`: VARCHAR → UUID
- ✅ `metas_vendedor.mes`: VARCHAR → INTEGER

### 4. Políticas RLS Corrigidas

**Removidas:**
- ❌ Políticas de teste ("teste", "test", "trete", etc.)
- ❌ Políticas `allow_all` muito permissivas (serão substituídas)

**Adicionadas:**
- ✅ Políticas granulares por operação (SELECT, INSERT, UPDATE, DELETE)
- ✅ Separação vendedor/backoffice
- ✅ Vendedores veem apenas seus dados
- ✅ Backoffice vê tudo
- ✅ Service role bypassa RLS

**Tabelas com RLS Habilitado:**
- ✅ `metas_vendedor` (antes não tinha)
- ✅ `ref_situacao` (antes não tinha)

### 5. Índices Adicionados

**Para Performance:**
- ✅ Índices em campos de busca frequente (email, cpf_cnpj, codigo_sku, etc.)
- ✅ Índices em campos de filtro (status, tipo, situacao, etc.)
- ✅ Índices em campos de ordenação (created_at, updated_at, data_venda, etc.)
- ✅ Índices compostos para queries complexas

**Total:** ~40 índices novos

---

## ⚠️ Impactos Esperados

### Impactos Positivos ✅

1. **Segurança Melhorada:**
   - Políticas RLS granulares impedem acesso não autorizado
   - Vendedores não podem ver dados de outros vendedores
   - Backoffice tem controle total

2. **Integridade de Dados:**
   - Foreign Keys garantem consistência referencial
   - Tipos corretos evitam erros de conversão

3. **Performance:**
   - Índices melhoram velocidade de queries
   - Campos desnormalizados reduzem JOINs

4. **Auditoria:**
   - Campos de auditoria permitem rastreamento completo
   - Soft delete preserva histórico

### Impactos Negativos ⚠️

1. **Breaking Changes:**
   - Campos obrigatórios podem quebrar código existente
   - Políticas RLS mais restritivas podem bloquear acesso legítimo

2. **Migração de Dados:**
   - Conversão de tipos pode falhar se houver dados inválidos
   - Campos novos precisam de valores default ou migração

3. **Performance Temporária:**
   - Criação de índices pode ser lenta em tabelas grandes
   - Reindexação pode bloquear tabelas temporariamente

---

## 🧪 Plano de Testes

### 1. Testes de Validação de Dados

```sql
-- Verificar se campos obrigatórios foram criados
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN ('email', 'tipo', 'ativo', 'data_cadastro');

-- Verificar se FKs foram criadas
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN ('dados_vendedor', 'pedido_venda', 'metas_vendedor');

-- Verificar se índices foram criados
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';
```

### 2. Testes de RLS Policies

```sql
-- Testar como vendedor (deve ver apenas seus dados)
SET ROLE authenticated;
SET request.jwt.claim.sub = 'vendedor-uuid-123';

SELECT COUNT(*) FROM public.cliente;  -- Deve retornar apenas clientes atribuídos
SELECT COUNT(*) FROM public.pedido_venda;  -- Deve retornar apenas seus pedidos

-- Testar como backoffice (deve ver tudo)
SET request.jwt.claim.sub = 'backoffice-uuid-456';

SELECT COUNT(*) FROM public.cliente;  -- Deve retornar todos
SELECT COUNT(*) FROM public.pedido_venda;  -- Deve retornar todos
```

### 3. Testes de Performance

```sql
-- Verificar uso de índices
EXPLAIN ANALYZE
SELECT * FROM public.cliente
WHERE cpf_cnpj = '12345678901234';

EXPLAIN ANALYZE
SELECT * FROM public.pedido_venda
WHERE vendedor_uuid = 'uuid-123'
ORDER BY data_venda DESC;
```

### 4. Testes de Integridade

```sql
-- Verificar se FKs impedem inserções inválidas
INSERT INTO public.dados_vendedor (user_id, nome)
VALUES ('00000000-0000-0000-0000-000000000000', 'Teste');
-- Deve falhar se user não existir

-- Verificar se constraints funcionam
INSERT INTO public.user (user_id, tipo)
VALUES (gen_random_uuid(), 'invalido');
-- Deve falhar (tipo inválido)
```

---

## 📝 Instruções de Aplicação

### ⚠️ IMPORTANTE: Backup Antes de Aplicar

```bash
# Fazer backup completo do banco
pg_dump -h <host> -U <user> -d <database> > backup_antes_migrations.sql
```

### Passo a Passo

1. **Revisar Migrations:**
   ```bash
   # Revisar cada arquivo SQL manualmente
   cat supabase/migrations/001_fix_campos_obrigatorios.sql
   cat supabase/migrations/002_fix_relacoes_fks.sql
   cat supabase/migrations/003_add_indices.sql
   cat supabase/migrations/004_fix_rls_policies.sql
   ```

2. **Aplicar em Ambiente de Desenvolvimento:**
   ```bash
   # Via Supabase CLI
   supabase db reset
   supabase migration up
   
   # Ou via SQL direto
   psql -h <host> -U <user> -d <database> -f supabase/migrations/001_fix_campos_obrigatorios.sql
   psql -h <host> -U <user> -d <database> -f supabase/migrations/002_fix_relacoes_fks.sql
   psql -h <host> -U <user> -d <database> -f supabase/migrations/003_add_indices.sql
   psql -h <host> -U <user> -d <database> -f supabase/migrations/004_fix_rls_policies.sql
   ```

3. **Validar Alterações:**
   - Executar testes acima
   - Verificar logs de erro
   - Testar funcionalidades críticas

4. **Aplicar em Produção:**
   - ⚠️ **APENAS APÓS VALIDAÇÃO COMPLETA EM DEV**
   - Aplicar em horário de baixo tráfego
   - Monitorar logs durante aplicação
   - Ter plano de rollback pronto

### Rollback (Se Necessário)

```sql
-- Reverter migrations (executar na ordem inversa)

-- 4. Remover políticas RLS novas
DROP POLICY IF EXISTS "users_select_own_or_backoffice" ON public.user;
-- ... (remover todas as políticas criadas)

-- 3. Remover índices
DROP INDEX IF EXISTS idx_cliente_cpf_cnpj;
-- ... (remover todos os índices criados)

-- 2. Remover FKs
ALTER TABLE public.dados_vendedor DROP CONSTRAINT IF EXISTS fk_dados_vendedor_user_id;
-- ... (remover todas as FKs criadas)

-- 1. Remover colunas (CUIDADO: pode perder dados)
ALTER TABLE public.user DROP COLUMN IF EXISTS email;
-- ... (remover todas as colunas criadas)
```

---

## 🔍 Checklist de Validação

Antes de aplicar em produção, verificar:

- [ ] Backup completo realizado
- [ ] Migrations revisadas e aprovadas
- [ ] Testes executados em ambiente de desenvolvimento
- [ ] Performance validada (queries rápidas)
- [ ] RLS policies testadas (vendedor e backoffice)
- [ ] Integridade referencial validada
- [ ] Plano de rollback preparado
- [ ] Equipe notificada sobre manutenção
- [ ] Horário de baixo tráfego agendado

---

## 📞 Suporte

Em caso de problemas:

1. **Verificar Logs:**
   - Logs do Supabase Dashboard
   - Logs da aplicação

2. **Consultar Documentação:**
   - `RELATORIO_ANALISE_BANCO_DADOS.md` - Análise completa
   - `backend-rule.mdc` - Regras de arquitetura

3. **Rollback Imediato:**
   - Se houver problemas críticos, executar rollback
   - Restaurar backup se necessário

---

## 📅 Próximos Passos (Após Aplicação)

1. **Criar Funções RPC Faltantes:**
   - CRUD completo para todas as entidades
   - Funções de aprovação de clientes
   - Funções de comissões (novo modelo)

2. **Criar Edge Functions:**
   - Seguir arquitetura em camadas
   - Edge Functions → RPC → Tabelas

3. **Atualizar Código Frontend:**
   - Ajustar tipos TypeScript se necessário
   - Atualizar chamadas de API

4. **Documentar:**
   - Atualizar documentação da API
   - Documentar novas funcionalidades

---

**Fim da Documentação**

