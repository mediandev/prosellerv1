# Guia de Deploy no Netlify - ProSeller V1

Este documento contém as instruções para fazer o deploy do sistema ProSeller V1 no Netlify.

## 📋 Pré-requisitos

1. Conta no Netlify (gratuita)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto configurado e funcionando localmente

## 🚀 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que todos os arquivos estão commitados e enviados para o repositório:

```bash
git add .
git commit -m "Configuração para deploy no Netlify"
git push
```

### 2. Conectar o Repositório ao Netlify

1. Acesse [netlify.com](https://netlify.com) e faça login
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Escolha seu provedor Git (GitHub, GitLab ou Bitbucket)
4. Autorize o Netlify a acessar seu repositório
5. Selecione o repositório do ProSeller V1

### 3. Configurar as Variáveis de Build

O Netlify detectará automaticamente as configurações do arquivo `netlify.toml`, mas você pode configurar manualmente:

**Build settings:**
- **Build command:** `npm install && npm run build`
- **Publish directory:** `build`
- **Node version:** `18` (ou superior)

### 4. Configurar Variáveis de Ambiente (Opcional)

Se você quiser usar variáveis de ambiente para as configurações do Supabase (recomendado):

1. No painel do Netlify, vá em **Site settings** → **Environment variables**
2. Adicione as seguintes variáveis (se necessário):
   - `VITE_SUPABASE_URL` - URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase

**Nota:** Atualmente, as configurações do Supabase estão hardcoded no arquivo `src/services/api.ts`. Para usar variáveis de ambiente, será necessário modificar esse arquivo.

### 5. Fazer o Deploy

1. Clique em **"Deploy site"**
2. O Netlify começará a fazer o build automaticamente
3. Aguarde o processo de build completar (geralmente 2-5 minutos)
4. Após o build, seu site estará disponível em uma URL do tipo: `https://seu-site-aleatorio.netlify.app`

### 6. Configurar Domínio Personalizado (Opcional)

1. No painel do Netlify, vá em **Site settings** → **Domain management**
2. Clique em **"Add custom domain"**
3. Siga as instruções para configurar seu domínio

## 📁 Arquivos de Configuração

### `netlify.toml`

Este arquivo contém as configurações principais do Netlify:
- Comando de build
- Diretório de publicação
- Regras de redirecionamento para SPA
- Headers de segurança

### `public/_redirects`

Este arquivo garante que todas as rotas da aplicação sejam redirecionadas para `index.html`, permitindo que o React Router funcione corretamente.

## 🔧 Configurações Atuais

- **Build command:** `npm install && npm run build`
- **Publish directory:** `build`
- **Node version:** Recomendado 18 ou superior
- **Framework:** Vite + React

## ⚠️ Importante

1. **Variáveis de Ambiente:** As configurações do Supabase estão atualmente hardcoded. Para maior segurança, considere mover para variáveis de ambiente.

2. **CORS:** Certifique-se de que o Supabase está configurado para aceitar requisições do domínio do Netlify.

3. **Builds Automáticos:** O Netlify fará deploy automaticamente sempre que você fizer push para a branch principal do repositório.

## 🐛 Troubleshooting

### Build falha

- Verifique os logs de build no painel do Netlify
- Certifique-se de que todas as dependências estão no `package.json`
- Verifique se a versão do Node está correta

### Rotas não funcionam

- Verifique se o arquivo `public/_redirects` está presente
- Certifique-se de que o arquivo está sendo copiado para o build

### Erros de CORS

- Adicione o domínio do Netlify nas configurações de CORS do Supabase
- Verifique as configurações de autenticação do Supabase

## 📚 Recursos Adicionais

- [Documentação do Netlify](https://docs.netlify.com/)
- [Deploy de aplicações React](https://docs.netlify.com/integrations/frameworks/react/)
- [Configuração de variáveis de ambiente](https://docs.netlify.com/environment-variables/overview/)
