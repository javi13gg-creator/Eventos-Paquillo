# 🎭 Avatares personalizados de Paquillo World

## Tanda 1: 10 avatares aprobados

Nombres del lote: **Adri, Carla, David, Diego, Inés, Iván, Javi, JB, Joaquín y Leti**.

Las imágenes originales están preparadas en un ZIP adjunto en la conversación de ChatGPT:
`PAQUILLO_WORLD_10_AVATARES_APROBADOS.zip`. Al descomprimirlo encontrarás diez archivos WebP con nombre normalizado (`adri.webp`, `ines.webp`, `joaquin.webp`, etc.).

### Activación en Supabase (una sola vez)

1. Abre **Supabase → SQL Editor**.
2. Ejecuta el archivo [paquillo-world-avatares.sql](paquillo-world-avatares.sql).
3. Esta configuración crea el bucket público `paquillo-characters` y una función que **solo permite a la cuenta administradora** asignar avatares a perfiles vinculados, sin modificar experiencia ni fotos de la web.

### Importar los diez avatares desde la web

1. Descarga y descomprime el ZIP de esta conversación.
2. Entra en Paquillo Events como administrador → **⚙️ Ajustes → Administración**.
3. Abre **🎭 Avatares personalizados de Paquillo World → Gestionar avatares del grupo**.
4. En **Seleccionar imágenes**, selecciona de una sola vez los diez WebP descomprimidos.
5. Comprueba los nombres reconocidos y pulsa **🚀 Asignar avatares seleccionados**.
6. El panel indicará cada éxito y fallo por persona. Si un miembro todavía no tiene una cuenta vinculada aparecerá como pendiente; no se asignará a una cuenta incorrecta.

### Resultado

Tras importar, los avatares serán visibles para todos desde:

- **Paquillo World → Perfil**: muñeco de cuerpo entero con su pose y una ligera animación CSS.
- **Paquillo World → Equipo y Rankings**: imagen personalizada, con foto previa como respaldo.
- **Carrera Paquillera**: cuerpo entero en lugar de la cabeza sobre un cuerpo genérico.

Las fotos reales de **Cumpleaños** y **Directorio** no se sustituyen. El usuario que ya hubiera elegido `character_image_url` podrá cambiarlo mediante una nueva importación administrativa.

## Tandas siguientes

Pendientes de generar y aprobar individualmente: **Alba, Jorge R., Julia, Laura, María, Mireia, Richy, Román, Rodri y Sara**.
Las otras cuatro personas para completar los 24 son **Santi, Sandra, Sofía y Rubén**.

No se debe asignar una imagen genérica o repetir a una misma persona con nombres diferentes: cada personaje necesita su propia referencia.

## Archivos técnicos

- `paquillo-avatar-admin.js` — interfaz de importación, asociación por nombre normalizado, subida a Storage y asignación.
- `paquillo-world-avatares.sql` — bucket protegido y función de asignación verificada en servidor.
- `paquillo-world.js` — usa `character_image_url` al renderizar perfiles y equipo.
- `paquillo-world-app.css` — animación ligera, respeta `prefers-reduced-motion`.
- `paquillo-race.js` — dibujo de personaje completo cuando la imagen viene del bucket.
- `index.html` — integra el panel administrador y carga versiones nuevas con caché actualizada.

**Estado:** interfaz y código publicados en GitHub. La importación de archivos reales y el SQL aún deben ejecutarse en Supabase; no se deben confundir con una asignación ya realizada.