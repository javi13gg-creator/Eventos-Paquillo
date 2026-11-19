-- PAQUILLO WORLD 2.0 · Burgos táctico + visita diaria (19/11/2026)
-- EJECUTAR MANUALMENTE en Supabase SQL Editor. Idempotente.
-- Requiere paquillo-world-fase1.sql (ledger + perfiles XP).
-- Ninguna casa es una dirección real: las posiciones son casillas de un mapa ficticio.
-- No concede XP por mover casas ni por resultados de minijuegos no verificados.

do $requirements$
begin
 if to_regclass('public.paqui_world_profiles') is null
  or to_regclass('public.paqui_world_xp_ledger') is null
  or to_regclass('public.group_members') is null then
  raise exception 'Antes ejecuta paquillo-world-fase1.sql (y la BD base de Paquillo Events).';
 end if;
end
$requirements$;

create table if not exists public.paqui_world_homes (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tile_x smallint not null check(tile_x between 0 and 27),
 tile_y smallint not null check(tile_y between 0 and 19),
 placed_at timestamptz not null default now(),
 moved_at timestamptz not null default now(),
 constraint paqui_world_homes_one_tile unique(tile_x,tile_y)
);
create index if not exists paqui_world_homes_moved on public.paqui_world_homes(moved_at desc);
alter table public.paqui_world_homes enable row level security;

drop policy if exists paqui_world_homes_read_members on public.paqui_world_homes;
create policy paqui_world_homes_read_members on public.paqui_world_homes
 for select to authenticated using(
  exists(select 1 from public.group_members g
         where g.auth_user_id=auth.uid() and g.is_active=true)
 );

revoke all on public.paqui_world_homes from public,anon,authenticated;
grant select on public.paqui_world_homes to authenticated;

-- Celdas del río, monumentos, zonas reservadas. Mantener sincronizadas
-- con PAQUILLO_BURGOS_BLOCKED de paquillo-burgos-map.js.
create or replace function public.paqui_world_home_tile_available(p_x integer,p_y integer)
returns boolean language sql immutable set search_path=''
as $$
 select p_x between 0 and 27 and p_y between 0 and 19
   and p_y <> 13
   and not(p_y = 14 and p_x between 8 and 24)
   and (p_x,p_y) not in (
     (7,4),  -- Castillo
     (12,8), -- Catedral
     (12,10),-- Espolón
     (5,9),  -- Universidad
     (19,8), -- Gamonal
     (18,4), -- G3
     (21,2), -- Villimar
     (16,11),-- El Plantío
     (24,15) -- Fuentes Blancas
   )
$$;
revoke all on function public.paqui_world_home_tile_available(integer,integer)
 from public,anon,authenticated;

create or replace function public.paqui_world_place_home(p_x integer,p_y integer)
returns public.paqui_world_homes
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid();
 v_old public.paqui_world_homes%rowtype;
 v_result public.paqui_world_homes%rowtype;
begin
 if v_user is null or not exists(
  select 1 from public.group_members g where g.auth_user_id=v_user and g.is_active=true
 ) then raise exception 'Solo los Paquillos con sesión activa pueden elegir casa' using errcode='42501';
 end if;
 if not public.paqui_world_home_tile_available(p_x,p_y) then
  raise exception 'Parcela fuera del mapa o reservada' using errcode='22023';
 end if;
 -- Bloqueo por usuario: evita carreras entre dos sesiones del mismo jugador.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,1001));
 select * into v_old from public.paqui_world_homes where user_id=v_user for update;
 if found then
  if v_old.tile_x=p_x and v_old.tile_y=p_y then return v_old;end if;
  if clock_timestamp()<v_old.moved_at+interval '60 seconds' then
   raise exception 'Espera un minuto antes de volver a mover tu casa' using errcode='P0001';
  end if;
  update public.paqui_world_homes
   set tile_x=p_x,tile_y=p_y,moved_at=now()
   where user_id=v_user returning * into v_result;
 else
  insert into public.paqui_world_homes(user_id,tile_x,tile_y)
   values(v_user,p_x,p_y) returning * into v_result;
 end if;
 return v_result;
exception
 when unique_violation then
  raise exception 'Esa parcela acaba de ser ocupada por otro vecino' using errcode='23505';
end;
$$;
revoke all on function public.paqui_world_place_home(integer,integer)
 from public,anon;
grant execute on function public.paqui_world_place_home(integer,integer) to authenticated;

-- Visita diaria: botón acotado a una única recompensa XP por día de Madrid.
create table if not exists public.paqui_world_daily_checkins (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,day)
);
create index if not exists paqui_world_checkins_recent on public.paqui_world_daily_checkins(day desc);
alter table public.paqui_world_daily_checkins enable row level security;
drop policy if exists paqui_world_checkins_read_own on public.paqui_world_daily_checkins;
create policy paqui_world_checkins_read_own on public.paqui_world_daily_checkins
 for select to authenticated using(user_id=auth.uid());
revoke all on public.paqui_world_daily_checkins from public,anon,authenticated;
grant select on public.paqui_world_daily_checkins to authenticated;

create or replace function public.paqui_world_claim_daily()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid();
 v_today date:=(now() at time zone 'Europe/Madrid')::date;
 v_added boolean:=false;
 v_awarded integer:=0;
begin
 if v_user is null or not exists(
  select 1 from public.group_members g where g.auth_user_id=v_user and g.is_active=true
 ) then raise exception 'Necesitas una cuenta activa de Paquillo Events' using errcode='42501';
 end if;
 -- La clave primaria (user_id, day) evita reclamaciones repetidas y carreras.
 insert into public.paqui_world_daily_checkins(user_id,day)
 values(v_user,v_today) on conflict(user_id,day) do nothing;
 v_added:=found;
 if v_added then
   insert into public.paqui_world_xp_ledger(user_id,points,action,source_key)
   values(v_user,5,'daily_checkin','daily-checkin:'||v_user::text||':'||v_today::text)
   on conflict(source_key) do nothing;
   if found then
     insert into public.paqui_world_profiles(user_id,total_xp)
     values(v_user,5)
     on conflict(user_id) do update
       set total_xp=public.paqui_world_profiles.total_xp+excluded.total_xp,
           updated_at=now();
     v_awarded:=5;
   end if;
 end if;
 return jsonb_build_object(
  'day',v_today,'claimed_today',true,
  'new_claim',v_added,'xp_awarded',v_awarded
 );
end;
$$;
revoke all on function public.paqui_world_claim_daily() from public,anon;
grant execute on function public.paqui_world_claim_daily() to authenticated;

-- Notas de seguridad:
-- 1) No existen permisos directos INSERT/UPDATE/DELETE en las dos tablas.
-- 2) Solo los RPC security definer aplican cambios, comprobando auth.uid() y miembro activo.
-- 3) Las casas no representan domicilios de personas.
-- 4) Los +5 XP se insertan en el ledger de manera idempotente, una vez/día.
-- 5) No se conceden XP por juegos con resultados aún sin validación antifraude.
--
-- Comprobaciones tras ejecutar (SQL Editor):
-- select count(*) from public.paqui_world_homes;
-- select count(*) from public.paqui_world_daily_checkins;
-- select public.paqui_world_home_tile_available(12,8); -- false, Catedral
-- select public.paqui_world_home_tile_available(4,4);  -- true, parcela libre
