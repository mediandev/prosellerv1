# Implementação de Grupos/Redes com Dados Reais do Supabase

## Status: ✅ IMPLEMENTADO

## Problema Identificado

O campo **Grupo / Rede** no cadastro de clientes estava utilizando dados **mock** (hardcoded) em vez de dados reais do Supabase. Isso significa que:

- ❌ Usuários não conseguiam adicionar novos grupos/redes
- ❌ Os dados eram fixos e não persistiam no banco
- ❌ Não havia gerenciamento desses dados no sistema

## Solução Implementada

### 1. Backend - Rotas de API (Supabase Edge Function)

**Arquivo**: `/supabase/functions/server/index.tsx`

Criadas 5 rotas completas para gerenciamento de Grupos/Redes:

#### GET `/make-server-f9c0d131/grupos-redes`
- Lista todos os grupos/redes cadastrados
- Retorna array vazio se não autenticado

#### GET `/make-server-f9c0d131/grupos-redes/:id`
- Busca um grupo/rede específico por ID
- Retorna 404 se não encontrado

#### POST `/make-server-f9c0d131/grupos-redes`
- Cria novo grupo/rede
- **Validações**:
  - ✅ Apenas backoffice pode criar
  - ✅ Nome único (não permite duplicados)
- **Campos auto-preenchidos**:
  - `id`: UUID gerado automaticamente
  - `dataCriacao`: timestamp atual
  - `criadoPor`: nome do usuário backoffice

#### PUT `/make-server-f9c0d131/grupos-redes/:id`
- Atualiza grupo/rede existente
- **Validações**:
  - ✅ Apenas backoffice pode editar
  - ✅ Não permite alterar para nome já existente
- **Campos auto-preenchidos**:
  - `dataAtualizacao`: timestamp atual
  - `atualizadoPor`: nome do usuário backoffice

#### DELETE `/make-server-f9c0d131/grupos-redes/:id`
- Remove grupo/rede
- **Validações**:
  - ✅ Apenas backoffice pode excluir
  - ✅ Não permite excluir se estiver em uso por clientes
  - ✅ Retorna quantidade de clientes usando quando bloqueado

**Armazenamento**: Todos os dados são salvos na tabela KV do Supabase com chave `grupos_redes`

---

### 2. Frontend - Componente de Gerenciamento

**Arquivo**: `/components/GrupoRedeManagement.tsx`

Interface completa de gerenciamento com:

#### Funcionalidades
- ✅ **Listagem** em tabela com informações:
  - Nome
  - Descrição
  - Data de criação
  - Criado por
  - Ações (editar/excluir)

- ✅ **Criar novo** grupo/rede
  - Dialog com formulário
  - Campos: Nome (obrigatório) e Descrição (opcional)

- ✅ **Editar** grupo/rede existente
  - Pré-preenche formulário com dados atuais
  - Validação de nome duplicado

- ✅ **Excluir** grupo/rede
  - Dialog de confirmação
  - Mensagem de erro se estiver em uso por clientes

#### Controle de Permissões
- ✅ Apenas usuários **backoffice** podem gerenciar
- ✅ Vendedores veem mensagem "Acesso Negado"

#### Feedback ao Usuário
- ✅ Mensagens de sucesso/erro com `toast`
- ✅ Loading states durante operações
- ✅ Estado vazio com link para criar primeiro registro

---

### 3. Integração em Configurações

**Arquivo**: `/components/SettingsPage.tsx`

#### Mudanças
1. **Import** do novo componente:
   ```tsx
   import { GrupoRedeManagement } from "./GrupoRedeManagement";
   ```

2. **Nova aba** no menu de Cadastros:
   ```tsx
   <TabsTrigger value="grupos-redes" className="whitespace-nowrap px-4 py-2.5">
     Grupos / Redes
   </TabsTrigger>
   ```

3. **Conteúdo da aba**:
   ```tsx
   <TabsContent value="grupos-redes" className="space-y-4">
     <GrupoRedeManagement />
   </TabsContent>
   ```

**Localização**: Menu principal > **Cadastros** > **Grupos / Redes**

---

### 4. Formulário de Cliente - Dados Reais

**Arquivo**: `/components/CustomerFormDadosCadastrais.tsx`

#### Mudanças

