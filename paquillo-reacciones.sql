-- PAQUILLO EVENTS · Reacciones a planes
-- Idempotente: ejecutar en Supabase > SQL Editor con permisos de administrador.
-- 1 reacción por usuario y plan; se puede cambiar o eliminar.
-- No modifica asistencia, gastos, encuestas ni XP.
create table if not exists public.paqui_event_reactions (
  event_id uuid not null references public.group_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('😂','🔥','🍻','❤️','👏','🤯')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists paqui_event_reactions_event_emoji_idx
  on public.paqui_event_reactions(event_id, emoji);

alter table public.paqui_event_reactions enable row level security;

-- Solo usuarios con miembro activo pueden leer, y solo pueden escribir su reacción.
drop policy if exists paqui_event_reactions_read on public.paqui_event_reactions;
create policy paqui_event_reactions_read
on public.paqui_event_reactions for select to authenticated
using (
  exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
  and exists (
    select 1 from public.group_events e
    where e.id = event_id and e.status not in ('draft','cancelled')
  )
);

drop policy if exists paqui_event_reactions_insert on public.paqui_event_reactions;
create policy paqui_event_reactions_insert
on public.paqui_event_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
  and exists (
    select 1 from public.group_events e
    where e.id = event_id and e.status not in ('draft','cancelled')
  )
);

drop policy if exists paqui_event_reactions_update on public.paqui_event_reactions;
create policy paqui_event_reactions_update
on public.paqui_event_reactions for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
  and exists (
    select 1 from public.group_events e
    where e.id = event_id and e.status not in ('draft','cancelled')
  )
);

drop policy if exists paqui_event_reactions_delete on public.paqui_event_reactions;
create policy paqui_event_reactions_delete
on public.paqui_event_reactions for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.group_members m
    where m.auth_user_id = auth.uid() and m.is_active = true
  )
);

revoke all on public.paqui_event_reactions from anon;
grant select, insert, update, delete on public.paqui_event_reactions to authenticated;

-- Comprobación después de ejecutar:
-- select count(*) from public.paqui_event_reactions;
