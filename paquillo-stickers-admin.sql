-- Paquillo Events | Retirar de la galería los stickers clásicos de GitHub.
-- Ejecutar en Supabase > SQL Editor. Idempotente; no borra archivos ni datos previos.
-- Complemento a paquillo-stickers-upload.sql (subidas y borrado del bucket).
-- Los stickers subidos a Supabase sí se pueden eliminar desde la web.

create table if not exists public.paqui_hidden_stickers (
  file_name text primary key
    check (file_name ~ '^[a-f0-9]{8}\.webp$'),
  hidden_by uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  hidden_at timestamptz not null default now()
);

alter table public.paqui_hidden_stickers enable row level security;

-- Los usuarios autenticados deben poder ver qué imágenes clásicas están ocultas.
drop policy if exists paqui_hidden_stickers_select on public.paqui_hidden_stickers;
create policy paqui_hidden_stickers_select
on public.paqui_hidden_stickers for select to authenticated
using (true);

-- Solo el administrador puede retirar/reponer stickers clásicos.
drop policy if exists paqui_hidden_stickers_admin_insert on public.paqui_hidden_stickers;
create policy paqui_hidden_stickers_admin_insert
on public.paqui_hidden_stickers for insert to authenticated
with check (public.paqui_is_admin() and hidden_by = auth.uid());

drop policy if exists paqui_hidden_stickers_admin_delete on public.paqui_hidden_stickers;
create policy paqui_hidden_stickers_admin_delete
on public.paqui_hidden_stickers for delete to authenticated
using (public.paqui_is_admin());

revoke all on public.paqui_hidden_stickers from anon;
grant select, insert, delete on public.paqui_hidden_stickers to authenticated;

-- Comprobación:
-- select * from public.paqui_hidden_stickers order by hidden_at desc;
