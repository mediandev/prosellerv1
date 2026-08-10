# Manual de operação — ProSeller

**Para quem vai cuidar do sistema no dia a dia.**
Não pressupõe conhecimento técnico. Leia a parte que você precisa, quando precisar.

---

## Antes de tudo: a regra que evita 90% dos problemas

**Nunca peça uma alteração e publique no mesmo minuto sem olhar o resultado na tela.**

O sistema tem usuários faturando de verdade. Um erro vira nota fiscal errada ou
cadastro perdido. Depois de qualquer mudança: **abra o sistema e confira com os
próprios olhos.**

Se você usa o Claude Code, ele já está instruído a fazer isso — o arquivo
`CLAUDE.md`, na raiz do projeto, tem as regras que ele segue. Se ele publicar
algo sem conferir, cobre.

---

## 1. Chegou um e-mail da Sentinela. E agora?

Todo dia de manhã o sistema se confere sozinho. **Se não chegar e-mail, está tudo
em ordem** — o silêncio é bom sinal.

Quando chega, cada item vem com um botão **"Resolver agora"** que abre o sistema
na tela certa. Segue o que cada aviso significa:

| Aviso | O que aconteceu | O que fazer |
|---|---|---|
| **Pedido enviado duas vezes ao ERP** | Dois pedidos com o mesmo número no Tiny | **É o mais urgente.** Confira no Tiny se saiu nota em duplicidade |
| **Comissão em duplicidade** | O mesmo pedido gerou duas comissões | Confira antes de fechar o período, senão paga duas vezes |
| **Comissão de pedido excluído** | Comissão de um pedido que foi apagado | Deveria ter sido estornada — confira o período |
| **Comissão sem pedido** | Comissão apontando para pedido que não existe | Confira antes de pagar |
| **Pedido sem confirmação do ERP** | Marcado como enviado, sem número do Tiny | Abra o pedido e reenvie ao ERP |
| **Valor do pedido não bate com os itens** | Total difere da soma dos produtos | Se faturar assim, a nota sai errada. Abra e confira os itens |
| **Campo de cliente apagado** | Um campo que tinha valor ficou vazio | O valor antigo está no histórico do cliente e pode ser devolvido |
| **Dois cadastros com o mesmo CNPJ** | Cliente duplicado | Unifique — senão a nota vai para o cadastro errado |
| **Cliente comprou e está sem endereço** | Não dá para emitir nem entregar | Complete o endereço no cadastro |
| **Cliente novo sem condição de pagamento** | Ele não consegue fechar pedido | Defina a condição no cadastro |
| **CEP fora do padrão** | CEP gravado quebrado | Corrija no cadastro — atrapalha a emissão |
| **Produto ativo sem preço** | Aparece para o vendedor e não fecha pedido | Defina o preço na lista |
| **Frete entregue preso em trânsito** | A transportadora entregou, o sistema não fechou | Abra o frete e use "Atualizar rastreio" |
| **Consulta do Simples falhou** | A Receita não respondeu e travou uma emissão | Normalmente é temporário: reenvie o pedido |
| **Condição parcelada com nome divergente** | O nome não bate com as parcelas | Configurações → Condições de Pagamento |

**O alerta some sozinho** quando o problema é resolvido. Você não precisa marcar
nada como concluído.

O e-mail chega **quando aparece algo novo** e, uma vez por semana, para lembrar
do que continua pendente. A lista completa fica sempre na tela **Sentinela**.

**Para mudar quem recebe:** é uma configuração no Supabase chamada
`SENTINELA_EMAIL_DESTINO` — vários e-mails separados por vírgula. Não precisa
mexer em código.

---

## 2. Quero saber quem mexeu em alguma coisa

Tela **Auditoria**, no menu. Mostra quem fez, quando, e o valor antes e depois.

Cobre: pedidos, clientes, usuários e permissões, comissões, conta corrente,
preços, produtos, configurações e fretes.

Dá para filtrar por tipo, por pessoa e por período.

**Duas coisas para saber:**

- Quando aparece **"Sistema"** como autor, significa que a ação foi automática
  (o ERP devolvendo o número da nota, o rastreio atualizando o frete) **ou** que
  aquela tela ainda não informa quem fez. Não é erro — é o sistema dizendo "não
  sei quem foi" em vez de chutar um nome.
- **Correção de telefone, e-mail e observação não aparece aqui de propósito.**
  Se aparecesse, o que importa ficaria enterrado. Essas mudanças ficam no
  histórico do próprio cliente.

O registro **não pode ser editado nem apagado**, e não tem prazo de validade.

---

## 3. Publicando uma alteração

O sistema tem três partes, e elas sobem de formas diferentes:

