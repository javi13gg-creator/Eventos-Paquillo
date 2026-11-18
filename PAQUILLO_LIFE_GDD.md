# Paquillo World · Evolución hacia Paquillo Life
Documento de diseño de juego y plan técnico. 18/11/2026.

**Estado: primer prototipo visual de habitación integrado en World bajo feature flag; no es aún el modo Life jugable completo.**

## Política de visibilidad para próximas fases
La vista previa de Life es privada para la **cuenta de Javi**, no para todos los administradores ni para cualquiera que conozca el enlace. En World se consulta `PaquilloLifePreview.enabled` (getter dinámico); `open()` valida la identidad de nuevo. El perfil procede de `user_profiles` mediante la sesión Auth actual. No volver a habilitar funciones nuevas con simples parámetros de URL.

**Limitación importante:** esta compuerta JavaScript protege la interfaz frente a otros usuarios normales, pero no es un control de acceso a recursos públicos de GitHub Pages. Antes de guardar estado personal, imágenes privadas o XP, crear RLS y RPC en Supabase vinculadas al `auth.uid()` autorizado o a un permiso de testers validado en servidor. La fuente y los assets estáticos siguen siendo públicos, sin datos privados.

## Avance 18/11/2026 · Fase A — primer hogar en modo prueba
- Ilustración vectorial `paquillo-life-room.svg`: casa tropical con mar, cama, nevera, recreativa, zona de ducha y espacio libre para el protagonista.
- Módulo aislado `paquillo-life-preview.js` + estilos `paquillo-life-preview.css`.
- **Acceso privado por identidad autenticada (18/11/2026):** solo la cuenta cuyo `user_profiles.username` sea `Javi` y cuyo `role` sea `admin` puede ver y abrir **Mi hogar · Vista previa**; se comprueba además sesión autenticada y fin de carga de auth. La URL `?life-preview=1` no habilita acceso a otros usuarios ni es necesaria para Javi.
- Hero = imagen de personaje aprobado en `PaquilloWorldCharacters.imageFor`, con animación básica de respiración en CSS.
- Objetos tocables: nevera (comer), ducha y cama (reacciones visuales sin guardar). Recreativa = transición real al Arcade existente de World.
- Escena fullscreen, botones táctiles, safe areas y preferencia de movimiento reducido. Botón de vuelta a World.
- **No hay necesidades persistentes, XP nuevo, partidas duplicadas ni ninguna escritura a Supabase.** Todos los demás módulos de Events/World mantienen su comportamiento.
- Esta es una **primera maqueta interactiva para probar composición y navegación**. Las animaciones todavía son básicas y el fondo SVG se debe reemplazar/refinar con arte final de calidad de juego tras aprobación visual.
- **Pendiente de QA móvil real:** Android, iPhone/PWA, legibilidad, posicionamiento de objetos, rendimiento y estados sin avatar.
- **Próximo paso recomendado:** convertir la habitación ilustrada aprobada en arte exportable para el motor; prototipo de animaciones de un personaje piloto con sprites consistentes (comer, descansar, ducha e idle), y conectar Memoria con una celebración, sin XP hasta existir validación en servidor.


## Visión de producto
**World es el universo; Life es la vida de tu personaje dentro de ese universo.**
La aplicación sigue llamándose Paquillo World. No crear otro login, otra app, otra tabla de XP ni dos menús de juegos.

**World actual** = lobby tropical + 24 personajes + Trivial, Reflejos, Memoria y Carrera + rankings y perfil.
**Life nuevo** = personaje animado + casa interactiva + cuidados + evolución + conexión entre minijuegos y progreso.
**Paquillo Events** = actividades reales verificables (planes, asistencia, encuestas, cumpleaños).

## Arquitectura de producto: una sola experiencia
1. **Mi hogar**: escena principal. MiniPaquillo vive en una habitación tropical con elementos interactivos.
2. **Arcade**: catálogo de los cuatro juegos existentes, sin duplicarlos.
3. **Barrio**: los 24 Paquillos, fichas y, más adelante, casas visitables.
4. **Ranking**: XP social real y récords de minijuegos, diferenciados.
5. **Mi personaje**: progreso, apariencia, accesorios, logros e historial.

La imagen de lobby aprobada se mantiene como referencia para la Plaza / Barrio; no desperdiciar el mundo ya construido.
Conservar el botón **Volver a Paquillo Events**, navegación fullscreen independiente y mobile-first (uso casi 100 % móvil).

## Loop principal
**Entrar → ver a tu personaje → cuidarlo → jugar una partida corta → ver su reacción y evolución → visitar amigos → salir.**
Tres indicadores pequeños y legibles: energía, ánimo y bienestar.
Acciones: comer, ducharse, dormir y jugar. Cada una debe tener una animación visual satisfactoria, sonido opcional y respuesta inmediata.
Las necesidades decaen lentamente con un mínimo seguro: nunca morir, perder XP ni sufrir castigo por varios días sin conexión.
Cuidar repetidamente nunca genera XP infinito. Sesiones de 1–4 minutos; rachas opcionales nunca punitivas.

