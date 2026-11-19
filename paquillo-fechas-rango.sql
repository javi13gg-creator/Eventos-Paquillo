-- PAQUILLO EVENTS | Categorías y fechas de inicio/fin (idempotente)
-- Ejecutar en Supabase > SQL Editor. No borra eventos ni altera sus relaciones.
-- Incluye la migración anterior 'paquillo-plan-a-viaje.sql': basta ejecutar este archivo.

ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS category text;
UPDATE public.group_events
  SET category = 'plan'
  WHERE category IS NULL OR btrim(category) = '';
ALTER TABLE public.group_events ALTER COLUMN category SET DEFAULT 'plan';
ALTER TABLE public.group_events ALTER COLUMN category SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.group_events'::regclass
      AND conname = 'group_events_category_check'
  ) THEN
    ALTER TABLE public.group_events
      ADD CONSTRAINT group_events_category_check
      CHECK (category IN ('plan','trip'));
  END IF;
END $$;

-- Compatibilidad con viajes convertidos usando el editor anterior.
ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS trip_end_date date;

-- Las dos nuevas columnas se aplican a cualquier plan (también si NO es viaje).
ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS event_end_date date;
ALTER TABLE public.group_events ADD COLUMN IF NOT EXISTS event_end_time time without time zone;

-- Recuperar la fecha de fin que ya se hubiese introducido en viajes.
UPDATE public.group_events
SET event_end_date = trip_end_date
WHERE event_end_date IS NULL
  AND trip_end_date IS NOT NULL
  AND event_date IS NOT NULL
  AND trip_end_date >= event_date;

CREATE INDEX IF NOT EXISTS group_events_category_event_date_idx
  ON public.group_events(category, event_date);

-- Conservamos todas las policies RLS actuales.
-- La interfaz valida que el fin no preceda al inicio.
