# ProSeller — Regras do Core (negócio + operação)

> Resumo executivo para **fechar o core e evitar regressão**. Linguagem de negócio, sem detalhe técnico. Cada regra: o que vale + (quando útil) **Regressão =** o que caracteriza quebra. O detalhe técnico com `arquivo:linha` está no *Contrato do Sistema* completo (151 regras).
>
> **Regra-mãe:** antes de subir qualquer coisa nova, pergunte — *"isso quebra alguma regra abaixo?"*

---

## 1. Pedido & Emissão ao ERP (Tiny)

1. **Sucesso só com confirmação do Tiny.** O pedido só é "enviado ao ERP" quando o Tiny devolve o ID/número dele. Sem isso = falha, fica pra reenviar. *Regressão = mostrar "enviado com sucesso" sem ID do Tiny.*
2. **Nota só com regime confirmado.** Se a consulta do Simples falhar (e a empresa tem natureza dupla), o envio é **bloqueado**. *Regressão = emitir mesmo assim com natureza chutada.*
3. **Natureza correta por empresa.** A natureza enviada ao Tiny é a mapeada para aquela empresa; o regime Simples pode trocá-la (mapeamento duplo). *Regressão = enviar sem mapeamento → Tiny usa a operação padrão errada.*
4. **Pré-requisitos de emissão:** vendedor com `idtiny`, cliente com CPF/CNPJ válido (11 ou 14 dígitos), empresa com chave de API, e pedido com pelo menos 1 item. Faltando qualquer um, não emite.
5. **Rascunho não vai ao ERP.** Pedido em Rascunho não pode ser enviado.
6. **Número muda no envio.** O número interno (`PV-2025-XXXX`) é gerado na tela; após o envio vira o número do Tiny. *Não usar o PV como chave de busca depois — ele "some".*
7. **Bonificação não gera comissão** (mas é pedido válido).

## 2. Cliente

8. **Salvar nunca apaga o que você não mexeu** — endereço, contato, observações, grupo, condições. *Regressão = editar um campo e outro sumir.*
9. **Exclusão é arquivar (soft delete).** Some das listas/contagens/relatórios, mas nada é apagado de vez. Só backoffice exclui.
10. **Nome obrigatório** (mínimo 2 caracteres; só espaços = vazio).
11. **Grupo/Rede aparece no detalhe** do cliente (não só na lista).
12. **Condições de pagamento do cliente:** ao editar, a lista é substituída por completo (não vai somando).

## 3. Fiscal — Simples Nacional & Natureza

13. **Regime é consultado e guardado** (ReceitaWS), com data da consulta. *"Não consultado" ≠ "não optante"* — nunca tratar vazio como "não é do Simples".
14. **Revalidação no envio ao ERP** para empresas de natureza dupla; se falhar, bloqueia (ver regra 2).
15. **Cliente PJ tem o Simples exibido no cadastro** (Sim / Não / Não consultado / Indisponível).

## 4. Condição de Pagamento

16. **O nome mostra TODAS as parcelas** (ex.: "10/15/20 dias"), não só a última.
17. **O faturamento usa o dado real das parcelas** (o intervalo), **nunca o nome** nem um prazo único. *Regressão = calcular vencimentos a partir do nome.*
18. **Quantidade de parcelas = tamanho do intervalo** (sempre bate).

## 5. Comissão

19. **Pedido excluído nunca gera comissão** nem entra em relatório de comissão. *Regressão = comissão de pedido que foi excluído.*
20. **Comissão só de venda real** (não cancelada, não excluída, não bonificação).
21. **Regras de comissão:** fixa (percentual do vendedor) ou por faixa de desconto (quanto maior o desconto, menor a comissão).
22. **Só backoffice edita/exclui comissão.**

## 6. Logística & Rastreio (SSW)

23. **Entrega é definitiva ("sticky").** Um frete entregue/devolvido não volta pra "em trânsito" por causa de evento administrativo posterior (ex.: "anexado comprovante"). *Regressão = frete entregue voltando pra "em trânsito".*
24. **O status considera o histórico todo**, não só o último evento.
25. **Frete já entregue não é mais consultado** no SSW (status terminal).
26. **Atualização automática de rastreio a cada 1h** (+ botões manuais no Kanban e no detalhe do frete).
27. **Romaneio = notas em separação ainda não romaneadas** (filtro por transportador opcional).

## 7. Permissões, Usuários & Acesso

28. **Dois tipos:** backoffice (vê tudo) e vendedor (vê só os próprios clientes/pedidos/comissões).
29. **As permissões valem também para o backoffice** (páginas e ações).
30. **Ações sensíveis (excluir cliente, editar comissão, fechar período)** são restritas a backoffice.

## 8. Produtos, Listas de Preço, Relatórios & Conta Corrente

31. **Preço e comissão saem da lista de preço do cliente** + faixa de desconto aplicada.
32. **Relatórios (Curva ABC, Mix, comissão) ignoram excluídos e respeitam o vendedor logado.**
33. **Conta corrente:** compromissos e pagamentos por cliente; saldo reflete o que foi lançado vs pago.

---

## 9. Operação & Deploy (aprendido no susto)

34. **Produção = branch `main`.** A Netlify publica a `main`. **NÃO** é a `master` (baseline antiga). PR de front sempre na `main`.
35. **Cuidado com clone raso (shallow).** Ele dá *falsa* impressão de divergência ("push não funciona", "main atrás"). O GitHub geralmente está íntegro. *Nunca force-push;* para subir 1 commit com segurança, usar worktree isolado sobre `origin/main`.
36. **Backend Supabase é compartilhado** — todo deploy de edge/migration afeta a produção real, independente da branch.
37. **Migration em produção = confirmação humana**, com plano de rollback. Nunca aplicar no susto.
38. **Backup antes de mexer em edge/RPC** (guardar a versão atual para rollback em 1 comando).
39. **Commitar antes de fazer deploy;** deploy sai da `main`.
40. **Mexeu em `src/` (front)? Suba a versão** (`systemVersion`) e registre no changelog.
41. **Edge nova respeita o padrão:** autenticada (verify_jwt) por padrão; pública (webhook/cron) só com proteção (secret).
42. **Validar em transação revertível (dry-run) antes de aplicar** mudança sensível em prod — prova o antes/depois sem gravar nada.

---

## 10. Armadilhas conhecidas (bugs que já corrigimos — não deixar voltar)

| Já aconteceu | A regra que protege |
|---|---|
| Salvar cliente **apagava a observação de contato** (~89 clientes) | Regra 8 — salvar nunca apaga campo não editado |
| Emissão mostrava **"sucesso" sem ir ao Tiny** | Regra 1 — sucesso só com ID do Tiny |
| Comissão de **pedido excluído** (Donato) | Regra 19 — excluído não comissiona |
| **Frete entregue preso em "em trânsito"** | Regra 23 — entrega é definitiva |
| Nome de condição parcelada mostrava **só a última parcela** | Regra 16 — nome com todas as parcelas |
| **Grupo/Rede não aparecia** no detalhe do cliente | Regra 11 — grupo aparece no detalhe |
| Regime **Simples sumia** no cadastro | Regra 15 — Simples exibido |
| **Pedido "sumia"** após envio | Regra 6 — o número muda no envio (não sumiu, virou nº Tiny) |
| Push/branch confusos (**main vs master / shallow**) | Regras 34–35 |

---

*Detalhe técnico completo (151 regras, com evidência arquivo:linha, contraexemplos e checklist de PR): ver `docs/specs/system-contract/` e `SYSTEM-CONTRACT-COMPLETO.pdf`.*
