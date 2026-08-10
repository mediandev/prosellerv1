# Acessos e propriedade — checklist da passagem

**O que precisa mudar de dono para o sistema continuar funcionando sem a Flowcode.**

Este documento não contém senha nem chave — só diz **o que existe, para que
serve, e o que acontece se for perdido**. As credenciais são transferidas
diretamente entre as pessoas, nunca por arquivo.

> **Regra:** nada aqui deve ser copiado para e-mail, WhatsApp ou documento.
> Transferência de acesso se faz adicionando o novo dono na plataforma e
> removendo o antigo — não repassando senha.

---

## 1. As cinco contas que sustentam o sistema

### Os dois que precisam mudar de dono, sem exceção

| Serviço | Para que serve | Se perder o acesso |
|---|---|---|
| **Supabase** | Banco de dados e funções do servidor. **É o coração do sistema.** | O sistema para. Não há recuperação por fora. |
| **GitHub** | Guarda todo o código e o histórico de alterações | Perde a capacidade de alterar o sistema |

**Sem estes dois no nome da Median, não existe autonomia.** Todo o resto do
sistema depende deles, e nenhum tem como ser recriado a partir de outro lugar.

### Um a confirmar

| Serviço | Para que serve | Situação |
|---|---|---|
| **Netlify** | Publica as telas | **A conferir** de quem é a conta hoje. O que já está no ar continua funcionando mesmo sem acesso; o que para é a capacidade de publicar alterações. |

### Os que já são da Median (só confirmar)

| Serviço | Para que serve | Se perder o acesso |
|---|---|---|
| **Tiny (ERP)** | Emissão de nota fiscal | O faturamento para |
| **Resend** | Envia os e-mails de alerta | Os avisos param de chegar, **em silêncio** |
| **Domínio** `proseller.app.br` | Endereço do sistema | O sistema fica fora do ar |

**Ordem para tocar:** Supabase → GitHub → Netlify (confirmar) → o resto.

---

## 2. Checklist de transferência

Marque cada um conforme concluir. **Enquanto houver caixa vazia, a passagem não
está completa.**

### Supabase — projeto `xxoiqfraeolsqsmsheue`

- [ ] Novo responsável adicionado como **Owner** da organização
- [ ] Confirmado que ele consegue entrar sozinho (sem a conta da Flowcode)
- [ ] Método de pagamento no nome do cliente
- [ ] Acesso antigo removido — **só depois de confirmar os itens acima**

### GitHub — `mediandev/prosellerv1`

- [ ] Novo responsável com acesso de **administrador** ao repositório
- [ ] Ele consegue enviar alterações (fazer um commit de teste)
- [ ] O segredo `SUPABASE_ACCESS_TOKEN` continua configurado nas Actions —
      **sem ele, a verificação de divergência para de rodar**
- [ ] Acesso antigo removido

### Netlify — **primeiro passo: descobrir de quem é a conta hoje**

- [ ] Confirmado quem é o dono da conta atualmente
- [ ] Novo responsável na equipe do site
- [ ] Método de pagamento no nome do cliente
- [ ] Confirmado que uma publicação funciona ponta a ponta
- [ ] Acesso antigo removido

### Tiny (ERP)

- [ ] Confirmado quem é o dono da conta hoje
- [ ] As chaves de API usadas pelo sistema continuam válidas
- [ ] Sabe-se **onde trocar a chave** se ela for renovada (ver adiante)

### Resend (e-mails)

- [ ] Novo responsável com acesso à conta
- [ ] Domínio `flowcode.cc` — **atenção:** o remetente hoje é
      `proseller@flowcode.cc`, um domínio da Flowcode. **Precisa migrar** para um
      domínio do cliente, senão os e-mails param quando o domínio sair do ar
- [ ] Depois de migrar: enviar um alerta de teste e confirmar que chega

### Domínio do sistema — `proseller.app.br`

- [ ] Confirmado quem é o dono do registro
- [ ] Data de renovação anotada
- [ ] Novo responsável com acesso ao painel do domínio

---

## 3. As chaves que o sistema usa

Todas ficam no Supabase, em **Edge Functions → Secrets**. Nenhuma está no código.

| Chave | Para que serve | Se sumir |
|---|---|---|
| `RESEND_API_KEY` | Enviar e-mails | Alertas e e-mails de comissão param, **sem aviso** |
| `SENTINELA_EMAIL_DESTINO` | Quem recebe os alertas | Volta ao destinatário padrão |
| `SSW_SWEEP_SECRET` | Proteger a rotina de rastreio | A atualização de fretes para |
| `FEATURE_*` | Ligar e desligar funcionalidades | Recursos somem das telas |
| `SUPABASE_*` | Uso interno da plataforma | Não mexer |

**Chave de API do Tiny:** não fica aqui. Fica **no banco**, uma por empresa de
faturamento (tela Configurações → Integrações). Se o Tiny renovar a chave, é lá
que se troca.

**Para trocar quem recebe os alertas:** Supabase → Edge Functions → Secrets →
`SENTINELA_EMAIL_DESTINO`. Vários e-mails separados por vírgula. Não precisa
mexer em código.

---

## 4. O que quebra em silêncio se um acesso for perdido

Esta é a parte que costuma pegar as pessoas de surpresa:

| Se perder | O que acontece | Você percebe? |
|---|---|---|
| Chave do Resend | Alertas param de chegar | **Não.** Parece que está tudo bem |
| Segredo no GitHub | Verificação de divergência para | **Não.** O job passa dizendo que pulou |
| Chave do Tiny | Faturamento para | Sim, na hora |
| Netlify | Publicação para | Sim, ao tentar publicar |
| Supabase | Sistema inteiro para | Sim, imediatamente |

**As duas primeiras são as perigosas** — falham caladas, que é o defeito que
passamos esta etapa inteira combatendo.

**Sugestão:** uma vez por mês, confirme que o e-mail da sentinela chegou pelo
menos uma vez (ou force um envio). Silêncio prolongado pode ser "está tudo bem"
ou "o mensageiro morreu" — e os dois se parecem.

---

## 5. Custos recorrentes

Confirmar quem passa a pagar, e trocar o cartão em cada um:

- [ ] Supabase
- [ ] Netlify
- [ ] Resend
- [ ] Domínio `proseller.app.br`
- [ ] Tiny (ERP)

**Cartão vencido derruba o sistema do mesmo jeito que um erro de código** — e sem
aviso prévio útil.

---

## 6. Serviços externos que o sistema consulta

Não exigem conta nem transferência, mas é bom saber que existem — se algum sair
do ar, uma parte do sistema para:

| Serviço | Usado para | Se ficar fora |
|---|---|---|
| **ReceitaWS** | Consultar Simples Nacional | **Emissão de nota é bloqueada** (proposital) |
| **SSW** | Rastreio das transportadoras | Fretes param de atualizar sozinhos |
| **BrasilAPI** | Consulta de CNPJ e CEP | Preenchimento automático no cadastro para |

---

## 7. Antes de considerar a passagem concluída

- [ ] O novo responsável **publicou uma alteração sozinho**, do início ao fim
- [ ] Ele **recebeu um e-mail da sentinela** e soube o que fazer
- [ ] Ele **abriu a tela Auditoria** e entendeu o que está vendo
- [ ] Todos os acessos acima transferidos e os antigos removidos
- [ ] Os pagamentos no nome do cliente

O primeiro item vale mais que todos os outros. Só se sabe que a passagem
funcionou quando alguém faz o caminho completo sem ajuda.

---

*ProSeller V1 · Checklist de passagem · agosto/2026*
