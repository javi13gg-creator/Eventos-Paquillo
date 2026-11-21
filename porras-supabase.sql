-- Ejecutar una sola vez en Supabase SQL Editor. Reejecutable.
create table if not exists public.paqui_porras (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 3 and 180),
 description text not null default '',
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 20),
 event_id bigint null,
 closes_at timestamptz not null,
 reveal_after_close boolean not null default false,
 prize text not null default '',
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 winner_index integer,
 resolved_at timestamptz,
 constraint winner_valid check(winner_index is null or (winner_index>=0 and winner_index<jsonb_array_length(options)))
);
create table if not exists public.paqui_porra_votes (
 porra_id uuid not null references public.paqui_porras(id) on delete cascade,
 user_id uuid not null default auth.uid(),
 option_index integer not null,
 created_at timestamptz not null default now(),
 primary key(porra_id,user_id)
);
create or replace function public.paqui_vote_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare p public.paqui_porras;
begin
 if tg_op <> 'INSERT' then raise exception 'Las apuestas son irreversibles'; end if;
 if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Usuario no autorizado'; end if;
 select * into p from public.paqui_porras where id=new.porra_id for update;
 if not found or p.closes_at<=now() or p.resolved_at is not null then raise exception 'Porra cerrada'; end if;
 if new.option_index<0 or new.option_index>=jsonb_array_length(p.options) then raise exception 'Opción inválida'; end if;
 return new;
end $$;
drop trigger if exists paqui_vote_guard_trigger on public.paqui_porra_votes;
create trigger paqui_vote_guard_trigger before insert or update or delete on public.paqui_porra_votes for each row execute function public.paqui_vote_guard();
create or replace function public.paqui_porra_guard() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' then
  if old.created_by<>new.created_by or old.title<>new.title or old.options<>new.options or old.closes_at<>new.closes_at or old.event_id is distinct from new.event_id or old.description<>new.description or old.prize<>new.prize or old.reveal_after_close<>new.reveal_after_close then
   raise exception 'No se pueden modificar las reglas de una porra'; end if;
  if old.resolved_at is not null or old.winner_index is not null then raise exception 'Resultado definitivo'; end if;
  if old.closes_at>now() then raise exception 'Solo se puede resolver tras el cierre'; end if;
  if new.winner_index is null or new.resolved_at is null then raise exception 'Resultado obligatorio'; end if;
 end if;
 return new;
end $$;
drop trigger if exists paqui_porra_guard_trigger on public.paqui_porras;
create trigger paqui_porra_guard_trigger before update on public.paqui_porras for each row execute function public.paqui_porra_guard();
alter table public.paqui_porras enable row level security;
alter table public.paqui_porra_votes enable row level security;
drop policy if exists porras_read on public.paqui_porras;
create policy porras_read on public.paqui_porras for select to authenticated using(true);
drop policy if exists porras_create on public.paqui_porras;
create policy porras_create on public.paqui_porras for insert to authenticated with check(created_by=auth.uid() and winner_index is null and resolved_at is null and closes_at>now());
drop policy if exists porras_resolve on public.paqui_porras;
create policy porras_resolve on public.paqui_porras for update to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
drop policy if exists porra_votes_read on public.paqui_porra_votes;
create policy porra_votes_read on public.paqui_porra_votes for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.paqui_porras p where p.id=porra_id and (p.closes_at<=now() or (not p.reveal_after_close)))
);
drop policy if exists porra_votes_insert on public.paqui_porra_votes;
create policy porra_votes_insert on public.paqui_porra_votes for insert to authenticated with check(user_id=auth.uid());
-- No UPDATE/DELETE policy: ningún participante puede alterar su apuesta.
