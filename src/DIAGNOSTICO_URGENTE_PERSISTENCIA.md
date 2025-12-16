# 🚨 Diagnóstico Urgente - Problema de Persistência

## Situação Atual
Os dados de clientes NÃO estão sendo salvos. Nenhuma alteração persiste após recarregar a página.

## Ferramentas de Debug Implementadas

### 1. Botão "🔍 Debug FormData" 
- Localização: Ao lado do botão "Salvar" 
- Função: Mostra o estado atual do formData ANTES de clicar em Salvar
- **IMPORTANTE**: Clique PRIMEIRO no botão Debug, DEPOIS no Salvar

### 2. Logs Automáticos no Console
O sistema agora loga automaticamente em 6 pontos críticos:
1. ✅ Quando o componente carrega dados do cliente
2. ✅ Toda vez que um campo é editado (updateFormData)
3. ✅ Quando o botão Salvar é clicado
4. ✅ Antes de enviar para o servidor
5. ✅ Resposta do servidor
6. ✅ Confirmação de salvamento no backend

## 🔍 Procedimento de Diagnóstico

### Passo 1: Preparação
1. Abra o navegador
2. Pressione F12 (DevTools)
3. Vá na aba "Console"
4. Clique no ícone 🚫 para limpar o console
5. Mantenha o console visível durante todo o teste

### Passo 2: Carregar um Cliente Existente
1. Navegue até a lista de clientes
2. Clique em qualquer cliente para visualizar
3. Clique em "Editar"
4. **OBSERVE O CONSOLE** - Deve aparecer:
   ```
   [CUSTOMER-FORM] Cliente encontrado: { ... }
   ```
5. **COPIE E COLE** este log completo num arquivo de texto

### Passo 3: Fazer UMA Alteração Por Vez

#### Teste 1: Adicionar Pessoa de Contato
1. Vá na aba "Contato"
2. Clique em "Adicionar Pessoa de Contato"
3. Preencha os dados (nome e email são obrigatórios)
4. Clique em "Adicionar"
5. **OBSERVE O CONSOLE** - Deve aparecer:
   ```
   [CUSTOMER-FORM] Atualizando formData: { pessoasContato: X }
   [CUSTOMER-FORM] FormData após atualização: { pessoasContato: X }
   ```
6. ✅ Se apareceu: A UI está funcionando
7. ❌ Se NÃO apareceu: Problema no componente CustomerFormContato

#### Teste 2: Debug FormData
1. **NÃO MUDE DE ABA**
2. Clique no botão "🔍 Debug FormData"
3. **OBSERVE O CONSOLE** - Deve aparecer uma tabela com:
   ```
   Pessoas Contato: 1 (ou o número que você adicionou)
   ```
4. ✅ Se o número está correto: O formData está atualizado
5. ❌ Se o número está 0: O formData NÃO foi atualizado

#### Teste 3: Salvar
1. Clique no botão "Salvar"
2. **OBSERVE O CONSOLE ATENTAMENTE** - Sequência esperada:
   ```
   ================================================================================
   [SAVE] Botão Salvar foi clicado!
   [SAVE] FormData SNAPSHOT: { ... }
   ================================================================================
   
   [CLIENTE] FormData completo antes de salvar: { 
     pessoasContato: 1,
     ...
   }
   
   [CLIENTE] Atualizando cliente no Supabase: {
     pessoasContato: 1,
     ...
   }
   
   [BACKEND] Atualizando cliente: { ... }
   [BACKEND] Cliente atualizado no KV store: {
     pessoasContato: 1,
     ...
   }
   
   [CLIENTE] Cliente atualizado no Supabase com sucesso: {
     pessoasContato: 1,
     ...
   }
   ```

3. **ANÁLISE** - Identifique onde o problema ocorre:

   **Cenário A**: pessoasContato é 0 no primeiro log `[SAVE] FormData SNAPSHOT`
   - ❌ Problema: O formData não foi atualizado antes do save
   - Causa: Possível bug de timing no React ou updateFormData não funcionando
   
   **Cenário B**: pessoasContato é 1 no SNAPSHOT mas 0 em `[CLIENTE] Atualizando cliente no Supabase`
   - ❌ Problema: Os dados estão se perdendo na preparação do clienteAtualizado
   - Causa: Bug na linha que cria o objeto clienteAtualizado
   
   **Cenário C**: pessoasContato é 1 no envio mas 0 na resposta do servidor
   - ❌ Problema: O servidor não está salvando corretamente
   - Causa: Bug no backend (rota PUT)
   
   **Cenário D**: pessoasContato é 1 em todos os logs
   - ✅ Tudo correto! Continue para o Passo 4

### Passo 4: Verificar Persistência Real
1. **NÃO FECHE A ABA**
2. Pressione F5 para recarregar a página
3. Navegue novamente até o cliente editado
4. Clique em "Editar"
5. **OBSERVE O CONSOLE**:
   ```
   [CUSTOMER-FORM] Cliente encontrado: {
     pessoasContato: X,
     ...
   }
   ```
