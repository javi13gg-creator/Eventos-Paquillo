-- Paquillo Events · permitir convertir un plan existente en viaje sin duplicarlo.
-- Ejecutar una vez en Supabase > SQL Editor. Idempotente.
-- La identidad del group_event no cambia: RSVP, organizadores, encuestas,
-- gastos, recuerdos, cartel y estadisticas permanecen vinculados.

alter table public.group_events
  add column if not exists category text;

update public.group_events
set category = 'plan'
where category is null or btrim(category) = '';

alter table public.group_events
  alter column category set default 'plan';

alter table public.group_events
  alter column category set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.group_events'::regclass
      and conname = 'group_events_category_check'
  ) then
    alter table public.group_events
      add constraint group_events_category_check
      check (category in ('plan', 'trip'));
  end if;
end $$;

-- Los viajes pueden durar varios dias. Null = solo fecha inicial.
alter table public.group_events
  add column if not exists trip_end_date date;

create index if not exists group_events_category_event_date_idx
  on public.group_events(category, event_date);

-- No se modifican politicas RLS ni permisos existentes.
