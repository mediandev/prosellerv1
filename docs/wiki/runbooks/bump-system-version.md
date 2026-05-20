# Runbook — Bump de `systemVersion` no Sidebar

> Cliente cobra ver a versão mudar a cada entrega visível. Sem bump = re-trabalho + confusão.

## Quando aplicar

- **Toda PR que toca `src/`** e dispara deploy Netlify em produção.
- Para deploy puramente backend (Edge Function ou migration), **avaliar caso a caso**: se o efeito é visível ao usuário (novo campo aparece, comportamento muda), bumpar; se é interno (perf, log, refactor), não bumpar.
- Quando há **vários fixes em paralelo** num mesmo deploy (acontece — ver V 1.29 que empilhou INC-011 + INC-012 + INC-013), todos viram **bullets na mesma versão**.

## Onde alterar

`src/App.tsx` → componente **`SidebarUserInfo`** (~linha 142).

Há duas mudanças por bump:

1. **Constante `systemVersion`:**
   ```ts
   const systemVersion = "V 1.34"; // antes era V 1.33
   ```
2. **Tooltip ✨** ao lado: adicionar nova seção "Novidades em V 1.34" no topo. Descer a anterior para virar "V 1.33" (e assim por diante). Padrão usado desde V 1.23 — verificar `ChangelogPage.tsx` como referência adicional (V 1.23+).

## Padrão do bullet no tooltip

- Linguagem do usuário final (não jargão técnico).
- Foco no efeito visível, não na causa.
- Curto (≤ 2 linhas por bullet).

Exemplos reais:
- V 1.33 — "PDF do relatório de comissões agora exibe acentos corretamente."
- V 1.32 — "Inclusão rápida de grupo/rede no cadastro de cliente sem sair do formulário."
- V 1.31 — "Busca de cliente passa a ignorar acentos e formatação de CNPJ; vendedor identificado por ID."

## Quando NÃO bumpar

- PR puramente de documentação (`docs/`).
- PR puramente de infraestrutura sem efeito visível (`.github/workflows/`, `tsconfig.json`).
- PR de refactor sem mudança comportamental.

Esta PR de bootstrap do Harness v3.2 **não bumpa** — é documental.

## Validação pós-deploy

1. Login em `proseller.app.br` (ver `smoke-pos-deploy-prod.md`).
2. Hover no ícone ✨ ao lado da versão no Sidebar.
3. Confirmar que a nova seção "Novidades em V x.y" aparece no topo.
4. Confirmar que a versão exibida bate com `systemVersion`.

## Lições registradas

- **INC-013 V 1.30** — fix aplicado em prod via SQL direto. Decisão: bumpou V 1.30 em vez de empilhar como 3º bullet da V 1.29 porque V 1.29 já estava em produção quando o INC veio. Critério: se a versão atual já está em prod, próximo fix bumpa; se ainda não foi pro Netlify, empilha bullets.
- **Commit `c88e117`** — regra de bump foi codificada em CLAUDE.md após queixas recorrentes do cliente.
