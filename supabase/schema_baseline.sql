-- ============================================================================
-- SCHEMA BASELINE — snapshot do schema public de PRODUÇÃO em 2026-06-01.
-- Montado via catálogo (pg_get_constraintdef / pg_get_indexdef / pg_get_triggerdef /
-- pg_policies / format_type) porque ~39 das 62 tabelas não existiam em migration.
-- Objetivo: versionar o schema que JÁ está em prod. NÃO foi aplicado em prod por
-- este arquivo (prod já tem tudo). As FUNÇÕES estão na migration 117 (baseline).
-- Best-effort: revisar antes de usar para rebuild (identity/generated columns e
-- ordem de dependências podem exigir ajuste). Para rebuild fiel, prefira `supabase db dump`.
-- Conteúdo: 51 sequences, 62 tabelas, 177 constraints, 99 índices, 54 RLS-enable, 130 policies, 12 triggers.
-- ============================================================================

-- ========== SEQUENCES (51) ==========

CREATE SEQUENCE IF NOT EXISTS public.ref_situacao_ref_situacao_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."Condição_De_Pagamento_Condição_ID_seq";
CREATE SEQUENCE IF NOT EXISTS public.cliente_cliente_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.cliente_vendedores_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.contatos_associados_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.listas_preco_comissionamento_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.listas_preco_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.natureza_operacao_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."detalhes_pedido_venda_pedido_venda_id (PK) (FK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."pedido_venda_produtos_pedido_venda_produtos_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."condições_cliente_id_seq";
CREATE SEQUENCE IF NOT EXISTS public.marcas_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."pedido_venda_pedido_venda_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public.produto_vendedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."ref_origem_produto_ref_origem_produto_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_intermediadores_ref_intermediador_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_formas_envio_ref_formas_envio_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_pagador_frete_ref_pagador_frete_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_embalagem_ref_embalagem_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_permissão_produto_ref_permissao_id_seq";
CREATE SEQUENCE IF NOT EXISTS public.ref_empresas_subsidiarias_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.produtos_listas_precos_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.ref_forma_pagamento_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.vendedores_cliente_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."ref_unidade_ref_unidade_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."vendedor_comissão_vendedor_comissao_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_user_role_ref_user_role_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."transportador_pedido_venda_pedido_venda_id (PK) (FK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_tipo_pessoa_ref_tipo_pessoa_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_tipo_endereço_tipo_endereco_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public.ref_tipo_produto_id_seq;
CREATE SEQUENCE IF NOT EXISTS public."dados_comissão_ref_comissão_id_seq";
CREATE SEQUENCE IF NOT EXISTS public."produto_produto_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_formar_frete_ref_formas_frete_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public."ref_tipo_embalagem_ref_tipo_embalagem_id (PK)_seq";
CREATE SEQUENCE IF NOT EXISTS public.conta_corrente_cliente_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.metas_vendedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.pagamento_acordo_cliente_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.lancamentos_comissao_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.pagamentos_comissao_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.segmento_cliente_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.controle_comissao_periodo_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.tiny_empresa_natureza_operacao_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.ref_unidade_medida_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.regiao_destino_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.transportador_logistica_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.origem_frete_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.frete_logistica_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.frete_logistica_ocorrencia_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.fatura_transportadora_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.fatura_transportadora_item_id_seq;

-- ========== TABLES (62) ==========

