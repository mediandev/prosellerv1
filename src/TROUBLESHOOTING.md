# Troubleshooting - Guia de Resolução de Problemas

## 🐛 Debug Rápido

### Como ver o que está sendo retornado pelas APIs

1. **Abra o Console do Navegador:**
   - Chrome/Edge: `F12` ou `Ctrl+Shift+I`
   - Firefox: `F12` ou `Ctrl+Shift+K`
   - Safari: `Cmd+Option+I`

2. **Clique na aba "Console"**

3. **Faça uma busca de CNPJ ou CEP**

4. **Veja os logs:**
   ```javascript
   // Exemplo de logs que você verá:
   
   // Para CNPJ:
   BrasilAPI Response: {
     cnpj: "12345678000190",
     razao_social: "Empresa Exemplo LTDA",
     municipio: "São Paulo",  // ← Procure este campo
     uf: "SP"
   }
   BrasilAPI - Município extraído: São Paulo
   BrasilAPI - UF extraído: SP
   
   // Para CEP:
   {
     cep: "01310-100",
     logradouro: "Avenida Paulista",
     bairro: "Bela Vista", 
     localidade: "São Paulo",  // ← Este é o município
     uf: "SP"
   }
   ```

5. **Se município estiver vazio nos logs:**
   - O problema está na API (dados incompletos)
   - Solução: Preencher manualmente

6. **Se município aparecer nos logs mas não no formulário:**
   - Reportar como bug
   - Pode ser problema no mapeamento de dados

---

## 🔍 Consulta CNPJ + Inscrição Estadual

### Fluxo Automático
O sistema agora realiza consulta integrada:
1. ✅ Consulta CNPJ na Receita Federal
2. ✅ Obtém a UF da empresa
3. ✅ Consulta automaticamente a Inscrição Estadual (SINTEGRA)
4. ✅ Preenche ambos os campos no formulário

### Município não é preenchido automaticamente

**Sintoma:** Ao buscar CNPJ ou CEP, o campo de município fica vazio

**✅ CORRIGIDO:** Implementado delay de 100ms entre preenchimento de UF e Município para dar tempo da lista carregar.

**Como funciona agora:**
1. API retorna dados com UF e Município
2. Sistema preenche UF primeiro
3. React recalcula lista de municípios para aquela UF
4. Aguarda 100ms
5. Sistema preenche Município
6. Campo aparece preenchido ✅

**Se ainda estiver vazio:**
1. **Abra o Console do navegador (F12)**
2. **Vá para a aba Console**
3. **Procure por logs:**
   ```
   BrasilAPI Response: { ... }
   BrasilAPI - Município extraído: São Paulo
   BrasilAPI - UF extraído: SP
   ```

**Possíveis Causas e Soluções:**

1. **API retornou sem município:**
   - Alguns CNPJs/CEPs podem não ter município na resposta
   - Solução: Preencher manualmente

2. **Estrutura da API mudou:**
   - As APIs públicas podem alterar estrutura de dados
   - Verificar logs do console para ver estrutura real
   - Reportar problema para atualização do código

3. **CEP inválido:**
   - ViaCEP retorna erro se CEP não existe
   - Verificar se CEP está correto

4. **CNPJ com dados incompletos:**
   - Algumas empresas têm cadastro incompleto
   - Tentar em diferentes APIs (sistema faz automaticamente)

**Como verificar qual API foi usada:**
```javascript
// No console, procure por:
✅ "Dados do CNPJ obtidos com sucesso!"
// Antes disso verá qual API respondeu:
"BrasilAPI Response:" // ou
"ReceitaWS Response:" // ou  
"CNPJ.WS Response:"
```

### Consulta CNPJ não funciona

### Problema
A busca automática de dados por CNPJ não retorna resultados ou apresenta erros.

### Possíveis Causas e Soluções

#### 1. **CORS (Cross-Origin Resource Sharing)**
**Sintoma:** Erro no console: "blocked by CORS policy"

**Causa:** Algumas APIs públicas podem bloquear requisições diretas do navegador.

**Soluções:**
- ✅ **Implementado:** Sistema com 3 APIs de fallback (BrasilAPI, ReceitaWS, CNPJ.WS)
- Se todas falharem por CORS, considere usar um proxy backend
- Em produção, crie um endpoint no seu backend que faz a consulta

#### 2. **Rate Limit (Limite de Requisições)**
**Sintoma:** Erro "Too Many Requests" ou status 429

**Causa:** APIs públicas gratuitas têm limite de requisições por minuto/hora.

**Soluções:**
- ✅ **Implementado:** Fallback automático entre APIs
- Espere alguns minutos antes de tentar novamente
- Para uso intensivo, considere APIs pagas ou cache local

