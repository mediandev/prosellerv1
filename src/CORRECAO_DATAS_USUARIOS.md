# Correção de Datas em Usuários - Inconsistência Backend/Frontend

## Status: ✅ CORRIGIDO

## Problema Identificado

Havia uma inconsistência entre backend e frontend no nome do campo de data de cadastro de usuários:

- **Backend**: Usava `dataCriacao`
- **Frontend**: Esperava `dataCadastro`

Isso causava erros como:
```
RangeError: Invalid time value
at format (date-fns)
at components/UserManagement.tsx:540:27
```

### Causa Raiz

1. Quando o backend criava usuários, salvava com `dataCriacao`
2. O frontend tentava formatar `dataCadastro` que vinha `undefined`
3. `date-fns format()` falhava ao tentar formatar uma data inválida

---

## Correções Aplicadas

### 1. Backend - Normalização de Dados

**Arquivo**: `/supabase/functions/server/index.tsx`

#### GET `/make-server-f9c0d131/usuarios`

**ANTES**:
```typescript
const usuarios = await kv.get('usuarios') || [];
return c.json(usuarios);
```

**DEPOIS**:
```typescript
const usuarios = await kv.get('usuarios') || [];

// Normalizar dados: migrar dataCriacao para dataCadastro e garantir permissoes
const usuariosNormalizados = usuarios.map((u: any) => ({
  ...u,
  dataCadastro: u.dataCadastro || u.dataCriacao || new Date().toISOString(),
  permissoes: u.permissoes || [],
}));

return c.json(usuariosNormalizados);
```

#### GET `/make-server-f9c0d131/usuarios/:id`

**ANTES**:
```typescript
const usuario = usuarios.find((u: any) => u.id === id);
if (!usuario) {
  return c.json({ error: 'Usuario not found' }, 404);
}
return c.json(usuario);
```

**DEPOIS**:
```typescript
const usuario = usuarios.find((u: any) => u.id === id);
if (!usuario) {
  return c.json({ error: 'Usuario not found' }, 404);
}

// Normalizar dados: migrar dataCriacao para dataCadastro e garantir permissoes
const usuarioNormalizado = {
  ...usuario,
  dataCadastro: usuario.dataCadastro || usuario.dataCriacao || new Date().toISOString(),
  permissoes: usuario.permissoes || [],
};

return c.json(usuarioNormalizado);
```

#### POST `/make-server-f9c0d131/usuarios`

**ANTES**:
```typescript
const novoUsuario = {
  ...usuario,
  id: usuario.id || crypto.randomUUID(),
  dataCriacao: new Date().toISOString(),
};
```

**DEPOIS**:
```typescript
const novoUsuario = {
  ...usuario,
  id: usuario.id || crypto.randomUUID(),
  dataCadastro: new Date().toISOString(),
};
```

#### POST `/make-server-f9c0d131/auth/signup`

**ANTES**:
```typescript
const novoUsuario = {
  id: data.user.id,
  nome,
  email,
  tipo,
  ativo: true,
  dataCriacao: new Date().toISOString(),
};
```

**DEPOIS**:
```typescript
const novoUsuario = {
  id: data.user.id,
  nome,
  email,
  tipo,
  ativo: true,
  dataCadastro: new Date().toISOString(),
  permissoes: [],
};
```

---

### 2. Frontend - Validação de Datas

**Arquivo**: `/components/UserManagement.tsx`

#### Função `carregarUsuarios`

**Adicionada normalização** para garantir que todos os campos existam:

```typescript
const carregarUsuarios = async () => {
  try {
    const usuariosAPI = await api.get('usuarios');
    // Garantir que todos os usuários tenham campos obrigatórios inicializados
    const usuariosNormalizados = usuariosAPI.map((u: Usuario) => ({
      ...u,
      permissoes: u.permissoes || [],
      dataCadastro: u.dataCadastro || new Date().toISOString()
    }));
    setUsuarios(usuariosNormalizados);
  } catch (error) {
    const mockNormalizados = mockUsuarios.map((u: Usuario) => ({
      ...u,
      permissoes: u.permissoes || [],
      dataCadastro: u.dataCadastro || new Date().toISOString()
    }));
    setUsuarios(mockNormalizados);
  }
};
```

#### Renderização de Data de Cadastro

**ANTES**:
```tsx
<TableCell>
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    <Calendar className="h-3 w-3" />
    {format(new Date(usuario.dataCadastro), "dd/MM/yyyy", {
      locale: ptBR,
    })}
  </div>
</TableCell>
```

**DEPOIS**:
```tsx
<TableCell>
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    <Calendar className="h-3 w-3" />
    {(() => {
      if (!usuario.dataCadastro) return "N/A";
      try {
        const date = new Date(usuario.dataCadastro);
        if (isNaN(date.getTime())) return "Data inválida";
        return format(date, "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return "Data inválida";
      }
    })()}
  </div>
</TableCell>
```

