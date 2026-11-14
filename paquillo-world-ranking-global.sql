-- Paquillo World: clasificaciones compartidas de minijuegos (posterior a fase 2).
-- Ejecutar en Supabase SQL Editor. No borra puntuaciones ni modifica XP.
-- Las marcas proceden del navegador: ranking SOCIAL/PROVISIONAL, NO validado contra trampas.
-- No habilitar premios de XP ni paqui_world_close_day con estas marcas.
create or replace function public.paqui_world_submit_score(p_game text,p_score integer)
returns table(saved_score integer, saved_day date)
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
        v_day date := (now() at time zone 'Europe/Madrid')::date;
        v_score integer;
begin
 if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.group_members where auth_user_id=v_uid and is_active=true)
 then raise exception 'Usuario no pertenece al grupo'; end if;
 if p_game not in ('trivia','reflex','memory','races') or p_score is null then
  raise exception 'Juego o puntuación incorrectos';
 end if;
 if (p_game='trivia' and p_score not between 0 and 10)
 or (p_game='reflex' and p_score not between 1 and 10000)
 or (p_game='memory' and p_score not between 1 and 10000)
 or (p_game='races' and p_score not between 1 and 100000)
 then raise exception 'Puntuación fuera de rango'; end if;
 -- Mayor es mejor: trivial/carreras. Menor es mejor: reflejos/memoria.
 insert into public.paqui_world_daily_scores(user_id,game,day,score,updated_at)
 values(v_uid,p_game,v_day,p_score,now())
 on conflict(user_id,game,day) do update
 set score=excluded.score,updated_at=now()
 where case when p_game in ('reflex','memory')
  then excluded.score < public.paqui_world_daily_scores.score
  else excluded.score > public.paqui_world_daily_scores.score end;
 select score into v_score from public.paqui_world_daily_scores
 where user_id=v_uid and game=p_game and day=v_day;
 return query select v_score,v_day;
end $$;
revoke all on function public.paqui_world_submit_score(text,integer) from public,anon;
grant execute on function public.paqui_world_submit_score(text,integer) to authenticated;
