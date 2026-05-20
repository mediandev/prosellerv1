# F-LOG-6 · Faturas transportadora — CRUD manual

**Risco:** B · **Branch:** `feat/log-crm-R-LOG-6` (futura) · **CI alvo:** N1 + matriz · **Depende de:** F-LOG-1.

> **Esqueleto.** CRUD sobre `fatura_transportadora` + `fatura_transportadora_item` (já criadas em F-LOG-1).

## Objetivo

Permitir cadastro/edição manual de faturas de transportadora com itens vinculados a fretes existentes (ou avulsos, se NFe não cadastrada). Lista + filtros + detalhe equivalente ao `/logis_faturas-listar` e `/logis_incluir-fatura/<id>` do Bubble.

## Definition of Ready

- [ ] Definir caminho de upload do PDF original (Storage bucket novo? Reusar `logistica-comprovantes` de F-LOG-2?).
- [ ] Decidir comportamento quando NFe do item NÃO existe em `frete_logistica` — criar registro vazio ou só registrar texto.
- [ ] Validação de soma: `sum(item.valor_frete_cobrado) == valor_total` (estrito ou tolerância?).

## Escopo incluído

- Edge Function `fatura-transportadora-v1` (CRUD da fatura) + `fatura-transportadora-item-v1` (CRUD dos itens).
- Componentes: `FaturasListPage`, `FaturaDetalhePage`.
- Upload PDF para Storage.

## Escopo excluído

- Parser automático PDF/EDI (R-LOG-7).
- Comparação cotado × cobrado (R-LOG-8).

## Dependências

- F-LOG-1 (tabelas).
- F-LOG-2 ideal (vinculação visual frete ↔ fatura).
