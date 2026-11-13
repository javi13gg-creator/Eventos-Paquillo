# Activación de notificaciones push manuales · Paquillo Events

El centro de avisos ya está disponible en la web, dentro de ⚙️ Ajustes → Administración → Avisos push manuales.

**Importante:** GitHub Pages solo aloja el frontend. Para enviar notificaciones reales es necesario desplegar la Edge Function en el proyecto Supabase. El botón Enviar permanecerá deshabilitado hasta que el backend y el historial estén disponibles.

## Paso 1. Ejecutar SQL

En Supabase → SQL Editor, ejecuta el archivo `supabase/paqui-manual-push.sql` del repositorio. Crea el historial privado de envíos. No elimina ni modifica las tablas que ya usas.

## Paso 2. Revisar los secretos VAPID

En Supabase → Edge Functions → Secrets, comprueba:

- `VAPID_PUBLIC_KEY` = la misma clave pública con la que los usuarios se suscribieron a push (está en `index.html` como `PAQUI_VAPID_PUBLIC_KEY`).
- `VAPID_PRIVATE_KEY` = la clave PRIVADA correspondiente, que ya debe existir en tu configuración de envíos push.
- `VAPID_SUBJECT` = un correo de contacto real con formato `mailto:correo@example.com`.

Las Edge Functions suelen disponer de `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` como variables de servidor en proyectos que usan las claves heredadas. Verifica su disponibilidad. **Nunca copies `VAPID_PRIVATE_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` al código HTML, al chat o a GitHub.**

Si utilizas un par VAPID nuevo en vez del actual, tendrás que pedir a cada usuario que vuelva a suscribirse desde Ajustes → Notificaciones push.

## Paso 3. Desplegar la función

Función nueva: `paquillo-manual-push`.

En el dashboard de Supabase, abre Edge Functions → Deploy a new function → Editor. Copia el contenido de `supabase/functions/paquillo-manual-push/index.ts` y despliega con el nombre `paquillo-manual-push`.

Alternativamente, desde un equipo con Supabase CLI, tras vincular el proyecto, ejecuta:

```bash
supabase functions deploy paquillo-manual-push
```

Mantén habilitada la comprobación JWT de la función. Además del JWT, el código consulta el rol de administrador de la cuenta en `user_profiles` del servidor.

## Paso 4. Uso desde la web

1. Entra en la web como administrador → ⚙️ Ajustes → Administración.
2. En Avisos push manuales, escoge Anuncio importante o Recordatorio de plan.
3. En anuncios puedes indicar a qué sección abre el aviso; en recordatorios elige un plan existente y todos los suscritos o solo los que marcaron «Voy»/«Quizá».
4. Escribe título y mensaje. Consulta la vista previa, pulsa «Comprobar destinatarios» para obtener usuarios y dispositivos sin enviar nada.
5. Al pulsar «Enviar aviso push», aparece una confirmación con destinatarios y contenido. Solo al confirmar se hace el envío.

El historial muestra intentos y notificaciones aceptadas por los servicios push. Un mensaje aceptado **no garantiza que el usuario lo haya visto o leído**.

### Seguridad y límites

- Solo los usuarios con `user_profiles.role = 'admin'` pueden invocar las acciones de previsualizar, consultar el historial o enviar.
- Nunca se envía desde el navegador usando claves privadas.
- Solo se incluyen usuarios activos con preferencia `push_enabled=true` y suscripción guardada.
- Confirmación previa, identificador único por envío, intervalo mínimo de 45 segundos y registro de auditoría.
- Los enlaces se restringen a secciones internas de Paquillo Events; no se aceptan URLs arbitrarias.
- La tabla de auditoría utiliza RLS y no concede permisos a `anon` ni `authenticated`.

El formulario no reemplaza los avisos automáticos existentes (`paquillo-notify`). Es una función independiente.
