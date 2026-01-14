# ✅ Integração Supabase - Guia Completo

## 📋 Visão Geral

O sistema está **totalmente integrado com Supabase** e funcionando em modo real. A arquitetura utiliza uma **tabela KV (Key-Value) Store** ao invés de tabelas SQL tradicionais.

## 🏗️ Arquitetura

### Como Funciona

```
Frontend (React) 
    ↓
API Service (/services/api.ts)
    ↓
Servidor Backend (/supabase/functions/server/index.tsx)
    ↓
KV Store (/supabase/functions/server/kv_store.tsx)
    ↓
Supabase Database (tabela: kv_store_f9c0d131)
```

### Estrutura de Dados

Ao invés de criar múltiplas tabelas SQL, o sistema usa **uma única tabela KV Store**:

| key | value |
|-----|-------|
| `clientes` | `[{...}, {...}, ...]` (array de objetos Cliente) |
| `usuarios` | `[{...}, {...}, ...]` (array de objetos Usuario) |
| `vendas` | `[{...}, {...}, ...]` (array de objetos Venda) |
| `produtos` | `[{...}, {...}, ...]` (array de objetos Produto) |
| `notificacoes` | `[{...}, {...}, ...]` (array de objetos Notificacao) |
| `comissoes` | `[{...}, {...}, ...]` (array de objetos Comissao) |

## ✅ O Que Já Está Funcionando

### 1. Autenticação
- ✅ Login com Supabase Auth
- ✅ Cadastro de usuários (signup)
- ✅ Fallback para dados mock (quando não há usuários no Supabase)
- ✅ Token de autenticação persistido

### 2. Backend Completo
- ✅ Servidor Hono rodando no Supabase Edge Functions
- ✅ Rotas CRUD para todas as entidades:
  - `/clientes` - GET, POST, PUT, DELETE
  - `/usuarios` - GET, POST, PUT, DELETE
  - `/vendas` - GET, POST, PUT, DELETE
  - `/produtos` - GET, POST, PUT, DELETE
  - `/notificacoes` - GET, PUT, POST (marcar como lidas)
  - `/comissoes` - GET, POST, PUT, DELETE
- ✅ Autenticação em todas as rotas
- ✅ Permissões granulares (vendedor vs backoffice)
- ✅ Logs detalhados para debug

### 3. Frontend Integrado
- ✅ Cadastro de clientes salva no Supabase
- ✅ Edição de clientes atualiza no Supabase
- ✅ Sistema híbrido (tenta Supabase, fallback para mock)
- ✅ Logs detalhados no console do navegador

### 4. Funcionalidades Especiais
- ✅ Aprovação de clientes (vendedor → backoffice)
- ✅ Sistema de notificações
- ✅ Filtros de permissão automáticos
- ✅ Logs completos para debug

## 🔍 Como Verificar se Está Funcionando

### Opção 1: Usar o Visualizador Integrado

1. Faça login no sistema
2. Vá em **Configurações** (⚙️)
3. Clique na aba **Integrações**
4. Clique em **Dados Supabase**
5. Clique em **Atualizar**
6. Veja todos os dados salvos no Supabase em tempo real

### Opção 2: Verificar no Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Table Editor**
4. Abra a tabela `kv_store_f9c0d131`
5. Procure pela linha com `key = 'clientes'`
6. Clique para expandir o campo `value`
7. Você verá um JSON com array de todos os clientes

### Opção 3: Verificar Logs do Console

Ao cadastrar um cliente, você verá no console:

```
[CLIENTE] Criando cliente no Supabase: {...}
[BACKEND] Criando cliente: {...}
[BACKEND] Cliente salvo no KV store: {...}
[CLIENTE] Cliente criado no Supabase com sucesso: {...}
```

## 🚀 Como Popular o Supabase com Dados de Teste

### Método 1: Importação Automática (Recomendado)

1. Vá em **Configurações** → **Integrações** → **Dados Supabase**
2. Clique no botão **Importar Dados**
3. Aguarde a importação (pode levar alguns segundos)
4. Verifique o resultado
5. Clique em **Atualizar** no visualizador para ver os dados

