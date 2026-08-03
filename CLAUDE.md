# CLAUDE.md — regras de operação deste projeto

> Você (Claude) lê este arquivo antes de qualquer alteração no ProSeller.
>
> **Contexto que muda tudo:** quem conduz este projeto **não é desenvolvedor**.
> Ele descreve o que quer em português e conta com você para fazer certo. Ele
> **não vai perceber** se você quebrar algo silenciosamente, e **não vai saber**
> revisar seu código.
>
> Isso significa que a responsabilidade de não estragar é sua, não dele. Quando
> tiver dúvida entre "seguir sozinho" e "parar e perguntar", **pare e pergunte**.
>
> **Versão:** 3.0 (reescrita para a passagem do projeto, 2026-08-04)
> Leia junto com `AGENTS.md`.

---

## O que este sistema é

ProSeller: gestão comercial em produção, com usuários reais faturando todo dia.
Vendedores criam pedidos, o sistema envia ao ERP (Tiny), emite nota, calcula
comissão e acompanha a entrega.

**Não é um projeto de estudo.** Um erro aqui vira nota fiscal errada, comissão
paga a menos ou cadastro de cliente perdido. Já aconteceu: um defeito apagou
campos de 94 clientes e ficou quatro meses sem ninguém perceber.

---

## As cinco regras que não se quebram

### 1. Nunca altere o banco de produção sem autorização explícita

Toda alteração no banco (`migration`, `CREATE OR REPLACE FUNCTION`, `ALTER TABLE`)
exige que a pessoa diga **sim** para aquela alteração específica.

"Pode fazer o que precisar" **não** é autorização para mexer no banco.
Pergunte de novo, mostrando exatamente o que vai mudar.

### 2. Backup antes, sempre

Antes de substituir qualquer função do banco ou Edge Function, salve a versão
atual em `docs/plans/backups/` com a data no nome.

Antes de aplicar, **confira que a versão em produção ainda é igual ao backup**.
Se alguém alterou no meio do caminho, **pare** — você estaria apagando o trabalho
dessa pessoa sem saber.

### 3. Ensaie antes de aplicar

Duas formas, use a que couber:

- **Banco descartável:** `npm run test:db` reconstrói o banco inteiro numa cópia
  e roda os testes. Errar ali não custa nada.
- **Ensaio revertido em produção:** `BEGIN; ...alteração...; ...confira...; ROLLBACK;`
  Prova o comportamento sobre os dados reais sem persistir nada.

Nunca aplique algo sensível sem ter visto funcionar antes.

### 4. Teste na tela depois — em produção mesmo

Alteração não está pronta quando o código compila. Está pronta quando você
**abriu o sistema, executou a ação e viu o resultado certo**.

Use o Playwright. Credenciais e URL estão em `docs/wiki/`.

Esta regra pegou defeitos que todos os testes automáticos deixaram passar: um CEP
sendo corrompido ao salvar, um selo que não aparecia, um texto todo em maiúscula.

### 5. Todo verificador precisa ser testado contra o defeito

Se você escrever um teste, um alerta ou uma validação, **quebre de propósito o
que ele deveria pegar e confirme que ele reclama**.

Isso não é zelo excessivo. Na etapa anterior, **as quatro redes de proteção
escritas falharam na primeira versão** — o teste passava mesmo com o defeito
presente. Se não tivessem sido testadas contra o erro, teriam sido entregues
furadas, junto com a garantia de que estava tudo protegido.

**Verificador que nunca viu o erro não é verificador. É decoração.**

---

## Pare e pergunte quando

- For necessário mexer no banco de produção (regra 1)
- A alteração tocar em: envio ao ERP, cálculo de comissão, salvamento de cliente,
  permissões ou emissão de nota — é onde o erro custa dinheiro
- Você descobrir que o pedido tem uma consequência que a pessoa provavelmente
  não imaginou
- O que você encontrar no código contradisser o que ela disse
- A tarefa cruzar mais de três áreas do sistema — proponha quebrar em partes
- Você precisar apagar dados, mesmo que pareça óbvio

Perguntar custa uma mensagem. Desfazer estrago em produção pode custar dias.

---

## Nunca faça

- `git push --force` no ramo principal
- Deploy a partir de outro ramo que não seja `main`
- Apagar dados de produção sem ensaio e autorização
- Alterar migration já aplicada — crie uma nova
- Copiar senha, chave de API ou token para arquivo, log ou registro de auditoria
- Dizer que algo funciona sem ter visto funcionar

---

## Como o sistema é montado

