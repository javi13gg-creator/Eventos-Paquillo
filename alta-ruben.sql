-- PAQUILLO EVENTS · alta de Rubén
-- 1) En Supabase > Authentication > Users > Add user, crea primero:
--    Email: ruben@paquillo-events.com
--    Activa Auto Confirm User.
-- 2) Después ejecuta este archivo completo en SQL Editor.
-- No guarda ni modifica contraseñas; el alta de Auth se hace desde el panel seguro.

do $$
declare
  v_user_id uuid;
  v_member_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'ruben@paquillo-events.com'
  limit 1;

  if v_user_id is null then
    raise exception 'No existe ruben@paquillo-events.com en Authentication. Crea primero el usuario y vuelve a ejecutar este SQL.';
  end if;

  insert into public.user_profiles(user_id, username, role)
  values (v_user_id, 'Rubén', 'member')
  on conflict (user_id) do update
    set username = excluded.username,
        role = 'member';

  select id into v_member_id
  from public.group_members
  where lower(display_name) in ('rubén', 'ruben')
  order by case when display_name = 'Rubén' then 0 else 1 end
  limit 1;

  if v_member_id is null then
    insert into public.group_members
      (display_name, auth_user_id, birthday, is_active, avatar_url)
    values
      ('Rubén', v_user_id, date '2000-07-10', true, null);
  else
    update public.group_members
    set display_name = 'Rubén',
        auth_user_id = v_user_id,
        birthday = date '2000-07-10',
        is_active = true,
        avatar_url = null
    where id = v_member_id;
  end if;
end $$;

-- El año 2000 es solo un año neutro para almacenar el día/mes (10 de julio);
-- la web muestra el día y el mes, no calcula la edad.
