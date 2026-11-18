-- Paquillo Life · Fase B: necesidades persistentes del piloto Javi.
-- Ejecutar manualmente en Supabase SQL Editor. No afecta al XP ni a World.
create table if not exists public.paqui_life_needs (
 user_id uuid primary key references auth.users(id) on delete cascade,
 energy integer not null default 75 check (energy between 20 and 100),
 mood integer not null default 75 check (mood between 20 and 100),
 wellbeing integer not null default 75 check (wellbeing between 20 and 100),
 updated_at timestamptz not null default now(),
 last_action_at timestamptz,
 last_action text
);
alter table public.paqui_life_needs enable row level security;
revoke all on public.paqui_life_needs from public, anon, authenticated;

create or replace function public.paqui_life_care(p_action text default null)
returns table(energy integer,mood integer,wellbeing integer,next_action_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
 v_uid uuid := auth.uid();
 v_row public.paqui_life_needs%rowtype;
 v_elapsed integer;
 v_now timestamptz := clock_timestamp();
begin
 if v_uid is null or not exists (
  select 1 from public.user_profiles p
  where p.id = v_uid and lower(btrim(p.username)) = 'javi' and p.role = 'admin'
 ) then
  raise exception 'Acceso no autorizado a Paquillo Life' using errcode = '42501';
 end if;
 if p_action is not null and p_action not in ('eat','sleep','shower') then
  raise exception 'Acción no válida' using errcode = '22023';
 end if;
 insert into public.paqui_life_needs(user_id) values(v_uid)
 on conflict(user_id) do nothing;
 select * into v_row from public.paqui_life_needs n where n.user_id=v_uid for update;
 -- Una unidad por cada 6 horas completas; tope de 25 unidades por periodo.
 v_elapsed := least(25,greatest(0,floor(extract(epoch from (v_now-v_row.updated_at))/21600)::integer));
 v_row.energy := greatest(20,v_row.energy-v_elapsed);
 v_row.mood := greatest(20,v_row.mood-v_elapsed);
 v_row.wellbeing := greatest(20,v_row.wellbeing-v_elapsed);
 if p_action is not null then
  if v_row.last_action_at is not null and v_now < v_row.last_action_at + interval '30 seconds' then
   raise exception 'Espera 30 segundos antes del siguiente cuidado' using errcode = 'P0001';
  end if;
  if p_action='eat' then
   v_row.energy:=least(100,v_row.energy+8);
   v_row.wellbeing:=least(100,v_row.wellbeing+12);
  elsif p_action='sleep' then
   v_row.energy:=least(100,v_row.energy+20);
   v_row.wellbeing:=least(100,v_row.wellbeing+5);
  elsif p_action='shower' then
   v_row.wellbeing:=least(100,v_row.wellbeing+18);
   v_row.mood:=least(100,v_row.mood+5);
  end if;
  v_row.last_action_at:=v_now;
  v_row.last_action:=p_action;
 end if;
 update public.paqui_life_needs n set
  energy=v_row.energy,mood=v_row.mood,wellbeing=v_row.wellbeing,
  updated_at=v_now,last_action_at=v_row.last_action_at,last_action=v_row.last_action
 where n.user_id=v_uid;
 return query select v_row.energy,v_row.mood,v_row.wellbeing,
  v_row.last_action_at+interval '30 seconds';
end;
$$;
revoke all on function public.paqui_life_care(text) from public, anon;
grant execute on function public.paqui_life_care(text) to authenticated;
-- Comprobar antes de ejecutar: user_profiles.id debe ser auth.users.id.