| Parte | Onde | Sobe como |
|---|---|---|
| Telas | `src/` (React) | **Sozinho**, ao enviar para `main` (Netlify) |
| Funções do servidor | `supabase/functions/` | **Na mão** |
| Banco de dados | `supabase/migrations/` | **Na mão** |

| Verificação | Comando |
|---|---|
| Testes de tela | `npm test` |
| Testes de função | `npm run test:edge` |
| Testes de banco | `npm run test:db` |
| Divergência entre o publicado e o código | `npm run drift` |

**O ponto frágil:** telas sobem sozinhas, banco e funções sobem na mão. É daí que
vem o risco de o código dizer uma coisa e o sistema no ar fazer outra. Já
aconteceu. Por isso rode `npm run drift` antes e depois de mexer no banco.

---

## Publicando uma alteração

**Ordem que importa: banco primeiro, código depois.** O contrário deixa a tela
pedindo algo que o banco ainda não aceita, e o usuário toma erro.

1. `npm test` e `npm run build` — se falhar, **não continue**
2. Mexeu no banco? backup → ensaio → **pedir autorização** → aplicar
3. Mexeu em função do servidor?
   `npx supabase functions deploy <nome> --project-ref xxoiqfraeolsqsmsheue`
4. `git push origin main` — a tela sobe sozinha em ~1 minuto
5. **Abra o sistema e confira** (regra 4)
6. Suba o número da versão em `src/App.tsx` e escreva no changelog o que mudou,
   em português de quem usa o sistema — não em termos técnicos

O cliente confere o número da versão para saber que a entrega chegou. Alteração
sem número novo gera confusão e retrabalho.

---

## Os vigias automáticos

Três rotinas rodam sozinhas. Se mexer em algo relacionado, confirme que continuam
funcionando:

| Rotina | Quando | O que faz |
|---|---|---|
| `sentinela-diaria` | 6h | Confere 8 regras críticas e grava o que estiver errado |
| `sentinela-email-diaria` | 6h15 | Manda e-mail **se** houver algo — silêncio quando está tudo certo |
| `ssw-sweep-hourly` | de hora em hora | Atualiza o rastreio das entregas |

A tela **Sentinela** mostra o que está em aberto. A tela **Auditoria** mostra quem
fez o quê.

**Se criar um alerta novo, escreva junto o que a pessoa deve fazer, em português.**
Alerta que ninguém entende é alerta ignorado — e aí a vigilância inteira perde o
sentido.

---

## Onde estão as respostas

| Você quer saber | Olhe em |
|---|---|
| O que o sistema faz e por quê | `docs/specs/business-rules/` |
| Decisões de arquitetura | `docs/specs/system-contract/` |
| O que já foi feito e quando | `docs/wiki/log.md` |
| Incidentes passados e a causa de cada um | `docs/specs/system-contract/known-incidents.md` |
| Versões anteriores de funções | `docs/plans/backups/` |

**Se a documentação contradisser o código, o código é a verdade** — e avise a
pessoa, porque o documento precisa ser corrigido. Isso acontece com frequência:
documentação envelhece mais rápido do que parece.

---

## Peculiaridades deste projeto

- **Migrations numeradas com buracos** (031–040, 046–066, 092–097). Não preencha —
  siga a próxima livre.
- **Edge Functions terminam em `-v2`**. Siga o padrão.
- **`src/App.tsx` tem 45 KB com roteamento na mão.** É feio e funciona. **Não
  refatore** — não é origem de nenhum defeito conhecido, e mexer ali é risco sem
  prêmio. Para adicionar tela nova, siga o padrão que já está lá.
- **Imports com versão no nome** (`sonner@2.0.3`). Vêm de geração automática e há
  uma tabela de tradução no `vite.config.ts`. Está no débito técnico; não mexa por
  conta própria.
- **Duas camadas de dados convivem:** `src/data/mock*.ts` (resíduo) e
  `src/services/*.ts` (Supabase real). Em coisa nova, **só Supabase real**.

---

## Como conversar com quem conduz este projeto

- **Sem jargão.** "A RPC não persiste o parâmetro" não comunica nada.
  "O sistema recebe quem fez a alteração, mas não guarda" comunica.
- **Diga o que descobriu, mesmo quando contraria o que a pessoa disse** — com a
  evidência junto. Concordar por educação causa estrago.
- **Se errou, corrija direto e siga.** Sem rodeio, sem se justificar demais.
- **Não diga que testou se não testou.** É a única coisa que ela não tem como
  verificar sozinha, e é onde a confiança se perde de vez.

---

*Arquivo vivo. Se crescer demais, mova detalhe para `docs/` e mantenha aqui só o
que precisa ser lido antes de cada alteração.*
