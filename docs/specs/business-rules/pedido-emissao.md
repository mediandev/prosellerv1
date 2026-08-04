# Pedido & Emissão ao ERP

> Domínio: envio de pedido de venda ao ERP Tiny via edge function `tiny-enviar-pedido-venda-v1`.
> Regras derivadas do código atual (edge function + migrations 082/143 + `SalesPage.tsx`), reconciliadas com verificação adversarial. Onde o contrato técnico divergia da implementação, prevalece o **código**.

## Regras de negócio

1. **Sucesso no envio ao ERP é confirmado apenas pela ID do Tiny na resposta.**
   O envio só é considerado bem-sucedido quando o Tiny retorna `registro.id`. Sem ID, o pedido não foi efetivamente registrado no ERP.
   *Por quê:* mostrar "sucesso" sem ID leva o usuário a ignorar erros reais — o pedido não existe no ERP.
   *Regressão:* aceitar sucesso sem ID retornado; ou reenviar pedido que já tem `id_tiny` preenchido (ver R11).
   *Implementação:* `if (!registro.id)` lança erro; `id_tiny` só é gravado após confirmação (edge function, linhas ~564-572).

2. **Natureza de operação é obrigatória e mapeada por empresa antes do envio.**
   O envio busca o mapeamento em `tiny_empresa_natureza_operacao` (empresa + natureza) e lança erro se o mapeamento estiver ausente. A natureza (`tiny_valor`) só entra no payload do Tiny quando existir valor não vazio.
   *Por quê:* sem mapeamento, o Tiny usaria sua natureza padrão em vez da pretendida — a NF sairia mal classificada no ERP.
   *Regressão:* enviar sem validar a existência do mapeamento; enviar com `tiny_valor` vazio/whitespace e deixar o Tiny cair no default silenciosamente (ver N4).
   *Nota (ajuste):* a validação garante que o mapeamento existe e é NOT NULL, mas **não valida** que `tiny_valor` está efetivamente preenchido/é válido para o Tiny. Não existe dual-mapping (`tiny_valor_simples` não existe na tabela — ver Dúvidas D1/D2).

3. **Pré-requisitos para envio: vendedor com `idtiny`, cliente com CPF/CNPJ de 11 ou 14 dígitos, empresa com chave API Tiny.**
   O envio faz early-fail se qualquer um faltar.
   *Por quê:* qualquer campo faltando = rejeição pelo Tiny ou erro no envio; validar cedo economiza tentativas.
   *Regressão:* enviar sem `vendedor.idtiny`, sem `chave_api` da empresa, ou com CPF/CNPJ vazio/tamanho inválido.
   *Nota (ajuste):* a validação de CPF/CNPJ checa **apenas o número de dígitos** (11 ou 14 após remover não-dígitos), **não** valida dígito verificador (ver N5).

4. **Pedido em status "Rascunho" não é enviável ao ERP.**
   Rascunho = trabalho em progresso.
   *Por quê:* enviar sem confirmação explícita pode gerar pedidos indesejados no ERP.
   *Regressão:* enviar Rascunho ao Tiny sem bloqueio.
   *Nota (ajuste — bloqueio frágil):* o bloqueio existe **apenas no frontend** (`SalesPage.tsx`, ~linhas 998-1001). A edge function **não** valida `status` (não busca a coluna no SELECT inicial), então uma chamada direta à function envia um Rascunho. Débito técnico: mover a validação para o backend.

5. **Número local do pedido (`PV-YYYY-XXXX`) é substituído pelo número do Tiny após envio bem-sucedido.**
   O número local é temporário (gerado em `SaleFormPage.tsx`); após sucesso, `numero_pedido` recebe o número do Tiny.
   *Por quê:* após o envio, o identificador verdadeiro é o do Tiny; confundir os dois causa busca errada na integração.
   *Regressão:* usar o número local como chave no ERP ou para reenvios; descartar o número do Tiny.
   *Nota:* o Tiny **pode não retornar** número — há fallback `registro.numero || pedido.numero_pedido || null` (ver D9/N2).

