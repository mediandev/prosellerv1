# Relatório — Permissões dos usuários administrativos (Backoffice)

**Data:** 09/06/2026
**Assunto:** Aplicar as permissões cadastradas também aos usuários do tipo "Backoffice"

---

## 1. Situação atual

No ProSeller, cada usuário tem um **tipo**:

- **Vendedor** — acesso restrito: só vê as telas e os dados liberados nas permissões dele.
- **Backoffice** (administrativo) — **hoje vê tudo**, independentemente das permissões marcadas no cadastro dele.

Ou seja: hoje, marcar/desmarcar permissões de um usuário backoffice **não tem efeito** — ele continua com acesso total ao sistema.

Foi isso que aconteceu no teste com a **Leandra**: ela tem só 3 permissões marcadas, mas continua enxergando todas as telas, porque é backoffice.

---

## 2. O que queremos mudar

Fazer com que **as permissões cadastradas valham também para os usuários backoffice** — assim, o que está marcado na tela passa a ser, de fato, o que a pessoa vê.

A mudança é simples e segura no código. **Porém**, ao ativá-la, alguns usuários administrativos passariam a ver **menos** telas do que hoje (exatamente o que as permissões deles já dizem). Por isso precisamos da sua validação antes.

> Observação: as telas **Equipe**, **Metas** e **Configurações** continuam visíveis para qualquer backoffice nesta etapa (não entram no controle agora). O **Painel/Dashboard** também é sempre visível.

---

## 3. Impacto por usuário (o que cada um passaria a ver)

As telas controladas por permissão são: **Pedidos, Clientes, Produtos, Comissões, Conta Corrente, Relatórios**.

✅ = continua vendo  ❌ = deixaria de ver

| Usuário | Pedidos | Clientes | Produtos | Comissões | Conta Corrente | Relatórios | Mudança |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Lucas** (lucas.carmo@flowcode.cc) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Nenhuma (acesso total) |
| **Median ADM** (admin@empresa.com) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Nenhuma (acesso total) |
| **Leandra** (expedicao@median.com.br) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Passa a ver só **Clientes** |
| **Karen Soares** (vendas@median.com.br) | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | Perde **Produtos** e **Comissões** |
| **Vinicyus Baumgratz** (administrativo@cantico.com.br) | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | Perde **Produtos** e **Comissões** |
| **Teste FlowCode** (obness.dev@flowcode.cc) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Conta de teste |

---

## 4. Decisão necessária do cliente

Para os usuários que perderiam acesso, confirme qual deve ser o comportamento correto:

| Usuário | O que perderia | **Está correto restringir?** (Sim/Não) | Se não, o que ele deve ver? |
|---|---|:---:|---|
| **Leandra** | Tudo menos Clientes | ☐ | |
| **Karen Soares** | Produtos e Comissões | ☐ | |
| **Vinicyus Baumgratz** | Produtos e Comissões | ☐ | |

- Se **Sim** → mantemos as permissões atuais e a pessoa fica restrita.
- Se **Não** → ajustamos as permissões da pessoa **antes** de ativar, para ela continuar com o acesso necessário.

> **Lucas** e **Median ADM** já têm acesso total e **não mudam**.

---

## 5. Próximos passos (após sua confirmação)

1. Ajustar as permissões dos usuários conforme a decisão acima (quando houver "Não").
2. Ativar a regra (permissões passam a valer para backoffice).
3. Testar o acesso de cada usuário afetado.

*Etapas futuras (não incluídas agora):* controlar também as telas Equipe/Metas/Configurações por permissão e aplicar as permissões aos botões de criar/editar/excluir. Podem ser feitas depois, se desejado.