| Parte | Como sobe |
|---|---|
| **Telas** | Sozinho, ~1 minuto depois de enviar o código |
| **Funções do servidor** | Comando manual |
| **Banco de dados** | Comando manual |

**A ordem importa: banco primeiro, telas depois.** Ao contrário, a tela pede algo
que o banco ainda não aceita e o usuário toma erro.

### Antes de publicar

```
npm test
npm run build
```

Se algum falhar, **não publique**. Não tem exceção.

### Publicando

| Você mudou | Comando |
|---|---|
| Só telas | `git push origin main` — e espere 1 minuto |
| Função do servidor | `npx supabase functions deploy NOME --project-ref xxoiqfraeolsqsmsheue` |
| Banco de dados | Peça ao Claude — ele faz backup e ensaia antes. **Nunca aplique direto.** |

### Depois de publicar

1. **Abra o sistema e confira.** Sempre.
2. Suba o número da versão (canto inferior esquerdo do sistema) e escreva no
   changelog o que mudou, em português de quem usa.

O número da versão é como o pessoal sabe que a entrega chegou.

---

## 4. Deu errado. Como volto atrás?

**Mudança de tela** (o caso mais comum):

```
git revert HEAD
git push origin main
```

Isso desfaz a última alteração e republica. Um minuto depois está no ar de novo.

**Função do servidor:** as versões anteriores estão em `docs/plans/backups/`.
Copie o conteúdo de volta para o arquivo e publique de novo.

**Banco de dados:** os backups também estão em `docs/plans/backups/`, com data no
nome. **Peça ajuda ao Claude Code** — ele sabe conferir antes de aplicar. Este é
o único lugar onde reverter errado pode piorar a situação.

---

## 5. Verificações que você pode rodar

> **Antes:** o projeto exige **Node 20.19 ou mais novo**. Em versões anteriores o
> `npm test` nem inicia, com um erro sobre "ES Module" que parece defeito do
> projeto e não é. Confira com `node -v`.


| Comando | O que faz |
|---|---|
| `npm test` | Confere as telas — 96 verificações, alguns segundos |
| `npm run test:edge` | Confere as funções do servidor |
| `npm run test:db` | Copia o banco e testa as regras críticas |
| `npm run drift` | **Compara o que está no ar com o código.** Se alguém alterou algo direto em produção, acusa aqui |
| `npm run test:e2e` | Abre o sistema num navegador de verdade e confere as telas. Precisa das credenciais em `PROSELLER_EMAIL` e `PROSELLER_SENHA` |

O `npm run drift` é o que mais vale a pena rodar de vez em quando. Se ele
reclamar, alguém mexeu fora do caminho normal.

---

## 6. As rotinas automáticas

| Rotina | Quando | O que faz |
|---|---|---|
| Verificação diária | 6h | Confere 15 regras críticas |
| E-mail de alerta | 6h15 | Avisa se encontrou algo |
| Rastreio de entregas | de hora em hora | Atualiza o status dos fretes |

Elas rodam dentro do banco de dados, sem depender de ninguém.

---

## 7. Nunca faça

- **Publicar sem conferir na tela.** É a origem de quase todo estrago.
- **Aplicar mudança no banco sem backup e sem ensaio.** Um comando errado ali não
  tem desfazer fácil.
- **Publicar a partir de outro ramo que não seja `main`.**
- **Apagar dados de produção.** Se algo precisa "sumir", quase sempre a resposta
  certa é desativar, não excluir.
- **Guardar senha ou chave de API em arquivo de texto.**
- **Confiar que funcionou porque compilou.** Compilar não é funcionar.

---

## 8. Quando pedir ajuda

Pare e peça ajuda se:

- O e-mail acusar **pedido enviado duas vezes ao ERP** ou **comissão em
  duplicidade** — mexe com dinheiro e nota fiscal
- Algo que funcionava parar de funcionar depois de uma publicação
- O `npm run drift` reclamar e você não souber por quê
- Você precisar mexer no banco de dados e não entender o que a mudança faz

Nesses casos, o custo de perguntar é uma mensagem. O de errar pode ser dias.

---

## Onde procurar mais

| Você quer | Olhe em |
|---|---|
| As regras que o Claude Code segue | `CLAUDE.md` (raiz do projeto) |
| Como o Supabase funciona aqui | `docs/GUIA_SUPABASE.md` |
| O que o sistema faz e por quê | `docs/specs/business-rules/` |
| O que já foi feito e quando | `docs/wiki/log.md` |
| Problemas antigos e a causa de cada um | `docs/specs/system-contract/known-incidents.md` |

---

*ProSeller V1 · Manual de operação · agosto/2026*
