-- schema_views.sql — VIEWS do schema public de PRODUÇÃO.
-- Extraído do catálogo em 2026-08-01. O schema_baseline.sql (2026-06-01) versionou
-- apenas tabelas/enums/constraints/índices/RLS — views ficaram de fora, e por isso
-- a reconstrução do banco quebrava na migration 122 (exportar_clientes RETURNS SETOF
-- cliente_exportacao, que é uma view). 13 view(s).
-- Aplicar DEPOIS de schema_baseline.sql e ANTES da migration 122.

CREATE OR REPLACE VIEW public.cliente_completo AS
 SELECT c.cliente_id,
    c.nome,
    c.desconto,
    c.nome_fantasia,
    c.cpf_cnpj,
    c.codigo_sequencial,
    c."ref_tipo_pessoa_id_FK",
    c.inscricao_estadual,
    c.inscricao_municipal,
    c.marca_mae,
    c.lista_de_preco,
    c."observação_nfe",
    c."empresaFaturamento",
    c."CondiçãoPagamento",
    c.condicoesdisponiveis,
    c.vendedoresatribuidos,
    cc.telefone,
    cc.telefone_adicional,
    cc.website,
    cc.email,
    cc.email_nf,
    cc.observacao,
    ce.cep,
    ce.rua,
    ce.bairro,
    ce.cidade,
    ce.uf,
    ce.numero,
    ce.complemento,
    ce."ref_tipo_endereco_id_FK"
   FROM cliente c
     LEFT JOIN cliente_contato cc ON c.cliente_id = cc.cliente_id
     LEFT JOIN "cliente_endereço" ce ON c.cliente_id = ce.cliente_id;

CREATE OR REPLACE VIEW public.cliente_condicoes AS
 SELECT c.cliente_id,
    cond.condicao_id,
    cp."Descrição" AS descricao
   FROM cliente c
     LEFT JOIN LATERAL ( SELECT unnest(c.condicoesdisponiveis) AS condicao_id) cond ON c.condicoesdisponiveis IS NOT NULL
     LEFT JOIN "Condicao_De_Pagamento" cp ON cond.condicao_id = cp."Condição_ID";

CREATE OR REPLACE VIEW public.cliente_exportacao AS
 SELECT c.nome,
    c.nome_fantasia,
    c.codigo_sequencial,
    c."ref_tipo_pessoa_id_FK",
    c.cpf_cnpj,
    c.inscricao_estadual,
    c.inscricao_municipal,
    c.marca_mae,
    c.cliente_id,
    c.lista_de_preco,
    c."observação_nfe",
    c."empresaFaturamento",
    c."CondiçãoPagamento",
    c.desconto,
    c.condicoesdisponiveis,
    c.vendedoresatribuidos,
    c.observacao_interna,
    c.tipo_segmento,
    c."IE_isento",
    c.condicao_padrao,
    c.ref_situacao_id,
    c.codigo,
    c.grupo_rede,
    c.desconto_financeiro,
    c.pedido_minimo,
    c.status_aprovacao,
    c.motivo_rejeicao,
    c.aprovado_por,
    c.data_aprovacao,
    c.endereco_entrega_diferente,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    c.criado_por,
    c.atualizado_por,
    c.segmento_id,
    c.grupo_id,
    c.codigo_origem,
    c.codigo_tiny_sistema,
    c.codigo_tiny_id_externo,
    c.codigo_tiny_integration_ref,
    c.codigo_gerado_em,
    c.requisitos_logisticos,
    string_agg(DISTINCT cp.descricao, ' | '::text ORDER BY cp.descricao) AS condicoes_pagamento
   FROM cliente c
     LEFT JOIN cliente_condicoes cp ON cp.cliente_id = c.cliente_id
  WHERE c.deleted_at IS NULL
  GROUP BY c.cliente_id;

CREATE OR REPLACE VIEW public.cliente_lista AS
 SELECT c.cliente_id,
    c.nome,
    c.nome_fantasia,
    c.cpf_cnpj,
    c."ref_tipo_pessoa_id_FK",
    c.vendedoresatribuidos,
    c.marca_mae,
    cc.telefone,
    cc.email,
    ce.cidade
   FROM cliente c
     LEFT JOIN cliente_contato cc ON c.cliente_id = cc.cliente_id
     LEFT JOIN "cliente_endereço" ce ON c.cliente_id = ce.cliente_id;

