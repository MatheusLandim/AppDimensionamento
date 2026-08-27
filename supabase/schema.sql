-- =====================================================================
--  CATÁLOGO DE EQUIPAMENTOS — schema standalone (Fase 1)
--  Alvo: Supabase (PostgreSQL) — projeto NOVO, isolado.
--  Só catálogo. Tabelas de projeto/memorial entram na Fase 2.
-- =====================================================================

create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Unidades externas (condensadoras)
-- ---------------------------------------------------------------------
create table equipamentos_ue (
  id                       uuid primary key default gen_random_uuid(),
  fabricante               text not null check (fabricante in ('Daikin','LG','Outro')),
  linha                    text,
  modelo                   text not null,

  cap_refrig_btu           integer not null,
  cap_refrig_kw            numeric(6,2),
  cap_aquec_btu            integer,

  max_ui_conectaveis       integer,
  taxa_conexao_min_pct     numeric(5,1),
  taxa_conexao_max_pct     numeric(5,1),

  fluido_refrig            text check (fluido_refrig in ('R410A','R32','R454B','Outro')),
  carga_gas_fabrica_kg     numeric(6,2),

  tensao_v                 integer,
  fases                    integer,
  frequencia_hz            integer default 60,
  corrente_max_a           numeric(6,2),
  disjuntor_recomendado_a  numeric(6,2),
  potencia_nominal_kw      numeric(6,2),

  diam_tubo_liquido_mm     numeric(5,2),
  diam_tubo_gas_mm         numeric(5,2),
  comprimento_max_tub_m    numeric(6,1),
  comprimento_total_max_m  numeric(7,1),
  desnivel_max_m           numeric(6,1),

  largura_mm               integer,
  altura_mm                integer,
  profundidade_mm          integer,
  peso_kg                  numeric(6,1),
  nivel_ruido_db           numeric(5,1),

  ativo                    boolean not null default true,
  observacoes              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (fabricante, modelo)
);
create trigger trg_ue_updated before update on equipamentos_ue
  for each row execute function set_updated_at();
create index idx_ue_fabricante on equipamentos_ue (fabricante);
create index idx_ue_cap        on equipamentos_ue (cap_refrig_btu);
create index idx_ue_ativo      on equipamentos_ue (ativo);

-- ---------------------------------------------------------------------
-- Unidades internas (evaporadoras)
-- ---------------------------------------------------------------------
create table equipamentos_ui (
  id                    uuid primary key default gen_random_uuid(),
  fabricante            text not null check (fabricante in ('Daikin','LG','Outro')),
  tipo                  text not null,
  modelo                text not null,

  cap_refrig_btu        integer not null,
  cap_refrig_kw         numeric(6,2),
  cap_aquec_btu         integer,
  vazao_ar_m3h          integer,

  tensao_v              integer default 220,
  fases                 integer default 1,
  corrente_a            numeric(6,2),

  diam_tubo_liquido_mm  numeric(5,2),
  diam_tubo_gas_mm      numeric(5,2),
  dreno_mm              numeric(5,2),

  largura_mm            integer,
  altura_mm             integer,
  profundidade_mm       integer,
  peso_kg               numeric(6,1),
  nivel_ruido_db        numeric(5,1),

  ativo                 boolean not null default true,
  observacoes           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (fabricante, modelo)
);
create trigger trg_ui_updated before update on equipamentos_ui
  for each row execute function set_updated_at();
create index idx_ui_fabricante on equipamentos_ui (fabricante);
create index idx_ui_tipo       on equipamentos_ui (tipo);
create index idx_ui_cap        on equipamentos_ui (cap_refrig_btu);
create index idx_ui_ativo      on equipamentos_ui (ativo);

-- ---------------------------------------------------------------------
-- RLS: leitura liberada (catálogo é consumido pela API server-side);
--      escrita SÓ via service_role (que ignora RLS). Se o app tiver
--      auth, troque 'anon' por 'authenticated' nas policies de select.
-- ---------------------------------------------------------------------
alter table equipamentos_ue enable row level security;
alter table equipamentos_ui enable row level security;
create policy "sel_ue" on equipamentos_ue for select to anon, authenticated using (true);
create policy "sel_ui" on equipamentos_ui for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- SEED de exemplo — VALIDAR no datasheet oficial antes de uso real.
-- ---------------------------------------------------------------------
insert into equipamentos_ue
  (fabricante, linha, modelo, cap_refrig_btu, cap_refrig_kw, max_ui_conectaveis,
   taxa_conexao_min_pct, taxa_conexao_max_pct, fluido_refrig, tensao_v, fases)
values
  ('Daikin','VRV IV','RXYQ12BTL(G)', 114700, 33.5, 39, 50, 130, 'R410A', 380, 3),
  ('Daikin','VRV IV','RXYQ16BTL(G)', 152500, 45.0, 52, 50, 130, 'R410A', 380, 3),
  ('Daikin','VRV IV','RXYQ20BTL(G)', 191100, 56.0, 64, 50, 130, 'R410A', 380, 3),
  ('LG','Multi V 5','ARUM200LTE5',   191500, 56.0, 64, 50, 130, 'R410A', 380, 3);

insert into equipamentos_ui
  (fabricante, tipo, modelo, cap_refrig_btu, cap_refrig_kw, tensao_v, fases,
   diam_tubo_liquido_mm, diam_tubo_gas_mm, dreno_mm)
values
  ('Daikin','Cassete 4 vias','FXFSQ25AVM',  8500, 2.5, 220,1, 6.4,12.7,25),
  ('Daikin','Cassete 4 vias','FXFSQ40AVM', 13600, 4.0, 220,1, 6.4,12.7,25),
  ('Daikin','Duto médio',     'FXSQ50AVM',  17100, 5.0, 220,1, 6.4,12.7,25),
  ('Daikin','Cassete 4 vias','FXFSQ100AVM',34100,10.0, 220,1, 9.5,15.9,25),
  ('LG','Cassete 4 vias',     'ARNU24GTQ',  24000, 7.0, 220,1, 6.4,15.9,25);
