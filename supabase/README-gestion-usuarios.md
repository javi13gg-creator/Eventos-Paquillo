# Gestión de usuarios sin correo — Paquillo Events

## Estado
La interfaz está incluida en `index.html`, y la función de backend en `supabase/functions/paqui-manage-users/index.ts`. **La función no se despliega automáticamente por subirla a GitHub Pages.**

## Despliegue necesario en Supabase
1. Abrir el proyecto Supabase `uljwhumngqrkdwqixuqq` → Edge Functions.
2. Crear la función `paqui-manage-users` y pegar el contenido de `supabase/functions/paqui-manage-users/index.ts`. También se puede desplegar con Supabase CLI: `supabase functions deploy paqui-manage-users`.
3. Mantener habilitada la verificación JWT. Configurar los secretos `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno de la función (los secretos propios del proyecto suelen estar disponibles automáticamente).
4. Probar con la cuenta administradora creando un usuario de prueba con contraseña de al menos 10 caracteres; iniciar sesión con su nombre; probar cambio de contraseña desde Perfil y restablecimiento desde Administración.
5. Comprobar que la tabla `user_profiles` permite `role='member'` y que `group_members` acepta los campos `display_name,auth_user_id,is_active`. Si existen columnas obligatorias adicionales, adaptar la inserción en la función.

## Seguridad
- La clave service-role se usa únicamente dentro de la Edge Function; nunca en el HTML.
- La función verifica el token de sesión y el rol admin de `user_profiles`.
- La contraseña nunca se almacena en las tablas de la aplicación.
- La recuperación de contraseña sin correo solo la realiza el administrador.
- La autenticación de usuario usa un correo interno derivado del nombre de usuario (`slug@paquillo-events.com`) por compatibilidad con Supabase Auth; no se solicita correo real.
- Si ya existe un miembro en `group_members` con el mismo nombre, se intenta vincular su cuenta.
- Las fichas estáticas de PEOPLE siguen existiendo para compatibilidad con la interfaz; la nueva autenticación ya no exige aparecer en esa lista.
