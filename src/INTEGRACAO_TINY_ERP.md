# Integração com Tiny ERP - Modo REAL

## ✅ Status: IMPLEMENTADO

A integração completa com o Tiny ERP em modo REAL está agora implementada e funcional!

## 🎯 O que foi implementado

### 1. Backend Proxy (Supabase Edge Functions)
- ✅ Rotas de proxy para resolver problema de CORS
- ✅ GET `/tiny/produtos` - Listar produtos
- ✅ GET `/tiny/produto/:id` - Obter produto específico
- ✅ GET `/tiny/clientes` - Listar clientes
- ✅ POST `/tiny/pedido` - Criar pedido
- ✅ GET `/tiny/pedido/:id` - Obter pedido específico
- ✅ GET `/tiny/pedidos` - Listar pedidos
- ✅ POST `/tiny/test-connection` - Testar conexão
- ✅ POST `/tiny/cliente` - Criar/atualizar cliente (contato)
- ✅ POST `/tiny/produto` - Criar/atualizar produto

### 2. Gerenciamento de Configuração por Empresa
- ✅ GET `/erp-config/:empresaId` - Obter configuração
- ✅ POST `/erp-config/:empresaId` - Salvar configuração
- ✅ Armazenamento seguro no KV Store do Supabase
- ✅ Token de API armazenado por empresa

### 3. Interface de Configuração
- ✅ Diálogo de configuração em **Configurações → Empresas**
- ✅ Botão com ícone de engrenagem em cada empresa
- ✅ Campos para:
  - Token de API do Tiny ERP
  - Ativar/Desativar integração
  - Envio automático de pedidos
  - Tentativas máximas e intervalo
  - Preferências (transmitir OC)
- ✅ Botão "Testar Conexão" funcional
- ✅ Validação em tempo real

### 4. Serviços Atualizados
- ✅ `tinyERPSync.ts` atualizado para usar backend
- ✅ `erpAutoSendService.ts` sem proteções MOCK
- ✅ `api.ts` com todos os métodos necessários
- ✅ Detecção automática de modo REAL/MOCK

## 📋 Como usar

### Passo 1: Obter Token do Tiny ERP

