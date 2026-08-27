-- Estado do app (organização única) + bucket de fotos.
-- Rode DEPOIS de schema.sql e schema-fase2.sql.

create table if not exists app_estado (
  org        text primary key,
  dados      jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table app_estado enable row level security;
create policy "estado_rw" on app_estado for all to authenticated using (true) with check (true);

-- Bucket público de fotos das obras
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;
create policy "fotos_insert" on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
create policy "fotos_read"   on storage.objects for select using (bucket_id = 'fotos');
create policy "fotos_delete" on storage.objects for delete to authenticated using (bucket_id = 'fotos');