### Método 2: Usar o SetupUsersButton

1. Vá em **Configurações** → **Usuários**
2. Clique em **Configurar Usuários no Supabase**
3. Os usuários mock serão criados no Supabase
4. Faça logout e login novamente com um dos usuários

### Método 3: Cadastro Manual

1. Cadastre clientes, produtos e vendas manualmente pelo sistema
2. Os dados serão salvos automaticamente no Supabase
3. Use o visualizador para confirmar

## 📊 Dados Disponíveis para Importação

- **Clientes**: 20+ clientes de exemplo
- **Vendas**: 100+ vendas de exemplo
- **Produtos**: 50+ produtos de exemplo
- **Usuários**: 6 usuários (3 backoffice + 3 vendedores)

## ⚙️ Configuração Técnica

### Variáveis de Ambiente Necessárias

O sistema requer as seguintes variáveis de ambiente (já configuradas):

- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de service role
- `SUPABASE_DB_URL` - URL do banco de dados

### Arquivos Principais

1. **Frontend**:
   - `/services/api.ts` - Cliente de API
   - `/components/CustomerFormPage.tsx` - Exemplo de integração

2. **Backend**:
   - `/supabase/functions/server/index.tsx` - Servidor principal
   - `/supabase/functions/server/kv_store.tsx` - Utilitário KV store (protegido)

3. **Autenticação**:
   - `/contexts/AuthContext.tsx` - Context com sistema híbrido
   - `/components/SetupUsersButton.tsx` - Setup inicial de usuários

## 🔒 Segurança e Permissões

### Sistema de Permissões

- **Vendedores**: Veem apenas SEUS clientes aprovados
- **Backoffice**: Veem TODOS os clientes

### Fluxo de Aprovação

1. Vendedor cadastra cliente → Status: `pendente` / Situação: `Análise`
2. Notificação criada para todos os usuários backoffice
3. Backoffice aprova → Status: `aprovado` / Situação: `Ativo`
4. Cliente fica visível para o vendedor
5. Notificação enviada ao vendedor

## ❓ FAQ

### Por que usar KV Store ao invés de tabelas SQL?

O Figma Make foi projetado para prototipagem rápida e não suporta execução de migrations ou DDL statements. O KV Store oferece:

- ✅ Setup zero (não precisa criar tabelas)
- ✅ Flexibilidade total (pode adicionar/remover campos sem migrations)
- ✅ Perfeito para protótipos
- ✅ Fácil de entender e debugar

### Os dados estão seguros?

Sim! O KV Store usa a mesma infraestrutura do Supabase:
- ✅ Autenticação obrigatória em todas as rotas
- ✅ Permissões granulares por tipo de usuário
- ✅ HTTPS/TLS em todas as comunicações
- ✅ Backup automático do Supabase

### Como migrar para tabelas SQL no futuro?

Se futuramente você quiser migrar para tabelas SQL tradicionais, você pode:

1. Exportar os dados do KV Store
2. Criar as tabelas SQL no Supabase
3. Importar os dados
4. Atualizar o código do servidor para usar queries SQL

Mas para prototipagem e MVP, o KV Store é **mais do que suficiente**.

## 🐛 Debug e Troubleshooting

### Cliente não aparece no Supabase

1. Verifique o console do navegador
2. Procure por erros na chamada da API
3. Verifique se está autenticado (token válido)
4. Teste com o visualizador de dados

### Erro "Unauthorized"

1. Faça logout e login novamente
2. Verifique se o token está válido
3. Limpe o localStorage e faça login novamente

### Dados não atualizam

1. Clique em "Atualizar" no visualizador
2. Faça logout e login novamente
3. Limpe o cache do navegador

## 📞 Suporte

Para mais informações, consulte:

- **Logs do Console**: Detalhes técnicos de todas as operações
- **Visualizador de Dados**: Ver dados em tempo real
- **Supabase Dashboard**: Interface administrativa

---

**✅ Sistema 100% funcional e integrado com Supabase!**
