# Teste de Persistência de Dados de Clientes

## Problema Identificado
Os dados de clientes não estavam sendo salvos corretamente ao editar um cadastro existente. As alterações desapareciam ao recarregar a página.

## Correções Aplicadas

### 1. Backend (index.tsx)
- **Melhorado o merge de dados** na rota PUT `/clientes/:id`
- **Adicionados logs detalhados** para rastrear quais campos estão sendo recebidos e salvos
- **Garantida preservação** de todos os campos ao fazer o merge

```typescript
const clienteCompleto = { 
  ...clientes[index],      // Dados antigos como base
  ...clienteAtualizado,    // Dados novos sobrescrevem
  id,                      // ID nunca muda
  dataAtualizacao: new Date().toISOString(),
  atualizadoPor: clienteAtualizado.atualizadoPor || clientes[index].atualizadoPor,
};
```

### 2. Frontend (CustomerFormPage.tsx)
- **Mesclagem completa de dados** ao salvar edições
- **Preservação de campos críticos** que não devem ser perdidos
- **Logs detalhados** em 3 pontos principais:
  1. Ao carregar o cliente
  2. Antes de salvar (formData completo)
  3. Após receber resposta do servidor

```typescript
const clienteAtualizado: Cliente = {
  ...clienteAnterior,        // Base com todos os dados originais
  ...formData as Cliente,    // Sobrescrever com edições
  id: clienteId,             // Garantir ID
  dataAtualizacao: new Date().toISOString(),
  atualizadoPor: usuario.nome,
  // Preservar campos essenciais
  dataCadastro: formData.dataCadastro || clienteAnterior.dataCadastro,
  criadoPor: formData.criadoPor || clienteAnterior.criadoPor,
  codigo: formData.codigo || clienteAnterior.codigo,
};
```

## Como Testar

### Passo 1: Abrir o Console do Navegador
1. Pressione F12 para abrir as DevTools
2. Vá na aba "Console"
3. Mantenha o console aberto durante todo o teste

### Passo 2: Editar um Cliente Existente
1. Acesse a lista de clientes
2. Clique em um cliente para visualizar
3. Clique no botão "Editar"
4. Observe no console a mensagem `[CUSTOMER-FORM] Cliente encontrado:`
   - Verifique se todos os campos estão presentes
   - Anote os valores de: pessoasContato, dadosBancarios, condicoesPagamento, etc.

### Passo 3: Fazer Alterações
Faça alterações em cada uma das seguintes abas:

#### Dados Cadastrais
- [ ] Altere Segmento de Mercado
- [ ] Altere Grupo/Rede
- [ ] Altere algum campo de endereço

#### Contato
- [ ] Adicione uma nova pessoa de contato
- [ ] Edite uma pessoa existente
- [ ] Adicione um dado bancário

#### Condição Comercial
- [ ] Altere Empresa de Faturamento
- [ ] Altere Lista de Preços
- [ ] Adicione/remova Condições de Pagamento
- [ ] Altere descontos ou pedido mínimo

#### Logística
- [ ] Altere requisitos logísticos
- [ ] Adicione observações

### Passo 4: Salvar as Alterações
1. Clique no botão "Salvar"
2. **OBSERVE ATENTAMENTE O CONSOLE** - você verá 3 logs importantes:
   
   **Log 1: FormData completo antes de salvar**
   ```
   [CLIENTE] FormData completo antes de salvar: {
     pessoasContato: X,
     dadosBancarios: Y,
     condicoesPagamento: Z,
     empresaFaturamento: "...",
     listaPrecos: "...",
     ...
   }
   ```
   ✅ **Verifique**: Todos os campos que você editou devem estar presentes com os valores corretos.
   
   **Log 2: Atualizando cliente no Supabase**
   ```
   [CLIENTE] Atualizando cliente no Supabase: {
     camposEnviados: [...],
     pessoasContato: X,
     dadosBancarios: Y,
     ...
   }
   ```
   ✅ **Verifique**: Os mesmos dados do Log 1 devem estar aqui.
   
   **Log 3: Cliente atualizado no Supabase com sucesso**
   ```
   [CLIENTE] Cliente atualizado no Supabase com sucesso: {
     pessoasContato: X,
     dadosBancarios: Y,
     ...
   }
   ```
   ✅ **Verifique**: O servidor deve retornar os mesmos dados que foram enviados.

3. Aguarde a mensagem de sucesso: "Cliente atualizado com sucesso!"

