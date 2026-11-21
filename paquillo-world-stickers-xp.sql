-- Paquillo World · +20 XP por sticker publicado.
-- Ejecutar en Supabase SQL Editor DESPUÉS de paquillo-world-fase1.sql
-- y paquillo-stickers-upload.sql. Idempotente; no concede XP retroactivo.
-- La recompensa se registra una vez por ID de sticker.
create or replace function public.paqui_world_award_xp(
  p_user_id uuid, p_points integer, p_action text, p_source_key text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_user_id is null or p_points is null or p_points <= 0 or p_points > 150
     or p_action not in ('event_created','attendance_confirmed','poll_created','sticker_uploaded')
     or p_source_key is null then
    return;
  end if;
  insert into public.paqui_world_xp_ledger(user_id, points, action, source_key)
  values (p_user_id, p_points, p_action, p_source_key)
  on conflict (source_key) do nothing;
  if found then
    insert into public.paqui_world_profiles(user_id, total_xp)
    values (p_user_id, p_points)
    on conflict (user_id) do update
      set total_xp = public.paqui_world_profiles.total_xp + excluded.total_xp,
          updated_at = now();
  end if;
end;
$$;

create or replace function public.paqui_world_sticker_uploaded_xp()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.paqui_world_award_xp(
    new.created_by, 20, 'sticker_uploaded', 'sticker-uploaded:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists paqui_world_sticker_uploaded_xp on public.paqui_stickers;
create trigger paqui_world_sticker_uploaded_xp
after insert on public.paqui_stickers
for each row execute function public.paqui_world_sticker_uploaded_xp();

revoke all on function public.paqui_world_award_xp(uuid,integer,text,text) from public, anon, authenticated;

-- Comprobación tras publicar un sticker nuevo:
-- select user_id, points, action, source_key, created_at
-- from public.paqui_world_xp_ledger
-- where action = 'sticker_uploaded' order by created_at desc limit 10;