6. **Pedido deve ter pelo menos 1 item antes de enviar ao ERP.**
   *Por quê:* pedido vazio é inválido; o Tiny rejeita e o backend lança erro.
   *Regressão:* permitir envio de pedido sem itens; lista vazia passar pela validação.
   *Implementação:* `if (!itensDb || itensDb.length === 0)` lança erro.

7. **Bonificação (natureza de operação) é um pedido válido, mas não gera comissão.**
   *Por quê:* bonificação é presente, não venda — não deve remunerar o vendedor.
   *Regressão:* pedido de bonificação gerar comissão por ser confundido com venda normal.
   *Nota (ajuste — falha de case-sensitivity):* a verificação é **case-sensitive e exata** (`natureza_operacao = 'Bonificação'`, sem `LOWER`/`TRIM`, migrations 082 linha 49 e 143 linha 57). Variações como `'bonificacao'`, `'BONIFICAÇÃO'` ou `'Bonificacao'` **contornam a regra e geram comissão indevidamente**. Débito técnico: normalizar a comparação.

8. **Pedido deletado (soft-delete, `deleted_at` preenchido) não pode ser enviado ao ERP.**
   *Por quê:* deletado = fora de operação; reenviar cria duplicação e inconsistência no ERP.
   *Regressão:* aceitar pedido com `deleted_at` para reenvio.
   *Implementação:* `if (!pedido || pedido.deleted_at)` lança NOT FOUND.

9. **Número de parcelas = tamanho do array `intervalo_parcela` da condição de pagamento.**
   As parcelas são geradas a partir de `intervalos.length`.
   *Por quê:* integridade de dados — se os números divergem, os vencimentos ficam errados.
   *Regressão:* permitir mismatch entre número de parcelas e intervalos.
   *Nota (ajuste):* **não há validação cruzada** de tamanho. A integridade depende de `intervalo_parcela` estar correto no banco; dados corrompidos geram mismatch silencioso. Intervalos todos inválidos caem em fallback `[0]` (à vista — ver N9).

10. **Envio deve ser idempotente: pedido que já tem `id_tiny` preenchido não deve ser reenviado.**
    *Por quê:* reenviar duplica o pedido no Tiny (ou gera erro do Tiny) e cria inconsistência.
    *Regressão:* a edge function **não valida idempotência** — o SELECT inicial não inclui `id_tiny`, então a function **aceita reenvio** de pedido já emitido. Débito técnico confirmado (D8): incluir `id_tiny` no SELECT e bloquear/curto-circuitar quando já preenchido.

11. **Em caso de falha no envio ao Tiny, `id_tiny` não é limpo.**
    O `UPDATE` de `id_tiny`/`numero_pedido` ocorre **somente após** sucesso confirmado; em erro, a exceção é capturada e nada é limpo.
    *Por quê:* previne sobrescrever com estado parcial em uma tentativa que falhou.
    *Regressão/risco:* se havia um `id_tiny` obsoleto anterior, ele permanece **dangling**. Combinado com a ausência de checagem de idempotência (R10), isso pode mascarar o estado real do pedido.

### Regra removida

- **~"Regime Simples Nacional bloqueia emissão ao ERP se consulta falhar e empresa tem dual-mapping"~ — REFUTADA / NÃO IMPLEMENTADA.**
  Não existe dual-mapping nem consulta ao ReceitaWS no fluxo de envio. A tabela `tiny_empresa_natureza_operacao` tem apenas `tiny_valor` (migration 085), sem `tiny_valor_simples`. A edge function não importa/chama nenhum lookup de Simples Nacional, e as colunas `optante_simples_nacional`, `tiny_natureza_enviada`, `tiny_optback_used`/`tiny_fallback_used` existem no schema mas **nunca são preenchidas nem consultadas**. O contrato técnico está fora de sincronismo com o código. Não há risco de "fallback NULL silencioso" porque a lógica simplesmente não roda — mas também **não há proteção tributária** para empresas que saem do Simples.

## Dúvidas em aberto

