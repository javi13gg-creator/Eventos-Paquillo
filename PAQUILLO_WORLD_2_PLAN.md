# PAQUILLO WORLD 2.0 · PLAN AMBICIOSO
*Diseño inicial: 19 de noviembre de 2026 · Burgos ficticio, inspirado en la ciudad real.*

## Principio de producto
**Entrar por curiosidad, quedarse por sus amigos, volver por un objetivo breve.**
Paquillo World es un juego social móvil vinculado a Events. No una segunda agenda ni un simulador de hambre/sueño.

## Reglas no negociables
- Infraestructura: GitHub Pages + Supabase; sin servidor nuevo obligatorio.
- XP y niveles existentes: sin monedas ni pagos. Recompensas futuras **cosméticas** y XP solo si el servidor valida la acción.
- No revelar domicilios reales: las parcelas son ficticias aunque el escenario evoque Burgos.
- Respeto a avatares aprobados, datos de grupo y accesos existentes.
- Si una migración SQL no está ejecutada, mostrar un modo exploración de prueba. Nunca afirmar que se ha guardado una casa o acreditado XP.
- Evitar recompensas por spam: límites en servidor y fuente de XP auditable.

## Pilar 1 · El Barrio: Burgos táctico / estrategia social
Mapa ficticio 28×20 casillas, gran desplazamiento con dedo, zoom de pinza y controles, ubicación de casas libre en parcelas válidas, búsqueda de vecinos, centrar casa, ver fichas y lanzar retos.
Lugares iconográficos y zonas reconocibles: Castillo, Catedral, Espolón, Arlanzón, Universidad, Gamonal, Villimar, G3, El Plantío y Fuentes Blancas. Distribución **inspirada** en la geografía local; no cartografía oficial.
- **A1, en implementación:** mapa navegable, terrenos y monumentos, avatares del World, reclamar/mover casa, búsqueda, navegación a casa, ficha y retar.
- **A2:** visitar casas, mural social de pegatinas y reacciones; tasas moderadas, borrado/denuncia.
- **A3:** eventos temporales de barrio y exploración: NPC Paquillo escondido, zonas de juego, búsquedas sin revelar datos privados.
- **A4:** personalización de fachadas, decoraciones ganadas y catálogos cosméticos versionados.

## Pilar 2 · Habitación: mi base jugable
Eliminar necesidades visibles y el énfasis en comer/ducha/dormir. Interacciones antiguas se conservan en un apartado secundario.
Zona central ocupada por personaje aprobado y accesos contextuales: jugar, barrio, retos, progresión, inventario, premios, racha.
- **B1, en implementación:** hub sin barras visibles; accesos grandes, estado diario, retos reales, visita diaria validada en servidor.
- **B2:** decoración real de habitación: muebles colocables en celdas; guardado privado de diseño y vista de amigos.
- **B3:** vitrina de trofeos/logros, recuerdos de eventos del grupo y personalización cosmética.

## Pilar 3 · El bucle diario
Sesión objetivo de 2-5 minutos:
1. Entrar → ver racha/recompensa diaria.
2. Tener 2-3 acciones: una partida, un reto de vecino o una interacción real con Events.
3. Cobrar visita diaria (servidor, una vez por día de Madrid) y registrar progreso.
4. Explorar el mapa o regresar mañana para continuar racha y descubrir novedades.
No se dan XP por resultados no validados de juegos ni por «visitar» indefinidamente.

## Modelo de datos mínimo
- `paqui_world_homes`: posición (x,y) única por parcela y usuario; RLS solo lectura para miembros; modificaciones exclusivamente RPC con `auth.uid()`, límites y bloqueo.
- `paqui_world_daily_checkins`: visita única por jugador y fecha de Madrid; RPC protegida con XP simbólico y ledger auditable.
- Etapas posteriores: `paqui_world_room_layout`, `paqui_world_house_visits`, `paqui_world_cosmetics`, `paqui_world_missions`, `paqui_world_guestbook` sujetos a revisión de privacidad y antifraude.

## Implementación inicial publicada · 19/11/2026

