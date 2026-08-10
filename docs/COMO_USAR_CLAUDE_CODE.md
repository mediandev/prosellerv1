# Como pedir alterações no ProSeller usando o Claude Code

**Para quem não é programador.**
O Claude escreve o código. Seu trabalho é dizer o que quer e conferir o resultado.

---

## O que é, em uma frase

Você descreve o que precisa, em português. Ele lê o sistema, faz a alteração e
publica. Você confere na tela.

Ele não adivinha o que você quis dizer — ele faz o que você pediu. Por isso o
jeito de pedir importa mais que o resto.

---

## Como pedir bem

**Diga o problema, não a solução.** Você conhece a operação; ele conhece o
código.

| Em vez de | Peça assim |
|---|---|
| "Muda a coluna X da tabela Y" | "No relatório de comissões, o total está somando pedido cancelado. Não deveria." |
| "Cria um índice em cliente" | "A tela de clientes está demorando muito para abrir." |
| "Arruma o CEP" | "Quando salvo um cliente, o CEP perde o hífen. Deveria ficar 13.345-400." |

Na coluna da direita ele entende o objetivo e pode achar uma causa que você nem
imaginava. Na esquerda, ele executa uma ordem que pode estar errada.

**Um pedido de cada vez.** "Arruma o relatório, muda a tela de clientes e cria um
alerta novo" vira três coisas mal feitas. Peça uma, confira, peça a próxima.

**Diga como saber que deu certo.** *"Depois disso, quando eu abrir o pedido 9506
o valor tem que aparecer como R$ 1.317,16."* Isso dá a ele um alvo concreto — e
te dá o que conferir.

---

## O que ele faz sozinho (e você pode cobrar)

O sistema tem um arquivo de instruções (`CLAUDE.md`) que ele lê antes de mexer em
qualquer coisa. Ele está obrigado a:

1. **Pedir sua autorização** antes de alterar o banco de dados
2. **Fazer backup** antes de substituir qualquer coisa
3. **Ensaiar** a alteração numa cópia antes de aplicar de verdade
4. **Abrir o sistema e conferir** depois de publicar
5. **Testar as próprias verificações** contra o erro que deveriam pegar

**Se ele pular alguma, cobre.** Um pedido basta: *"você testou na tela?"*

Vale saber por que a regra 4 existe: nesta última etapa, três defeitos passaram
por todos os testes automáticos e só apareceram quando alguém abriu o navegador —
um CEP sendo corrompido, um selo sem cor e um link que ia para a tela errada.

---

## Quando desconfiar

Pare e pergunte mais se ele:

- **Disser que está pronto sem ter aberto o sistema.** Compilar não é funcionar.
- **Quiser mexer no banco sem explicar o que muda.** Peça em português: *"me
  explica o que essa alteração faz, sem termo técnico."*
- **Propuser refazer algo grande.** Quase nunca é a resposta certa aqui. O
  sistema funciona e tem gente faturando nele.
- **Der uma resposta que você não entendeu.** Se você não entendeu, ou está mal
  explicado ou está mal pensado. Peça de novo, mais simples.
- **Concordar com tudo que você diz.** Se você falar uma bobagem, ele deveria
  apontar. Concordância fácil demais é sinal ruim.

---

## Frases que valem a pena guardar

Use estas quando quiser puxar o freio:

> *"Isso pode quebrar alguma outra coisa?"*

> *"Me explica em português o que você vai fazer."*

> *"Você testou na tela ou só compilou?"*

> *"Faz o backup antes."*

> *"Não mexe em produção ainda, quero entender primeiro."*

> *"Quantos registros isso vai afetar?"*

A última é especialmente útil antes de qualquer coisa que altere dados. Se a
resposta for um número grande e você não esperava, pare.

---

## Coisas que exigem cuidado redobrado

Peça sempre para ele **explicar antes de fazer** quando o pedido tocar em:

- **Envio de pedido ao ERP** e emissão de nota
- **Cálculo ou pagamento de comissão**
- **Salvamento de cliente** — foi onde um defeito apagou dados de 94 clientes
- **Permissões de usuário**
- **Qualquer coisa que apague dados**

Nessas áreas, um erro custa dinheiro de verdade.

---

## Depois que ele publicar

1. **Abra o sistema e confira** o que você pediu, com seus olhos
2. **Veja o número da versão** no canto inferior esquerdo — ele muda a cada
   entrega. Se não mudou, a alteração não subiu
3. **Clique em "novidades"** (o ícone ao lado da versão) para ler o que mudou

Se algo ficou estranho, diga: *"depois da sua alteração, tal coisa parou de
funcionar."* Ele consegue desfazer.

---

## Se der errado

Peça: *"desfaz a última alteração."* Para mudanças de tela, volta ao ar em um
minuto.

Para banco de dados é mais delicado — peça para ele explicar o que vai fazer
antes de desfazer, porque reverter errado pode piorar.

---

## O que o sistema faz sozinho, sem você pedir

- **Todo dia às 6h** confere 15 regras críticas e te manda e-mail **se** achar
  algo. Sem e-mail = está tudo em ordem.
- **De hora em hora** atualiza o rastreio das entregas.
- **A cada ação importante** registra quem fez, na tela Auditoria.

O e-mail traz um botão que abre direto na tela do problema. O que fazer em cada
caso está no `docs/MANUAL_OPERACAO.md`.

---

## Onde procurar mais

| Você quer | Olhe em |
|---|---|
| O que fazer quando chega um alerta | `docs/MANUAL_OPERACAO.md` |
| Como o banco de dados funciona | `docs/GUIA_SUPABASE.md` |
| As regras que o Claude segue | `CLAUDE.md` |
| Quem é dono de cada acesso | `docs/ACESSOS_E_PROPRIEDADE.md` |

---

*ProSeller V1 · agosto/2026*
