# 🚀 Setup Tiny ERP - Guia Visual Passo a Passo

## 📌 Visão Geral

Este guia mostrará como configurar a integração com o Tiny ERP em modo REAL, permitindo que seus pedidos sejam enviados automaticamente para o ERP.

---

## ✅ Pré-requisitos

- [ ] Conta ativa no Tiny ERP
- [ ] Pelo menos uma empresa cadastrada no sistema
- [ ] Acesso às configurações do Tiny ERP

---

## 📝 Passo 1: Obter Token de API do Tiny ERP

### 1.1 Acessar o Tiny ERP
- Acesse: https://www.tiny.com.br/
- Faça login na sua conta

### 1.2 Navegar até API
1. Clique no menu superior direito (ícone do usuário)
2. Selecione **"Configurações"**
3. No menu lateral, procure por **"API"** ou **"Integrações"**

### 1.3 Gerar Token
1. Clique em **"Gerar novo token"** ou **"Criar token"**
2. Dê um nome descritivo (ex: "Sistema de Gestão Comercial")
3. Copie o token gerado (IMPORTANTE: guarde em local seguro!)

**Formato do token:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 🏢 Passo 2: Configurar Empresa no Sistema

### 2.1 Acessar Configurações
1. No sistema, clique em **"⚙️ Configurações"** no menu principal
2. Selecione a aba **"Empresas"**

### 2.2 Selecionar Empresa
- Você verá cards de todas as empresas cadastradas
- Cada card mostra:
  - Nome fantasia
  - CNPJ
  - Localização
  - Badge de status (Ativa/Inativa)

### 2.3 Abrir Configuração de ERP
1. Localize a empresa que deseja integrar
2. Clique no botão **⚙️** (engrenagem) ao lado do botão "Editar"
3. Um diálogo "Integração com Tiny ERP" será aberto

---

## 🔧 Passo 3: Configurar Integração

### 3.1 Ativar Integração
- No topo do diálogo, você verá um switch **"Status da Integração"**
- Ative o switch (ficará verde com badge "Ativo")

### 3.2 Inserir Token
1. No campo **"Token de API"**, cole o token copiado do Tiny ERP
2. O campo é do tipo "password" para segurança

### 3.3 Testar Conexão
1. Clique no botão **"🔄 Testar Conexão"**
2. Aguarde alguns segundos
3. Você verá uma mensagem de:
   - ✅ **Sucesso**: "Conexão estabelecida com sucesso!"
   - ❌ **Erro**: "Falha na conexão. Verifique o token..."

**Se der erro:**
- Verifique se o token foi copiado corretamente (sem espaços)
- Confirme que o token não expirou no Tiny ERP
- Tente gerar um novo token

### 3.4 Configurar Envio Automático
Abaixo da seção de token, você encontrará:

**Habilitar Envio Automático**
- ✅ Ativado: Pedidos serão enviados automaticamente ao criar
- ❌ Desativado: Você precisará enviar manualmente

**Tentativas Máximas**
- Padrão: 3
- Intervalo: 1 a 10
- Define quantas vezes o sistema tentará enviar em caso de falha

**Intervalo entre Tentativas**
- Padrão: 5 minutos
- Intervalo: 1 a 60 minutos
- Tempo de espera entre cada tentativa

### 3.5 Configurar Preferências
**Transmitir OC nas Observações**
- ✅ Ativado: Número da OC do cliente será incluído nas observações do pedido no ERP
- ❌ Desativado: OC não será enviada

### 3.6 Salvar
1. Clique em **"Salvar Configuração"**
2. Aguarde a confirmação
3. Se a empresa configurada for a empresa atualmente selecionada, você verá:
   - 📢 "Sistema configurado para modo REAL. Recarregue a página..."

---

## 🔄 Passo 4: Ativar Modo REAL

### 4.1 Recarregar Página
- Pressione **F5** ou **Ctrl+R** (Cmd+R no Mac)
- Ou clique no botão de recarregar do navegador

### 4.2 Verificar Indicador
- No canto inferior direito da tela, você verá:
  - 🟢 **"Tiny ERP: REAL"** (verde) → Integração ativa!
  - 🟡 **"Tiny ERP: MOCK"** (amarelo) → Modo simulação

**Se ainda estiver em MOCK:**
1. Verifique se salvou a configuração
2. Confirme que a empresa está marcada como "Ativa"
3. Recarregue a página novamente
4. Verifique o localStorage: `localStorage.getItem('tinyERPMode')`

---

## 🎯 Passo 5: Testar Envio de Pedido

### 5.1 Criar Novo Pedido
1. Vá para **"Vendas"** no menu principal
2. Clique em **"+ Novo Pedido"** ou no botão flutuante
3. Preencha os dados do pedido:
   - Cliente
   - Produtos e quantidades
   - Condições comerciais
   - Observações (opcional)