1. Acesse sua conta no [Tiny ERP](https://www.tiny.com.br/)
2. Vá em **Configurações** → **API**
3. Clique em **Gerar novo token**
4. Copie o token gerado

### Passo 2: Configurar no Sistema

1. Acesse **Configurações** no menu principal
2. Vá para a aba **Empresas**
3. Localize a empresa desejada
4. Clique no botão **⚙️** (engrenagem) ao lado de "Editar"
5. Cole o token no campo **Token de API**
6. Clique em **Testar Conexão** para validar
7. Configure as preferências de envio automático
8. Clique em **Salvar Configuração**

### Passo 3: Ativar Modo REAL

Após salvar a configuração com um token válido:

1. O sistema automaticamente detectará a configuração
2. Se a empresa salva for a empresa selecionada atual, será sugerido recarregar a página
3. Recarregue a página para ativar o modo REAL
4. O indicador no canto inferior direito mostrará "Tiny ERP: REAL"

### Passo 4: Criar Pedidos

Agora você pode criar pedidos normalmente:

1. Vá para **Vendas** → **Novo Pedido**
2. Preencha os dados do pedido
3. Marque a opção **Enviar para ERP automaticamente** (se disponível)
4. Salve o pedido

O pedido será automaticamente enviado ao Tiny ERP via backend!

## 🔧 Configurações Avançadas

### Envio Automático

- **Habilitado**: Pedidos são enviados automaticamente após a criação
- **Tentativas Máximas**: Número de tentativas em caso de falha (padrão: 3)
- **Intervalo entre Tentativas**: Tempo em minutos entre cada tentativa (padrão: 5)

### Preferências

- **Transmitir OC nas Observações**: Inclui o número da Ordem de Compra do cliente nas observações do pedido no ERP

## 🔍 Monitoramento

### Logs no Console

O sistema fornece logs detalhados no console do navegador:

```
[TINY ERP] Buscando config para empresa: xxx
[TINY ERP] Config encontrada: { ativo: true, hasToken: true }
[TINY ERP] Enviando pedido...
[TINY ERP] Pedido criado com sucesso: {...}
```

### Indicador de Modo

No canto inferior direito da tela, você verá:
- **Tiny ERP: REAL** (verde) - Integração ativa
- **Tiny ERP: MOCK** (amarelo) - Modo simulação

## ⚠️ Resolução de Problemas

### "Token inválido"

- Verifique se copiou o token completo do Tiny ERP
- Confirme que o token não expirou
- Gere um novo token se necessário

### "Tiny ERP not configured for this company"

- Certifique-se de ter salvado a configuração
- Verifique se a integração está marcada como "Ativa"
- Confirme que selecionou a empresa correta

### "Failed to fetch"

- Se ainda aparecer este erro, verifique se:
  - A empresa tem configuração salva
  - O token está correto
  - A conexão com internet está funcionando

## 🎓 Exemplos de Uso

### Criar Pedido Manualmente

```typescript
import { api } from './services/api';

const empresaId = 'uuid-da-empresa';
const pedidoXML = `<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <data_pedido>01/12/2024</data_pedido>
  <cliente>
    <codigo>123</codigo>
    <nome>Cliente Teste</nome>
  </cliente>
  <itens>
    <item>
      <codigo>PROD-001</codigo>
      <descricao>Produto Teste</descricao>
      <quantidade>10</quantidade>
      <valor_unitario>100.00</valor_unitario>
    </item>
  </itens>
</pedido>`;

const resultado = await api.tinycriarPedido(empresaId, pedidoXML);
console.log('Pedido criado:', resultado.registros[0].registro.id);
```

### Listar Produtos

```typescript
import { api } from './services/api';

const empresaId = 'uuid-da-empresa';
const produtos = await api.tinyListarProdutos(empresaId);

console.log('Produtos:', produtos.produtos);
```

### Consultar Status de Pedido

```typescript
import { api } from './services/api';

const empresaId = 'uuid-da-empresa';
const pedidoId = '123456';
const pedido = await api.tinyObterPedido(empresaId, pedidoId);

console.log('Status:', pedido.pedido.situacao);
```

## 🚀 Próximos Passos

Com a integração funcionando, você pode:

1. ✅ Criar pedidos reais no Tiny ERP
2. ✅ Sincronizar status automaticamente
3. ✅ Importar produtos do Tiny ERP
4. ✅ Importar clientes do Tiny ERP
5. ⏳ Configurar webhooks para sincronização em tempo real (futuro)
6. ⏳ Adicionar suporte a outros ERPs (TOTVS, SAP, etc.)

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verifique os logs no console do navegador
2. Teste a conexão usando o botão "Testar Conexão"
3. Consulte a documentação oficial do Tiny ERP: https://tiny.com.br/api-docs

---

## 📚 Referência de Endpoints da API Tiny ERP

### URLs Corretas (importante!)

- ✅ **Contato (Cliente)**: `https://api.tiny.com.br/api2/contato.incluir.php`
  - **NÃO** usar `cliente.incluir.php` (retorna 404)
  - XML deve usar tag `<contato>`, não `<cliente>`
  
- ✅ **Produto**: `https://api.tiny.com.br/api2/produto.incluir.php`
  - XML deve usar tag `<produto>`
  
- ✅ **Pedido**: `https://api.tiny.com.br/api2/pedido.incluir.php`
  - XML deve usar tag `<pedido>`

### Método HTTP

Todos os endpoints usam **POST** com `FormData`:
```javascript
const formData = new FormData();
formData.append('token', 'seu_token_aqui');
formData.append('formato', 'json');
formData.append('contato', xmlDoContato); // ou 'produto', 'pedido'
```

---

**Desenvolvido por**: Sistema de Gestão Comercial v2.0
**Última atualização**: 29 Novembro 2025
