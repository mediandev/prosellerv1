# 🔧 Guia de Configuração do MCP do Supabase

Este guia explica como configurar o MCP (Model Context Protocol) do Supabase no Cursor para permitir que a IA acesse e consulte seu banco de dados diretamente.

## 📋 Pré-requisitos

1. Conta no Supabase (projeto hospedado ou self-hosted)
2. Cursor IDE instalado
3. Acesso ao dashboard do Supabase

## 🚀 Passo a Passo

### 1. Gerar Personal Access Token (PAT)

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Vá em **Settings** → **Access Tokens** (ou **Account** → **Access Tokens`)
3. Clique em **Generate New Token**
4. Configure o token:
   - **Nome**: `Cursor MCP` (ou qualquer nome descritivo)
   - **Scopes**: 
     - ✅ `read_only: false` (se precisar de escrita)
     - ✅ `project_ref: xxoiqfraeolsqsmsheue` (limitar ao seu projeto)
   - **Expiração**: Escolha conforme necessário (recomendado: 1 ano)
5. **Copie o token gerado** (você só verá ele uma vez!)

### 2. Configurar no Cursor

#### Opção A: Arquivo de Configuração (Recomendado)

1. Crie o diretório `.cursor` na raiz do projeto (se não existir):
   ```bash
   mkdir .cursor
   ```

2. Crie ou edite o arquivo `.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "type": "http",
         "url": "https://mcp.supabase.com/mcp",
         "headers": {
           "Authorization": "Bearer SEU_PERSONAL_ACCESS_TOKEN_AQUI"
         },
         "args": {
           "project_ref": "xxoiqfraeolsqsmsheue"
         }
       }
     }
   }
   ```

3. **Substitua** `SEU_PERSONAL_ACCESS_TOKEN_AQUI` pelo token que você copiou no passo 1.

#### Opção B: Configuração via Interface do Cursor

1. Abra as configurações do Cursor
2. Procure por "MCP" ou "Model Context Protocol"
3. Adicione um novo servidor MCP:
   - **Nome**: `supabase`
   - **Tipo**: `http`
   - **URL**: `https://mcp.supabase.com/mcp`
   - **Headers**: 
     ```json
     {
       "Authorization": "Bearer SEU_PERSONAL_ACCESS_TOKEN_AQUI"
     }
     ```
   - **Args**:
     ```json
     {
       "project_ref": "xxoiqfraeolsqsmsheue"
     }
     ```

### 3. Reiniciar o Cursor

Após configurar, **reinicie o Cursor** para que as mudanças tenham efeito:
- Feche completamente o Cursor
- Abra novamente

### 4. Verificar Configuração

Para verificar se está funcionando:

1. Abra o chat do Cursor
2. Pergunte: "Liste as tabelas do banco de dados"
3. Se funcionar, você verá uma lista das tabelas do seu projeto Supabase

## 🔐 Segurança

### ⚠️ Importante

- **NUNCA** commite o arquivo `.cursor/mcp.json` com o token no Git
- Adicione `.cursor/mcp.json` ao `.gitignore`:
  ```
  .cursor/mcp.json
  ```

### Alternativa: Variáveis de Ambiente

Se preferir usar variáveis de ambiente:

1. Crie um arquivo `.cursor/mcp.json` com referência à variável:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "type": "http",
         "url": "https://mcp.supabase.com/mcp",
         "headers": {
           "Authorization": "Bearer ${SUPABASE_MCP_TOKEN}"
         },
         "args": {
           "project_ref": "${SUPABASE_PROJECT_REF}"
         }
       }
     }
   }
   ```

2. Configure as variáveis de ambiente no sistema ou no Cursor

## 📝 Informações do Projeto

- **Project Ref**: `xxoiqfraeolsqsmsheue`
- **URL do Projeto**: `https://xxoiqfraeolsqsmsheue.supabase.co`

## 🛠️ Troubleshooting

### Problema: "No MCP resources found"

**Soluções:**
1. Verifique se o token está correto (sem espaços extras)
2. Verifique se o `project_ref` está correto
3. Reinicie o Cursor completamente
4. Verifique se o token não expirou
5. Tente gerar um novo token

### Problema: "Unauthorized"

**Soluções:**
1. Verifique se o token tem as permissões corretas
2. Verifique se o `project_ref` corresponde ao projeto correto
3. Gere um novo token e atualize a configuração

### Problema: MCP não aparece nas ferramentas

**Soluções:**
1. Verifique se o arquivo está no local correto: `.cursor/mcp.json`
2. Verifique a sintaxe JSON (use um validador JSON)
3. Reinicie o Cursor
4. Verifique os logs do Cursor para erros

## 📚 Recursos Adicionais

- [Documentação Oficial do MCP Supabase](https://supabase.com/docs/guides/getting-started/mcp)
- [GitHub: Supabase MCP Server](https://github.com/supabase-community/supabase-mcp)
- [Documentação do Model Context Protocol](https://modelcontextprotocol.io)

## ✅ Checklist de Configuração

- [ ] Token PAT gerado no Supabase
- [ ] Arquivo `.cursor/mcp.json` criado
- [ ] Token inserido no arquivo de configuração
- [ ] `project_ref` configurado corretamente
- [ ] `.cursor/mcp.json` adicionado ao `.gitignore`
- [ ] Cursor reiniciado
- [ ] Configuração testada (listar tabelas)

## 🎯 Próximos Passos

Após configurar o MCP, você poderá:

- ✅ Consultar esquema do banco de dados
- ✅ Ver estruturas de tabelas
- ✅ Verificar políticas RLS
- ✅ Consultar funções RPC
- ✅ Analisar migrations
- ✅ E muito mais!

---

**Nota**: O MCP do Supabase está em **alpha público**. Algumas funcionalidades podem estar limitadas ou mudar.
