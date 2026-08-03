-- Invariante da migration 152 — o banco aceita o status "Aguardando Agendamento".
--
-- O defeito que isto protege: o front trocou "Em Trânsito - Reentrega" por
-- "Aguardando Agendamento" (V1.5x) mas o tipo do banco nunca recebeu o valor novo.
-- Arrastar um frete para essa coluna do Kanban era REJEITADO pelo banco — a tela
-- oferecia uma coluna que não existia do outro lado.
--
-- Sem cenário elaborado: se o valor não existe no tipo, o próprio cast falha.

DO $$
DECLARE
  v_status public.status_entrega_frete;
BEGIN
  -- O caminho que quebrava: gravar o status vindo do Kanban.
  v_status := 'Aguardando Agendamento'::public.status_entrega_frete;
  ASSERT v_status::text = 'Aguardando Agendamento',
    'REGRESSÃO 152: o tipo status_entrega_frete não aceita "Aguardando Agendamento"';

  -- O valor legado continua existindo (não foi removido de propósito: remover
  -- valor de enum exigiria recriar o tipo e suas dependências).
  ASSERT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'status_entrega_frete'
       AND e.enumlabel = 'Em Trânsito - Reentrega'),
    'o valor legado "Em Trânsito - Reentrega" sumiu do tipo — não era para ter sido removido';

  -- Todas as 9 colunas do Kanban precisam existir no banco, senão a tela oferece
  -- uma coluna que o banco recusa (que foi exatamente o defeito).
  ASSERT (SELECT count(*) FROM unnest(ARRAY[
            'Em Separação','Aguardando Coleta','Em Trânsito','Aguardando Agendamento',
            'Agendado','Entregue','Recusado','Devolvido - Trânsito','Devolvido - Entregue'
          ]) col
           WHERE NOT EXISTS (
             SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
              WHERE t.typname = 'status_entrega_frete' AND e.enumlabel = col)) = 0,
    'existe coluna do Kanban sem valor correspondente no banco';
END $$;
