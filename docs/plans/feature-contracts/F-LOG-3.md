# F-LOG-3 · Hook em `tiny-enviar-pedido-venda-v1` cria frete automático

**Risco:** **C** · **Branch:** `feat/log-crm-R-LOG-3` (futura) · **CI alvo:** N2 · **Depende de:** F-LOG-1.

> **Esqueleto.** Classe C — toca Edge Function de produção. DoR exigirá Anti-SPEC revisada e teste de paridade antes de mexer.

## Objetivo

Após sucesso no `tiny-enviar-pedido-venda-v1` (NF emitida pelo Tiny), criar automaticamente um `frete_logistica` com `pedido_venda_id`, `nfe_numero`, `nfe_chave_acesso`, `cliente_id`, `empresa_id`, `vendedor_id`, `valor_produtos`, `status_entrega='Em Separação'`. Idempotente (re-envio do mesmo pedido não cria 2 fretes — UNIQUE em `(pedido_venda_id, nfe_numero)`).

## Definition of Ready

- [ ] Confirmar contrato de payload Tiny já carrega `nfe_numero` + `nfe_chave_acesso` na resposta — ou exige chamada de consulta separada.
- [ ] Anti-SPEC F-001/INC-014 revisitada: novo campo no fluxo Tiny exige feature flag.
- [ ] Teste de paridade: snapshot do output atual de `tiny-enviar-pedido-venda-v1` antes/depois.
- [ ] Decidir se o hook chama serviço interno ou faz INSERT direto.

## Escopo incluído

- Edit em `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts` — após persistir `id_tiny` no pedido, ler `nfe_numero` da resposta e fazer INSERT em `frete_logistica`.
- Tratamento defensivo: se INSERT falhar, **NÃO** bloqueia retorno do pedido (best-effort).
- Cobertura de testes Deno dos 5 sub-casos de CA-007 + novo caso "frete criado".
- Feature flag `FEATURE_LOG_CRM_AUTO_FRETE` separada (defesa em camadas).

## Escopo excluído

- UI nova nesta onda (Detalhe do frete já mostra o vínculo se F-LOG-2 estiver mergeada).
- Integração SSW (R-LOG-4).

## Arquivos prováveis

- `supabase/functions/tiny-enviar-pedido-venda-v1/index.ts`
- `tests/edge/frete-auto-criado-on-tiny-send.test.ts`

## Dependências

- F-LOG-1 (tabela `frete_logistica` aplicada em prod).
- F-LOG-2 ideal (UI mostra o frete), opcional.
- ADR-010 (a criar) — política de erro do hook (best-effort vs. transacional).

## Bloqueadores prováveis

- Sem clareza sobre `nfe_chave_acesso` vir do Tiny → discovery antes.
- Migration de schema para UNIQUE em `(pedido_venda_id, nfe_numero)` (parte do schema F-LOG-1).