## Progresión
La única fuente de nivel es el XP ya existente: 250 XP por nivel en el código actual. Nunca reiniciar avances.
Etapas de aspecto sugeridas: Novato (Nv1), Habitante (Nv3), Veterano (Nv7), Leyenda (Nv14), por validar según XP real.
Crecer no significa convertir en bebé al amigo: **evolucionan vestimenta, gestos, habitación, accesorios y animaciones**, manteniendo parecido humano.
Desbloqueables cosméticos y logros, sin moneda adicional ni tienda.
Los juegos mejoran de inmediato el ánimo y los logros. **No conceder XP competitivo solo por aceptar una puntuación enviada desde JavaScript.**
Antes de dar XP por minijuegos debe existir una RPC de sesión y recompensa con idempotencia, controles de ritmo, límite por juego/día y validación del resultado.

## Base existente verificada en GitHub
- paquillo-world.js: cinco secciones principales, estado autenticado, niveles, XP, puntuaciones, Trivial, Reflejos y Memoria.
- paquillo-race.js: carrera canvas con ranking.
- paquillo-world-characters.js: 24 personajes aprobados con ilustraciones de aspecto 3D.
- paquillo-world-fase1.sql: XP por crear plan (+100), confirmar asistencia (+10) y crear encuesta (+40).
- El propio frontend indica que los juegos actuales **no otorgan XP**.
- **Los 24 retratos actuales son imágenes, no modelos 3D con esqueleto**. Para animarlos con calidad serán necesarios spritesheets o partes articuladas.
- La aplicación efectiva del SQL y las pruebas en iPhone/Android requieren verificación aparte.

## Dirección de arte: calidad de juego de verdad
Estética tropical 3D cartoon, basada en la referencia visual 03_concepto_lobby_paqui_world.png.
Escena de hogar **2.5D** con profundidad y perspectiva, no dashboard de tarjetas ni botones gigantes.
Personaje en primer plano, reconocible, estilo mini / chibi moderado; cama, nevera, ducha, ventana, suelo y decoraciones interactivas.
Una misma biblioteca de poses de personaje piloto: idle con respiración y parpadeo, desplazamiento corto, comer, dormir, alegría, mal humor y celebración.
Animaciones con anticipación, acción y reacción; sombras coherentes, iluminación integrada, partículas con moderación y microinteracciones.
Producir y aprobar sprites consistentes para los otros 23. No sustituir caras por avatares genéricos.

## Propuesta técnica
- Mantener GitHub Pages + Supabase. Una sola autenticación y un solo personaje por usuario.
- Motor recomendado para escena: **Phaser 4**, cargado bajo demanda únicamente en el hogar (no rehacer los juegos actuales); separar Scene, Renderer, Rules, Repository y World Bridge en módulos.
- UI de navegación en DOM accesible, escena táctil renderizada por el motor. Render escalable y assets diferidos según tamaño de móvil.
- Primero una vista de desarrollo tras feature flag; no reemplazar Home actual antes de alcanzar calidad.
- Persistencia futura mediante migración idempotente: paqui_life_state (needs + last_sync_at), paqui_life_action_log (acciones con anti-spam), paqui_life_unlocks (desbloqueos), paqui_life_room (decoración).
- RLS por propietario y funciones de servidor; visitas a otros solo con datos públicos autorizados. Timestamp en servidor, sin escritura cada segundo.
- Recompensas de juegos solo tras diseño y pruebas de validación, idempotencia y límites.
- Motor y assets deben soportar modo vertical móvil, pausas, rotación y pérdida de conexión, con fallback.

## Orden de trabajo: vertical slice antes que muchas features
**Fase A: arte y experiencia**
Mockup de una sola habitación con un personaje piloto y tres animaciones, en formato 390×844 y 360×800. Validar visualmente antes de programar botones.
**Fase B: slice funcional**
Habitación animada, cuidado 3 estados, persistencia de prueba, integración completa con **Memoria Paquillera**, celebración al terminar, y un objeto desbloqueable por nivel real.
**Fase C: producción**
Aprobar y adaptar los 24 personajes, integrar juegos restantes, misiones, progreso persistido y QA con dos usuarios y PWA Android/iPhone.
**Fase D: social**
Barrio visitable, reacciones y regalos cosméticos, desafíos por turnos y después en directo si es fiable y divertido.

## Definition of Done (para abrir a todo el grupo)
- Personaje reconocible, escena bonita y animada, sin placeholder visible como versión final.
- Fluidez en móvil real (60 fps donde sea viable, al menos 30 fps estables en móvil medio).
- Toda acción tiene respuesta visual/sonora opcional, estado real guardado tras refrescar.
- El juego de Memoria puede jugarse desde el hogar y regresar con premio visual real.
- No se duplica ningún menú, login, personaje o contador de XP.
- El avatar no pierde progreso si el usuario no entra varios días.
- Supabase RLS probado con dos usuarios; no escribir XP arbitrario desde consola.
- Sin regresiones en Paquillo Events ni en el World actual.
- Feature flag para activar/desactivar y rollback sencillo.

## Decisiones recomendadas
**Sí:** MiniPaquillo humano, 2.5D premium, una sola progresión XP, un solo Arcade, la isla existente como Plaza/Barrio.
**No:** otro juego independiente, mascota genérica que tape al avatar, 24 modelos improvisados, un simple HTML con barras, XP por pulsar botones, monedas, castigos por inactividad.

**Siguiente tarea concreta:** crear la dirección artística aprobable del hogar y del personaje piloto, y después montar una escena de prueba aislada. Hasta entonces, la aplicación de producción permanece sin cambios.