- **D1/D2 — Dual-mapping de natureza para Simples vs não-Simples.** [RESPONDIDA]
  Não existe. A coluna `tiny_valor_simples` **não existe** na tabela (`schema_baseline.sql` / migration 085 tem só `tiny_valor`). Não há função `resolveNaturezaTiny` nem lógica condicional por regime. O contrato descreve uma feature não implementada.
  *Resolvido via:* código.

- **D3/D4/D10 — Consulta ReceitaWS (Simples Nacional) e comportamento com `optante_simples_nacional` NULL.** [RESPONDIDA]
  Nunca é feita no fluxo de envio ao Tiny. `optante_simples_nacional` permanece NULL e não bloqueia nada (fallback silencioso porque a lógica não roda). Sem revalidação de Simples no envio.
  *Resolvido via:* código.

- **D5 — Case-sensitivity de "Bonificação".** [RESPONDIDA]
  Confirmado case-sensitive e exato (sem `LOWER`/`TRIM`). Variações de grafia geram comissão indevida (ver R7). Recomenda-se validação em Playwright para confirmar em ambiente real quais grafias existem em produção.
  *Resolver via:* Playwright (confirmação em prod) — comportamento de código já confirmado.

- **D6 — Fluxo de status de Rascunho até "enviado/faturado".** [RESPONDIDA PARCIALMENTE]
  Criação default = `Rascunho` (`pedido-venda-v2`). Frontend bloqueia envio de Rascunho. **Após envio bem-sucedido ao Tiny, nenhuma alteração automática de status ocorre** — o status permanece como estava. Não há webhook conhecido que promova para "Faturado"/"Em aberto".
  *Aberto:* confirmar com o cliente/produto se a ausência de transição de status pós-envio é intencional, ou se falta implementar (webhook do Tiny ou update na edge function).
  *Resolver via:* cliente.

- **D7 — `id_tiny` em caso de falha.** [RESPONDIDA]
  Mantém valor anterior (não é limpo); ver R11. Risco de valor dangling.
  *Resolvido via:* código.

- **D8 — Reenvio de pedido já com `id_tiny`.** [RESPONDIDA]
  Não há bloqueio de idempotência; a function aceita reenvio. Ver R10 (débito técnico).
  *Resolvido via:* código.

- **D9/N2 — Número do Tiny pode vir nulo/vazio.** [RESPONDIDA PARCIALMENTE]
  Sim, pode. Fallback: `registro.numero || pedido.numero_pedido || null`. Aberto: confirmar se `numero_pedido` aceita NULL no banco e o impacto em integrações externas quando fica NULL.
  *Resolver via:* código (schema/constraint) + cliente (impacto de integração).

- **N6 — Sucesso no Tiny mas falha no UPDATE local.** [ABERTA]
  Se o Tiny cria o pedido mas o `UPDATE` local de `id_tiny` falha, o pedido fica com `id_tiny = NULL` no banco enquanto **já existe no Tiny**. Não há evidência de log/alerta/recuperação. Combinado com R10 (sem idempotência), o próximo reenvio duplicaria no Tiny.
  *Resolver via:* código (adicionar log/alerta + reconciliação) — decisão de produto sobre estratégia de recuperação.

- **N1 — Chave API expirada/inválida.** [ABERTA]
  O código só verifica que `chave_api` não está vazia; não valida o token antes do envio. O error handling é genérico e não diferencia falha de autenticação de outros erros do Tiny.
  *Resolver via:* código (melhorar tratamento e mensagem).

- **N7 — Autorização além do JWT.** [ABERTA]
  Vendedor é restrito a enviar seus próprios pedidos, mas não há evidência clara de validação de quem no backoffice pode enviar pedidos de terceiros além do JWT básico.
  *Resolver via:* código + cliente (definição de política de permissão).

- **N8 — Valores negativos.** [ABERTA]
  `valor_total`/`valor_final` são calculados sem validar que preços/itens são positivos; item com `valor_unitario` negativo pode gerar parcela negativa.
  *Resolver via:* código (validação) — confirmar com cliente se negativos são um caso legítimo.