1. **Removido import de mock**:
   ```tsx
   // ANTES
   import { gruposRedes, segmentosMercado } from '../data/mockCustomers';
   
   // DEPOIS
   import { segmentosMercado } from '../data/mockCustomers';
   import { api } from '../services/api';
   ```

2. **Adicionado estado local**:
   ```tsx
   const [gruposRedes, setGruposRedes] = useState<Array<{ id: string; nome: string; descricao?: string }>>([]);
   const [loadingGrupos, setLoadingGrupos] = useState(false);
   ```

3. **Carregamento automático** via useEffect:
   ```tsx
   useEffect(() => {
     const carregarGruposRedes = async () => {
       try {
         setLoadingGrupos(true);
         const data = await api.get('grupos-redes');
         setGruposRedes(data);
         console.log('[GRUPOS-REDES] Carregados:', data.length);
       } catch (error: any) {
         console.error('[GRUPOS-REDES] Erro ao carregar:', error);
         setGruposRedes([]);
       } finally {
         setLoadingGrupos(false);
       }
     };
     carregarGruposRedes();
   }, []);
   ```

4. **Opções dinâmicas** do Combobox:
   ```tsx
   const gruposOptions = useMemo(
     () => gruposRedes.map((g) => ({ value: g.nome, label: g.nome })),
     [gruposRedes] // Atualiza quando gruposRedes muda
   );
   ```

#### Resultado
- ✅ Campo "Grupo / Rede" agora usa dados do Supabase
- ✅ Atualiza automaticamente quando novos grupos são criados
- ✅ Sem fallback para mock

---

### 5. Correção de Bug - UserManagement

**Arquivo**: `/components/UserManagement.tsx`

#### Problema
```
TypeError: Cannot read properties of undefined (reading 'length')
at getPermissoesCount (components/UserManagement.tsx:326:30)
```

#### Causa
Alguns usuários não tinham o campo `permissoes` inicializado (era `undefined`)

#### Correções Aplicadas

1. **Função `getPermissoesCount`**:
   ```tsx
   // ANTES
   const getPermissoesCount = (usuario: Usuario) => {
     return usuario.permissoes.length;
   };
   
   // DEPOIS
   const getPermissoesCount = (usuario: Usuario) => {
     return usuario.permissoes?.length || 0;
   };
   ```

2. **Carregamento de usuários**:
   ```tsx
   const carregarUsuarios = async () => {
     try {
       const usuariosAPI = await api.get('usuarios');
       // Garantir que todos os usuários tenham permissoes inicializado
       const usuariosNormalizados = usuariosAPI.map((u: Usuario) => ({
         ...u,
         permissoes: u.permissoes || []
       }));
       setUsuarios(usuariosNormalizados);
     } catch (error) {
       const mockNormalizados = mockUsuarios.map((u: Usuario) => ({
         ...u,
         permissoes: u.permissoes || []
       }));
       setUsuarios(mockNormalizados);
     }
   };
   ```

3. **Formulários de edição**:
   ```tsx
   setFormulario({
     nome: usuario.nome,
     email: usuario.email,
     permissoes: usuario.permissoes || [], // Proteção adicionada
     ativo: usuario.ativo,
   });
   ```

---

## Fluxo Completo de Uso

### Cenário 1: Criar Novo Grupo/Rede

1. **Backoffice** acessa: Configurações > Cadastros > Grupos / Redes
2. Clica em "**Novo Grupo/Rede**"
3. Preenche:
   - Nome: "Rede SuperMercados ABC" (obrigatório)
   - Descrição: "Rede nacional de supermercados" (opcional)
4. Clica em "**Criar Grupo/Rede**"
5. Sistema:
   - ✅ Valida nome único
   - ✅ Salva no Supabase
   - ✅ Exibe toast de sucesso
   - ✅ Atualiza tabela automaticamente

### Cenário 2: Cadastrar Cliente com Novo Grupo

1. **Vendedor** acessa: Clientes > Novo Cliente
2. Na aba "Dados Cadastrais", campo "**Grupo / Rede**":
   - Combobox carrega automaticamente dados reais do Supabase
   - Mostra "Rede SuperMercados ABC" criado anteriormente
3. Seleciona o grupo e salva cliente
4. Grupo fica vinculado ao cliente no banco

### Cenário 3: Tentar Excluir Grupo em Uso

