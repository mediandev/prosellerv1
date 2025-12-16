# 🔐 Sistema de Autenticação - VendasPro

## Visão Geral

O sistema possui **autenticação híbrida** que permite começar imediatamente em modo demo e migrar para autenticação real quando necessário.

## 🎯 Funcionamento

### Modo Demo (Padrão Inicial)
- ✅ **Login imediato** com credenciais mock
- ✅ **Sem configuração** necessária
- ✅ Ideal para **testes e demonstração**
- ✅ Indicador visual "Modo Demo" no header

### Modo Produção (Supabase Auth)
- ✅ **Autenticação real** via Supabase
- ✅ **Persistência** de sessão
- ✅ **Segurança completa**
- ✅ Migração simples do modo demo

## 🚀 Como Usar

### 1️⃣ Login Imediato (Modo Demo)

Use uma das credenciais abaixo:

**Backoffice (Admin):**
- Email: `admin@empresa.com`
- Senha: `admin123`
- Acesso: Total ao sistema

**Vendedor:**
- Email: `joao.silva@empresa.com`
- Senha: `joao123`
- Acesso: Restrito aos seus clientes/vendas

**Outros vendedores:**
- `maria.santos@empresa.com` / `maria123`
- `carlos.oliveira@empresa.com` / `carlos123`
- `ana.paula@empresa.com` / `ana123`
- `pedro.costa@empresa.com` / `pedro123`

### 2️⃣ Migrar para Modo Produção

1. Na tela de login, clique em **"Criar Usuários no Supabase"**
2. Aguarde a criação dos usuários
3. Faça logout e login novamente
4. O sistema agora usa Supabase Auth ✓

## 🔄 Fluxo de Autenticação

```
┌─────────────────────────────────────────────┐
│  Tentativa de Login                         │
│  (email + senha)                            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  1. Tenta Supabase Auth                     │
│     (autenticação real)                     │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
     ✓ Sucesso         ✗ Falha
          │            (sem usuários)
          │                 │
          │                 ▼
          │    ┌────────────────────────────┐
          │    │  2. Fallback para Mock     │
          │    │     (modo demo)            │
          │    └────────────────────────────┘
          │                 │
          └────────┬────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Login Bem-Sucedido  │
        └──────────────────────┘
```

## 🛡️ Segurança

### Modo Demo
- ⚠️ Dados armazenados no localStorage
- ⚠️ Não persistem entre dispositivos
- ⚠️ Token mock (não seguro)
- ✓ Ideal apenas para demonstração

### Modo Produção
- ✓ Autenticação via Supabase Auth
- ✓ Tokens JWT seguros
- ✓ Sessões persistentes
- ✓ Pronto para produção

## 📊 Indicadores Visuais

### Badge "Modo Demo"
- 🟡 Aparece no header quando em modo demo
- Indica que está usando autenticação mock
- Não aparece quando usa Supabase Auth

### Console Logs
```
✓ Login via Supabase Auth              // Produção
ℹ Tentando autenticação mock...        // Demo fallback
✓ Login via autenticação mock (modo demo)  // Demo sucesso
```

## 🔧 Componentes

### AuthContext (`/contexts/AuthContext.tsx`)
- Gerencia estado de autenticação
- Implementa fallback automático
- Restaura sessão ao recarregar

### SetupUsersButton (`/components/SetupUsersButton.tsx`)
- Cria usuários no Supabase Auth
- Exibe credenciais de login
- Feedback visual de sucesso

### DemoModeBadge (`/components/DemoModeBadge.tsx`)
- Indicador visual de modo demo
- Detecta token mock automaticamente
- Oculta-se em modo produção

## 🎨 Personalização

### Adicionar Novos Usuários Mock

Edite `/contexts/AuthContext.tsx`:

```typescript
const USUARIOS_MOCK = [
  {
    id: 'user-7',
    nome: 'Novo Vendedor',
    email: 'novo@empresa.com',
    senha: 'senha123',
    tipo: 'vendedor',
    ativo: true,
    permissoes: [...],
    dataCadastro: '2025-11-15',
  },
];
```

### Adicionar Usuários no Supabase

Edite `/components/SetupUsersButton.tsx`:

```typescript
const USUARIOS_SETUP = [
  {
    nome: 'Novo Usuário',
    email: 'novo@empresa.com',
    senha: 'senha123',
    tipo: 'backoffice',
  },
];
```

## 🐛 Troubleshooting

### Problema: "Invalid login credentials"
**Causa:** Nenhum usuário criado no Supabase Auth ainda  
**Solução:** Use as credenciais mock ou clique em "Criar Usuários no Supabase"

### Problema: Badge "Modo Demo" não desaparece
**Causa:** Ainda usando token mock  
**Solução:** Faça logout e login novamente após criar usuários

### Problema: Não consigo fazer login
**Causa:** Credenciais incorretas  
**Solução:** Use uma das credenciais listadas neste documento

## 📝 Próximos Passos

1. ✅ Sistema híbrido funcionando
2. ✅ Migração suave entre modos
3. ⏳ Adicionar mais métodos de autenticação (Google, etc.)
4. ⏳ Implementar recuperação de senha
5. ⏳ Adicionar 2FA (autenticação de dois fatores)

## ✅ Status Atual

- ✅ Autenticação Mock funcionando
- ✅ Autenticação Supabase funcionando
- ✅ Fallback automático implementado
- ✅ Indicadores visuais adicionados
- ✅ Logs informativos no console
- ✅ Sistema 100% operacional

---

**Última atualização:** 15/11/2025
