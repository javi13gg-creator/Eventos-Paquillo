-- Paquillo World · Retos asíncronos v1. Ejecutar en Supabase SQL Editor.
-- Una partida por jugador y reto; sin XP ni récords históricos.
create table if not exists public.paqui_world_duels (
 id uuid primary key default gen_random_uuid(),
 challenger uuid not null references auth.users(id) on delete cascade,
 opponent uuid not null references auth.users(id) on delete cascade,
 game text not null check(game in ('trivia','memory','reflex')),
 status text not null default 'pending' check(status in ('pending','active','completed','declined')),
 challenger_score integer,
 opponent_score integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint duel_distinct_players check(challenger<>opponent),
 constraint duel_score_bounds check((challenger_score is null or challenger_score between 0 and 1000000) and (opponent_score is null or opponent_score between 0 and 1000000))
);
create index if not exists paqui_world_duels_players on public.paqui_world_duels(challenger,opponent,created_at desc);
create index if not exists paqui_world_duels_opponents on public.paqui_world_duels(opponent,created_at desc);
alter table public.paqui_world_duels enable row level security;
revoke all on public.paqui_world_duels from anon,authenticated;
grant select on public.paqui_world_duels to authenticated;
drop policy if exists paqui_world_duels_participants on public.paqui_world_duels;
create policy paqui_world_duels_participants on public.paqui_world_duels for select to authenticated using(auth.uid()=challenger or auth.uid()=opponent);
create or replace function public.paqui_world_duel(p_action text,p_duel uuid default null,p_opponent uuid default null,p_game text default null,p_score integer default null)
returns public.paqui_world_duels language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.paqui_world_duels; u uuid:=auth.uid();
begin
 if u is null then raise exception 'Inicia sesión';end if;
 if p_action='create' then
  if p_opponent is null or p_opponent=u or p_game not in ('trivia','memory','reflex') then raise exception 'Reto no válido';end if;
  if not exists(select 1 from public.group_members where auth_user_id=u and is_active=true) or
     not exists(select 1 from public.group_members where auth_user_id=p_opponent and is_active=true) then raise exception 'Solo miembros activos';end if;
  insert into public.paqui_world_duels(challenger,opponent,game) values(u,p_opponent,p_game) returning * into v;
 else
  select * into v from public.paqui_world_duels where id=p_duel for update;
  if not found or u not in (v.challenger,v.opponent) then raise exception 'Reto no disponible';end if;
  if p_action='accept' then
   if u<>v.opponent or v.status<>'pending' then raise exception 'No puedes aceptar este reto';end if;
   update public.paqui_world_duels set status='active',updated_at=now() where id=v.id returning * into v;
  elsif p_action='decline' then
   if u<>v.opponent or v.status<>'pending' then raise exception 'No puedes rechazar este reto';end if;
   update public.paqui_world_duels set status='declined',updated_at=now() where id=v.id returning * into v;
  elsif p_action='score' then
   if v.status<>'active' or p_score is null or p_score<0 or p_score>1000000 then raise exception 'Resultado no válido';end if;
   if (u=v.challenger and v.challenger_score is not null) or (u=v.opponent and v.opponent_score is not null) then raise exception 'Ya has jugado este reto';end if;
   update public.paqui_world_duels set challenger_score=case when u=v.challenger then p_score else challenger_score end,
     opponent_score=case when u=v.opponent then p_score else opponent_score end,
     status=case when (u=v.challenger and opponent_score is not null) or (u=v.opponent and challenger_score is not null) then 'completed' else 'active' end,
     updated_at=now() where id=v.id returning * into v;
  else raise exception 'Acción no válida';end if;
 end if;
 return v;
end $$;
revoke all on function public.paqui_world_duel(text,uuid,uuid,text,integer) from public,anon;
grant execute on function public.paqui_world_duel(text,uuid,uuid,text,integer) to authenticated;
-- Importante: la puntuación procede del cliente y no es prueba antifraude.
