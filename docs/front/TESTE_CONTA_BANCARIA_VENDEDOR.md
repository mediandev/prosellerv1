# Como Testar a Conta Bancária do Vendedor

## Passo 1: Trocar o Usuário Logado

Para visualizar a conta bancária na página de perfil, você precisa estar logado como um vendedor.

### Opção A: Alterar o código temporariamente

Abra o arquivo `/contexts/AuthContext.tsx` e na linha 98, altere:

```typescript
// DE:
const usuarioInicial = USUARIOS_MOCK[0];

// PARA (João Silva - Vendedor):
const usuarioInicial = USUARIOS_MOCK[1];

// OU PARA (Maria Santos - Vendedora):
const usuarioInicial = USUARIOS_MOCK[2];
```

### Opção B: Fazer login

Use as credenciais:
- **Email**: `joao.silva@empresa.com` | **Senha**: `joao123`
- **Email**: `maria.santos@empresa.com` | **Senha**: `maria123`

## Passo 2: Acessar a Página de Perfil

1. Após estar logado como vendedor, vá até a sidebar
2. No canto inferior esquerdo, clique no botão com o nome do usuário
3. Você será redirecionado para a página "Meu Perfil"

## Passo 3: Visualizar Conta Bancária

Na página de perfil, você verá um card chamado **"Conta Bancária para Comissões"** que exibe:

### Para João Silva:
- **Banco**: 341 - Itaú Unibanco S.A.
- **Tipo de Conta**: Conta Corrente
- **Agência**: 1234-5
- **Conta**: 12345-6
- **Titular**: João Silva
- **CPF/CNPJ**: 123.456.789-00
- **Tipo de Chave Pix**: CPF/CNPJ
- **Chave Pix**: 123.456.789-00

### Para Maria Santos:
- **Banco**: 237 - Banco Bradesco S.A.
- **Tipo de Conta**: Conta Corrente
- **Agência**: 5678-0
- **Conta**: 98765-4
- **Titular**: Maria Santos
- **CPF/CNPJ**: 12.345.678/0001-90
- **Tipo de Chave Pix**: E-mail
- **Chave Pix**: maria.santos@empresa.com

## Observações Importantes

1. **Somente Leitura**: O vendedor NÃO pode editar os dados bancários pela página de perfil
2. **Mensagem de Aviso**: Um aviso informa que para alteração é necessário contatar o backoffice
3. **Sincronização**: Os dados exibidos vêm diretamente do cadastro do vendedor em `/data/mockSellers.ts`
4. **Visibilidade**: O card só aparece para usuários do tipo "vendedor"

## Troubleshooting

### O card não aparece?

Verifique:
1. Se você está logado como vendedor (tipo: "vendedor")
2. Se o email do usuário logado corresponde a um vendedor em `mockSellers.ts`
3. Se o vendedor possui `dadosBancarios` preenchidos
4. Abra o console do navegador e procure por logs com "UserProfilePage"

### Os dados aparecem vazios?

- Verifique se o vendedor possui o objeto `dadosBancarios` completo em `/data/mockSellers.ts`
- Certifique-se de que o email do usuário logado é EXATAMENTE o mesmo do vendedor

## Para Desenvolvedores

### Adicionar novos vendedores

1. Adicione o vendedor em `/data/mockSellers.ts` com dados bancários completos
2. Adicione o usuário correspondente em `/contexts/AuthContext.tsx` no array `USUARIOS_MOCK`
3. **IMPORTANTE**: O email deve ser idêntico nos dois arquivos
4. O tipo do usuário deve ser `'vendedor'`
