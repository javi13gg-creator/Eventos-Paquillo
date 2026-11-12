/* Paquillo World · pantalla de videojuego */
(()=>{
 const $=id=>document.getElementById(id),target=$('paquiWorldContent');
 if(!target)return;
 let busy=false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
 const level=xp=>Math.floor(Math.max(0,Number(xp)||0)/250)+1;
 const xpLabel={event_created:'Organizaste un plan',attendance_confirmed:'Te apuntaste a un plan',poll_created:'Creaste una encuesta'};
 const avatar=(url,name,large=false)=>{
  const cls='pw-avatar'+(large?' pw-avatar-large':'');
  return '<div class="pw-avatar-wrap'+(large?' pw-avatar-wrap-large':'')+'">'+
   (url?'<img class="'+cls+'" src="'+esc(url)+'" alt="Personaje provisional de '+esc(name)+'" onerror="this.style.display=\'none\';this.nextElementSibling.hidden=false">':'')+
   '<span class="'+cls+' pw-avatar-fallback"'+(url?' hidden':'')+'>'+esc(initials(name))+'</span></div>';
 };
 function renderGames(){
  const games=[
   ['trivia','🧠','TRIVIAL PAQUILLERO','Preguntas, anécdotas y secretos del grupo.','Por turnos · En directo'],
   ['duel','⚡','DUELO DE REFLEJOS','Un cara a cara para ver quién tiene los reflejos más rápidos.','Duelo · 2 jugadores'],
   ['race','🏁','CARRERAS PAQUILLERAS','Tu personaje en una carrera frenética contra los demás.','Multijugador · En directo'],
   ['who','🕵️','¿QUIÉN ES QUIÉN?','Adivina a quién pertenece cada foto, frase o historia.','Por turnos · Grupo']
  ];
  return '<section class="pw-section pw-arcade"><div class="pw-section-heading"><div><span class="pw-kicker">RECREATIVOS PAQUILLEROS</span><h3>ARCADE <i>ZONE</i></h3><p>Elige tu reto. Reta a tus amigos. Que empiece el pique.</p></div><span class="pw-coming">PRÓXIMAMENTE</span></div><div class="pw-game-grid">'+games.map(g=>'<article class="pw-game-card pw-game-'+g[0]+'"><div class="pw-game-art"><span>'+g[1]+'</span><i></i></div><div class="pw-game-copy"><small>'+g[4]+'</small><h4>'+g[2]+'</h4><p>'+g[3]+'</p><span class="pw-game-lock">🔒 EN DESARROLLO</span></div></article>').join('')+'</div></section>';
 }
 async function render(){
  if(busy)return;busy=true;
  try{
   const ctx=window.PaquilloWorldContext?.();
   if(!ctx?.client||!ctx?.currentAuthUser){target.innerHTML='<div class="empty">Inicia sesión para entrar en Paquillo World.</div>';return;}
   const db=ctx.client,uid=ctx.currentAuthUser.id;
   const [membersRes,profilesRes,ledgerRes]=await Promise.all([
    db.from('group_members').select('id,display_name,avatar_url,auth_user_id').eq('is_active',true).order('display_name'),
    db.from('paqui_world_profiles').select('user_id,total_xp,character_image_url,character_name'),
    db.from('paqui_world_xp_ledger').select('user_id,points,action,created_at').order('created_at',{ascending:false}).limit(100)
   ]);
   if(membersRes.error)throw membersRes.error;
   const members=membersRes.data||[],xpReady=!profilesRes.error&&!ledgerRes.error;
   const profiles=new Map((profilesRes.data||[]).map(p=>[p.user_id,p])),ledger=ledgerRes.data||[];
   const mine=members.find(m=>m.auth_user_id===uid),myProfile=profiles.get(uid)||{total_xp:0};
   const xp=xpReady?(Number(myProfile.total_xp)||0):0,lvl=level(xp),progress=xp%250,percent=Math.round(progress/250*100);
   const ranked=members.map(m=>({...m,xp:xpReady?(Number(profiles.get(m.auth_user_id)?.total_xp)||0):0})).sort((a,b)=>b.xp-a.xp||a.display_name.localeCompare(b.display_name,'es'));
   const rank=mine?ranked.findIndex(m=>m.auth_user_id===uid)+1:0,recent=xpReady?ledger.filter(x=>x.user_id===uid).slice(0,5):[];
   const notice=xpReady?'':'<div class="pw-notice">⚙️ <b>El sistema de experiencia está esperando a Supabase.</b> Ejecuta <code>paquillo-world-fase1.sql</code> para activar niveles y puntuaciones.</div>';
   const gallery=ranked.map((m,i)=>{
    const mineCard=m.auth_user_id===uid;
    const mp=profiles.get(m.auth_user_id);
    return '<article class="pw-character-card'+(mineCard?' is-me':'')+'"><div class="pw-character-portrait"><div class="pw-character-glow"></div>'+avatar(mp?.character_image_url||m.avatar_url,m.display_name,true)+'<span class="pw-character-status">'+(mp?.character_image_url?'PERSONAJE PAQUILLERO': 'AVATAR EN PREPARACIÓN')+'</span>'+(mineCard?'<span class="pw-you-tag">TÚ</span>':'')+'</div><div class="pw-character-info"><b>'+esc(m.display_name)+'</b><div><span class="pw-level-pill">NIVEL '+level(m.xp)+'</span><strong>'+m.xp+' XP</strong></div><small>'+(i<3&&m.xp>0?['🥇 TOP 1','🥈 TOP 2','🥉 TOP 3'][i]:'MIEMBRO DEL EQUIPO')+'</small></div></article>';
   }).join('');
   const podium=ranked.slice(0,5).map((m,i)=>'<div class="pw-leader-row '+(m.auth_user_id===uid?'is-me':'')+'"><span class="pw-leader-pos">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1).padStart(2,'0'))+'</span>'+(m.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="" onerror="this.remove()">':'<span class="pw-leader-initials">'+esc(initials(m.display_name))+'</span>')+'<b>'+esc(m.display_name)+'</b><strong>'+m.xp+' <small>XP</small></strong></div>').join('');
   target.innerHTML='<div class="pw-world">'+notice+
    '<header class="pw-hero"><div class="pw-hero-sparks"></div><div class="pw-hero-copy"><div class="pw-brandline"><span class="pw-brand-icon">P!</span><span>EL UNIVERSO DE LOS PAQUILLOS</span><b>TEMPORADA 01</b></div><h2>PAQUILLO<br><em>WORLD</em></h2><p>Tu pandilla. Tu personaje. Tu leyenda.</p><div class="pw-hero-tags"><span>🎮 JUEGA</span><span>⚡ SUBE DE NIVEL</span><span>🏆 CONQUISTA EL GRUPO</span></div></div><div class="pw-hero-player"><div class="pw-hero-orbit pw-orbit-one"></div><div class="pw-hero-orbit pw-orbit-two"></div><div class="pw-hero-platform"></div><div class="pw-hero-avatar">'+avatar(myProfile.character_image_url||mine?.avatar_url,mine?.display_name||'Tu personaje',true)+'</div><div class="pw-hero-level">LVL <b>'+lvl+'</b></div><div class="pw-hero-name">'+esc(mine?.display_name||'TU PERSONAJE')+'</div><span class="pw-hero-caption">PLAYER 01 · PAQUILLO</span></div><div class="pw-hero-scribble">¡A JUGAR!</div></header>'+
    '<div class="pw-stats-strip"><div><small>EXPERIENCIA</small><b>'+xp+' <i>XP</i></b></div><div><small>POSICIÓN</small><b>#'+(rank||'—')+' <i>/ '+members.length+'</i></b></div><div><small>NIVEL ACTUAL</small><b>'+lvl+'</b></div><div><small>HASTA EL SIGUIENTE</small><b>'+((250-progress)%250||250)+' <i>XP</i></b></div></div>'+
    '<section class="pw-section pw-player-progress"><div class="pw-section-heading"><div><span class="pw-kicker">TU PROGRESO</span><h3>SUBE DE NIVEL</h3><p>Cada plan y cada participación te acerca a la siguiente categoría.</p></div><span class="pw-count">NIVEL '+lvl+'</span></div><div class="pw-progress-track"><div class="pw-progress-fill" style="width:'+percent+'%"></div><span class="pw-progress-label">'+progress+' / 250 XP</span></div></section>'+
    '<section class="pw-section pw-roster"><div class="pw-section-heading"><div><span class="pw-kicker">SELECCIÓN DE PERSONAJES</span><h3>LA PANDILLA <i>PAQUILLO</i></h3><p>24 amigos. 24 personajes. Una sola pandilla.</p></div><span class="pw-count">'+members.length+' PLAYERS</span></div><div class="pw-character-grid">'+(gallery||'<div class="empty">Todavía no hay miembros activos.</div>')+'</div></section>'+
    '<div class="pw-feature-grid"><section class="pw-section pw-leaderboard"><div class="pw-section-heading"><div><span class="pw-kicker">EL PODIO</span><h3>TOP <i>PAQUILLERO</i></h3><p>¿Quién está dominando la temporada?</p></div><span class="pw-trophy">🏆</span></div><div class="pw-leader-list">'+(podium||'<p class="pw-muted">Aún no hay puntuaciones.</p>')+'</div><div class="pw-your-rank">TU PUESTO EN LA CLASIFICACIÓN <b>#'+(rank||'—')+'</b></div></section>'+
    '<section class="pw-section pw-how"><div class="pw-section-heading"><div><span class="pw-kicker">CÓMO CONSEGUIR XP</span><h3>GANA PUNTOS</h3><p>Participar tiene recompensa.</p></div><span class="pw-trophy">⚡</span></div><div class="pw-xp-actions"><div><span>📅</span><b>Crear un plan</b><strong>+100 XP</strong></div><div><span>🙋</span><b>Confirmar asistencia</b><strong>+10 XP</strong></div><div><span>🗳️</span><b>Crear una encuesta</b><strong>+40 XP</strong></div><div><span>🎮</span><b>Jugar minijuegos</b><strong>PRONTO</strong></div></div></section></div>'+
    '<div class="pw-feature-grid"><section class="pw-section pw-activity"><div class="pw-section-heading"><div><span class="pw-kicker">TU HISTORIAL</span><h3>ÚLTIMOS MOVIMIENTOS</h3></div><span class="pw-trophy">📜</span></div>'+(recent.length?'<div class="pw-activity-list">'+recent.map(x=>'<div><span>✦</span><b>'+esc(xpLabel[x.action]||'Actividad Paquillo')+'</b><small>'+new Date(x.created_at).toLocaleDateString('es-ES')+'</small><strong>+'+x.points+' XP</strong></div>').join('')+'</div>':'<p class="pw-muted">'+(xpReady?'Todavía no tienes XP. ¡Empieza proponiendo un plan!':'El historial aparecerá al activar la experiencia.')+'</p>')+'</section><section class="pw-section pw-achievements"><div class="pw-section-heading"><div><span class="pw-kicker">OBJETIVOS</span><h3>LOGROS</h3></div><span class="pw-trophy">🎖️</span></div><div class="pw-achievement-chips"><span>📅 PRIMER PLAN</span><span>🙌 SIEMPRE PRESENTE</span><span>✈️ ALMA VIAJERA</span><span>🧠 MENTE PAQUILLERA</span></div><p>Los títulos se irán desbloqueando con tus hazañas.</p></section></div>'+
    renderGames()+'<footer class="pw-world-footer">PAQUILLO WORLD <span>·</span> HECHO PARA UNA PANDILLA ÚNICA 💜</footer></div>';
  }catch(e){
   target.innerHTML='<div class="empty">No se ha podido cargar Paquillo World: '+esc(e.message||e)+'<br><small>Comprueba tu conexión y los permisos de Supabase.</small><br><button class="btn secondary" id="pwRetry" type="button">Reintentar</button></div>';
   $('pwRetry')?.addEventListener('click',render);
  }finally{busy=false;}
 }
 window.addEventListener('paqui-world-ready',()=>{if(location.hash==='#world')render();});
 document.addEventListener('click',e=>{if(e.target.closest('[data-t="world"]'))setTimeout(render,0);});
 window.addEventListener('hashchange',()=>{if(location.hash==='#world')render();});
 if(location.hash==='#world')render();
})();
