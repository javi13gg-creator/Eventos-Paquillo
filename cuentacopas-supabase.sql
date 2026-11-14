-- Ejecutar manualmente en Supabase SQL Editor. Idempotente.
create table if not exists public.paqui_drink_sessions (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(trim(title)) between 1 and 80),
 event_id uuid references public.group_events(id) on delete set null,
 session_date date not null default current_date,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(event_id)
);
create table if not exists public.paqui_drink_entries (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.paqui_drink_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 beverage text not null check (char_length(trim(beverage)) between 1 and 45),
 emoji text not null default '🍹',
 created_at timestamptz not null default now()
);
create index if not exists paqui_drink_entries_session_idx on public.paqui_drink_entries(session_id);
create index if not exists paqui_drink_entries_user_idx on public.paqui_drink_entries(user_id);
alter table public.paqui_drink_sessions enable row level security;
alter table public.paqui_drink_entries enable row level security;
drop policy if exists paqui_sessions_read on public.paqui_drink_sessions;
create policy paqui_sessions_read on public.paqui_drink_sessions for select to authenticated using (exists(select 1 from public.group_members m where m.auth_user_id=auth.uid() and m.is_active=true));
drop policy if exists paqui_sessions_insert on public.paqui_drink_sessions;
create policy paqui_sessions_insert on public.paqui_drink_sessions for insert to authenticated with check (created_by=auth.uid() and exists(select 1 from public.group_members m where m.auth_user_id=auth.uid() and m.is_active=true));
drop policy if exists paqui_entries_read on public.paqui_drink_entries;
create policy paqui_entries_read on public.paqui_drink_entries for select to authenticated using (exists(select 1 from public.group_members m where m.auth_user_id=auth.uid() and m.is_active=true));
drop policy if exists paqui_entries_insert on public.paqui_drink_entries;
create policy paqui_entries_insert on public.paqui_drink_entries for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.group_members m where m.auth_user_id=auth.uid() and m.is_active=true));
drop policy if exists paqui_entries_delete on public.paqui_drink_entries;
create policy paqui_entries_delete on public.paqui_drink_entries for delete to authenticated using (user_id=auth.uid());