CREATE TABLE IF NOT EXISTS public."Condicao_De_Pagamento" (
  "Condição_ID" bigint NOT NULL,
  "Parcelamento" boolean,
  "Condição_de_crédito" boolean,
  "Quantidade_parcelas" double precision,
  "Desconto" double precision,
  "Prazo_pagamento" double precision,
  "Descrição" text,
  forma_pagamento_id bigint,
  meio_pagamento bigint,
  intervalo_parcela bigint[],
  valor_minimo numeric(10,2) DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.categorias_conta_corrente (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  descricao text,
  cor text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.cliente (
  nome text,
  nome_fantasia text,
  codigo_sequencial text,
  "ref_tipo_pessoa_id_FK" bigint,
  cpf_cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  marca_mae text,
  cliente_id bigint NOT NULL,
  lista_de_preco bigint,
  "observação_nfe" text,
  "empresaFaturamento" bigint,
  "CondiçãoPagamento" bigint,
  desconto numeric,
  condicoesdisponiveis bigint[],
  vendedoresatribuidos uuid[],
  observacao_interna text,
  tipo_segmento text,
  "IE_isento" boolean,
  condicao_padrao bigint,
  ref_situacao_id integer NOT NULL,
  codigo text,
  grupo_rede text,
  desconto_financeiro numeric DEFAULT 0,
  pedido_minimo numeric DEFAULT 0,
  status_aprovacao text DEFAULT 'pendente'::text,
  motivo_rejeicao text,
  aprovado_por uuid,
  data_aprovacao date,
  endereco_entrega_diferente boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  criado_por uuid,
  atualizado_por uuid,
  segmento_id bigint,
  grupo_id uuid,
  codigo_origem text,
  codigo_tiny_sistema text,
  codigo_tiny_id_externo text,
  codigo_tiny_integration_ref text,
  codigo_gerado_em timestamp with time zone,
  requisitos_logisticos jsonb,
  optante_simples boolean,
  optante_simples_nacional boolean,
  optante_simples_nacional_consultado_em timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.cliente_codigo_depara (
  cliente_id bigint NOT NULL,
  codigo_antigo text,
  codigo_novo text NOT NULL,
  migrado_em timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cliente_contato (
  telefone text,
  telefone_adicional text,
  website text,
  email text,
  email_nf text,
  observacao text,
  cliente_id bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS public."cliente_endereço" (
  cep text,
  rua text,
  bairro text,
  cidade text,
  uf text,
  numero text,
  complemento text,
  "ref_tipo_endereco_id_FK" bigint,
  cliente_id bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS public.cliente_historico_alteracoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id bigint NOT NULL,
  tipo text DEFAULT 'edicao'::text NOT NULL,
  descricao text NOT NULL,
  campos_alterados jsonb DEFAULT '[]'::jsonb NOT NULL,
  usuario_id uuid,
  usuario_nome text,
  data_hora timestamp with time zone DEFAULT now() NOT NULL,
  metadados jsonb
);
CREATE TABLE IF NOT EXISTS public.cliente_vendedores (
  id bigint NOT NULL,
  cliente_id bigint,
  vendedor_id uuid DEFAULT gen_random_uuid()
);
CREATE TABLE IF NOT EXISTS public."condições_cliente" (
  id bigint NOT NULL,
  "ID_condições" bigint,
  "ID_cliente" bigint,
  descricao text
);
CREATE TABLE IF NOT EXISTS public.conta_corrente_cliente (
  id bigint NOT NULL,
  cliente_id bigint NOT NULL,
  vendedor_uuid uuid,
  data date NOT NULL,
  valor numeric NOT NULL,
  titulo text,
  descricao_longa text,
  arquivos_anexos text[] DEFAULT '{}'::text[],
  tipo_compromisso text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  categoria_id uuid
);
CREATE TABLE IF NOT EXISTS public.contatos_associados (
  id bigint NOT NULL,
  "Nome" text,
  "Setor" text,
  "Telefone" text,
  "Contato" text,
  "ID_cliente" text
);
CREATE TABLE IF NOT EXISTS public.controle_comissao_periodo (
  id bigint NOT NULL,
  vendedor_uuid uuid NOT NULL,
  periodo text NOT NULL,
  status text DEFAULT 'aberto'::text NOT NULL,
  saldo_anterior numeric(15,2) DEFAULT 0,
  saldo_final numeric(15,2),
  data_fechamento timestamp with time zone,
  fechado_por uuid
);
CREATE TABLE IF NOT EXISTS public.dados_comissao (
  "ref_comissão_id" bigint NOT NULL,
  "Descrição" text,
  "Modelo_tabela" text,
  "informações" text
);
CREATE TABLE IF NOT EXISTS public.dados_vendedor (
  user_id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome_fantasia text,
  codigo_sequencial text,
  ref_tipo_pessoa_id bigint,
  cpf_cnpj text,
  telefone text,
  telefone_adicional text,
  website text,
  email text,
  email_nf text,
  observacao_contato text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  observacao text,
  "Comissão" bigint,
  nome text,
  aliquotafixa numeric,
  idtiny text,
  idcantico text,
  iniciais text,
  data_admissao date,
  status text DEFAULT 'ativo'::text,
  cnpj text,
  razao_social text,
  inscricao_estadual text,
  observacoes_internas text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  dados_bancarios jsonb DEFAULT '{}'::jsonb,
  contatos_adicionais jsonb DEFAULT '[]'::jsonb
);
CREATE TABLE IF NOT EXISTS public.detalhes_pedido_venda (
  pedido_venda_id bigint NOT NULL,
  created_at timestamp with time zone,
  data_previsao_entrega date,
  data_envio date,
  data_max_despacho date,
  canal_vendas text,
  numero_pedido_canal_vendas text,
  ref_intermediador_id text,
  desconto numeric,
  frete_cliente numeric,
  frete_empresa numeric,
  despesas numeric,
  forma_pagamento text,
  meio_pagamento text,
  id_condicao bigint
);
CREATE TABLE IF NOT EXISTS public.fatura_transportadora (
  id bigint DEFAULT nextval('fatura_transportadora_id_seq'::regclass) NOT NULL,
  transportador_id bigint NOT NULL,
  empresa_id bigint NOT NULL,
  numero_fatura text NOT NULL,
  valor_total numeric(14,2) DEFAULT 0 NOT NULL,
  data_emissao date,
  data_vencimento date,
  status status_fatura_transportadora DEFAULT 'Aberta'::status_fatura_transportadora NOT NULL,
  arquivo_url text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  criado_por uuid,
  atualizado_por uuid
);
CREATE TABLE IF NOT EXISTS public.fatura_transportadora_item (
  id bigint DEFAULT nextval('fatura_transportadora_item_id_seq'::regclass) NOT NULL,
  fatura_id bigint NOT NULL,
  frete_id bigint,
  cte_numero text,
  data_emissao_cte date,
  nfe_numero integer,
  destinatario text,
  valor_mercadoria numeric(14,2),
  peso_kg numeric(10,3),
  valor_frete_cobrado numeric(14,2) DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.frete_logistica (
  id bigint DEFAULT nextval('frete_logistica_id_seq'::regclass) NOT NULL,
  pedido_venda_id bigint,
  nfe_numero integer,
  nfe_chave_acesso text,
  cliente_id bigint,
  empresa_id bigint NOT NULL,
  vendedor_id uuid,
  transportador_id bigint,
  regiao_destino_id integer,
  origem_frete_id integer,
  data_emissao date,
  data_saida date,
  previsao_entrega date,
  data_entrega date,
  valor_produtos numeric(14,2) DEFAULT 0 NOT NULL,
  valor_cotacao numeric(14,2),
  volumes integer,
  numero_expedicao text,
  numero_coleta text,
  status_entrega status_entrega_frete DEFAULT 'Em Separação'::status_entrega_frete NOT NULL,
  rateio boolean DEFAULT false NOT NULL,
  reentrega boolean DEFAULT false NOT NULL,
  dacte_url text,
  comprovante_entrega_url text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  criado_por uuid,
  atualizado_por uuid
);
CREATE TABLE IF NOT EXISTS public.frete_logistica_ocorrencia (
  id bigint DEFAULT nextval('frete_logistica_ocorrencia_id_seq'::regclass) NOT NULL,
  frete_id bigint NOT NULL,
  codigo_ssw text NOT NULL,
  descricao_ocorrencia text,
  tipo tipo_ocorrencia_ssw DEFAULT 'Informativo'::tipo_ocorrencia_ssw NOT NULL,
  data_hora timestamp with time zone DEFAULT now() NOT NULL,
  dominio text,
  filial text,
  cidade text,
  uf character varying(2),
  raw_payload jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  nome_recebedor text,
  nro_doc_recebedor text,
  data_hora_efetiva timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.grupos_redes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.lancamentos_comissao (
  id bigint NOT NULL,
  vendedor_uuid uuid NOT NULL,
  data_lancamento date DEFAULT CURRENT_DATE NOT NULL,
  tipo text NOT NULL,
  valor numeric(15,2) NOT NULL,
  descricao text NOT NULL,
  periodo text NOT NULL,
  criado_por uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.listas_preco (
  id bigint NOT NULL,
  data_criacao timestamp with time zone DEFAULT now() NOT NULL,
  nome character varying,
  desconto numeric DEFAULT '0'::numeric,
  ativo boolean DEFAULT true,
  codigo_sequencial text
);
CREATE TABLE IF NOT EXISTS public.listas_preco_comissionamento (
  id bigint NOT NULL,
  lista_preco_id bigint NOT NULL,
  desconto_minimo numeric NOT NULL,
  desconto_maximo numeric NOT NULL,
  comissao numeric NOT NULL,
  data_criacao timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.marcas (
  id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  descricao text
);
CREATE TABLE IF NOT EXISTS public.metas_vendedor (
  id integer DEFAULT nextval('metas_vendedor_id_seq'::regclass) NOT NULL,
  ano integer NOT NULL,
  meta_valor numeric(15,2) NOT NULL,
  meta_percentual_crescimento numeric(5,2),
  periodo_referencia text,
  data_criacao timestamp with time zone DEFAULT now(),
  data_atualizacao timestamp with time zone,
  vendedor_id uuid NOT NULL,
  mes integer NOT NULL
);
CREATE TABLE IF NOT EXISTS public.natureza_operacao (
  id bigint NOT NULL,
  nome text,
  tem_comissao boolean,
  codigo text,
  descricao text,
  gera_receita boolean DEFAULT true,
  ativo boolean DEFAULT true NOT NULL,
  tiny_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.notificacao (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  link text,
  status text DEFAULT 'nao_lida'::text NOT NULL,
  usuario_id uuid NOT NULL,
  criado_por uuid,
  dados_adicionais jsonb DEFAULT '{}'::jsonb NOT NULL,
  data_criacao timestamp with time zone DEFAULT now() NOT NULL,
  data_leitura timestamp with time zone,
  arquivada_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.origem_frete (
  id integer DEFAULT nextval('origem_frete_id_seq'::regclass) NOT NULL,
  nome text NOT NULL,
  uf character varying(2),
  empresa_id bigint NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.pagamento_acordo_cliente (
  id bigint NOT NULL,
  conta_corrente_id bigint NOT NULL,
  data_pagamento date,
  forma_pagamento text NOT NULL,
  valor_pago numeric NOT NULL,
  arquivo_comprovante text,
  created_at timestamp with time zone DEFAULT now(),
  categoria_id uuid,
  forma_pagamento_id bigint
);
CREATE TABLE IF NOT EXISTS public.pagamentos_comissao (
  id bigint NOT NULL,
  vendedor_uuid uuid NOT NULL,
  data_pagamento date DEFAULT CURRENT_DATE NOT NULL,
  valor numeric(15,2) NOT NULL,
  periodo text NOT NULL,
  forma_pagamento text NOT NULL,
  comprovante_url text,
  observacoes text,
  realizado_por uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.pedido_venda (
  "pedido_venda_ID" bigint NOT NULL,
  cliente_id bigint,
  vendedor_uuid uuid DEFAULT gen_random_uuid(),
  natureza_operacao text,
  numero_pedido text,
  observacao text,
  observacao_interna text,
  valor_total double precision,
  "timestamp" timestamp without time zone DEFAULT now(),
  data_venda date,
  ordem_cliente text,
  id_condicao bigint,
  empresa_faturou text,
  lista_de_preco text,
  id_tiny text,
  status text DEFAULT ''::text,
  lista_preco_id bigint,
  nome_lista_preco text,
  percentual_desconto_padrao numeric DEFAULT 0,
  nome_cliente text,
  cnpj_cliente text,
  inscricao_estadual_cliente text,
  nome_vendedor text,
  nome_natureza_operacao text,
  empresa_faturamento_id bigint,
  nome_empresa_faturamento text,
  nome_condicao_pagamento text,
  total_quantidades numeric DEFAULT 0,
  total_itens integer DEFAULT 0,
  peso_bruto_total numeric DEFAULT 0,
  peso_liquido_total numeric DEFAULT 0,
  valor_total_produtos numeric DEFAULT 0,
  percentual_desconto_extra numeric DEFAULT 0,
  valor_desconto_extra numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  deleted_at timestamp with time zone,
  natureza_id bigint,
  tiny_natureza_enviada text,
  tiny_optante_aplicado boolean,
  tiny_fallback_used text
);
CREATE TABLE IF NOT EXISTS public.pedido_venda_produtos (
  pedido_venda_produtos_id bigint NOT NULL,
  pedido_venda_id bigint NOT NULL,
  produto_id bigint NOT NULL,
  quantidade numeric,
  valor_unitario double precision,
  descricao text,
  numero integer,
  codigo_sku text,
  codigo_ean text,
  valor_tabela numeric,
  percentual_desconto numeric DEFAULT 0,
  subtotal numeric,
  peso_bruto numeric,
  peso_liquido numeric,
  unidade text
);
CREATE TABLE IF NOT EXISTS public.produto (
  produto_id bigint NOT NULL,
  descricao text,
  codigo_sku text,
  ref_origem_produto_id bigint,
  ncm text,
  gtin text,
  cest text,
  preco_venda numeric,
  ref_unidade_id text,
  peso_liquido numeric,
  peso_bruto numeric,
  numero_volumes numeric,
  ref_tipo_embalagem_id bigint,
  ref_embalagem_id bigint,
  largura numeric,
  altura numeric,
  comprimento numeric,
  controle_estoque boolean,
  estoque_inicial numeric,
  estoque_minimo numeric,
  localizacao_estoque text,
  dias_preparacao numeric,
  ref_permissao_id bigint DEFAULT '1'::bigint,
  codigo_sequencial text,
  tipo_id bigint,
  marca bigint,
  foto text,
  situacao text DEFAULT 'Ativo'::text,
  ativo boolean DEFAULT true NOT NULL,
  disponivel boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  nome_marca text,
  nome_tipo_produto text,
  sigla_unidade text,
  unidade_id bigint
);
CREATE TABLE IF NOT EXISTS public.produto_backup (
  produto_id bigint,
  descricao text,
  codigo_sku text,
  ref_origem_produto_id bigint,
  ncm text,
  gtin text,
  cest text,
  preco_venda numeric,
  ref_unidade_id bigint,
  peso_liquido numeric,
  peso_bruto numeric,
  numero_volumes numeric,
  ref_tipo_embalagem_id bigint,
  ref_embalagem_id bigint,
  largura numeric,
  altura numeric,
  comprimento numeric,
  controle_estoque boolean,
  estoque_inicial numeric,
  estoque_minimo numeric,
  localizacao_estoque text,
  dias_preparacao numeric,
  ref_permissao_id bigint,
  codigo_sequencial text,
  tipo text
);
CREATE TABLE IF NOT EXISTS public.produto_vendedor (
  id bigint NOT NULL,
  "Id_produto" bigint,
  "Id_vendedor" uuid,
  "Condição_associada" bigint
);
CREATE TABLE IF NOT EXISTS public.produtos_listas_precos (
  id bigint NOT NULL,
  produto_id bigint,
  lista_preco_id bigint,
  preco numeric
);
CREATE TABLE IF NOT EXISTS public.ref_empresas_subsidiarias (
  id bigint NOT NULL,
  nome text,
  "identificação" text,
  chave_api text,
  cnpj text,
  razao_social text,
  nome_fantasia text,
  inscricao_estadual text,
  endereco jsonb DEFAULT '{}'::jsonb,
  contas_bancarias jsonb DEFAULT '[]'::jsonb,
  integracoes_erp jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.ref_forma_pagamento (
  id bigint NOT NULL,
  nome text NOT NULL,
  descricao text,
  usar_em_conta_corrente boolean DEFAULT true,
  usar_em_condicoes_pagamento boolean DEFAULT true,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ref_formar_frete (
  ref_formas_frete_id bigint NOT NULL,
  nome text,
  ref_formas_envio_id bigint
);
CREATE TABLE IF NOT EXISTS public.ref_formas_envio (
  ref_formas_envio_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_intermediadores (
  ref_intermediador_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_meio_pagamento (
  ref_pagamento_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_origem_produto (
  ref_origem_produto_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_pagador_frete (
  ref_pagador_frete_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public."ref_permissão_produto" (
  ref_permissao_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_situacao (
  ref_situacao_id integer DEFAULT nextval('ref_situacao_ref_situacao_id_seq'::regclass) NOT NULL,
  nome character varying(50) NOT NULL,
  descricao text
);
CREATE TABLE IF NOT EXISTS public.ref_tipo_embalagem (
  "ref_tipo_embalagem_id (PK)" bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public."ref_tipo_endereço" (
  tipo_endereco_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_tipo_pessoa (
  ref_tipo_pessoa_id bigint NOT NULL,
  nome text,
  nome_completo text
);
CREATE TABLE IF NOT EXISTS public.ref_tipo_produto (
  id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_unidade (
  ref_unidade_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.ref_unidade_medida (
  id bigint NOT NULL,
  nome text NOT NULL,
  sigla text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ref_user_role (
  ref_user_role_id bigint NOT NULL,
  nome text
);
CREATE TABLE IF NOT EXISTS public.regiao_destino (
  id integer DEFAULT nextval('regiao_destino_id_seq'::regclass) NOT NULL,
  nome text NOT NULL,
  uf character varying(2),
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.segmento_cliente (
  id bigint DEFAULT nextval('segmento_cliente_id_seq'::regclass) NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.tiny_empresa_natureza_operacao (
  id bigint NOT NULL,
  empresa_id bigint NOT NULL,
  natureza_operacao_id bigint NOT NULL,
  tiny_valor text NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  tiny_valor_simples text
);
CREATE TABLE IF NOT EXISTS public.tipos_veiculo (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.transportador_logistica (
  id bigint DEFAULT nextval('transportador_logistica_id_seq'::regclass) NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL,
  inscricao_estadual text,
  uf character varying(2),
  email text,
  telefone text,
  grupo grupo_transportador DEFAULT 'OUTROS'::grupo_transportador NOT NULL,
  ssw_dominio character varying(8),
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  criado_por uuid,
  atualizado_por uuid
);
CREATE TABLE IF NOT EXISTS public.transportador_pedido_venda (
  pedido_venda_id bigint NOT NULL,
  ref_formas_envio_id bigint,
  ref_formas_frete_id bigint,
  codigo_rastreio text,
  url_rastreio text,
  ref_pagador_frete_id bigint,
  nome_pagador_frete text,
  quantidade numeric
);
CREATE TABLE IF NOT EXISTS public."user" (
  user_id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text,
  ref_user_role_id bigint,
  user_login text,
  first_login boolean DEFAULT false,
  email text,
  tipo text,
  ativo boolean DEFAULT true NOT NULL,
  data_cadastro timestamp with time zone DEFAULT now() NOT NULL,
  ultimo_acesso timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  permissoes jsonb DEFAULT '[]'::jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public."vendedor_comissão" (
  vendedor_comissao_id bigint NOT NULL,
  vendedor_uuid uuid DEFAULT gen_random_uuid(),
  data_inicio date,
  data_final date,
  valor_total numeric,
  valor_comissao numeric,
  id_produtos bigint[],
  produtos_qtde text[],
  efetivada boolean,
  pedido_id bigint,
  debito boolean DEFAULT false,
  observacao text,
  periodo text,
  oc_cliente text,
  cliente_id bigint,
  cliente_nome text,
  percentual_comissao numeric,
  regra_aplicada text,
  lista_preco_id bigint,
  lista_preco_nome text,
  desconto_aplicado numeric,
  faixa_desconto_id bigint,
  criado_em timestamp with time zone DEFAULT now(),
  editado_por uuid,
  editado_em timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.vendedores_cliente (
  id bigint NOT NULL,
  "ID_vendedor" text,
  "ID_cliente" text,
  "Nome_vendedor" text,
  "Telefone_vendedor" text,
  "Email_Vendedor" text
);

-- ========== CONSTRAINTS (PK/UNIQUE/CHECK primeiro, FK por último) (177) ==========

ALTER TABLE public."Condicao_De_Pagamento" ADD CONSTRAINT "Condição_De_Pagamento_pkey" PRIMARY KEY ("Condição_ID");
ALTER TABLE public.categorias_conta_corrente ADD CONSTRAINT categorias_conta_corrente_pkey PRIMARY KEY (id);
ALTER TABLE public.cliente ADD CONSTRAINT cliente_pkey PRIMARY KEY (cliente_id);
ALTER TABLE public.cliente_codigo_depara ADD CONSTRAINT cliente_codigo_depara_pkey PRIMARY KEY (cliente_id);
ALTER TABLE public.cliente_contato ADD CONSTRAINT cliente_contato_pkey PRIMARY KEY (cliente_id);
ALTER TABLE public."cliente_endereço" ADD CONSTRAINT "cliente_endereço_pkey" PRIMARY KEY (cliente_id);
ALTER TABLE public.cliente_historico_alteracoes ADD CONSTRAINT cliente_historico_alteracoes_pkey PRIMARY KEY (id);
ALTER TABLE public.cliente_vendedores ADD CONSTRAINT cliente_vendedores_pkey PRIMARY KEY (id);
ALTER TABLE public."condições_cliente" ADD CONSTRAINT "condições_cliente_pkey" PRIMARY KEY (id);
ALTER TABLE public.conta_corrente_cliente ADD CONSTRAINT conta_corrente_cliente_pkey PRIMARY KEY (id);
ALTER TABLE public.contatos_associados ADD CONSTRAINT contatos_associados_pkey PRIMARY KEY (id);
ALTER TABLE public.controle_comissao_periodo ADD CONSTRAINT controle_comissao_periodo_pkey PRIMARY KEY (id);
ALTER TABLE public.dados_comissao ADD CONSTRAINT "dados_comissão_pkey" PRIMARY KEY ("ref_comissão_id");
ALTER TABLE public.dados_vendedor ADD CONSTRAINT dados_vendedor_pkey PRIMARY KEY (user_id);
ALTER TABLE public.detalhes_pedido_venda ADD CONSTRAINT detalhes_pedido_venda_pkey PRIMARY KEY (pedido_venda_id);
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transportadora_pkey PRIMARY KEY (id);
ALTER TABLE public.fatura_transportadora_item ADD CONSTRAINT fatura_transportadora_item_pkey PRIMARY KEY (id);
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_pkey PRIMARY KEY (id);
ALTER TABLE public.frete_logistica_ocorrencia ADD CONSTRAINT frete_logistica_ocorrencia_pkey PRIMARY KEY (id);
ALTER TABLE public.grupos_redes ADD CONSTRAINT grupos_redes_pkey PRIMARY KEY (id);
ALTER TABLE public.lancamentos_comissao ADD CONSTRAINT lancamentos_comissao_pkey PRIMARY KEY (id);
ALTER TABLE public.listas_preco ADD CONSTRAINT listas_preco_pkey PRIMARY KEY (id);
ALTER TABLE public.listas_preco_comissionamento ADD CONSTRAINT listas_preco_comissionamento_pkey PRIMARY KEY (id);
ALTER TABLE public.marcas ADD CONSTRAINT marcas_pkey PRIMARY KEY (id);
ALTER TABLE public.metas_vendedor ADD CONSTRAINT metas_vendedor_pkey PRIMARY KEY (id);
ALTER TABLE public.natureza_operacao ADD CONSTRAINT natureza_operacao_pkey PRIMARY KEY (id);
ALTER TABLE public.notificacao ADD CONSTRAINT notificacao_pkey PRIMARY KEY (id);
ALTER TABLE public.origem_frete ADD CONSTRAINT origem_frete_pkey PRIMARY KEY (id);
ALTER TABLE public.pagamento_acordo_cliente ADD CONSTRAINT pagamento_acordo_cliente_pkey PRIMARY KEY (id);
ALTER TABLE public.pagamentos_comissao ADD CONSTRAINT pagamentos_comissao_pkey PRIMARY KEY (id);
ALTER TABLE public.pedido_venda ADD CONSTRAINT pedido_venda_pkey PRIMARY KEY ("pedido_venda_ID");
ALTER TABLE public.pedido_venda_produtos ADD CONSTRAINT pedido_venda_produtos_pkey PRIMARY KEY (pedido_venda_produtos_id);
ALTER TABLE public.produto ADD CONSTRAINT produto_pkey PRIMARY KEY (produto_id);
ALTER TABLE public.produto_vendedor ADD CONSTRAINT produto_vendedor_pkey PRIMARY KEY (id);
ALTER TABLE public.produtos_listas_precos ADD CONSTRAINT produtos_listas_precos_pkey PRIMARY KEY (id);
ALTER TABLE public.ref_empresas_subsidiarias ADD CONSTRAINT ref_empresas_subsidiarias_pkey PRIMARY KEY (id);
ALTER TABLE public.ref_forma_pagamento ADD CONSTRAINT ref_forma_pagamento_pkey PRIMARY KEY (id);
ALTER TABLE public.ref_formar_frete ADD CONSTRAINT ref_formar_frete_pkey PRIMARY KEY (ref_formas_frete_id);
ALTER TABLE public.ref_formas_envio ADD CONSTRAINT ref_formas_envio_pkey PRIMARY KEY (ref_formas_envio_id);
ALTER TABLE public.ref_intermediadores ADD CONSTRAINT ref_intermediadores_pkey PRIMARY KEY (ref_intermediador_id);
ALTER TABLE public.ref_meio_pagamento ADD CONSTRAINT ref_meio_pagamento_pkey PRIMARY KEY (ref_pagamento_id);
ALTER TABLE public.ref_origem_produto ADD CONSTRAINT ref_origem_produto_pkey PRIMARY KEY (ref_origem_produto_id);
ALTER TABLE public.ref_pagador_frete ADD CONSTRAINT ref_pagador_frete_pkey PRIMARY KEY (ref_pagador_frete_id);
ALTER TABLE public."ref_permissão_produto" ADD CONSTRAINT "ref_permissão_produto_pkey" PRIMARY KEY (ref_permissao_id);
ALTER TABLE public.ref_situacao ADD CONSTRAINT ref_situacao_pkey PRIMARY KEY (ref_situacao_id);
ALTER TABLE public.ref_tipo_embalagem ADD CONSTRAINT ref_tipo_embalagem_pkey PRIMARY KEY ("ref_tipo_embalagem_id (PK)");
ALTER TABLE public."ref_tipo_endereço" ADD CONSTRAINT "ref_tipo_endereço_pkey" PRIMARY KEY (tipo_endereco_id);
ALTER TABLE public.ref_tipo_pessoa ADD CONSTRAINT ref_tipo_pessoa_pkey PRIMARY KEY (ref_tipo_pessoa_id);
ALTER TABLE public.ref_tipo_produto ADD CONSTRAINT ref_tipo_produto_pkey PRIMARY KEY (id);
ALTER TABLE public.ref_unidade ADD CONSTRAINT ref_unidade_pkey PRIMARY KEY (ref_unidade_id);
ALTER TABLE public.ref_unidade_medida ADD CONSTRAINT ref_unidade_medida_pkey PRIMARY KEY (id);
ALTER TABLE public.ref_user_role ADD CONSTRAINT ref_user_role_pkey PRIMARY KEY (ref_user_role_id);
ALTER TABLE public.regiao_destino ADD CONSTRAINT regiao_destino_pkey PRIMARY KEY (id);
ALTER TABLE public.segmento_cliente ADD CONSTRAINT segmento_cliente_pkey PRIMARY KEY (id);
ALTER TABLE public.tiny_empresa_natureza_operacao ADD CONSTRAINT tiny_empresa_natureza_operacao_pkey PRIMARY KEY (id);
ALTER TABLE public.tipos_veiculo ADD CONSTRAINT tipos_veiculo_pkey PRIMARY KEY (id);
ALTER TABLE public.transportador_logistica ADD CONSTRAINT transportador_logistica_pkey PRIMARY KEY (id);
ALTER TABLE public.transportador_pedido_venda ADD CONSTRAINT transportador_pedido_venda_pkey PRIMARY KEY (pedido_venda_id);
ALTER TABLE public."user" ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT "vendedor_comissão_pkey" PRIMARY KEY (vendedor_comissao_id);
ALTER TABLE public.vendedores_cliente ADD CONSTRAINT vendedores_cliente_pkey PRIMARY KEY (id);
ALTER TABLE public.cliente ADD CONSTRAINT cliente_cpf_cnpj_key UNIQUE (cpf_cnpj);
ALTER TABLE public.controle_comissao_periodo ADD CONSTRAINT controle_comissao_periodo_vendedor_uuid_periodo_key UNIQUE (vendedor_uuid, periodo);
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transp_unica UNIQUE (transportador_id, numero_fatura);
ALTER TABLE public.origem_frete ADD CONSTRAINT origem_frete_nome_empresa_unique UNIQUE (nome, empresa_id);
ALTER TABLE public.pedido_venda_produtos ADD CONSTRAINT uq_pedido_produto UNIQUE (pedido_venda_id, produto_id);
ALTER TABLE public.ref_situacao ADD CONSTRAINT ref_situacao_nome_key UNIQUE (nome);
ALTER TABLE public.regiao_destino ADD CONSTRAINT regiao_destino_nome_unique UNIQUE (nome);
ALTER TABLE public.transportador_logistica ADD CONSTRAINT transportador_logistica_cnpj_unique UNIQUE (cnpj);
ALTER TABLE public.categorias_conta_corrente ADD CONSTRAINT categorias_conta_corrente_nome_check CHECK ((length(TRIM(BOTH FROM nome)) >= 2));
ALTER TABLE public.cliente ADD CONSTRAINT cliente_codigo_origem_chk CHECK (((codigo_origem IS NULL) OR (codigo_origem = ANY (ARRAY['tiny_dap'::text, 'tiny_cantico'::text, 'sequencial'::text, 'manual'::text]))));
ALTER TABLE public.cliente ADD CONSTRAINT cliente_status_aprovacao_check CHECK ((status_aprovacao = ANY (ARRAY['aprovado'::text, 'pendente'::text, 'rejeitado'::text])));
ALTER TABLE public.cliente ADD CONSTRAINT cliente_codigo_tiny_sistema_chk CHECK (((codigo_tiny_sistema IS NULL) OR (codigo_tiny_sistema = ANY (ARRAY['dap'::text, 'cantico'::text]))));
ALTER TABLE public.cliente_historico_alteracoes ADD CONSTRAINT cliente_historico_alteracoes_tipo_check CHECK ((tipo = ANY (ARRAY['edicao'::text, 'mudanca_status'::text])));
ALTER TABLE public.conta_corrente_cliente ADD CONSTRAINT conta_corrente_cliente_tipo_compromisso_check CHECK ((tipo_compromisso = ANY (ARRAY['investimento'::text, 'ressarcimento'::text])));
ALTER TABLE public.controle_comissao_periodo ADD CONSTRAINT controle_comissao_periodo_status_check CHECK ((status = ANY (ARRAY['aberto'::text, 'fechado'::text, 'pago'::text])));
ALTER TABLE public.dados_vendedor ADD CONSTRAINT dados_vendedor_status_check CHECK ((status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'excluido'::text])));
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transp_valor_pos CHECK ((valor_total >= (0)::numeric));
ALTER TABLE public.fatura_transportadora_item ADD CONSTRAINT fatura_item_valor_pos CHECK ((valor_frete_cobrado >= (0)::numeric));
ALTER TABLE public.fatura_transportadora_item ADD CONSTRAINT fatura_item_valor_mercad_pos CHECK (((valor_mercadoria IS NULL) OR (valor_mercadoria >= (0)::numeric)));
ALTER TABLE public.fatura_transportadora_item ADD CONSTRAINT fatura_item_peso_pos CHECK (((peso_kg IS NULL) OR (peso_kg >= (0)::numeric)));
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_nfe_chave_44 CHECK (((nfe_chave_acesso IS NULL) OR (nfe_chave_acesso ~ '^[0-9]{44}$'::text)));
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_volumes_pos CHECK (((volumes IS NULL) OR (volumes >= 0)));
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_valor_produtos_pos CHECK ((valor_produtos >= (0)::numeric));
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_valor_cotacao_pos CHECK (((valor_cotacao IS NULL) OR (valor_cotacao >= (0)::numeric)));
ALTER TABLE public.grupos_redes ADD CONSTRAINT grupos_redes_nome_check CHECK ((length(TRIM(BOTH FROM nome)) >= 2));
ALTER TABLE public.lancamentos_comissao ADD CONSTRAINT lancamentos_comissao_tipo_check CHECK ((tipo = ANY (ARRAY['credito'::text, 'debito'::text])));
ALTER TABLE public.listas_preco_comissionamento ADD CONSTRAINT lpc_min_le_max CHECK ((desconto_minimo <= desconto_maximo));
ALTER TABLE public.metas_vendedor ADD CONSTRAINT chk_mes_valido CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE public.notificacao ADD CONSTRAINT notificacao_status_check CHECK ((status = ANY (ARRAY['nao_lida'::text, 'lida'::text, 'arquivada'::text])));
ALTER TABLE public.pagamento_acordo_cliente ADD CONSTRAINT pagamento_acordo_cliente_forma_pagamento_check CHECK ((forma_pagamento = ANY (ARRAY['abatimento_em_boleto'::text, 'boleto'::text, 'transferencia'::text])));
ALTER TABLE public.produto ADD CONSTRAINT produto_situacao_check CHECK ((situacao = ANY (ARRAY['Ativo'::text, 'Inativo'::text, 'Excluído'::text])));
ALTER TABLE public.segmento_cliente ADD CONSTRAINT segmento_cliente_nome_check CHECK ((length(TRIM(BOTH FROM nome)) >= 2));
ALTER TABLE public.tipos_veiculo ADD CONSTRAINT tipos_veiculo_nome_check CHECK ((length(TRIM(BOTH FROM nome)) >= 2));
ALTER TABLE public.transportador_logistica ADD CONSTRAINT transportador_logistica_cnpj_digits CHECK ((cnpj ~ '^[0-9]{14}$'::text));
ALTER TABLE public."user" ADD CONSTRAINT user_tipo_check CHECK ((tipo = ANY (ARRAY['backoffice'::text, 'vendedor'::text])));
ALTER TABLE public."user" ADD CONSTRAINT user_permissoes_array_chk CHECK ((jsonb_typeof(permissoes) = 'array'::text));
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT "vendedor_comissão_regra_aplicada_check" CHECK ((regra_aplicada = ANY (ARRAY['aliquota_fixa_vendedor'::text, 'lista_preco_fixa'::text, 'lista_preco_faixas'::text])));
ALTER TABLE public."Condicao_De_Pagamento" ADD CONSTRAINT "Condicao_De_Pagamento_meio_pagamento_fkey" FOREIGN KEY (meio_pagamento) REFERENCES ref_meio_pagamento(ref_pagamento_id);
ALTER TABLE public."Condicao_De_Pagamento" ADD CONSTRAINT "Condicao_De_Pagamento_forma_pagamento_id_fkey" FOREIGN KEY (forma_pagamento_id) REFERENCES ref_forma_pagamento(id);
ALTER TABLE public.cliente ADD CONSTRAINT "cliente_empresaFaturamento_fkey" FOREIGN KEY ("empresaFaturamento") REFERENCES ref_empresas_subsidiarias(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.cliente ADD CONSTRAINT cliente_lista_de_preco_fkey FOREIGN KEY (lista_de_preco) REFERENCES listas_preco(id) ON DELETE SET NULL;
ALTER TABLE public.cliente ADD CONSTRAINT fk_cliente_situacao FOREIGN KEY (ref_situacao_id) REFERENCES ref_situacao(ref_situacao_id);
ALTER TABLE public.cliente ADD CONSTRAINT fk_cliente_criado_por FOREIGN KEY (criado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.cliente ADD CONSTRAINT fk_cliente_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.cliente ADD CONSTRAINT fk_cliente_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.cliente ADD CONSTRAINT cliente_segmento_id_fkey FOREIGN KEY (segmento_id) REFERENCES segmento_cliente(id) ON DELETE SET NULL;
ALTER TABLE public.cliente ADD CONSTRAINT "cliente_ref_tipo_pessoa_id_FK_fkey" FOREIGN KEY ("ref_tipo_pessoa_id_FK") REFERENCES ref_tipo_pessoa(ref_tipo_pessoa_id);
ALTER TABLE public.cliente ADD CONSTRAINT cliente_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES grupos_redes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.cliente_codigo_depara ADD CONSTRAINT cliente_codigo_depara_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE public.cliente_contato ADD CONSTRAINT cliente_contato_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."cliente_endereço" ADD CONSTRAINT "cliente_endereço_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.cliente_historico_alteracoes ADD CONSTRAINT cliente_historico_alteracoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON DELETE CASCADE;
ALTER TABLE public.cliente_vendedores ADD CONSTRAINT cliente_vendedores_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES dados_vendedor(user_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.cliente_vendedores ADD CONSTRAINT cliente_vendedores_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."condições_cliente" ADD CONSTRAINT "condições_cliente_ID_condições_fkey" FOREIGN KEY ("ID_condições") REFERENCES "Condicao_De_Pagamento"("Condição_ID") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public."condições_cliente" ADD CONSTRAINT "condições_cliente_ID_cliente_fkey" FOREIGN KEY ("ID_cliente") REFERENCES cliente(cliente_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.conta_corrente_cliente ADD CONSTRAINT conta_corrente_cliente_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias_conta_corrente(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.conta_corrente_cliente ADD CONSTRAINT conta_corrente_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON DELETE CASCADE;
ALTER TABLE public.conta_corrente_cliente ADD CONSTRAINT conta_corrente_cliente_vendedor_uuid_fkey FOREIGN KEY (vendedor_uuid) REFERENCES dados_vendedor(user_id) ON DELETE SET NULL;
ALTER TABLE public.controle_comissao_periodo ADD CONSTRAINT controle_comissao_periodo_vendedor_uuid_fkey FOREIGN KEY (vendedor_uuid) REFERENCES auth.users(id);
ALTER TABLE public.controle_comissao_periodo ADD CONSTRAINT controle_comissao_periodo_fechado_por_fkey FOREIGN KEY (fechado_por) REFERENCES auth.users(id);
ALTER TABLE public.dados_vendedor ADD CONSTRAINT "dados_vendedor_Comissão_fkey" FOREIGN KEY ("Comissão") REFERENCES dados_comissao("ref_comissão_id");
ALTER TABLE public.dados_vendedor ADD CONSTRAINT fk_dados_vendedor_user_id FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transportadora_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES ref_empresas_subsidiarias(id) ON DELETE RESTRICT;
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transportadora_transportador_id_fkey FOREIGN KEY (transportador_id) REFERENCES transportador_logistica(id) ON DELETE RESTRICT;
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transportadora_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.fatura_transportadora ADD CONSTRAINT fatura_transportadora_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.fatura_transportadora_item ADD CONSTRAINT fatura_transportadora_item_fatura_id_fkey FOREIGN KEY (fatura_id) REFERENCES fatura_transportadora(id) ON DELETE CASCADE;
ALTER TABLE public.fatura_transportadora_item ADD CONSTRAINT fatura_transportadora_item_frete_id_fkey FOREIGN KEY (frete_id) REFERENCES frete_logistica(id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_regiao_destino_id_fkey FOREIGN KEY (regiao_destino_id) REFERENCES regiao_destino(id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES ref_empresas_subsidiarias(id) ON DELETE RESTRICT;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_origem_frete_id_fkey FOREIGN KEY (origem_frete_id) REFERENCES origem_frete(id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_pedido_venda_id_fkey FOREIGN KEY (pedido_venda_id) REFERENCES pedido_venda("pedido_venda_ID") ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_transportador_id_fkey FOREIGN KEY (transportador_id) REFERENCES transportador_logistica(id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica ADD CONSTRAINT frete_logistica_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.frete_logistica_ocorrencia ADD CONSTRAINT frete_logistica_ocorrencia_frete_id_fkey FOREIGN KEY (frete_id) REFERENCES frete_logistica(id) ON DELETE CASCADE;
ALTER TABLE public.lancamentos_comissao ADD CONSTRAINT lancamentos_comissao_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);
ALTER TABLE public.lancamentos_comissao ADD CONSTRAINT lancamentos_comissao_vendedor_uuid_fkey FOREIGN KEY (vendedor_uuid) REFERENCES auth.users(id);
ALTER TABLE public.listas_preco_comissionamento ADD CONSTRAINT fk_listas_preco FOREIGN KEY (lista_preco_id) REFERENCES listas_preco(id) ON DELETE CASCADE;
ALTER TABLE public.metas_vendedor ADD CONSTRAINT fk_metas_vendedor_vendedor_id FOREIGN KEY (vendedor_id) REFERENCES "user"(user_id) ON DELETE CASCADE;
ALTER TABLE public.notificacao ADD CONSTRAINT notificacao_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES "user"(user_id);
ALTER TABLE public.notificacao ADD CONSTRAINT notificacao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES "user"(user_id) ON DELETE CASCADE;
ALTER TABLE public.origem_frete ADD CONSTRAINT origem_frete_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES ref_empresas_subsidiarias(id) ON DELETE RESTRICT;
ALTER TABLE public.pagamento_acordo_cliente ADD CONSTRAINT pagamento_acordo_cliente_forma_pagamento_id_fkey FOREIGN KEY (forma_pagamento_id) REFERENCES ref_forma_pagamento(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.pagamento_acordo_cliente ADD CONSTRAINT pagamento_acordo_cliente_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias_conta_corrente(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.pagamento_acordo_cliente ADD CONSTRAINT pagamento_acordo_cliente_conta_corrente_id_fkey FOREIGN KEY (conta_corrente_id) REFERENCES conta_corrente_cliente(id) ON DELETE CASCADE;
ALTER TABLE public.pagamentos_comissao ADD CONSTRAINT pagamentos_comissao_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES auth.users(id);
ALTER TABLE public.pagamentos_comissao ADD CONSTRAINT pagamentos_comissao_vendedor_uuid_fkey FOREIGN KEY (vendedor_uuid) REFERENCES auth.users(id);
ALTER TABLE public.pedido_venda ADD CONSTRAINT pedido_venda_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE public.pedido_venda ADD CONSTRAINT pedido_venda_lista_preco_id_fkey FOREIGN KEY (lista_preco_id) REFERENCES listas_preco(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.pedido_venda ADD CONSTRAINT fk_pedido_venda_vendedor_uuid FOREIGN KEY (vendedor_uuid) REFERENCES dados_vendedor(user_id) ON DELETE SET NULL;
ALTER TABLE public.pedido_venda ADD CONSTRAINT fk_pedido_venda_created_by FOREIGN KEY (created_by) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.pedido_venda ADD CONSTRAINT pedido_venda_natureza_id_fkey FOREIGN KEY (natureza_id) REFERENCES natureza_operacao(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.pedido_venda_produtos ADD CONSTRAINT fk_pedido_venda_produtos_produto_id FOREIGN KEY (produto_id) REFERENCES produto(produto_id) ON DELETE RESTRICT;
ALTER TABLE public.pedido_venda_produtos ADD CONSTRAINT fk_pedido_venda_produtos_pedido_venda_id FOREIGN KEY (pedido_venda_id) REFERENCES pedido_venda("pedido_venda_ID") ON DELETE CASCADE;
ALTER TABLE public.produto ADD CONSTRAINT produto_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES ref_tipo_produto(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.produto ADD CONSTRAINT produto_ref_permissao_id_fkey FOREIGN KEY (ref_permissao_id) REFERENCES "ref_permissão_produto"(ref_permissao_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.produto ADD CONSTRAINT produto_marca_fkey FOREIGN KEY (marca) REFERENCES marcas(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.produto ADD CONSTRAINT produto_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES ref_unidade_medida(id);
ALTER TABLE public.produto_vendedor ADD CONSTRAINT "produto_vendedor_Id_produto_fkey" FOREIGN KEY ("Id_produto") REFERENCES produto(produto_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.produto_vendedor ADD CONSTRAINT "produto_vendedor_Id_vendedor_fkey" FOREIGN KEY ("Id_vendedor") REFERENCES "user"(user_id);
ALTER TABLE public.produtos_listas_precos ADD CONSTRAINT produtos_listas_precos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produto(produto_id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.produtos_listas_precos ADD CONSTRAINT produtos_listas_precos_lista_preco_id_fkey FOREIGN KEY (lista_preco_id) REFERENCES listas_preco(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.tiny_empresa_natureza_operacao ADD CONSTRAINT tiny_empresa_natureza_operacao_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES ref_empresas_subsidiarias(id);
ALTER TABLE public.tiny_empresa_natureza_operacao ADD CONSTRAINT tiny_empresa_natureza_operacao_natureza_operacao_id_fkey FOREIGN KEY (natureza_operacao_id) REFERENCES natureza_operacao(id);
ALTER TABLE public.transportador_logistica ADD CONSTRAINT transportador_logistica_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public.transportador_logistica ADD CONSTRAINT transportador_logistica_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public."user" ADD CONSTRAINT user_ref_user_role_id_fkey FOREIGN KEY (ref_user_role_id) REFERENCES ref_user_role(ref_user_role_id);
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT fk_vendedor_comissao_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id) ON DELETE SET NULL;
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT fk_vendedor_comissao_editado_por FOREIGN KEY (editado_por) REFERENCES "user"(user_id) ON DELETE SET NULL;
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT "vendedor_comissão_vendedor_uuid_fkey" FOREIGN KEY (vendedor_uuid) REFERENCES dados_vendedor(user_id);
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT fk_vendedor_comissao_lista_preco_id FOREIGN KEY (lista_preco_id) REFERENCES listas_preco(id) ON DELETE SET NULL;
ALTER TABLE public."vendedor_comissão" ADD CONSTRAINT "vendedor_comissão_pedido_id_fkey" FOREIGN KEY (pedido_id) REFERENCES pedido_venda("pedido_venda_ID");

-- ========== INDEXES (não-constraint) (99) ==========

CREATE UNIQUE INDEX idx_grupos_redes_nome_unique ON public.grupos_redes USING btree (lower(TRIM(BOTH FROM nome))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_grupos_redes_ativo ON public.grupos_redes USING btree (ativo) WHERE ((deleted_at IS NULL) AND (ativo = true));
CREATE INDEX idx_grupos_redes_created_at ON public.grupos_redes USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_tipos_veiculo_nome_unique ON public.tipos_veiculo USING btree (lower(TRIM(BOTH FROM nome))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tipos_veiculo_ativo ON public.tipos_veiculo USING btree (ativo) WHERE ((deleted_at IS NULL) AND (ativo = true));
CREATE INDEX idx_tipos_veiculo_created_at ON public.tipos_veiculo USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_natureza_operacao_ativo ON public.natureza_operacao USING btree (ativo) WHERE ((deleted_at IS NULL) AND (ativo = true));
CREATE INDEX idx_natureza_operacao_codigo ON public.natureza_operacao USING btree (codigo) WHERE ((deleted_at IS NULL) AND (codigo IS NOT NULL));
CREATE INDEX idx_lpc_lista_min_max ON public.listas_preco_comissionamento USING btree (lista_preco_id, desconto_minimo, desconto_maximo);
CREATE UNIQUE INDEX idx_categorias_conta_corrente_nome_unique ON public.categorias_conta_corrente USING btree (lower(TRIM(BOTH FROM nome))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_categorias_conta_corrente_ativo ON public.categorias_conta_corrente USING btree (ativo) WHERE ((deleted_at IS NULL) AND (ativo = true));
CREATE INDEX idx_categorias_conta_corrente_created_at ON public.categorias_conta_corrente USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_metas_vendedor_ano ON public.metas_vendedor USING btree (ano DESC);
CREATE INDEX idx_metas_vendedor_vendedor_ano ON public.metas_vendedor USING btree (vendedor_id, ano DESC);
CREATE INDEX idx_metas_vendedor_data_criacao ON public.metas_vendedor USING btree (data_criacao);
CREATE UNIQUE INDEX idx_metas_vendedor_unique_periodo ON public.metas_vendedor USING btree (vendedor_id, ano, mes);
CREATE UNIQUE INDEX idx_ref_empresas_subsidiarias_cnpj_unique ON public.ref_empresas_subsidiarias USING btree (regexp_replace(TRIM(BOTH FROM COALESCE(cnpj, ''::text)), '\D'::text, ''::text, 'g'::text)) WHERE ((deleted_at IS NULL) AND (cnpj IS NOT NULL) AND (TRIM(BOTH FROM cnpj) <> ''::text));
CREATE INDEX idx_ref_empresas_subsidiarias_ativo ON public.ref_empresas_subsidiarias USING btree (ativo) WHERE ((deleted_at IS NULL) AND (ativo = true));
CREATE INDEX idx_ref_empresas_subsidiarias_created_at ON public.ref_empresas_subsidiarias USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_user_email ON public."user" USING btree (email) WHERE (email IS NOT NULL);
CREATE INDEX idx_user_tipo ON public."user" USING btree (tipo) WHERE (tipo IS NOT NULL);
CREATE INDEX idx_user_ativo ON public."user" USING btree (ativo) WHERE (ativo = true);
CREATE INDEX idx_user_tipo_ativo ON public."user" USING btree (tipo, ativo) WHERE (ativo = true);
CREATE INDEX idx_user_created_at ON public."user" USING btree (data_cadastro DESC);
CREATE INDEX idx_user_deleted_at ON public."user" USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_conta_corrente_cliente_id ON public.conta_corrente_cliente USING btree (cliente_id);
CREATE INDEX idx_conta_corrente_data ON public.conta_corrente_cliente USING btree (data);
CREATE INDEX idx_conta_corrente_tipo ON public.conta_corrente_cliente USING btree (tipo_compromisso);
CREATE INDEX idx_conta_corrente_vendedor ON public.conta_corrente_cliente USING btree (vendedor_uuid);
CREATE INDEX idx_lancamentos_comissao_vendedor ON public.lancamentos_comissao USING btree (vendedor_uuid);
CREATE INDEX idx_lancamentos_comissao_periodo ON public.lancamentos_comissao USING btree (periodo);
CREATE INDEX idx_pagamento_acordo_conta_corrente_id ON public.pagamento_acordo_cliente USING btree (conta_corrente_id);
CREATE INDEX idx_pagamento_acordo_data ON public.pagamento_acordo_cliente USING btree (data_pagamento);
CREATE INDEX idx_dados_vendedor_status ON public.dados_vendedor USING btree (status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_dados_vendedor_codigo_sequencial ON public.dados_vendedor USING btree (codigo_sequencial) WHERE (deleted_at IS NULL);
CREATE INDEX idx_dados_vendedor_created_at ON public.dados_vendedor USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_dados_vendedor_email ON public.dados_vendedor USING btree (email) WHERE (deleted_at IS NULL);
CREATE INDEX idx_dados_vendedor_updated_at ON public.dados_vendedor USING btree (updated_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_created_at ON public.produto USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_codigo_sku ON public.produto USING btree (codigo_sku) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_marca ON public.produto USING btree (marca) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_tipo_id ON public.produto USING btree (tipo_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_situacao ON public.produto USING btree (situacao) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_disponivel ON public.produto USING btree (disponivel) WHERE (deleted_at IS NULL);
CREATE INDEX idx_produto_marca_tipo_disponivel ON public.produto USING btree (marca, tipo_id, disponivel) WHERE ((deleted_at IS NULL) AND (disponivel = true));
CREATE INDEX idx_produto_updated_at ON public.produto USING btree (updated_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pagamentos_comissao_periodo ON public.pagamentos_comissao USING btree (periodo);
CREATE INDEX idx_pagamentos_comissao_vendedor ON public.pagamentos_comissao USING btree (vendedor_uuid);
CREATE UNIQUE INDEX idx_segmento_cliente_nome_unique ON public.segmento_cliente USING btree (lower(TRIM(BOTH FROM nome))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_segmento_cliente_ativo ON public.segmento_cliente USING btree (ativo) WHERE ((deleted_at IS NULL) AND (ativo = true));
CREATE INDEX idx_segmento_cliente_created_at ON public.segmento_cliente USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_tiny_empresa_natureza_operacao_empresa_natureza ON public.tiny_empresa_natureza_operacao USING btree (empresa_id, natureza_operacao_id);
CREATE INDEX idx_tiny_empresa_natureza_operacao_empresa_id ON public.tiny_empresa_natureza_operacao USING btree (empresa_id);
CREATE INDEX idx_tiny_empresa_natureza_operacao_natureza_operacao_id ON public.tiny_empresa_natureza_operacao USING btree (natureza_operacao_id);
CREATE INDEX idx_pedido_venda_vendedor_uuid ON public.pedido_venda USING btree (vendedor_uuid) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_cliente_id ON public.pedido_venda USING btree (cliente_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_data_venda ON public.pedido_venda USING btree (data_venda DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_status ON public.pedido_venda USING btree (status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_created_by ON public.pedido_venda USING btree (created_by) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_vendedor_data ON public.pedido_venda USING btree (vendedor_uuid, data_venda DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_cliente_data ON public.pedido_venda USING btree (cliente_id, data_venda DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pedido_venda_lista_preco_id ON public.pedido_venda USING btree (lista_preco_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_controle_comissao_periodo_vendedor ON public.controle_comissao_periodo USING btree (vendedor_uuid);
CREATE INDEX idx_controle_comissao_periodo_periodo ON public.controle_comissao_periodo USING btree (periodo);
CREATE INDEX idx_vendedor_comissao_vendedor_uuid ON public."vendedor_comissão" USING btree (vendedor_uuid);
CREATE INDEX idx_vendedor_comissao_periodo ON public."vendedor_comissão" USING btree (periodo) WHERE (periodo IS NOT NULL);
CREATE INDEX idx_vendedor_comissao_pedido_id ON public."vendedor_comissão" USING btree (pedido_id) WHERE (pedido_id IS NOT NULL);
CREATE INDEX idx_vendedor_comissao_cliente_id ON public."vendedor_comissão" USING btree (cliente_id) WHERE (cliente_id IS NOT NULL);
CREATE INDEX idx_vendedor_comissao_vendedor_periodo ON public."vendedor_comissão" USING btree (vendedor_uuid, periodo) WHERE (periodo IS NOT NULL);
CREATE INDEX idx_vendedor_comissao_data_inicio ON public."vendedor_comissão" USING btree (data_inicio DESC) WHERE (data_inicio IS NOT NULL);
CREATE INDEX idx_pedido_venda_produtos_pedido_numero ON public.pedido_venda_produtos USING btree (pedido_venda_id, numero) WHERE (numero IS NOT NULL);
CREATE INDEX idx_pedido_venda_produtos_produto_id ON public.pedido_venda_produtos USING btree (produto_id);
CREATE INDEX idx_cliente_created_at ON public.cliente USING btree (created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_cpf_cnpj ON public.cliente USING btree (cpf_cnpj) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_codigo_sequencial ON public.cliente USING btree (codigo_sequencial) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_status_aprovacao ON public.cliente USING btree (status_aprovacao) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_criado_por ON public.cliente USING btree (criado_por) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_situacao_deleted ON public.cliente USING btree (ref_situacao_id, deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_situacao ON public.cliente USING btree (ref_situacao_id);
CREATE INDEX idx_cliente_updated_at ON public.cliente USING btree (updated_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_cliente_segmento_id ON public.cliente USING btree (segmento_id) WHERE ((deleted_at IS NULL) AND (segmento_id IS NOT NULL));
CREATE INDEX idx_cliente_codigo_origem ON public.cliente USING btree (codigo_origem);
CREATE INDEX idx_cliente_codigo_tiny_externo ON public.cliente USING btree (codigo_tiny_id_externo) WHERE (codigo_tiny_id_externo IS NOT NULL);
CREATE INDEX idx_notificacao_usuario_data ON public.notificacao USING btree (usuario_id, data_criacao DESC);
CREATE INDEX idx_notificacao_usuario_status ON public.notificacao USING btree (usuario_id, status);
CREATE INDEX idx_cliente_historico_alteracoes_cliente_data ON public.cliente_historico_alteracoes USING btree (cliente_id, data_hora DESC);
CREATE INDEX idx_transportador_logistica_cnpj ON public.transportador_logistica USING btree (cnpj) WHERE (deleted_at IS NULL);
CREATE INDEX idx_transportador_logistica_grupo ON public.transportador_logistica USING btree (grupo) WHERE ((ativo = true) AND (deleted_at IS NULL));
CREATE INDEX idx_origem_frete_empresa ON public.origem_frete USING btree (empresa_id) WHERE (ativo = true);
CREATE INDEX idx_frete_logistica_nfe_numero ON public.frete_logistica USING btree (nfe_numero) WHERE (deleted_at IS NULL);
CREATE INDEX idx_frete_logistica_chave_acesso ON public.frete_logistica USING btree (nfe_chave_acesso) WHERE (deleted_at IS NULL);
CREATE INDEX idx_frete_logistica_empresa ON public.frete_logistica USING btree (empresa_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_frete_logistica_status ON public.frete_logistica USING btree (status_entrega) WHERE (deleted_at IS NULL);
CREATE INDEX idx_frete_logistica_pedido_venda ON public.frete_logistica USING btree (pedido_venda_id) WHERE ((pedido_venda_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uq_frete_logistica_empresa_nfe ON public.frete_logistica USING btree (empresa_id, nfe_numero) WHERE ((nfe_numero IS NOT NULL) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uq_frete_logistica_chave_acesso ON public.frete_logistica USING btree (nfe_chave_acesso) WHERE ((nfe_chave_acesso IS NOT NULL) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uq_frete_logistica_pedido_venda ON public.frete_logistica USING btree (pedido_venda_id) WHERE ((pedido_venda_id IS NOT NULL) AND (deleted_at IS NULL));
CREATE INDEX idx_fatura_item_frete ON public.fatura_transportadora_item USING btree (frete_id) WHERE (frete_id IS NOT NULL);
CREATE INDEX idx_frete_ocorrencia_frete ON public.frete_logistica_ocorrencia USING btree (frete_id);

-- ========== RLS ENABLE (54) ==========

ALTER TABLE public."Condicao_De_Pagamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_conta_corrente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_contato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cliente_endereço" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."condições_cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conta_corrente_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_associados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_comissao_periodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalhes_pedido_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_transportadora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fatura_transportadora_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frete_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frete_logistica_ocorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_redes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_preco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_preco_comissionamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natureza_operacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origem_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamento_acordo_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_venda_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_listas_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_empresas_subsidiarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_forma_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_formar_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_formas_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_intermediadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_meio_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_origem_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_pagador_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ref_permissão_produto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_situacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_tipo_embalagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ref_tipo_endereço" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_tipo_pessoa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regiao_destino ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_veiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportador_logistica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportador_pedido_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vendedor_comissão" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendedores_cliente ENABLE ROW LEVEL SECURITY;

-- ========== POLICIES (130) ==========

CREATE POLICY "Teste" ON public."Condicao_De_Pagamento" AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY allow_all ON public."Condicao_De_Pagamento" AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can insert categorias_conta_corrente" ON public.categorias_conta_corrente AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can select categorias_conta_corrente" ON public.categorias_conta_corrente AS PERMISSIVE FOR SELECT TO authenticated USING ((deleted_at IS NULL));
CREATE POLICY "Authenticated can update categorias_conta_corrente" ON public.categorias_conta_corrente AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access categorias_conta_corrente" ON public.categorias_conta_corrente AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.cliente AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY clientes_insert_vendedor_or_backoffice ON public.cliente AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((is_user_backoffice(auth.uid()) AND (status_aprovacao = ANY (ARRAY['aprovado'::text, 'pendente'::text]))) OR ((status_aprovacao = 'pendente'::text) AND (criado_por = auth.uid()))));
CREATE POLICY clientes_select_assigned_or_backoffice ON public.cliente AS PERMISSIVE FOR SELECT TO authenticated USING (((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM cliente_vendedores
  WHERE ((cliente_vendedores.cliente_id = cliente.cliente_id) AND (cliente_vendedores.vendedor_id = auth.uid())))) OR ((criado_por = auth.uid()) AND (status_aprovacao = 'pendente'::text))) AND (deleted_at IS NULL)));
CREATE POLICY clientes_update_assigned_or_backoffice ON public.cliente AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM cliente_vendedores
  WHERE ((cliente_vendedores.cliente_id = cliente.cliente_id) AND (cliente_vendedores.vendedor_id = auth.uid())))) OR ((criado_por = auth.uid()) AND (status_aprovacao = 'pendente'::text)))) WITH CHECK ((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM cliente_vendedores
  WHERE ((cliente_vendedores.cliente_id = cliente.cliente_id) AND (cliente_vendedores.vendedor_id = auth.uid())))) OR ((criado_por = auth.uid()) AND (status_aprovacao = 'pendente'::text))));
CREATE POLICY service_role_bypass_cliente ON public.cliente AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to insert cliente_contato" ON public.cliente_contato AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update cliente_contato" ON public.cliente_contato AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to cliente_contato" ON public.cliente_contato AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.cliente_contato AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY cliente_contato_select_assigned_or_backoffice ON public.cliente_contato AS PERMISSIVE FOR SELECT TO authenticated USING ((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM cliente_vendedores
  WHERE ((cliente_vendedores.cliente_id = cliente_contato.cliente_id) AND (cliente_vendedores.vendedor_id = auth.uid()))))));
CREATE POLICY "Allow authenticated users to insert cliente_endereco" ON public."cliente_endereço" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update cliente_endereco" ON public."cliente_endereço" AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to cliente_endereco" ON public."cliente_endereço" AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY cliente_endereco_select_assigned_or_backoffice ON public."cliente_endereço" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM cliente c
  WHERE ((c.cliente_id = "cliente_endereço".cliente_id) AND (c.deleted_at IS NULL) AND ((auth.uid() = ANY (c.vendedoresatribuidos)) OR ((c.criado_por = auth.uid()) AND (c.status_aprovacao = 'pendente'::text)))))) OR (EXISTS ( SELECT 1
   FROM cliente_vendedores cv
  WHERE ((cv.cliente_id = "cliente_endereço".cliente_id) AND (cv.vendedor_id = auth.uid()))))));
CREATE POLICY allow_all ON public.cliente_vendedores AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public."condições_cliente" AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY conta_corrente_cliente_all_access ON public.conta_corrente_cliente AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY conta_corrente_cliente_delete_policy ON public.conta_corrente_cliente AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY conta_corrente_cliente_insert_policy ON public.conta_corrente_cliente AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY conta_corrente_cliente_select_policy ON public.conta_corrente_cliente AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY conta_corrente_cliente_service_role_access ON public.conta_corrente_cliente AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY conta_corrente_cliente_update_policy ON public.conta_corrente_cliente AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY conta_corrente_select_assigned_or_backoffice ON public.conta_corrente_cliente AS PERMISSIVE FOR SELECT TO authenticated USING ((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM cliente_vendedores
  WHERE ((cliente_vendedores.cliente_id = conta_corrente_cliente.cliente_id) AND (cliente_vendedores.vendedor_id = auth.uid())))) OR (vendedor_uuid = auth.uid())));
CREATE POLICY allow_all ON public.contatos_associados AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "Backoffice pode gerenciar controle de periodos" ON public.controle_comissao_periodo AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".user_id = auth.uid()) AND ("user".tipo = 'backoffice'::text)))));
CREATE POLICY "Vendedores podem ver seus status de periodo" ON public.controle_comissao_periodo AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = vendedor_uuid));
CREATE POLICY allow_all ON public.dados_comissao AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.dados_vendedor AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY service_role_bypass_vendedor ON public.dados_vendedor AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY vendedores_insert_backoffice ON public.dados_vendedor AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_user_backoffice(auth.uid()));
CREATE POLICY vendedores_select_own_or_backoffice ON public.dados_vendedor AS PERMISSIVE FOR SELECT TO authenticated USING ((((user_id = auth.uid()) OR is_user_backoffice(auth.uid())) AND (deleted_at IS NULL)));
CREATE POLICY vendedores_update_own_or_backoffice ON public.dados_vendedor AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR is_user_backoffice(auth.uid()))) WITH CHECK (((user_id = auth.uid()) OR is_user_backoffice(auth.uid())));
CREATE POLICY allow_all ON public.detalhes_pedido_venda AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY fatura_transportadora_select_authenticated ON public.fatura_transportadora AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY fatura_transportadora_item_select_authenticated ON public.fatura_transportadora_item AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY frete_logistica_select_authenticated ON public.frete_logistica AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY frete_logistica_ocorrencia_select_authenticated ON public.frete_logistica_ocorrencia AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert grupos_redes" ON public.grupos_redes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can select grupos_redes" ON public.grupos_redes AS PERMISSIVE FOR SELECT TO authenticated USING ((deleted_at IS NULL));
CREATE POLICY "Authenticated can update grupos_redes" ON public.grupos_redes AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access grupos_redes" ON public.grupos_redes AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Apenas Backoffice pode criar lancamentos" ON public.lancamentos_comissao AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".user_id = auth.uid()) AND ("user".tipo = 'backoffice'::text)))));
CREATE POLICY "Backoffice pode ver todos lancamentos" ON public.lancamentos_comissao AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".user_id = auth.uid()) AND ("user".tipo = 'backoffice'::text)))));
CREATE POLICY "Vendedores podem ver seus proprios lancamentos" ON public.lancamentos_comissao AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = vendedor_uuid));
CREATE POLICY allow_all ON public.listas_preco AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.listas_preco_comissionamento AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can delete metas_vendedor" ON public.metas_vendedor AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u.user_id = auth.uid()) AND (u.tipo = 'backoffice'::text) AND (u.ativo = true) AND (u.deleted_at IS NULL)))));
CREATE POLICY "Authenticated can insert metas_vendedor" ON public.metas_vendedor AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u.user_id = auth.uid()) AND (u.tipo = 'backoffice'::text) AND (u.ativo = true) AND (u.deleted_at IS NULL)))));
CREATE POLICY "Authenticated can update metas_vendedor" ON public.metas_vendedor AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u.user_id = auth.uid()) AND (u.tipo = 'backoffice'::text) AND (u.ativo = true) AND (u.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "user" u
  WHERE ((u.user_id = auth.uid()) AND (u.tipo = 'backoffice'::text) AND (u.ativo = true) AND (u.deleted_at IS NULL)))));
CREATE POLICY "Service role full access metas_vendedor" ON public.metas_vendedor AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY metas_modify_backoffice ON public.metas_vendedor AS PERMISSIVE FOR ALL TO authenticated USING (is_user_backoffice(auth.uid())) WITH CHECK (is_user_backoffice(auth.uid()));
CREATE POLICY metas_select_own_or_backoffice ON public.metas_vendedor AS PERMISSIVE FOR SELECT TO authenticated USING ((is_user_backoffice(auth.uid()) OR (vendedor_id = auth.uid())));
CREATE POLICY service_role_bypass_metas ON public.metas_vendedor AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.natureza_operacao AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY notificacao_select_own ON public.notificacao AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = usuario_id));
CREATE POLICY notificacao_update_own ON public.notificacao AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = usuario_id)) WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY origem_frete_select_authenticated ON public.origem_frete AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY pagamento_acordo_cliente_all_access ON public.pagamento_acordo_cliente AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY pagamento_acordo_cliente_delete_policy ON public.pagamento_acordo_cliente AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY pagamento_acordo_cliente_insert_policy ON public.pagamento_acordo_cliente AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pagamento_acordo_cliente_select_policy ON public.pagamento_acordo_cliente AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY pagamento_acordo_cliente_service_role_access ON public.pagamento_acordo_cliente AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pagamento_acordo_cliente_update_policy ON public.pagamento_acordo_cliente AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Apenas Backoffice pode registrar pagamentos" ON public.pagamentos_comissao AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".user_id = auth.uid()) AND ("user".tipo = 'backoffice'::text)))));
CREATE POLICY "Backoffice pode ver todos pagamentos" ON public.pagamentos_comissao AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".user_id = auth.uid()) AND ("user".tipo = 'backoffice'::text)))));
CREATE POLICY "Vendedores podem ver seus proprios pagamentos" ON public.pagamentos_comissao AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = vendedor_uuid));
CREATE POLICY allow_all ON public.pedido_venda AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY pedidos_insert_own_or_backoffice ON public.pedido_venda AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_user_backoffice(auth.uid()) OR (vendedor_uuid = auth.uid())));
CREATE POLICY pedidos_select_own_or_backoffice ON public.pedido_venda AS PERMISSIVE FOR SELECT TO authenticated USING (((is_user_backoffice(auth.uid()) OR (vendedor_uuid = auth.uid())) AND (deleted_at IS NULL)));
CREATE POLICY pedidos_update_own_or_backoffice ON public.pedido_venda AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_user_backoffice(auth.uid()) OR (vendedor_uuid = auth.uid()))) WITH CHECK ((is_user_backoffice(auth.uid()) OR (vendedor_uuid = auth.uid())));
CREATE POLICY service_role_bypass_pedido ON public.pedido_venda AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert pedido_venda_produtos" ON public.pedido_venda_produtos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pedido_venda_produtos" ON public.pedido_venda_produtos AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to pedido_venda_produtos" ON public.pedido_venda_produtos AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.pedido_venda_produtos AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY pedido_produtos_select_own_or_backoffice ON public.pedido_venda_produtos AS PERMISSIVE FOR SELECT TO authenticated USING ((is_user_backoffice(auth.uid()) OR (EXISTS ( SELECT 1
   FROM pedido_venda
  WHERE ((pedido_venda_produtos.pedido_venda_id = pedido_venda_produtos.pedido_venda_id) AND (pedido_venda.vendedor_uuid = auth.uid()))))));
CREATE POLICY allow_all ON public.produto AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY produtos_modify_backoffice ON public.produto AS PERMISSIVE FOR ALL TO authenticated USING (is_user_backoffice(auth.uid())) WITH CHECK (is_user_backoffice(auth.uid()));
CREATE POLICY produtos_select_available ON public.produto AS PERMISSIVE FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((disponivel = true) OR is_user_backoffice(auth.uid()))));
CREATE POLICY service_role_bypass_produto ON public.produto AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.produto_backup AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.produto_vendedor AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.produtos_listas_precos AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can select ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias AS PERMISSIVE FOR SELECT TO authenticated USING ((deleted_at IS NULL));
CREATE POLICY "Authenticated can update ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ref_empresas_subsidiarias" ON public.ref_empresas_subsidiarias AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.ref_empresas_subsidiarias AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_forma_pagamento AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_formar_frete AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_formas_envio AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY test ON public.ref_formas_envio AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY allow_all ON public.ref_intermediadores AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_meio_pagamento AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY test ON public.ref_meio_pagamento AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY allow_all ON public.ref_origem_produto AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_pagador_frete AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public."ref_permissão_produto" AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anonymous to read ref_situacao" ON public.ref_situacao AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated users to read ref_situacao" ON public.ref_situacao AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role has full access to ref_situacao" ON public.ref_situacao AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.ref_tipo_embalagem AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public."ref_tipo_endereço" AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_tipo_pessoa AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_unidade AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public.ref_user_role AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY regiao_destino_select_authenticated ON public.regiao_destino AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tipos_veiculo" ON public.tipos_veiculo AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can select tipos_veiculo" ON public.tipos_veiculo AS PERMISSIVE FOR SELECT TO authenticated USING ((deleted_at IS NULL));
CREATE POLICY "Authenticated can update tipos_veiculo" ON public.tipos_veiculo AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access tipos_veiculo" ON public.tipos_veiculo AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY transportador_logistica_select_authenticated ON public.transportador_logistica AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY allow_all ON public.transportador_pedido_venda AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY allow_all ON public."user" AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY service_role_bypass_user ON public."user" AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY users_insert_backoffice ON public."user" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_user_backoffice(auth.uid()));
CREATE POLICY users_select_own_or_backoffice ON public."user" AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR is_user_backoffice(auth.uid())));
CREATE POLICY users_update_own ON public."user" AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Enable insert for authenticated users" ON public."vendedor_comissão" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY allow_all ON public."vendedor_comissão" AS PERMISSIVE FOR ALL TO authenticated USING (true);
CREATE POLICY comissoes_modify_backoffice ON public."vendedor_comissão" AS PERMISSIVE FOR ALL TO authenticated USING (is_user_backoffice(auth.uid())) WITH CHECK (is_user_backoffice(auth.uid()));
CREATE POLICY comissoes_select_own_or_backoffice ON public."vendedor_comissão" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_user_backoffice(auth.uid()) OR (vendedor_uuid = auth.uid())));
CREATE POLICY service_role_bypass_comissao ON public."vendedor_comissão" AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.vendedores_cliente AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- ========== TRIGGERS (dependem das funções da migration 117) (12) ==========

CREATE TRIGGER trg_cliente_historico_alteracoes AFTER UPDATE ON public.cliente FOR EACH ROW EXECUTE FUNCTION registrar_log_alteracao_cliente();
CREATE TRIGGER trg_enforce_cliente_codigo_unique_v2 BEFORE INSERT OR UPDATE OF codigo ON public.cliente FOR EACH ROW EXECUTE FUNCTION enforce_cliente_codigo_unique_v2();
CREATE TRIGGER trg_cliente_contato_historico_alteracoes AFTER INSERT OR DELETE OR UPDATE ON public.cliente_contato FOR EACH ROW EXECUTE FUNCTION registrar_log_alteracao_cliente_auxiliar();
CREATE TRIGGER trg_cliente_endereco_historico_alteracoes AFTER INSERT OR DELETE OR UPDATE ON public."cliente_endereço" FOR EACH ROW EXECUTE FUNCTION registrar_log_alteracao_cliente_auxiliar();
CREATE TRIGGER trg_condicoes_cliente_historico_alteracoes AFTER INSERT OR DELETE OR UPDATE ON public."condições_cliente" FOR EACH ROW EXECUTE FUNCTION registrar_log_alteracao_cliente_auxiliar();
CREATE TRIGGER after_insert_delete_zero_discount AFTER INSERT ON public.listas_preco_comissionamento FOR EACH ROW EXECUTE FUNCTION delete_zero_discount_rows();
CREATE TRIGGER pedido_venda_au_generate_comissao AFTER UPDATE OF valor_total ON public.pedido_venda FOR EACH ROW WHEN (((new.valor_total IS DISTINCT FROM old.valor_total) AND (new.valor_total > (0)::double precision))) EXECUTE FUNCTION tg_pedido_venda_generate_comissao();
CREATE TRIGGER trg_comissao_on_faturado AFTER UPDATE OF status ON public.pedido_venda FOR EACH ROW WHEN ((new.status = 'Faturado'::text)) EXECUTE FUNCTION trigger_comissao_faturado();
CREATE TRIGGER trg_fill_pedido_venda_lookup_ids BEFORE INSERT ON public.pedido_venda FOR EACH ROW EXECUTE FUNCTION fill_pedido_venda_lookup_ids();
CREATE TRIGGER trg_fill_pedido_venda_produtos_snapshot_fields BEFORE INSERT ON public.pedido_venda_produtos FOR EACH ROW EXECUTE FUNCTION fill_pedido_venda_produtos_snapshot_fields();
CREATE TRIGGER update_ref_forma_pagamento_updated_at BEFORE UPDATE ON public.ref_forma_pagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_preencher_cliente_nome_vendedor_comissao BEFORE INSERT ON public."vendedor_comissão" FOR EACH ROW EXECUTE FUNCTION preencher_cliente_nome_vendedor_comissao();