6. Vá na aba "Contato"
7. Verifique se a pessoa de contato adicionada está visível

#### Resultados Possíveis:

**✅ Sucesso Total**: 
- Log mostra pessoasContato: 1
- A pessoa aparece na lista
- **Conclusão**: A persistência está funcionando!

**❌ Falha Parcial**:
- Log mostra pessoasContato: 1
- MAS a pessoa NÃO aparece na lista
- **Conclusão**: Dados salvos mas UI não está renderizando

**❌ Falha Total**:
- Log mostra pessoasContato: 0
- A pessoa NÃO aparece na lista
- **Conclusão**: Dados não foram persistidos

### Passo 5: Teste Outros Campos

Repita o procedimento (Testes 1-4) para cada campo problemático:

#### Teste: Segmento de Mercado
1. Vá na aba "Dados Cadastrais"
2. Selecione um Segmento de Mercado
3. Clique em "🔍 Debug FormData"
4. Verifique se "Segmento Mercado" tem o valor selecionado
5. Clique em "Salvar"
6. Observe os logs
7. Recarregue e verifique

#### Teste: Empresa de Faturamento
1. Vá na aba "Condição Comercial"
2. Selecione uma Empresa de Faturamento
3. Clique em "🔍 Debug FormData"
4. Verifique se "Empresa Faturamento" tem o valor selecionado
5. Clique em "Salvar"
6. Observe os logs
7. Recarregue e verifique

## 📊 Matriz de Diagnóstico

| Sintoma | Log do Console | Possível Causa | Arquivo Afetado |
|---------|----------------|----------------|-----------------|
| Botão Debug mostra dados vazios | `pessoasContato: 0` após edição | `updateFormData` não está sendo chamado | `CustomerFormContato.tsx` |
| SNAPSHOT mostra dados corretos mas são perdidos depois | `pessoasContato: 1` → depois `0` | Problema no merge de `clienteAtualizado` | `CustomerFormPage.tsx` linha 240-250 |
| Dados enviados mas servidor não salva | Backend mostra `0` | Problema no KV store ou merge do backend | `index.tsx` linha 461-466 |
| Tudo salvo mas não aparece ao recarregar | Logs corretos mas UI vazia | Problema na rota GET ou serialização | `index.tsx` linha 277-310 |
| Erro de autenticação | `[AUTH] ...failed` ou `Unauthorized` | Token inválido ou expirado | `api.ts` ou `AuthContext.tsx` |

## 🚨 Próximos Passos

### Se o problema é no Cenário A (formData vazio no SNAPSHOT):
```
❌ O formData não está sendo atualizado pelos componentes filhos
→ Verificar se updateFormData está sendo chamado
→ Verificar se há erro silencioso no componente filho
```

### Se o problema é no Cenário B (dados perdidos na preparação):
```
❌ O clienteAtualizado não está recebendo todos os campos
→ Problema na linha de merge: ...clienteAnterior + ...formData
→ Possível overwrite indesejado
```

### Se o problema é no Cenário C (servidor não salva):
```
❌ O backend não está fazendo merge corretamente
→ Verificar o spread operator no backend
→ Verificar se kv.set está falhando
```

### Se o problema é no Cenário D (dados não carregam):
```
❌ O GET não está retornando dados salvos
→ Verificar se kv.get está retornando dados atualizados
→ Verificar se há cache ou dados mock sobrescrevendo
```

## ⚠️ Informações Críticas para Reportar

Após fazer os testes, **COPIE E COLE** as seguintes informações:

1. **Todos os logs do console** (do momento que clicou em Editar até após recarregar)
2. **Cenário identificado** (A, B, C ou D)
3. **Qual campo testou** (Pessoas de Contato, Segmento, etc.)
4. **Resultado do botão Debug** (copie a tabela do console)
5. **Mensagens de erro** (se houver)

Com essas informações, poderei identificar exatamente onde está o problema e corrigi-lo!

## 🔧 Debug Avançado (Opcional)

Se quiser investigar mais a fundo, abra o console e execute:

```javascript
// Ver dados no localStorage
console.log('Auth Token:', localStorage.getItem('auth_token'));
console.log('Usuario Logado:', localStorage.getItem('usuarioLogado'));

// Ver dados mockados
console.log('Clientes Mock:', clientes);

// Ver o formData atual (cole dentro do navegador com DevTools aberto na página do formulário)
// Este comando só funciona se executado no contexto da página
```

## ✅ Checklist Final

- [ ] Console aberto e limpo
- [ ] Logs copiados ANTES de editar
- [ ] Editei UM campo por vez
- [ ] Cliquei em Debug ANTES de Salvar
- [ ] Copiei logs do SAVE completo
- [ ] Recarreguei a página
- [ ] Copiei logs do RELOAD
- [ ] Identifiquei o cenário (A, B, C ou D)
- [ ] Preparei todas as informações para reportar

---

**IMPORTANTE**: Não pule nenhum passo! Cada log é crítico para identificar onde exatamente o problema está ocorrendo.
