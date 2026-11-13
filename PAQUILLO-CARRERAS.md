# 🏁 Carrera Paquillera: Escape del Festival

Juego jugable y responsive, disponible desde **Paquillo World → Inicio o Juegos → Carrera Paquillera**.

## Cómo jugar

- **Saltar:** pulsa SALTAR, toca la pista, desliza hacia arriba o usa ↑ / Espacio.
- **Agacharse:** mantén pulsado AGACHARSE, desliza hacia abajo o mantén ↓.
- **Pausar:** pulsa ⏸ o la tecla P. Cambiar de aplicación pausa la partida.
- **Salir:** botón ← Volver del modal o navegación de Paquillo World.
- **Sonido:** botón 🔊/🔇 dentro del juego.

Se empieza con **3 corazones**. Al chocar con un obstáculo se pierde
uno (hay un breve periodo de inmunidad), salvo que haya escudo o Modo
Fiesta. La carrera acaba cuando se agotan. La distancia recorrida es
la puntuación principal.

El circuito tiene cinco áreas que se van alternando cada 500 metros:
Festival, Ruta viajera, Cancha, Cumpleaños y After. Obstáculos:
cervezas, dados, maletas, tartas, balones, barreras, charcos y carteles
que se esquivan agachándose.

Tickets, escudos, imán, turbo, supersalto, doble ticket y modo fiesta.
Los tickets son una puntuación adicional **local**. Los logros por
distancia se guardan en el navegador y se muestran al terminar.

El avatar del corredor usa la foto del perfil/World cuando está
disponible. Si no hay una foto usable, usa la inicial del jugador.

## Clasificaciones

- El récord personal, el semanal (desde el lunes), los tickets y logros
  se guardan siempre en \`localStorage\` en este dispositivo.
- La clasificación del grupo es **opcional**. Para activarla,
  abre Supabase → SQL Editor y ejecuta
  [paquillo-race-ranking.sql](paquillo-race-ranking.sql).
- Una vez ejecutado, los resultados se guardan con usuario autenticado
  y pueden verse en **Histórico** y **Semanal** dentro del juego.
  Cada dispositivo sigue conservando su copia local.
- Si la tabla no existe o no hay conexión a Supabase, el juego continúa
  normalmente y la sección Ranking indica que solo tiene marcas locales.

**Seguridad:** los datos de un juego renderizado en el navegador no
permiten verificar completamente que la partida sea legítima. Las
políticas RLS impiden escribir puntuaciones en nombre de otro usuario
y los límites de velocidad/tiempo detienen valores fuera de rango,
pero la clasificación compartida no es un sistema antitrampas
autoritativo.

**XP:** esta versión no asigna puntos XP a los perfiles de World:
es necesario validar partidas en un servidor de confianza antes de
vincular carreras con XP para evitar fraudes. Los XP obtenidos por
organizar eventos, confirmar asistencia y crear encuestas siguen intactos.

## Archivos

- \`paquillo-race.js\`: motor Canvas, controles, física y puntuaciones.
- \`paquillo-race.css\`: diseño mobile-first independiente.
- \`paquillo-world.js\`: apertura y cierre del minijuego.
- \`index.html\`: carga de JS/CSS con versión de caché.
- \`paquillo-race-ranking.sql\`: tabla de ranking Supabase con RLS.

La carrera no depende de vídeos, bibliotecas externas ni imágenes
generadas. Se ejecuta completamente en Canvas con gráficos y emojis
y aprovecha la foto que el usuario tenga asignada en Paquillo World.