#### 3. **API Temporariamente Indisponível**
**Sintoma:** Timeout ou erro 503/504

**Causa:** Servidores da API estão fora do ar ou lentos.

**Soluções:**
- ✅ **Implementado:** Sistema tenta 3 APIs diferentes automaticamente
- Verifique status em:
  - BrasilAPI: https://status.brasilapi.com.br/
  - ReceitaWS: https://receitaws.com.br/
  - CNPJ.WS: https://cnpj.ws/

#### 4. **CNPJ Inválido**
**Sintoma:** Mensagem "CNPJ inválido"

**Causa:** Dígitos verificadores incorretos ou formato errado.

**Soluções:**
- ✅ **Implementado:** Validação automática de dígitos verificadores
- Verifique se o CNPJ está correto
- Use a ferramenta de teste em Configurações → Testes de API

#### 5. **CNPJ Não Cadastrado**
**Sintoma:** API retorna erro 404 ou "CNPJ não encontrado"

**Causa:** CNPJ não existe ou não está ativo na base da Receita Federal.

**Soluções:**
- Verifique o CNPJ diretamente no site da Receita Federal
- CNPJs muito novos podem não estar nas APIs ainda
- CNPJs cancelados podem não retornar dados

---

## 🧪 Como Testar a Integração CNPJ

### Usando a Ferramenta de Teste
1. Acesse **Configurações** no menu lateral
2. Clique na aba **"Testes de API"**
3. Digite um CNPJ ou use um dos exemplos fornecidos
4. Clique em **"Buscar"**
5. Verifique os logs no console do navegador (F12)

### CNPJs de Teste Válidos
```
00.000.000/0001-91  - Banco do Brasil
33.000.167/0001-01  - Petrobras
60.746.948/0001-12  - Ambev
07.526.557/0001-00  - Renner
```

### Inscrição Estadual não aparece

**Sintoma:** CNPJ é consultado com sucesso, mas IE não é preenchida

**Possíveis Causas:**
1. **IE não está nas APIs públicas**
   - Nem todos os CNPJs têm IE disponível nas APIs gratuitas
   - Algumas empresas são isentas de IE
   
2. **Estado sem API pública**
   - Cada estado tem seu próprio sistema SINTEGRA
   - APIs públicas só têm dados de alguns estados
   
3. **IE só em fonte oficial**
   - Algumas IEs só estão disponíveis no portal da SEFAZ de cada estado

**Soluções:**
- ✅ Sistema tenta automaticamente (não gera erro se não encontrar)
- ✅ Consulte manualmente no portal da SEFAZ do estado
- ✅ Preencha manualmente se necessário
- Para produção, considere APIs pagas com cobertura completa

**Como verificar logs:**
```javascript
// No console (F12), procure por:
✅ "UF obtida (SP), buscando Inscrição Estadual..."
✅ "Inscrição Estadual encontrada via ReceitaWS"
⚠️ "Inscrição Estadual não encontrada automaticamente"
```

### Logs no Console
Abra o console do navegador (F12) e procure por:
- ✅ "Dados do CNPJ obtidos com sucesso!" - Funcionou
- ⚠️ "BrasilAPI falhou, tentando ReceitaWS..." - Fallback em ação
- ❌ "Não foi possível consultar o CNPJ" - Todas as APIs falharam

---

## 📡 Como Depurar Requisições

### Chrome/Edge DevTools
1. Pressione **F12**
2. Vá para a aba **Network**
3. Filtre por **Fetch/XHR**
4. Faça uma busca de CNPJ
5. Clique nas requisições para ver:
   - Status Code (200 = sucesso)
   - Response (dados retornados)
   - Preview (visualização formatada)

### Códigos de Status HTTP
- **200** - ✅ Sucesso
- **400** - ❌ Requisição inválida
- **404** - ❌ CNPJ não encontrado
- **429** - ⚠️ Muitas requisições (rate limit)
- **500/502/503/504** - ❌ Erro no servidor da API

---

## 🔧 Soluções Alternativas

### 1. Usar Proxy Backend (Recomendado para Produção)

**Node.js/Express Exemplo:**
```javascript
app.get('/api/cnpj/:cnpj', async (req, res) => {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${req.params.cnpj}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar CNPJ' });
  }
});
```

**Alterar no código:**
```typescript
// Em /services/integrations.ts
async function consultarCNPJBrasilAPI(cnpj: string): Promise<CNPJData | null> {
  const response = await fetch(`/api/cnpj/${cnpj}`); // Usar seu backend
  // ... resto do código
}
```