### Passo 5: Recarregar a Página
1. Pressione F5 para recarregar a página
2. Navegue até o mesmo cliente
3. Clique para visualizar/editar
4. **OBSERVE O CONSOLE** - Log: `[CUSTOMER-FORM] Cliente encontrado:`
5. **Verifique se TODOS os dados salvos no Passo 4 estão presentes**

### Passo 6: Verificar Cada Campo Individualmente
Vá aba por aba e confirme:

- [ ] **Dados Cadastrais**: Segmento de Mercado está correto?
- [ ] **Dados Cadastrais**: Grupo/Rede está correto?
- [ ] **Contato**: Pessoas de contato foram salvas?
- [ ] **Contato**: Dados bancários foram salvos?
- [ ] **Condição Comercial**: Empresa de Faturamento está correta?
- [ ] **Condição Comercial**: Lista de Preços está correta?
- [ ] **Condição Comercial**: Condições de Pagamento estão corretas?
- [ ] **Condição Comercial**: Descontos e pedido mínimo estão corretos?
- [ ] **Logística**: Requisitos logísticos estão corretos?

## Interpretando os Logs

### ✅ Cenário Correto
Se os logs mostrarem:
```
[CUSTOMER-FORM] Cliente encontrado: { pessoasContato: 2, dadosBancarios: 1, ... }
[CLIENTE] FormData completo antes de salvar: { pessoasContato: 3, dadosBancarios: 1, ... }
[CLIENTE] Atualizando cliente no Supabase: { pessoasContato: 3, ... }
[CLIENTE] Cliente atualizado no Supabase com sucesso: { pessoasContato: 3, ... }
[BACKEND] Cliente atualizado no KV store: { pessoasContato: 3, ... }
```
E após recarregar:
```
[CUSTOMER-FORM] Cliente encontrado: { pessoasContato: 3, dadosBancarios: 1, ... }
```
**✅ TUDO FUNCIONANDO CORRETAMENTE!**

### ❌ Cenário com Problema

#### Problema 1: Dados não chegam no formData
```
[CUSTOMER-FORM] Cliente encontrado: { pessoasContato: 2, ... }
[CLIENTE] FormData completo antes de salvar: { pessoasContato: 0, ... }  ❌
```
**Causa**: O componente filho não está atualizando o formData corretamente.
**Solução**: Verificar o componente específico (ex: CustomerFormContato).

#### Problema 2: Dados não são enviados ao servidor
```
[CLIENTE] FormData completo antes de salvar: { pessoasContato: 3, ... }
[CLIENTE] Atualizando cliente no Supabase: { pessoasContato: 0, ... }  ❌
```
**Causa**: Problema na preparação dos dados antes do envio.
**Solução**: Verificar a construção do objeto `clienteAtualizado`.

#### Problema 3: Servidor não salva corretamente
```
[CLIENTE] Atualizando cliente no Supabase: { pessoasContato: 3, ... }
[BACKEND] Cliente atualizado no KV store: { pessoasContato: 0, ... }  ❌
```
**Causa**: Problema no merge de dados no backend.
**Solução**: Verificar a rota PUT no servidor.

#### Problema 4: Dados não são recuperados corretamente
```
[BACKEND] Cliente atualizado no KV store: { pessoasContato: 3, ... }
```
Mas após recarregar:
```
[CUSTOMER-FORM] Cliente encontrado: { pessoasContato: 0, ... }  ❌
```
**Causa**: Problema na rota GET do servidor ou no KV store.
**Solução**: Verificar se o `kv.set` está funcionando corretamente.

## Checklist de Validação Final

Após fazer o teste completo, responda:

- [ ] Os logs mostram todos os dados sendo enviados corretamente?
- [ ] Os logs mostram o servidor salvando todos os dados?
- [ ] Após recarregar, os dados persistem na interface?
- [ ] Todos os campos listados no início estão funcionando?

Se TODAS as respostas forem SIM, a persistência está funcionando! ✅

Se alguma for NÃO, compartilhe os logs do console para análise detalhada. ❌

## Observações Importantes

1. **Console Limpo**: Antes de cada teste, limpe o console (ícone 🚫) para ver apenas os logs do teste atual.

2. **Modo Mock vs Supabase**: Se você ver logs como:
   ```
   [CLIENTE] Erro ao atualizar no Supabase, atualizando apenas localmente
   ```
   Isso significa que está em modo fallback. Os dados serão salvos apenas na sessão atual e serão perdidos ao recarregar.

3. **Autenticação**: Se ver `[BACKEND] No user authenticated`, significa que há problema de autenticação e os dados não serão salvos no Supabase.

4. **Sincronização Imediata**: O sistema salva no Supabase E localmente simultaneamente. A persistência real depende do Supabase.