1. **Backoffice** tenta excluir "Rede SuperMercados ABC"
2. Sistema detecta que tem 5 clientes usando
3. Exibe erro:
   ```
   ❌ Não é possível excluir - este Grupo/Rede está sendo usado por clientes
   ```
4. Grupo permanece no sistema

---

## Estrutura de Dados no Supabase

### Tabela KV: `grupos_redes`

```typescript
interface GrupoRede {
  id: string;              // UUID gerado automaticamente
  nome: string;            // Nome do grupo (único)
  descricao?: string;      // Descrição opcional
  dataCriacao: string;     // ISO timestamp
  criadoPor: string;       // Nome do usuário que criou
  dataAtualizacao?: string; // ISO timestamp (quando editado)
  atualizadoPor?: string;  // Nome do usuário que editou
}
```

### Exemplo de Registro

```json
{
  "id": "abc-123-def-456",
  "nome": "Grupo Pão de Açúcar",
  "descricao": "Rede de supermercados nacional",
  "dataCriacao": "2025-11-16T10:30:00.000Z",
  "criadoPor": "João Silva",
  "dataAtualizacao": "2025-11-16T14:20:00.000Z",
  "atualizadoPor": "Maria Santos"
}
```

---

## Segurança e Validações

### Backend
- ✅ **Autenticação obrigatória** em todas as rotas
- ✅ **Apenas backoffice** pode criar/editar/excluir
- ✅ **Nomes únicos** (case-insensitive)
- ✅ **Proteção contra exclusão** quando em uso
- ✅ **IDs imutáveis** (não podem ser alterados)

### Frontend
- ✅ **Validação de campos** obrigatórios
- ✅ **Mensagens de erro** claras
- ✅ **Confirmação** antes de excluir
- ✅ **Loading states** durante operações
- ✅ **Controle de permissões** por tipo de usuário

---

## Logs e Debugging

Todos os componentes incluem logs para facilitar debugging:

```javascript
// Backend
console.log('[BACKEND] Grupo/Rede criado:', { id, nome });
console.log('[BACKEND] Grupo/Rede atualizado:', { id, nome });
console.log('[BACKEND] Grupo/Rede deletado:', { id, nome });

// Frontend
console.log('[GRUPOS-REDES] Grupos/Redes carregados:', data.length);
console.log('[GRUPOS-REDES] Erro ao carregar:', error);
```

---

## Checklist de Implementação

- ✅ Rotas backend completas (CRUD)
- ✅ Validações de segurança
- ✅ Componente de gerenciamento
- ✅ Integração em Configurações
- ✅ Formulário de cliente usando dados reais
- ✅ Controle de permissões
- ✅ Proteção contra exclusão
- ✅ Mensagens de feedback
- ✅ Loading states
- ✅ Logs de debugging
- ✅ Correção de bugs relacionados
- ✅ Documentação completa

---

## Arquivos Modificados/Criados

### Criados
1. `/components/GrupoRedeManagement.tsx` - Novo componente de gerenciamento

### Modificados
1. `/supabase/functions/server/index.tsx` - Adicionadas rotas de grupos/redes
2. `/components/SettingsPage.tsx` - Adicionada aba de Grupos/Redes
3. `/components/CustomerFormDadosCadastrais.tsx` - Integração com dados reais
4. `/components/UserManagement.tsx` - Correção de bug de permissões

---

## Próximos Passos Sugeridos

1. **Migrar Segmentos de Mercado** para usar mesma abordagem (dados reais)
2. **Criar dashboard** de estatísticas de grupos/redes
3. **Exportação/Importação** em massa de grupos/redes
4. **Hierarquia de grupos** (grupos e sub-grupos)
5. **Integração com ERP** para sincronizar grupos/redes

---

## Notas Importantes

- ⚠️ **Não use dados mock** para Grupos/Redes - sempre use `api.get('grupos-redes')`
- ⚠️ **Permissões**: Apenas backoffice pode gerenciar
- ⚠️ **Exclusão bloqueada**: Não é possível excluir se houver clientes usando
- ✅ **Dados persistem** no Supabase automaticamente
- ✅ **Auditoria completa**: Guarda quem criou/editou e quando

---

**Data**: 16/11/2025  
**Autor**: Sistema de IA  
**Versão**: 1.0
