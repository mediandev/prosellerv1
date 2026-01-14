# 🔄 Instruções para Limpar Cache e Aplicar Correções

## ⚠️ IMPORTANTE: Problema de Cache Detectado

Se você ainda está vendo o erro:
```
❌ Erro: CNPJ inválido: "00.000.000/0001-91" (zeros em excesso)
```

É porque o **navegador está usando uma versão antiga do código em cache**.

## ✅ Solução: Limpar Cache do Navegador

### Método 1: Hard Refresh (Mais Rápido)

**No Chrome/Edge/Brave:**
1. Pressione `Ctrl + Shift + R` (Windows/Linux)
2. Ou `Cmd + Shift + R` (Mac)

**No Firefox:**
1. Pressione `Ctrl + F5` (Windows/Linux)
2. Ou `Cmd + Shift + R` (Mac)

**No Safari:**
1. Pressione `Cmd + Option + R`

### Método 2: Limpar Cache Completo (Recomendado)

**No Chrome/Edge:**
1. Pressione `F12` para abrir DevTools
2. Clique com botão direito no ícone de **Recarregar** (ao lado da URL)
3. Selecione **"Limpar cache e recarregar forçado"** (Hard Reload)

**Ou:**
1. Vá em `Configurações` → `Privacidade e segurança`
2. Clique em `Limpar dados de navegação`
3. Selecione:
   - ✅ Imagens e arquivos em cache
   - ✅ Cookies e outros dados do site
4. Período: **Última hora**
5. Clique em `Limpar dados`

### Método 3: Modo Anônimo (Para Testar)

1. Abra uma **nova janela anônima/privada**:
   - Chrome/Edge: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`
   - Safari: `Cmd + Shift + N`
2. Acesse o sistema novamente
3. Teste o envio do pedido

## 🔍 Como Verificar se a Correção Foi Aplicada

Após limpar o cache, ao tentar enviar um pedido, você deve ver no **Console do navegador** (F12):

```
🏗️ [construirPedidoXML v2.0.0] Iniciando construção do XML
🏗️ [construirPedidoXML v2.0.0] Cliente: BANCO DO BRASIL SA
🏗️ [construirPedidoXML v2.0.0] CNPJ: 00.000.000/0001-91
🏗️ [construirPedidoXML v2.0.0] CPF/CNPJ limpo: 00000000000191
🏗️ [construirPedidoXML v2.0.0] Tamanho: 14 | Tipo pessoa: J
✅ [construirPedidoXML v2.0.0] Validação de tamanho OK!
✅ [construirPedidoXML v2.0.0] CNPJs com zeros iniciais são VÁLIDOS (ex: Banco do Brasil)
✅ [construirPedidoXML v2.0.0] Validação de dígitos verificadores será feita pela API do Tiny ERP
```

Se você vir **"v2.0.0"** nos logs, a correção foi aplicada! ✅

## ❌ Se o Erro Continuar

### 1. Verifique se há Service Workers ativos

1. Abra DevTools (F12)
2. Vá em `Application` (Chrome) ou `Storage` (Firefox)
3. Clique em `Service Workers`
4. Se houver algum, clique em **"Unregister"**
5. Recarregue a página

### 2. Limpe LocalStorage e SessionStorage

1. Abra DevTools (F12)
2. Vá em `Application` → `Storage`
3. Clique em **"Clear site data"**
4. Recarregue a página

### 3. Desabilite Cache do DevTools

1. Abra DevTools (F12)
2. Vá em `Network`
3. Marque a opção **"Disable cache"**
4. Mantenha o DevTools aberto e teste novamente

### 4. Feche e Reabra o Navegador

1. Feche **TODAS** as janelas do navegador
2. Aguarde 5 segundos
3. Abra o navegador novamente
4. Acesse o sistema

## 🧪 Teste com CNPJ do Banco do Brasil

Após limpar o cache, teste com:

**Cliente:** Banco do Brasil SA  
**CNPJ:** 00.000.000/0001-91

**Resultado esperado:**
- ✅ Validação passa sem erros
- ✅ Pedido é construído corretamente
- ✅ XML é enviado para Tiny ERP

## 📊 Logs de Debug

Quando a correção estiver ativa, você verá estes logs no console:

### ✅ Logs Corretos (v2.0.0)
```
🏗️ [construirPedidoXML v2.0.0] Iniciando construção do XML
✅ [construirPedidoXML v2.0.0] Validação de tamanho OK!
✅ [construirPedidoXML v2.0.0] CNPJs com zeros iniciais são VÁLIDOS
```

### ❌ Logs Antigos (versão em cache)
```
❌ Erro ao construir XML: Error: CNPJ inválido: "00.000.000/0001-91" (zeros em excesso)
```

Se você vir os logs antigos, o cache não foi limpo corretamente.

## 🔧 Para Desenvolvedores: Disable Cache Durante Desenvolvimento

1. Abra DevTools (F12)
2. Vá em `Settings` (ícone de engrenagem)
3. Marque: **"Disable cache (while DevTools is open)"**
4. Mantenha DevTools sempre aberto durante desenvolvimento

## 📱 No Mobile / Tablets

### Android (Chrome):
1. Vá em `Configurações` → `Privacidade`
2. `Limpar dados de navegação`
3. Selecione `Imagens e arquivos em cache`
4. Clique em `Limpar dados`

### iOS (Safari):
1. Vá em `Ajustes` → `Safari`
2. Role até `Limpar Histórico e Dados de Sites`
3. Confirme

## ✅ Checklist de Verificação

- [ ] Abri DevTools (F12) e fui na aba Console
- [ ] Limpei o cache (Ctrl+Shift+R ou método 2)
- [ ] Recarreguei a página
- [ ] Tentei enviar pedido com CNPJ do Banco do Brasil
- [ ] Verifiquei os logs do console
- [ ] Vi "v2.0.0" nos logs → **Correção aplicada!** ✅
- [ ] Não vi erro de "zeros em excesso" → **Sucesso!** ✅

## 🆘 Ainda Com Problemas?

Se após seguir TODOS os passos acima o erro persistir:

1. Tire um **print do console** (F12 → Console)
2. Copie o **stack trace completo** do erro
3. Verifique se o arquivo `/services/tinyERPSync.ts` tem a tag `VERSION: 2024-11-30_20:00`
4. Confirme que não há arquivo `tinyERPSync_old.ts` ou similar sendo importado

## 📝 Notas Técnicas

- **Versão do código:** 2.0.0
- **Data da correção:** 30/11/2025
- **Arquivos alterados:** 3
  - `/services/tinyERPSync.ts`
  - `/services/integrations.ts`
  - `/lib/masks.ts`

---

**Última atualização:** 30/11/2025 20:00  
**Status:** Correção completa aplicada ✅
