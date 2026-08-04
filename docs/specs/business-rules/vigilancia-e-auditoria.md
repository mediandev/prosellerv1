# Vigilância e auditoria

> Criado em 2026-08-04. Documenta o que passou a existir entre 31/07 e 04/08 e
> não tinha regra escrita: as verificações automáticas, o registro de ações e a
> rede de testes.

---

## Por que isto existe

Todos os incidentes caros deste sistema tiveram a mesma característica: **falhavam
em silêncio**.

O envio ao ERP dizia "sucesso" sem ter enviado. O salvamento de cliente apagava
campos sem erro. O relatório zerava um número sem reclamar. O sistema mentia, e
quem descobria era o cliente — dias depois, no prejuízo.

O defeito que apagou campos de 94 clientes viveu **quatro meses** assim.

A resposta não foi escrever código mais cuidadoso. Foi **fazer o sistema perguntar
a si mesmo, todo dia, se está tudo certo — e falar quando não estiver.**

---

## Regras da Sentinela

Verificação diária às 6h (`sentinela-diaria`), gravando em `sentinela_alerta`.
Um alerta **se resolve sozinho** quando a violação deixa de existir.

| # | Regra | O que acusa |
|---|---|---|
| 1 | `comissao_pedido_excluido` | Comissão com valor num pedido excluído |
| 2 | `pedido_aberto_sem_tiny` | Pedido "enviado" sem ID do Tiny |
| 3 | `frete_entregue_preso` | Entrega registrada, frete em status não-terminal |
| 4 | `cep_invalido` | CEP fora de 8 dígitos |
| 5 | `wipe_campo_cliente` | Campo de cliente que tinha valor e **continua** vazio |
| 6 | `cliente_novo_sem_condicao` | Cliente criado após 29/07 sem condição |
| 7 | `condicao_nome_divergente` | Nome da condição não bate com as parcelas |
| 8 | `regime_lookup_falhou` | Consulta do Simples falhou e travou uma emissão |
| 9 | `pedido_duplicado_no_erp` | Dois pedidos com o mesmo `id_tiny` |
| 10 | `comissao_duplicada` | Mais de uma comissão no mesmo pedido |
| 11 | `cliente_cnpj_duplicado` | Dois cadastros com o mesmo CNPJ |
| 12 | `pedido_valor_divergente` | Total do pedido ≠ soma dos itens (> R$ 1) |
| 13 | `comissao_sem_pedido` | Comissão apontando para pedido inexistente |
| 14 | `produto_ativo_sem_preco` | Produto ativo sem preço em nenhuma lista |
| 15 | `cliente_com_pedido_sem_endereco` | Cliente que já comprou e não tem endereço |

### Três princípios de desenho, aprendidos errando

**1. Confirmar contra o estado atual antes de alertar.** A regra 5 poderia
comparar só o histórico — e daria **520 falsos positivos** só no campo `codigo`
(o histórico registra o apagamento, mas o valor está lá hoje). Ela confirma que o
campo **continua** vazio. Resultado: 520 → 22, todos reais.

**2. Vazio escrito de outro jeito continua vazio.** `[]`, `{}`, `--` e `-` não
contam como valor (migration 151). Sem isso, 6 dos 22 alertas eram ruído.

**3. Regra que nasce apitando é regra ignorada.** Só entra regra com baseline
limpo. Ficaram **de fora de propósito**:
- *"comissão efetivada com valor zero"* — 124 dos 135 casos são das contas
  "Empresa - Venda Direta SP/ES", que **nunca** comissionaram ninguém. Correto,
  viraria ruído diário.
- *"cliente sem endereço"* sem qualificar — 48 dos 49 nunca compraram. Só
  interessa quem já comprou (regra 15).

### O aviso

`sentinela-email-diaria` (6h15) manda e-mail **quando aparece algo novo** e, uma
vez por semana, para lembrar do que continua pendente. Nada novo ⇒ silêncio.

Destinatários em `SENTINELA_EMAIL_DESTINO` (lista por vírgula).

---

## Auditoria

20 gatilhos registrando **ações com impacto**, com quem, quando e o de/para.

**Escopo (decisão do cliente, 2026-08-03):** ações que importam, não toda
alteração de campo. Cobre pedidos, clientes, usuários e permissões, comissões,
conta corrente, preços, listas, produtos, naturezas, condições, metas, empresas
e fretes.

**Fora de propósito:** correção rotineira de cadastro (telefone, e-mail,
observação). Se entrasse, o que importa ficaria enterrado — e continua guardada
em `cliente_historico_alteracoes`.

### Regras de desenho

**Registro não pode ser editado nem apagado.** A tabela não tem policy de UPDATE
nem DELETE. Registro de auditoria alterável não vale como auditoria.

**A gravação é blindada.** Falha ao auditar **nunca** derruba a operação do
usuário: perder uma linha de auditoria é ruim, impedir um pagamento é pior. Há
caso de teste que quebra a gravação de propósito e exige que a operação passe.

**Quem fez, em três degraus:** `app.usuario_id` → coluna de autoria da linha →
`'Sistema'`. O terceiro degrau é honesto de propósito — melhor registrar "não sei
quem foi" do que atribuir a ação à pessoa errada.

**Exclusão suave aparece como exclusão.** Excluir aqui é `UPDATE` de
`deleted_at`. Tratar isso como "alteração de campo" esconderia a ação mais grave
no meio das corriqueiras.

**Permissão registra o delta, não a lista.** "ganhou `comissoes.visualizar`"
responde na hora; duas listas de 40 itens para comparar na mão, não.

**Credencial nunca é copiada.** A troca da chave de API do ERP é registrada como
fato ("chave substituída"), jamais com o valor. Há teste que falha se a chave
aparecer em qualquer campo.

### Onde ainda sai "Sistema"

Conta corrente, criação de usuário, preços, produtos e configurações não têm
coluna de autoria e nenhum caminho informa o usuário. Está mapeado, não feito.

---

## A rede de testes

| Camada | O que cobre |
|---|---|
| `npm test` | 96 verificações de tela e de lógica pura |
| `npm run test:edge` | 96 verificações das funções do servidor |
| `npm run test:db` | 8 casos que reconstroem o banco numa cópia e testam as regras críticas |
| `npm run drift` | Compara as 137 funções publicadas com o código versionado |

### A regra que vale mais que os testes

**Todo verificador precisa ser rodado contra o defeito antes de valer como rede.**

Não é zelo: das quatro redes escritas nesta etapa, **as quatro falharam na
primeira versão**.

- O teste do incidente de dados **passava na função bugada** — os blocos de
  contato e endereço só executam se algum campo daquele bloco vier preenchido, e
  o teste mandava só o nome.
- O detector de status ficava **quieto no único defeito conhecido** — exigia a
  palavra "status" na mesma linha do valor.
- O teste de cor **não existia** até a cor sumir em produção.

Se não tivessem sido testadas contra o erro, teriam sido entregues furadas —
junto com a garantia de que estava tudo protegido.

**Verificador que nunca viu o erro não é verificador. É decoração.**
