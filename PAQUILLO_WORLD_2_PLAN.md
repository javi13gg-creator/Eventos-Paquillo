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
