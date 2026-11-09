-- Actualiza las fechas completas de cumpleaños de los miembros de Paquillo Events.
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Se usa el nombre visible exacto de group_members.display_name.

begin;

with birthdays(display_name, birthday) as (
  values
    ('Leti', date '1994-01-14'),
    ('Adri', date '1996-07-22'),
    ('Alba', date '1994-03-03'),
    ('Carla', date '1993-04-30'),
    ('David', date '1992-03-06'),
    ('Diego', date '1990-04-22'),
    ('Ines', date '1994-10-01'),
    ('Iván', date '1992-09-28'),
    ('Joaquín', date '1991-07-14'),
    ('JB', date '1992-10-08'),
    ('Jorge R', date '1996-09-24'),
    ('Julia', date '1992-06-15'),
    ('Laura', date '1994-05-20'),
    ('María', date '1994-01-14'),
    ('Mireia', date '1994-02-05'),
    ('Richy', date '1990-02-26'),
    ('Román', date '1993-12-01'),
    ('Rodri', date '1989-04-27'),
    ('Sara', date '1993-06-22'),
    ('Santi', date '1992-02-16'),
    ('Sandra', date '1993-11-02'),
    ('Sofía', date '1992-01-16'),
    ('Javi', date '1992-04-21'),
    ('Rubén', date '1993-07-10')
)
update public.group_members as gm
set birthday = birthdays.birthday
from birthdays
where gm.display_name = birthdays.display_name
returning gm.display_name, gm.birthday;

commit;
