# Deploy da Edge Function produtos-v2

## Opção 1: Deploy via Dashboard do Supabase (Recomendado)

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto (xxoiqfraeolsqsmsheue)
3. Vá em **Edge Functions** no menu lateral
4. Clique em **Create a new function**
5. Nome da função: `produtos-v2`
6. Cole o conteúdo do arquivo `supabase/functions/produtos-v2/index.ts`
7. Clique em **Deploy**

## Opção 2: Deploy via CLI (requer autenticação)

### 1. Instalar Supabase CLI

```powershell
# Via Scoop (recomendado no Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Ou via npm (não recomendado, mas funciona)
npm install -g supabase
```

### 2. Fazer login no Supabase

```powershell
npx supabase login
```

### 3. Fazer deploy

```powershell
cd supabase/functions/produtos-v2
npx supabase functions deploy produtos-v2 --project-ref xxoiqfraeolsqsmsheue
```

## Opção 3: Deploy via API REST

Se você tiver um access token do Supabase, pode fazer o deploy via API:

```powershell
# Compactar a função
Compress-Archive -Path "supabase/functions/produtos-v2/*" -DestinationPath "produtos-v2.zip" -Force

# Fazer upload via API
$headers = @{
    "Authorization" = "Bearer SEU_ACCESS_TOKEN"
    "Content-Type" = "application/zip"
}
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/xxoiqfraeolsqsmsheue/functions/produtos-v2" -Method PUT -Headers $headers -InFile "produtos-v2.zip"
```

## Verificação

Após o deploy, teste a função:

```bash
curl -X GET "https://xxoiqfraeolsqsmsheue.supabase.co/functions/v1/produtos-v2?action=list" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "apikey: SEU_ANON_KEY"
```

## Nota

A Edge Function `produtos-v2` está pronta e corrigida para CORS. Ela implementa:
- ✅ Listagem de produtos
- ✅ Busca de produto por ID
- ✅ Criação de produtos
- ✅ Atualização de produtos
- ✅ Exclusão de produtos (soft delete)
- ✅ Headers CORS corretos
- ✅ Autenticação JWT
- ✅ Validações de dados