### 2. Cache Local
Implemente cache para evitar consultas repetidas:
```typescript
const cnpjCache = new Map<string, CNPJData>();

export async function consultarCNPJ(cnpj: string): Promise<CNPJData | null> {
  // Verificar cache primeiro
  if (cnpjCache.has(cnpj)) {
    return cnpjCache.get(cnpj)!;
  }
  
  // Consultar API
  const result = await consultarCNPJBrasilAPI(cnpj);
  
  // Salvar no cache
  if (result) {
    cnpjCache.set(cnpj, result);
  }
  
  return result;
}
```

### 3. API Paga (Para Alto Volume)
Considere APIs comerciais:
- **Brasil API Pro** - https://brasilapi.com.br/pricing
- **API CNPJ** - https://api-cnpj.com/
- **ReceitaFederal.app** - https://receitafederal.app/

---

## 🚨 Problemas Comuns

### "Não foi possível consultar o CNPJ"
**Checklist:**
1. ✅ CNPJ tem 14 dígitos?
2. ✅ CNPJ é válido? (Use a ferramenta de teste)
3. ✅ Conexão com internet está OK?
4. ✅ Console mostra erros de CORS?
5. ✅ Já tentou outro CNPJ?

### Dados Incompletos Retornados
**Causa:** Nem todos os CNPJs têm todos os dados cadastrados.

**Solução:** 
- ✅ **Implementado:** Sistema trata campos vazios
- Preencha manualmente os campos faltantes
- Campos opcionais podem ficar em branco

### Dados Desatualizados
**Causa:** APIs públicas podem ter delay de atualização.

**Solução:**
- Consulte diretamente na Receita Federal para dados críticos
- Use as APIs apenas como pré-preenchimento
- Permita edição manual dos campos

---

## 🔐 CORS e Segurança

### O que é CORS?
Cross-Origin Resource Sharing é uma medida de segurança dos navegadores que impede sites de fazerem requisições para outros domínios sem permissão.

### Por que acontece?
Algumas APIs não permitem requisições diretas do navegador por questões de segurança.

### Como Resolver?

#### Solução 1: Proxy Backend (Melhor)
Crie um endpoint no seu backend que faz a requisição e retorna os dados.

#### Solução 2: Extensão de Navegador (Apenas Desenvolvimento)
**⚠️ NÃO use em produção!**
- Chrome: "CORS Unblock"
- Firefox: "CORS Everywhere"

#### Solução 3: Configurar CORS no Servidor
Se você controla a API, adicione headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST
```

---

## 📊 Monitoramento

### Logs Importantes
O sistema gera logs úteis no console:

```javascript
// Sucesso
✅ "Dados do CNPJ obtidos com sucesso!"

// Fallback
⚠️ "BrasilAPI falhou, tentando ReceitaWS..."
⚠️ "ReceitaWS falhou, tentando CNPJ.WS..."

// Erro
❌ "Erro ao consultar CNPJ: [mensagem]"
```

### Métricas Recomendadas
Em produção, monitore:
- Taxa de sucesso das consultas
- Qual API está sendo mais usada
- Tempo médio de resposta
- Taxa de fallback

---

## 🆘 Suporte

### Ainda com Problemas?

1. **Verifique a Ferramenta de Teste**
   - Configurações → Testes de API
   - Teste CNPJs conhecidos
   - Analise os logs

2. **Verifique o Console**
   - Pressione F12
   - Vá para Console
   - Procure por erros em vermelho

3. **Teste APIs Diretamente**
   - BrasilAPI: `https://brasilapi.com.br/api/cnpj/v1/00000000000191`
   - ReceitaWS: `https://receitaws.com.br/v1/cnpj/00000000000191`
   - Abra no navegador ou use Postman

4. **Documentação das APIs**
   - BrasilAPI: https://brasilapi.com.br/docs
   - ReceitaWS: https://receitaws.com.br/api
   - CNPJ.WS: https://cnpj.ws/docs

---

## ✅ Checklist Rápido

Antes de reportar um bug:

- [ ] Testei na ferramenta de testes (Configurações → Testes de API)
- [ ] Verifiquei o console do navegador (F12)
- [ ] Testei com CNPJs diferentes
- [ ] Testei CNPJs conhecidos (Banco do Brasil: 00.000.000/0001-91)
- [ ] Verifiquei minha conexão com internet
- [ ] Limpei o cache do navegador
- [ ] Testei em outro navegador
- [ ] Testei acessando as APIs diretamente no navegador

---

## 🔄 Atualizações Futuras

### Melhorias Planejadas
- [ ] Cache persistente com LocalStorage
- [ ] Retry automático com exponential backoff
- [ ] Métricas de uso das APIs
- [ ] Opção de configurar API preferencial
- [ ] Integração com mais APIs (Serpro, Brasil API Pro)
- [ ] Fallback para banco de dados local

---

**Última atualização:** 26/10/2025