CREATE OR REPLACE VIEW public.cliente_view_vendedores AS
 SELECT c.cliente_id,
    v.vendedor_id,
    dv.nome AS nome_vendedor,
    dv.telefone,
    dv.email
   FROM cliente c
     LEFT JOIN LATERAL ( SELECT unnest(c.vendedoresatribuidos) AS vendedor_id) v ON c.vendedoresatribuidos IS NOT NULL
     LEFT JOIN dados_vendedor dv ON v.vendedor_id = dv.user_id;

CREATE OR REPLACE VIEW public.filtros_tipo_segmento AS
 SELECT DISTINCT cliente.tipo_segmento
   FROM cliente;

CREATE OR REPLACE VIEW public.view_clientes_com_lista_preco AS
 SELECT c.nome,
    c.nome_fantasia,
    c.codigo_sequencial,
    c."ref_tipo_pessoa_id_FK",
    c.cpf_cnpj,
    c.inscricao_estadual,
    c.inscricao_municipal,
    c.marca_mae,
    c.cliente_id,
    c.lista_de_preco,
    c."observação_nfe",
    c."empresaFaturamento",
    c."CondiçãoPagamento",
    c.desconto,
    c.condicoesdisponiveis,
    c.vendedoresatribuidos,
    c.condicao_padrao,
    array_agg(dv.nome ORDER BY dv.nome) AS nomes_vendedores,
    c.observacao_interna,
    c.tipo_segmento,
    c."IE_isento",
    lp.nome AS nome_lista_preco
   FROM cliente c
     LEFT JOIN listas_preco lp ON c.lista_de_preco = lp.id
     LEFT JOIN LATERAL ( SELECT dv_1.nome
           FROM unnest(c.vendedoresatribuidos) vendedor_id(vendedor_id)
             JOIN dados_vendedor dv_1 ON dv_1.user_id = vendedor_id.vendedor_id) dv ON true
  GROUP BY c.nome, c.nome_fantasia, c.codigo_sequencial, c."ref_tipo_pessoa_id_FK", c.cpf_cnpj, c.inscricao_estadual, c.inscricao_municipal, c.marca_mae, c.cliente_id, c.lista_de_preco, c."observação_nfe", c."empresaFaturamento", c."CondiçãoPagamento", c.desconto, c.condicoesdisponiveis, c.vendedoresatribuidos, c.condicao_padrao, c.observacao_interna, c.tipo_segmento, c."IE_isento", lp.nome;

CREATE OR REPLACE VIEW public.view_tipo_segmento AS
 SELECT DISTINCT cliente.tipo_segmento
   FROM cliente;

CREATE OR REPLACE VIEW public.vw_conta_corrente_cliente AS
 SELECT ccc.id,
    ccc.cliente_id,
    ccc.vendedor_uuid,
    dv.nome AS vendedor_nome,
    dv.nome_fantasia AS vendedor_fantasia,
    c.nome AS cliente_nome,
    c.nome_fantasia AS cliente_fantasia,
    ccc.data,
    ccc.valor,
    ccc.titulo,
    ccc.descricao_longa,
    ccc.arquivos_anexos,
    ccc.tipo_compromisso,
    ccc.created_at,
    COALESCE(sum(pac.valor_pago), 0::numeric) AS total_pago,
    ccc.valor - COALESCE(sum(pac.valor_pago), 0::numeric) AS saldo_restante
   FROM conta_corrente_cliente ccc
     LEFT JOIN cliente c ON ccc.cliente_id = c.cliente_id
     LEFT JOIN dados_vendedor dv ON ccc.vendedor_uuid = dv.user_id
     LEFT JOIN pagamento_acordo_cliente pac ON ccc.id = pac.conta_corrente_id
  GROUP BY ccc.id, ccc.cliente_id, ccc.vendedor_uuid, dv.nome, dv.nome_fantasia, c.nome, c.nome_fantasia, ccc.data, ccc.valor, ccc.titulo, ccc.descricao_longa, ccc.arquivos_anexos, ccc.tipo_compromisso, ccc.created_at;

