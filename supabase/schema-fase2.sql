-- =====================================================================
--  FASE 2 — Projetos, ambientes e seleção. Roda DEPOIS do schema.sql.
--  Modelo: organização única. Todo usuário autenticado vê os projetos.
--  (Para permissões por papel, trocar as policies por checagem de role.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Projetos
-- ---------------------------------------------------------------------
create table projetos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  codigo        text unique,
  local         text,
  cliente       text,
  revisao       text default 'R00',
  -- condições de projeto (NBR 16401-1/-2)
  text_bs       numeric(5,2) default 34,
  ur_ext        numeric(5,2) default 60,
  t_int         numeric(5,2) default 24,
  ur_int        numeric(5,2) default 50,
  altitude_m    numeric(7,1) default 760,
  status        text not null default 'rascunho'
                check (status in ('rascunho','calculado','memorial_gerado','concluido')),
  criado_por    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_proj_updated before update on projetos
  for each row execute function set_updated_at();
create index idx_proj_status on projetos(status);

-- ---------------------------------------------------------------------
-- UEs do projeto (instância)
-- ---------------------------------------------------------------------
create table projeto_ue (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references projetos(id) on delete cascade,
  equipamento_ue uuid references equipamentos_ue(id),
  tag            text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (projeto_id, tag)
);
create trigger trg_pue_updated before update on projeto_ue
  for each row execute function set_updated_at();
create index idx_pue_projeto on projeto_ue(projeto_id);

-- ---------------------------------------------------------------------
-- Ambientes: entradas do cálculo + resultados persistidos
-- ---------------------------------------------------------------------
create table projeto_ambientes (
  id                uuid primary key default gen_random_uuid(),
  projeto_id        uuid not null references projetos(id) on delete cascade,
  projeto_ue_id     uuid references projeto_ue(id) on delete set null,
  equipamento_ui    uuid references equipamentos_ui(id),

  tag               text not null,
  nome              text not null,

  -- entradas do memorial
  area_m2           numeric(8,2),
  pe_direito_m      numeric(5,2) default 2.8,
  n_pessoas         integer default 0,
  atividade         text default 'atividade_moderada',
  categoria         text default 'residencia',
  iluminacao_wm2    numeric(6,2) default 10,
  equipamentos_w    numeric(8,1) default 0,
  parede_ext_m2     numeric(8,2) default 0,
  orientacao        text default 'S' check (orientacao in ('N','L','S','O')),
  vidro_m2          numeric(8,2) default 0,
  cobertura_exposta boolean default false,

  -- origem da área: manual | dwg | pdf  (rastreabilidade)
  origem_area       text default 'manual' check (origem_area in ('manual','dwg','pdf')),
  area_cad_m2       numeric(8,2),   -- quando veio do CAD, guarda p/ comparar

  -- resultados (persistidos após o cálculo)
  carga_sensivel_w  numeric(10,1),
  carga_latente_w   numeric(10,1),
  carga_total_btu   integer,
  fcs               numeric(4,3),
  wm2               numeric(6,1),
  vazao_ar_ls       numeric(7,1),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (projeto_id, tag)
);
create trigger trg_amb_updated before update on projeto_ambientes
  for each row execute function set_updated_at();
create index idx_amb_projeto on projeto_ambientes(projeto_id);
create index idx_amb_ue on projeto_ambientes(projeto_ue_id);

-- ---------------------------------------------------------------------
-- View de balanço (taxa de conexão) — reaproveitada pelas telas e relatórios
-- ---------------------------------------------------------------------
create or replace view vw_balanco_ue as
select
  pue.projeto_id, pue.id as projeto_ue_id, pue.tag as ue_tag,
  eue.modelo as ue_modelo, eue.cap_refrig_btu as ue_cap_btu,
  eue.max_ui_conectaveis, eue.taxa_conexao_max_pct,
  count(pa.id) as qtd_ui,
  coalesce(sum(eui.cap_refrig_btu),0) as soma_ui_btu,
  round(100.0*coalesce(sum(eui.cap_refrig_btu),0)/nullif(eue.cap_refrig_btu,0),1) as taxa_real_pct
from projeto_ue pue
join equipamentos_ue eue on eue.id = pue.equipamento_ue
left join projeto_ambientes pa on pa.projeto_ue_id = pue.id
left join equipamentos_ui eui on eui.id = pa.equipamento_ui
group by pue.projeto_id, pue.id, pue.tag, eue.modelo, eue.cap_refrig_btu,
         eue.max_ui_conectaveis, eue.taxa_conexao_max_pct;

-- ---------------------------------------------------------------------
-- RLS — autenticado lê/escreve (organização única)
-- ---------------------------------------------------------------------
alter table projetos          enable row level security;
alter table projeto_ue        enable row level security;
alter table projeto_ambientes enable row level security;
create policy "auth_proj" on projetos          for all to authenticated using (true) with check (true);
create policy "auth_pue"  on projeto_ue        for all to authenticated using (true) with check (true);
create policy "auth_amb"  on projeto_ambientes for all to authenticated using (true) with check (true);
