-- PAQUILLO WORLD · Fase 1: experiencia, niveles y clasificación
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Los puntos se generan desde triggers de acciones reales; no se permite insertar XP desde el navegador.

create table if not exists public.paqui_world_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  character_image_url text,
  character_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paqui_world_xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points > 0),
  action text not null,
  source_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists paqui_world_xp_user_created_idx
  on public.paqui_world_xp_ledger(user_id, created_at desc);

alter table public.paqui_world_profiles enable row level security;
alter table public.paqui_world_xp_ledger enable row level security;

drop policy if exists "Paquillo World profiles visible to members" on public.paqui_world_profiles;
create policy "Paquillo World profiles visible to members"
on public.paqui_world_profiles for select to authenticated using (true);

drop policy if exists "Paquillo World XP visible to members" on public.paqui_world_xp_ledger;
create policy "Paquillo World XP visible to members"
on public.paqui_world_xp_ledger for select to authenticated using (true);

create or replace function public.paqui_world_award_xp(
  p_user_id uuid, p_points integer, p_action text, p_source_key text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_user_id is null or p_points is null or p_points <= 0 or p_points > 150
     or p_action not in ('event_created','attendance_confirmed','poll_created')
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

create or replace function public.paqui_world_event_created_xp()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.paqui_world_award_xp(new.created_by, 100, 'event_created', 'event-created:' || new.id::text);
  return new;
end;
$$;

drop trigger if exists paqui_world_event_created_xp on public.group_events;
create trigger paqui_world_event_created_xp
after insert on public.group_events
for each row execute function public.paqui_world_event_created_xp();

create or replace function public.paqui_world_attendance_xp()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_user_id uuid;
begin
  if new.status = 'yes' and (tg_op = 'INSERT' or old.status is distinct from 'yes') then
    select auth_user_id into v_user_id
    from public.group_members where id = new.member_id and is_active = true;
    perform public.paqui_world_award_xp(
      v_user_id, 10, 'attendance_confirmed',
      'attendance-yes:' || new.event_id::text || ':' || new.member_id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists paqui_world_attendance_xp on public.event_attendance;
create trigger paqui_world_attendance_xp
after insert or update of status on public.event_attendance
for each row execute function public.paqui_world_attendance_xp();

create or replace function public.paqui_world_poll_created_xp()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.paqui_world_award_xp(new.created_by, 40, 'poll_created', 'poll-created:' || new.id::text);
  return new;
end;
$$;

drop trigger if exists paqui_world_poll_created_xp on public.polls;
create trigger paqui_world_poll_created_xp
after insert on public.polls
for each row execute function public.paqui_world_poll_created_xp();

grant select on public.paqui_world_profiles, public.paqui_world_xp_ledger to authenticated;
revoke all on function public.paqui_world_award_xp(uuid, integer, text, text) from public, anon, authenticated;
revoke insert, update, delete on public.paqui_world_profiles, public.paqui_world_xp_ledger from anon, authenticated;