CREATE OR REPLACE VIEW public.vw_pedido_venda AS
 SELECT pv."pedido_venda_ID",
    pv.cliente_id,
    c.nome AS nome_cliente,
    pv.vendedor_uuid,
    pv.natureza_operacao,
    pv.numero_pedido,
    pv.observacao,
    pv.observacao_interna,
    pv.valor_total,
    pv."timestamp",
    pv.data_venda,
    pv.ordem_cliente,
    pv.id_condicao
   FROM pedido_venda pv
     LEFT JOIN cliente c ON pv.cliente_id = c.cliente_id;

CREATE OR REPLACE VIEW public.vw_pedido_venda_cliente AS
 SELECT pv."pedido_venda_ID",
    pv.cliente_id,
    cli.cliente_id AS id_cliente,
    cli.cpf_cnpj AS cnpj_cliente,
    cli.inscricao_estadual,
    ende.cep,
    ende.rua,
    ende.bairro,
    ende.cidade,
    ende.uf,
    ende.numero,
    ende.complemento,
    pv.vendedor_uuid,
    pv.natureza_operacao,
    pv.numero_pedido,
    pv.observacao,
    pv.observacao_interna,
    pv.valor_total,
    pv."timestamp",
    pv.data_venda,
    pv.ordem_cliente,
    pv.id_condicao AS id_condicao_pagamento,
    cli.nome AS nome_cliente,
    cli.nome_fantasia,
    cli.desconto AS desconto_cliente,
    pv.lista_de_preco AS lista_de_preco_id,
    lp.nome AS nome_lista_de_preco,
    pv.empresa_faturou AS empresa_faturamento_id,
    ef.nome AS nome_empresa_faturamento,
    cli.vendedoresatribuidos[1] AS vendedor_uuid_atribuido,
    dv.nome AS nome_vendedor_atribuido,
    COALESCE(agg.total_quantidade_itens, 0::numeric) AS total_quantidade_itens,
    COALESCE(agg.total_produtos, 0::bigint) AS total_produtos,
    COALESCE(agg.total_peso_bruto, 0::numeric) AS total_peso_bruto,
    COALESCE(agg.total_peso_liquido, 0::numeric) AS total_peso_liquido
   FROM pedido_venda pv
     LEFT JOIN cliente cli ON pv.cliente_id = cli.cliente_id
     LEFT JOIN "cliente_endereço" ende ON cli.cliente_id = ende.cliente_id
     LEFT JOIN dados_vendedor dv ON dv.user_id = cli.vendedoresatribuidos[1]
     LEFT JOIN listas_preco lp ON pv.lista_de_preco = lp.id::text
     LEFT JOIN ref_empresas_subsidiarias ef ON pv.empresa_faturou = ef.id::text
     LEFT JOIN ( SELECT pvp.pedido_venda_id,
            sum(pvp.quantidade) AS total_quantidade_itens,
            count(DISTINCT pvp.produto_id) AS total_produtos,
            sum(pvp.quantidade * prod.peso_bruto) AS total_peso_bruto,
            sum(pvp.quantidade * prod.peso_liquido) AS total_peso_liquido
           FROM pedido_venda_produtos pvp
             JOIN produto prod ON pvp.produto_id = prod.produto_id
          GROUP BY pvp.pedido_venda_id) agg ON agg.pedido_venda_id = pv."pedido_venda_ID";

CREATE OR REPLACE VIEW public.vw_pedido_venda_produtos_com_sku AS
 SELECT pvp.pedido_venda_produtos_id,
    pvp.pedido_venda_id,
    pvp.produto_id,
    pvp.quantidade,
    pvp.valor_unitario,
    pvp.descricao AS descricao_pedido,
    prod.codigo_sku AS sku
   FROM pedido_venda_produtos pvp
     LEFT JOIN produto prod ON pvp.produto_id = prod.produto_id;

CREATE OR REPLACE VIEW public.vw_produtos_listas_precos AS
 SELECT lp.id AS lista_preco_id,
    lp.nome AS nome_lista_preco,
    p.produto_id,
    p.descricao AS descricao_produto,
    p.codigo_sku,
    p.gtin,
    plp.preco AS preco_lista_preco,
    p.preco_venda AS preco_padrao_produto,
    p.peso_liquido AS peso_liquido_produto,
    p.peso_bruto AS peso_bruto_produto
   FROM produtos_listas_precos plp
     JOIN produto p ON plp.produto_id = p.produto_id
     JOIN listas_preco lp ON plp.lista_preco_id = lp.id
  ORDER BY lp.id, p.produto_id;