**Fase técnica A1/B1:** disponible en GitHub (pendiente de QA visual y migración en Supabase):
- `paquillo-burgos-map.js/css`: mapa 28×20 con Burgos ilustrado, parrilla, zoom rueda/botones y pinza, desplazamiento táctil, buscador, casas con avatares y selección de parcela libre; lectura y colocación por Supabase RPC. Botón para actualizar vecinos y **hallazgo escondido del día** (solo cosmético local, sin XP). Sin SQL, casas provisionales identificadas como demostración y movimientos no guardados.
- `paquillo-world-burgos-v2.sql`: tablas de posiciones, visitas y rachas; un RPC para asignar parcela con exclusión y tiempo mínimo entre mudanzas; uno para registrar visitas sociales con límite de spam; uno para reclamar **+5 XP una sola vez al día** mediante ledger seguro.
- `paquillo-world-daily.js/css`: racha real, objetivos breves, retos pendientes, partidas provisionales, visitas diarias y enlace a planes de Events. Ningún XP por minijuego ni por visitas.
- `paquillo-life-preview.js` y `paquillo-life-base-v25.css`: «Mi base», nueva zona de juego con Arcade, Memoria, decoraciones y tarjetas diarias. Comer/ducha/descanso/barras quedan en un desplegable opcional.
- `paquillo-world.js`: nueva pestaña **Barrio** en navegación inferior (Equipo permanece en accesos de Inicio), mapa para miembros autenticados, fichas y retos ya existentes, botón «Pasar por esta casa».
- La **habitación aún sigue en piloto privado Javi/admin**, mientras que el mapa del Barrio es visible para todos los miembros de World.

**Estado de verificación:** sintaxis JS/HTML/CSS comprobada, simulación de mapa con personajes y UI, simulación de racha +5 XP sin duplicado. NO se ha probado todavía con Supabase real ni en iOS/Android. Requiere aplicar la migración tras confirmar base XP.

**No implementado todavía:** muebles arrastrables en habitación, inventario cosmético persistente, chat/mural de casa, NPCs/cofres de exploración, ligas y misiones verificadas, directo multijugador. Se conservan como fases posteriores, sin anunciar como funcionalidades activas.

## Barrio Burgos 2.1 · integración del mapa ilustrado aprobado (19/11/2026)

- **Imagen definitiva:** `burgos-world-map-v1.avif`, 1672×941 px, ~220 KB. Basada directamente en la última ilustración aprobada por el usuario (G3 a la izquierda de Villímar). El archivo está versionado y servido por GitHub Pages; no se carga desde ChatGPT ni de un CDN privado.
- **Composición:** tablero de 28×20, imagen centrada con `object-fit:contain` (sin estirarla), cuadrícula superpuesta que se intensifica al mover casas, puntos interactivos, casas y selección de parcela. Fondo procedural antiguo conservado como alternativa si el navegador no admite AVIF.
- **Ubicaciones:** Catedral, Castillo, Plaza Mayor, Arco de Santa María, Espolón, Universidad, El Plantío, Coliseum, Fuentes Blancas, G3 y Villímar. La distribución visual es aproximada y fiel a las relaciones del mapa ilustrado, no es cartografía oficial.
- **Gestión:** búsqueda y zoom siguen activos; se puede visitar la ficha de un monumento mediante un pin o un desplegable de «Lugares», y las casas con avatar se pintan por `tile_x/tile_y` encima del mapa.
- **Parcelas:** G3 y Villímar concentran las nuevas casas provisionales para mostrar el potencial del barrio. Una casa real previamente guardada conserva su posición; si coincide con zona que ahora se protege, aparece una advertencia para trasladarla sin cambiar datos históricos.
- **Migración adicional obligatoria para restricciones del servidor:** ejecutar `paquillo-burgos-landmarks-v21.sql` **después** de `paquillo-world-burgos-v2.sql`. Cambia únicamente el validador de parcelas, no recoloca ni borra casas. La validación del navegador ya está sincronizada.
- **QA:** archivo AVIF verificado en GitHub por SHA `c1d31bf030233fe70303406b5e926c8a11339f46`; JS comprobado, pruebas de estructura y simulaciones de clic en casa, landmark, carga del fondo y modo colocación. Pendientes prueba visual real en iOS/Android y SQL ejecutado en Supabase.

## Lanzamiento gradual
- **Fase 1:** mapa navegable, casas, modo simulación sin SQL, control de parcelas + hub. Código en GitHub.
- **Fase 2:** aplicar la migración de A1/B1, probar en Supabase con Javi y otro usuario; confirmar permisos y colisiones; corregir bugs de móvil.
- **Fase 3:** activar acceso social al nuevo mapa para todos y tablero de logros; mantener opciones experimentales como piloto privado cuando aún no sean aptas.
- **Fase 4:** economía exclusivamente cosmética con XP verificado, más misiones y visitas.

## Verificación / criterios de aceptación
- Android e iOS: arrastre sin desplazamientos accidentales, pellizco y zoom, botones sin salir de pantalla, áreas seguras de PWA.
- Una parcela no puede asignarse a dos jugadores ni reservarse si es río/monumento.
- Un usuario no puede mover la casa de otro ni duplicar una visita diaria.
- Las fichas conservan los retratos del grupo; no se sustituyen por emojis cuando existe avatar.
- Modo sin SQL es explícito, y no fabrica casas persistidas ni recompensas.
- UI y JavaScript sintácticos, tests de lógica de colocación, colisiones y renderizado. Pruebas reales con sesión y SQL se documentan aparte.
