-- CARRERA PAQUILLERA · marcador compartido histórico y semanal.
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- No altera XP ni otros juegos. La carrera funciona localmente sin esta tabla.
--
-- IMPORTANTE: los resultados proceden de un navegador y NO están
-- criptográficamente certificados. No otorgan XP de Paquillo World.
create table if not exists public.paqui_world_race_scores (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 distance_m integer not null check (distance_m between 1 and 100000),
 tickets integer not null default 0 check (tickets between 0 and 10000),
 duration_s integer not null check (duration_s between 1 and 900),
 created_at timestamptz not null default now(),
 constraint paqui_race_distance_speed_limit check (distance_m <= duration_s * 58 + 120),
 constraint paqui_race_ticket_limit check (tickets <= duration_s * 12 + 30)
);
create index if not exists paqui_race_alltime_idx
 on public.paqui_world_race_scores (distance_m desc,created_at desc);
create index if not exists paqui_race_weekly_idx
 on public.paqui_world_race_scores (created_at desc,distance_m desc);
create index if not exists paqui_race_user_idx
 on public.paqui_world_race_scores (user_id,created_at desc);

alter table public.paqui_world_race_scores enable row level security;
drop policy if exists "Carreras Paquillo: miembros consultan resultados" on public.paqui_world_race_scores;
create policy "Carreras Paquillo: miembros consultan resultados"
 on public.paqui_world_race_scores for select to authenticated using (true);

drop policy if exists "Carreras Paquillo: guardar propias carreras" on public.paqui_world_race_scores;
create policy "Carreras Paquillo: guardar propias carreras"
 on public.paqui_world_race_scores for insert to authenticated
 with check (auth.uid() = user_id);

-- Ninguna política de UPDATE/DELETE desde el navegador. Solo INSERT del jugador.
-- No se conceden permisos de administrador a los jugadores.
revoke all on public.paqui_world_race_scores from anon;
grant select, insert on public.paqui_world_race_scores to authenticated;
