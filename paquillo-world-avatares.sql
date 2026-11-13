-- PAQUILLO WORLD · Avatares personalizados importados por el administrador.
-- Ejecutar una vez en Supabase > SQL Editor. No altera XP ni fotos de cumpleaños.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('paquillo-characters','paquillo-characters',true,8*1024*1024,
  array['image/webp','image/png','image/jpeg']::text[])
on conflict (id) do update
set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Paquillo admin sube personajes" on storage.objects;
create policy "Paquillo admin sube personajes"
on storage.objects for insert to authenticated
with check (
 bucket_id='paquillo-characters'
 and exists (
   select 1 from public.user_profiles p
   where p.user_id=auth.uid() and p.role='admin'
 )
);

-- Actualiza SOLO la imagen del personaje; evita modificar XP desde el navegador.
create or replace function public.paqui_world_set_character(
 p_user_id uuid,p_image_url text
) returns void
language plpgsql security definer
set search_path=public
as $$
begin
 if auth.uid() is null or not exists (
    select 1 from public.user_profiles
    where user_id=auth.uid() and role='admin'
 ) then
   raise exception 'Solo la administración puede asignar personajes.';
 end if;
 if p_user_id is null or not exists (select 1 from public.group_members
    where auth_user_id=p_user_id and is_active=true) then
   raise exception 'El miembro no tiene una cuenta activa vinculada.';
 end if;
 if p_image_url is null or length(p_image_url)>1200 or
    p_image_url !~ '^https://[a-zA-Z0-9.-]+/storage/v1/object/public/paquillo-characters/portraits/[a-z0-9_-]+/[a-zA-Z0-9._-]+[.](webp|png|jpg)$' then
   raise exception 'URL de avatar no autorizada.';
 end if;
 insert into public.paqui_world_profiles(user_id,character_image_url)
 values (p_user_id,p_image_url)
 on conflict(user_id) do update
 set character_image_url=excluded.character_image_url,updated_at=now();
end;
$$;
revoke all on function public.paqui_world_set_character(uuid,text) from public,anon;
grant execute on function public.paqui_world_set_character(uuid,text) to authenticated;

-- Las miniaturas se leen por URL pública del bucket. No se crean políticas
-- de UPDATE/DELETE sobre storage.objects para los usuarios.
