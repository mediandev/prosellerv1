# Testes de banco (RPC / PL-pgSQL)

## Por que isto existe

Os incidentes de maior prejuízo do ProSeller não estiveram no front nem nas Edge
Functions — estiveram em **funções do Postgres**:

| Incidente | Onde | Migration que corrigiu |
|---|---|---|
| Salvar cliente apagava campos não enviados (caso Época: 121 campos, 94 clientes) | `update_cliente_v2` | 140 |
| CEP perdia zeros à esquerda e gravava formato quebrado | `create/update_cliente_v2` | 146 |
| Comissão gerada para natureza de operação sem comissão | `generate_vendedor_comissao` | 144 |
| Pagamento acima do pendente era bloqueado | `create_pagamento_conta_corrente` | 145 |

Nenhuma dessas funções tinha teste. Vitest não roda SQL e Deno não roda SQL — a
única verificação era um ensaio `BEGIN … ROLLBACK` **manual**, dependente de
alguém lembrar de fazer. Esta suíte transforma esse ensaio em comando.

## Como rodar

```bash
npm run test:db
```

Cada caso em `cases/*.sql` roda dentro da sua própria transação, que é sempre
revertida (`ROLLBACK`) — nenhum caso deixa resíduo, mesmo se falhar.

### Dois alvos

| Alvo | Comando | Quando |
|---|---|---|
| Banco efêmero local (Docker) | `npm run test:db` | Padrão. Isolado, seguro, roda no CI. |
| Produção, dentro de transação revertida | `npm run test:db -- --target=prod` | Para provar comportamento sobre os **dados reais** antes de aplicar uma migration sensível. |

O alvo `prod` exige `SUPABASE_DB_URL` (ou `source .envrc`). Ele nunca faz commit:
o runner abre a transação, roda o caso e sempre reverte. Ainda assim, prefira o
alvo local — `prod` é para o ensaio final de uma migration.

## Como escrever um caso

Um caso é um arquivo `.sql` que monta seus próprios dados, chama a função e usa
`ASSERT` para falhar com mensagem legível. O runner cuida de `BEGIN`/`ROLLBACK`.

```sql
-- cases/exemplo.sql
DO $$
DECLARE v_resultado text;
BEGIN
  -- 1. montar o cenário
  INSERT INTO ...;
  -- 2. exercitar a função
  SELECT minha_funcao(...) INTO v_resultado;
  -- 3. afirmar
  ASSERT v_resultado = 'esperado',
    format('esperava "esperado", veio "%s"', v_resultado);
END $$;
```

Regra: **um caso por invariante**, com o número da migration no cabeçalho. Se um
caso quebrar, a mensagem do `ASSERT` precisa dizer sozinha o que regrediu.