#### Renderização de Último Acesso

**ANTES**:
```tsx
{usuario.ultimoAcesso ? (
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    <Clock className="h-3 w-3" />
    {format(new Date(usuario.ultimoAcesso), "dd/MM/yyyy HH:mm", {
      locale: ptBR,
    })}
  </div>
) : (
  <span className="text-sm text-muted-foreground">Nunca</span>
)}
```

**DEPOIS**:
```tsx
{usuario.ultimoAcesso ? (
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    <Clock className="h-3 w-3" />
    {(() => {
      try {
        const date = new Date(usuario.ultimoAcesso);
        if (isNaN(date.getTime())) return "Data inválida";
        return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
      } catch {
        return "Data inválida";
      }
    })()}
  </div>
) : (
  <span className="text-sm text-muted-foreground">Nunca</span>
)}
```

#### Proteção em Formulários

```typescript
setFormulario({
  nome: usuario.nome,
  email: usuario.email,
  permissoes: usuario.permissoes || [],  // ✅ Proteção adicionada
  ativo: usuario.ativo,
});
```

---

## Estratégia de Migração

A solução implementada garante **compatibilidade retroativa**:

1. **Novos usuários**: Sempre criados com `dataCadastro` ✅
2. **Usuários existentes com `dataCriacao`**: Migrados automaticamente para `dataCadastro` nas rotas GET ✅
3. **Usuários sem data**: Recebem timestamp atual como fallback ✅
4. **Campo `permissoes`**: Sempre inicializado como array vazio se ausente ✅

### Fluxo de Migração Automática

```typescript
// Backend normaliza ao retornar
dataCadastro: u.dataCadastro || u.dataCriacao || new Date().toISOString()

// Frontend valida ao carregar
dataCadastro: u.dataCadastro || new Date().toISOString()

// Frontend valida ao renderizar
if (!usuario.dataCadastro) return "N/A";
try {
  const date = new Date(usuario.dataCadastro);
  if (isNaN(date.getTime())) return "Data inválida";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
} catch {
  return "Data inválida";
}
```

---

## Benefícios da Solução

### ✅ Robustez
- Todas as datas são validadas antes de formatar
- Múltiplos níveis de fallback

### ✅ Retrocompatibilidade
- Usuários antigos continuam funcionando
- Migração automática de `dataCriacao` → `dataCadastro`
- Sem necessidade de script de migração manual

### ✅ Segurança
- Nunca quebra a UI por data inválida
- Try-catch protege contra erros inesperados
- Mensagens claras: "N/A", "Data inválida", "Nunca"

### ✅ Consistência
- Backend e frontend usam o mesmo campo: `dataCadastro`
- Formato ISO 8601 para todas as datas
- Inicialização garantida de arrays (`permissoes`)

---

## Testes Recomendados

### 1. Usuário Novo
```bash
# Criar usuário via signup
# Verificar se dataCadastro está presente
# Verificar se permissoes é array vazio
```

### 2. Usuário Antigo (com dataCriacao)
```bash
# Buscar usuário antigo
# Verificar se dataCadastro foi migrado
# Verificar se data é exibida corretamente
```

### 3. Usuário sem Data
```bash
# Simular usuário sem data
# Verificar se recebe timestamp atual
# Verificar se renderiza "N/A" ou data válida
```

### 4. Data Inválida
```bash
# Simular data corrompida
# Verificar se exibe "Data inválida"
# Verificar se não quebra a UI
```

---

## Arquivos Modificados

1. ✅ `/supabase/functions/server/index.tsx`
   - Rotas GET: Normalização de dados
   - Rotas POST: Campo `dataCadastro` em vez de `dataCriacao`

2. ✅ `/components/UserManagement.tsx`
   - Função `carregarUsuarios`: Normalização
   - Renderização de datas: Validação robusta
   - Formulários: Proteção de arrays

---

## Padrão de Validação de Datas

Para referência futura, use este padrão em todos os lugares onde formatar datas:

```typescript
{(() => {
  if (!data) return "N/A";
  try {
    const date = new Date(data);
    if (isNaN(date.getTime())) return "Data inválida";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "Data inválida";
  }
})()}
```

---

## Logs e Debugging

O sistema agora exibe logs claros:

```javascript
console.log('[USERS] Usuários carregados:', usuariosNormalizados.length);
console.log('[BACKEND] No user authenticated for GET usuarios');
```

---

## Próximos Passos

- [ ] Aplicar mesmo padrão em outros componentes que usam datas
- [ ] Criar helper function `formatarData()` para reutilizar lógica
- [ ] Documentar padrão de datas no guia de desenvolvimento
- [ ] Considerar biblioteca de validação de schemas (Zod)

---

**Data**: 16/11/2025  
**Tipo**: Correção Crítica  
**Prioridade**: Alta  
**Status**: Resolvido ✅
