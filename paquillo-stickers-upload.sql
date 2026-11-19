-- Paquillo Events · stickers subidos por los miembros.
-- Ejecutar en Supabase > SQL Editor. Idempotente.
-- No modifica ni elimina los stickers originales del repositorio.
-- Los stickers se guardan como WEBP optimizado (512 x 512 px) en Storage.
-- IMPORTANTE: bucket público; una persona con el enlace directo podrá ver la imagen.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('paquillo-stickers', 'paquillo-stickers', true, 2097152, array['image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.paqui_stickers (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  caption text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint paqui_stickers_path_format check (
    storage_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$'
  ),
  constraint paqui_stickers_caption_len check (char_length(caption) <= 80)
);

create index if not exists paqui_stickers_created_idx
  on public.paqui_stickers(created_at desc);

alter table public.paqui_stickers enable row level security;

-- Solo usuarios autenticados pueden consultar el listado; el bucket es público
-- porque los stickers están pensados para compartir/descargar.
drop policy if exists paqui_stickers_select on public.paqui_stickers;
create policy paqui_stickers_select
on public.paqui_stickers for select to authenticated using (true);

-- Cada usuario guarda solo stickers en su carpeta y con su identidad.
drop policy if exists paqui_stickers_insert on public.paqui_stickers;
create policy paqui_stickers_insert
on public.paqui_stickers for insert to authenticated with check (
  created_by = auth.uid()
  and split_part(storage_path, '/', 1) = auth.uid()::text
  and exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
);

-- El autor o administración pueden retirar un sticker sin modificar otros datos.
drop policy if exists paqui_stickers_delete on public.paqui_stickers;
create policy paqui_stickers_delete
on public.paqui_stickers for delete to authenticated using (
  created_by = auth.uid() or public.paqui_is_admin()
);

revoke all on public.paqui_stickers from anon;
grant select, insert, delete on public.paqui_stickers to authenticated;

-- Acceso público a las imágenes del bucket (no a otros buckets).
drop policy if exists "Paquillo stickers public read" on storage.objects;
create policy "Paquillo stickers public read"
on storage.objects for select
using (bucket_id = 'paquillo-stickers');

drop policy if exists "Paquillo stickers own upload" on storage.objects;
create policy "Paquillo stickers own upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'paquillo-stickers'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
);

drop policy if exists "Paquillo stickers own or admin delete" on storage.objects;
create policy "Paquillo stickers own or admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'paquillo-stickers'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.paqui_is_admin()
  )
);

-- Comprobaciones tras ejecutar:
-- select id, name, public from storage.buckets where id='paquillo-stickers';
-- select count(*) from public.paqui_stickers;
