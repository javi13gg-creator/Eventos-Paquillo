-- Paquillo Events: historial de avisos push manuales (ejecutar una vez en Supabase).
-- Acceso exclusivo de la Edge Function con credenciales de servicio.
create table if not exists public.paqui_manual_push_log (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 kind text not null check (kind in ('announcement','event')),
 title text not null check (char_length(title) between 4 and 75),
 body text not null check (char_length(body) between 6 and 220),
 audience text not null check (audience in ('all','attendees')),
 event_id text,
 attempted integer not null default 0 check (attempted>=0),
 sent integer not null default 0 check (sent>=0),
 failed integer not null default 0 check (failed>=0),
 status text not null default 'sending' check (status in ('sending','sent','partial','error'))
);
create index if not exists paqui_manual_push_log_created_idx
 on public.paqui_manual_push_log(created_at desc);
create index if not exists paqui_manual_push_log_admin_idx
 on public.paqui_manual_push_log(created_by,created_at desc);
alter table public.paqui_manual_push_log enable row level security;
revoke all on public.paqui_manual_push_log from anon, authenticated;
-- No crear políticas públicas: el navegador no puede leer ni escribir registros.
