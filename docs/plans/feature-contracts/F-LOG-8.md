# F-LOG-8 · Auditoria de Fretes — Cotado × Cobrado

**Risco:** **C** · **Branch:** `feat/log-crm-R-LOG-8` (futura) · **CI alvo:** N2 · **Depende de:** F-LOG-1 + F-LOG-6.

> **Esqueleto.** Tela do print original do cliente (`/adm_auditoria-fretes`). Comparação financeira → sensível.

## Objetivo

Tela que mostra para cada frete o `valor_cotacao` × `sum(fatura_transportadora_item.valor_frete_cobrado where frete_id=...)` com sinalizadores: azul (cotação > cobrado, ok), verde (cobrado < cotação por > X%, alerta positivo), vermelho (cobrado > cotação, perda). Filtros por situação, transportador, empresa, data, cliente. Equivalente ao print do cliente.

## Definition of Ready

- [ ] Definir % de tolerância para sinalizador verde/vermelho.
- [ ] Definir comportamento quando frete não tem fatura vinculada (vazio? alerta amarelo?).
- [ ] Acesso: backoffice apenas (alinhar com Valentim).

## Escopo incluído

- Edge Function `auditoria-fretes-v1` (GET paginado com filtros + cálculo do delta).
- Componente `AuditoriaFretesPage`.
- Exportação CSV (se Valentim pedir).

## Escopo excluído

- Workflow de contestação automatizada com transportadora.
- Cálculo de multa contratual.

## Dependências

- F-LOG-1 (tabelas).
- F-LOG-6 (faturas com itens vinculados).
- Acesso restrito (já backoffice-only por menu).
