-- Paquillo World · Burgos ilustrado 2.1 · parcelas protegidas.
-- Ejecutar UNA VEZ (puede repetirse) en Supabase > SQL Editor DESPUÉS de
-- paquillo-world-burgos-v2.sql. No elimina ni mueve las casas existentes.
-- Mantiene el tablero 28x20 y sus coordenadas tile_x/tile_y.

create or replace function public.paqui_world_home_tile_available(p_x integer,p_y integer)
returns boolean
language sql
immutable
set search_path = ''
as $burgos_tiles$
  select p_x between 0 and 27
    and p_y between 0 and 19
    and p_y <> 13                  -- Río Arlanzón
    and not (p_y = 14 and p_x between 8 and 24) -- ribera
    and (p_x,p_y) not in (
      -- Bloqueos originales: preservados sin modificaciones.
      (7,4),(12,8),(12,10),(5,9),(19,8),(18,4),(21,2),(16,11),(24,15),
      -- Nuevas zonas históricas y deportivas sobre la ilustración aprobada.
      (7,7),(6,7),(8,7),          -- Castillo
      (9,9),(10,9),(10,8),(11,9),-- Catedral
      (12,9),(13,9),(14,9),      -- Plaza Mayor
      (8,12),(9,12),             -- Arco de Santa María
      (12,12),(13,12),(14,12),   -- Paseo del Espolón
      (2,10),(3,10),             -- Universidad
      (17,10),(18,10),(19,10),(18,11), -- El Plantío
      (21,10),(22,10),(23,10),   -- Coliseum Burgos
      (24,12),(25,12)            -- Fuentes Blancas
    )
$burgos_tiles$;

-- Conservar función no invocable directamente; la RPC segura place_home
-- la usa desde security definer y valida al usuario autenticado.
revoke all on function public.paqui_world_home_tile_available(integer,integer)
  from public,anon,authenticated;

-- Verificar casillas emblemáticas (deben devolver false):
select public.paqui_world_home_tile_available(10,9) as catedral_protegida,
       public.paqui_world_home_tile_available(18,10) as plantio_protegido,
       public.paqui_world_home_tile_available(22,10) as coliseum_protegido;

-- G3 y Villímar siguen con parcelas disponibles:
-- select public.paqui_world_home_tile_available(20,6) as g3_disponible,
--        public.paqui_world_home_tile_available(26,6) as villimar_disponible;

-- Para comprobar si existe una casa anterior en un nuevo lugar protegido:
-- select user_id,tile_x,tile_y from public.paqui_world_homes
-- where not public.paqui_world_home_tile_available(tile_x,tile_y);
-- Si sucede, el propietario conservará sus coordenadas originales
-- y la web mostrará la advertencia «REUBICAR». No se tocan datos ni XP.