### 5.2 Verificar Opções de ERP
Na tela de criação, você verá opções relacionadas ao ERP:
- Checkbox: **"Enviar para ERP automaticamente"**
- Se marcado, o pedido será enviado imediatamente após salvar

### 5.3 Salvar e Aguardar
1. Clique em **"Salvar"** ou **"Criar Pedido"**
2. O sistema irá:
   - Salvar o pedido no banco de dados local
   - Construir o XML do pedido
   - Enviar para o Tiny ERP via backend
   - Atualizar o status do pedido

### 5.4 Verificar Resultado
Você verá notificações (toasts) informando:
- 📤 "Enviando pedido PV-XXXX para o Tiny ERP..."
- ✅ "Pedido enviado para o Tiny ERP com sucesso! (ID: XXXXX)"
- Ou ❌ "Erro ao enviar pedido: [mensagem]"

---

## 🔍 Passo 6: Verificar no Tiny ERP

### 6.1 Acessar Tiny ERP
- Faça login no Tiny ERP
- Vá para a seção **"Pedidos"** ou **"Vendas"**

### 6.2 Localizar Pedido
- Busque pelo número do pedido ou data
- O pedido deve estar lá com status "Aberto" ou similar

### 6.3 Verificar Dados
Confira se os dados foram transmitidos corretamente:
- ✅ Cliente
- ✅ Produtos e quantidades
- ✅ Valores
- ✅ Observações (incluindo OC se configurado)

---

## 🎓 Casos de Uso Avançados

### Configurar Múltiplas Empresas
1. Repita os passos 2 e 3 para cada empresa
2. Cada empresa pode ter seu próprio token do Tiny ERP
3. Ao trocar de empresa no sistema, a integração mudará automaticamente

### Envio Manual de Pedido
Se o envio automático falhar ou estiver desabilitado:
1. Abra o pedido na lista de vendas
2. Clique em **"Ações"** ou menu do pedido
3. Selecione **"Enviar para ERP"**

### Sincronizar Status
Para buscar atualizações do Tiny ERP:
1. Abra o pedido
2. Clique em **"Sincronizar Status"**
3. O sistema buscará o status atual no Tiny ERP

---

## ⚠️ Troubleshooting

### Problema: "Token inválido"
**Solução:**
1. Gere um novo token no Tiny ERP
2. Cole o novo token na configuração
3. Teste a conexão novamente

### Problema: "Tiny ERP not configured"
**Solução:**
1. Verifique se salvou a configuração
2. Confirme que o switch "Ativo" está ligado
3. Recarregue a página

### Problema: Sistema continua em modo MOCK
**Solução:**
1. Abra o console do navegador (F12)
2. Digite: `localStorage.setItem('tinyERPMode', 'REAL')`
3. Pressione Enter
4. Recarregue a página

### Problema: Pedido não aparece no Tiny ERP
**Solução:**
1. Verifique os logs no console (F12 → Console)
2. Procure por mensagens começando com `[TINY ERP]`
3. Se houver erro, copie a mensagem e verifique:
   - Token está correto?
   - Empresa está ativa no Tiny ERP?
   - Produtos existem no Tiny ERP?

---

## 📊 Monitoramento e Logs

### Console do Navegador
Pressione **F12** para abrir as ferramentas do desenvolvedor:

```
[TINY ERP] Buscando config para empresa: abc-123
[TINY ERP] Config encontrada: { ativo: true, hasToken: true }
[TINY ERP] Enviando pedido...
[TINY ERP] XML gerado: <?xml version="1.0"...
[TINY ERP] Pedido criado com sucesso: { id: "12345", numero: "TINY-001" }
```

### Indicadores Visuais
- 🟢 Badge "Integração Ativa" na configuração
- 🟢 "Tiny ERP: REAL" no rodapé
- ✅ Ícone de sucesso nos pedidos enviados

---

## 🎉 Conclusão

Parabéns! Sua integração com o Tiny ERP está configurada e funcionando!

**Próximos passos:**
- ✅ Criar pedidos e verificar no Tiny ERP
- ✅ Configurar outras empresas se necessário
- ✅ Ajustar preferências de envio automático
- ✅ Monitorar logs para garantir funcionamento correto

**Lembre-se:**
- O token do Tiny ERP é sensível - não compartilhe
- Teste sempre após configurar uma nova empresa
- Monitore os logs em caso de problemas

---

## 📚 Documentação Adicional

- [Integração Tiny ERP - Visão Técnica](/INTEGRACAO_TINY_ERP.md)
- [API do Tiny ERP](https://tiny.com.br/api-docs)
- Supabase Edge Functions: `/supabase/functions/server/index.tsx`

---

**Versão:** 1.0  
**Data:** Novembro 2024  
**Autor:** Sistema de Gestão Comercial
