-- Paquillo World fase 2. Ejecutar DESPUÉS de fase1 en Supabase SQL Editor.
-- Zona horaria Europe/Madrid. Cierre mediante pg_cron si está disponible.
drop trigger if exists paqui_world_event_created_xp on public.group_events;
create table if not exists public.paqui_world_approved_events (
 event_id text primary key, approved_by uuid not null references auth.users(id),
 approved_at timestamptz not null default now()
);
create table if not exists public.paqui_world_daily_scores (
 user_id uuid not null references auth.users(id) on delete cascade,
 game text not null check (game in ('trivia','reflex','memory','races')),
 day date not null default ((now() at time zone 'Europe/Madrid')::date),
 score integer not null check (score between 0 and 1000000),
 updated_at timestamptz not null default now(),
 primary key (user_id,game,day)
);
create table if not exists public.paqui_world_daily_awards (
 game text not null, day date not null, user_id uuid not null references auth.users(id),
 rank integer not null check(rank between 1 and 3), points integer not null,
 primary key(game,day,user_id), unique(game,day,rank)
);
create table if not exists public.paqui_world_challenge_claims (
 user_id uuid not null references auth.users(id), challenge text not null,
 period text not null, claimed_at timestamptz not null default now(),
 primary key(user_id,challenge,period)
);
alter table public.paqui_world_approved_events enable row level security;
alter table public.paqui_world_daily_scores enable row level security;
alter table public.paqui_world_daily_awards enable row level security;
alter table public.paqui_world_challenge_claims enable row level security;
drop policy if exists "Daily scores visible" on public.paqui_world_daily_scores;
create policy "Daily scores visible" on public.paqui_world_daily_scores for select to authenticated using(true);
drop policy if exists "Daily awards visible" on public.paqui_world_daily_awards;
create policy "Daily awards visible" on public.paqui_world_daily_awards for select to authenticated using(true);
drop policy if exists "Challenge claims visible" on public.paqui_world_challenge_claims;
create policy "Challenge claims visible" on public.paqui_world_challenge_claims for select to authenticated using(true);
grant select on public.paqui_world_daily_scores,public.paqui_world_daily_awards,public.paqui_world_challenge_claims to authenticated;
revoke all on public.paqui_world_approved_events from anon,authenticated;
revoke insert,update,delete on public.paqui_world_daily_scores,public.paqui_world_daily_awards,public.paqui_world_challenge_claims from anon,authenticated;

-- Solo admins pueden aprobar; verificar estructura de roles antes de activar RPC.
-- Los resultados de minijuegos necesitan validación en servidor: nunca aceptar puntuaciones arbitrarias del cliente.
create or replace function public.paqui_world_award_xp(
 p_user_id uuid,p_points integer,p_action text,p_source_key text
) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_user_id is null or p_points is null or p_points<=0 or p_points>150
 or p_action not in ('event_approved','attendance_confirmed','poll_created','daily_game','weekly_challenge')
 or p_source_key is null then return; end if;
 insert into public.paqui_world_xp_ledger(user_id,points,action,source_key)
 values(p_user_id,p_points,p_action,p_source_key) on conflict(source_key) do nothing;
 if found then
  insert into public.paqui_world_profiles(user_id,total_xp) values(p_user_id,p_points)
  on conflict(user_id) do update set total_xp=public.paqui_world_profiles.total_xp+excluded.total_xp,updated_at=now();
 end if;
end $$;
revoke all on function public.paqui_world_award_xp(uuid,integer,text,text) from public,anon,authenticated;

-- IMPORTANTE: no habilitar premios automáticos hasta validar resultados de partidas.
create or replace function public.paqui_world_close_day(p_day date)
returns void language plpgsql security definer set search_path=public as $$
declare v record; v_points int;
begin
 if p_day >= (now() at time zone 'Europe/Madrid')::date then
  raise exception 'No se puede cerrar el día actual';
 end if;
 for v in
  select game,day,user_id,rank from (
   select game,day,user_id,row_number() over(partition by game,day order by score desc,updated_at asc,user_id) rank
   from public.paqui_world_daily_scores where day=p_day
  ) ranked where rank<=3
 loop
  v_points:=case v.rank when 1 then 100 when 2 then 60 else 30 end;
  insert into public.paqui_world_daily_awards(game,day,user_id,rank,points)
  values(v.game,v.day,v.user_id,v.rank,v_points) on conflict do nothing;
  if found then
   perform public.paqui_world_award_xp(v.user_id,v_points,'daily_game',
    'daily:'||v.game||':'||v.day::text||':'||v.user_id::text);
  end if;
 end loop;
end $$;
revoke all on function public.paqui_world_close_day(date) from public,anon,authenticated;

-- Para producción: programar ejecución en Supabase Cron a las 00:00 Europe/Madrid
-- (considerando horario de verano) SOLO tras implementar validación de partidas.
-- No se crea un cron automáticamente para evitar recompensar puntuaciones manipuladas.
