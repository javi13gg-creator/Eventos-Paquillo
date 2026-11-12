/* Paquillo World · hub inicial: progreso, personajes y zona arcade */
(()=>{
 const $=id=>document.getElementById(id),target=$('paquiWorldContent');
 if(!target)return;
 let busy=false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
 const level=xp=>Math.floor(Math.max(0,Number(xp)||0)/250)+1;
 const xpLabel={event_created:'Creaste un plan',attendance_confirmed:'Confirmaste asistencia',poll_created:'Creaste una encuesta'};
 const avatar=(url,name,large=false)=>{
  const cls='pw-avatar'+(large?' pw-avatar-large':'');
  return '<div class="pw-avatar-wrap '+(large?'pw-avatar-wrap-large':'')+'">'+(url?'<img class="'+cls+'" src="'+esc(url)+'" alt="Foto provisional de '+esc(name)+'" onerror="this.remove()">':'')+'<span class="'+cls+' pw-avatar-fallback">'+esc(initials(name))+'</span></div>';
 };
 function renderGames(){
  return '<section class="pw-section"><div class="pw-section-heading"><div><span class="pw-kicker">PAQUILLO ARCADE</span><h3>🕹️ Zona de juegos</h3><p>Elige rival, demuestra lo que vales y suma victorias.</p></div><span class="pw-coming">EN CONSTRUCCIÓN</span></div><div class="pw-game-grid">'+
   '<article class="pw-game-card"><div class="pw-game-art pw-art-trivia">🧠</div><div><span class="pw-game-tag">POR TURNOS Y EN DIRECTO</span><h4>Trivial Paquillero</h4><p>Preguntas sobre el grupo, sus viajes y sus mejores anécdotas.</p><b>Próximamente</b></div></article>'+
   '<article class="pw-game-card"><div class="pw-game-art pw-art-duel">⚡</div><div><span class="pw-game-tag">DUELOS</span><h4>Duelo de reflejos</h4><p>Retos rápidos para enfrentarte a otro Paquillo y comparar tiempos.</p><b>Próximamente</b></div></article>'+
   '<article class="pw-game-card"><div class="pw-game-art pw-art-race">🏁</div><div><span class="pw-game-tag">MULTIJUGADOR</span><h4>Carreras Paquilleras</h4><p>Tu personaje compite en carreras cortas contra el resto.</p><b>Próximamente</b></div></article>'+
   '<article class="pw-game-card"><div class="pw-game-art pw-art-who">🕵️</div><div><span class="pw-game-tag">EL GRUPO ES LA PISTA</span><h4>¿Quién es quién?</h4><p>Adivina a quién pertenece cada foto, frase o anécdota.</p><b>Próximamente</b></div></article>'+
  '</div></section>';
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
    db.from('paqui_world_xp_ledger').select('user_id,points,action,created_at').order('created_at',{ascending:false}).limit(80)
   ]);
   if(membersRes.error)throw membersRes.error;
   const members=membersRes.data||[],xpReady=!profilesRes.error&&!ledgerRes.error;
   const profiles=new Map((profilesRes.data||[]).map(p=>[p.user_id,p])),ledger=ledgerRes.data||[];
   const mine=members.find(m=>m.auth_user_id===uid),myProfile=profiles.get(uid)||{total_xp:0};
   const xp=xpReady?(Number(myProfile.total_xp)||0):0,lvl=level(xp),progress=xp%250,percent=Math.round(progress/250*100);
   const ranked=members.map(m=>({...m,xp:xpReady?(Number(profiles.get(m.auth_user_id)?.total_xp)||0):0})).sort((a,b)=>b.xp-a.xp||a.display_name.localeCompare(b.display_name,'es'));
   const rank=mine?ranked.findIndex(m=>m.auth_user_id===uid)+1:0,recent=xpReady?ledger.filter(x=>x.user_id===uid).slice(0,5):[];
   const notice=xpReady?'':'<div class="pw-notice">⚙️ <b>La experiencia está pendiente de activación.</b> La sección ya está preparada; ejecuta <code>paquillo-world-fase1.sql</code> en Supabase para empezar a sumar XP.</div>';
   const gallery=ranked.map((m,i)=>'<article class="pw-character-card"><div class="pw-character-portrait">'+avatar(profiles.get(m.auth_user_id)?.character_image_url||m.avatar_url,m.display_name,true)+'<span class="pw-character-status">AVATAR 3D PENDIENTE</span></div><div class="pw-character-info"><b>'+esc(m.display_name)+'</b><span>Nivel '+level(m.xp)+' · '+m.xp+' XP</span><small>'+(i<3&&m.xp>0?['🥇','🥈','🥉'][i]+' En el podio':'Personaje Paquillo')+'</small></div></article>').join('');
   target.innerHTML=notice+
    '<div class="pw-grid pw-overview"><article class="pw-card pw-main-card"><div class="pw-me">'+avatar(myProfile.character_image_url||mine?.avatar_url,mine?.display_name||'Tu personaje',true)+'<div><div class="pw-muted">TU PERSONAJE</div><div class="pw-level">Nivel '+lvl+'</div><b>'+esc(myProfile.character_name||mine?.display_name||'Paquillo')+'</b><div class="pw-muted">'+xp+' XP acumulados</div></div></div><div class="pw-xpbar"><span style="width:'+percent+'%"></span></div><div class="pw-xp-caption"><span>'+progress+' / 250 XP</span><b>'+((250-progress)%250||250)+' XP para nivel '+(lvl+1)+'</b></div><p class="pw-muted">Tu avatar ilustrado y sus accesorios se incorporarán en la siguiente etapa.</p></article><article class="pw-card pw-rank-card"><div class="pw-muted">TU POSICIÓN EN EL GRUPO</div><div class="pw-rank-big">#'+(rank||'—')+'</div><b>de '+members.length+' Paquillos</b><p class="pw-muted">La clasificación se actualiza con tus acciones.</p></article></div>'+
    '<section class="pw-section"><div class="pw-section-heading"><div><span class="pw-kicker">EL EQUIPO</span><h3>🧍 Los personajes</h3><p>Todo el grupo tendrá su propio muñeco 3D, basado en sus fotos.</p></div><span class="pw-count">'+members.length+' miembros</span></div><div class="pw-character-grid">'+(gallery||'<div class="empty">Todavía no hay miembros activos.</div>')+'</div></section>'+
    '<div class="pw-grid pw-lower"><article class="pw-card"><h3>🏆 Clasificación XP</h3><div class="pw-ranking">'+ranked.map((m,i)=>'<div class="pw-rank"><span>'+(i===0&&m.xp?'🥇':i===1&&m.xp?'🥈':i===2&&m.xp?'🥉':(i+1)+'.')+'</span>'+(m.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="" onerror="this.style.display=\'none\'">':'')+'<b>'+esc(m.display_name)+'</b><strong>'+m.xp+' XP</strong></div>').join('')+'</div></article><article class="pw-card"><h3>✨ Cómo ganar experiencia</h3><div class="pw-action-list"><div class="pw-action"><span>📅 Crear una propuesta de plan</span><b>+100 XP</b></div><div class="pw-action"><span>🙋 Confirmar asistencia</span><b>+10 XP</b></div><div class="pw-action"><span>🗳️ Crear una encuesta</span><b>+40 XP</b></div><div class="pw-action pw-action-soon"><span>🎮 Jugar y completar retos</span><b>Próximamente</b></div></div><p class="pw-muted">Cada acción válida se contabiliza una sola vez.</p></article></div>'+
    '<div class="pw-grid"><article class="pw-card"><h3>📜 Tus últimas acciones</h3>'+(recent.length?'<div class="pw-action-list">'+recent.map(x=>'<div class="pw-action"><span>'+esc(xpLabel[x.action]||'Actividad Paquillo')+' · '+new Date(x.created_at).toLocaleDateString('es-ES')+'</span><b>+'+x.points+' XP</b></div>').join('')+'</div>':'<p class="pw-muted">'+(xpReady?'Todavía no tienes XP. ¡Propón un plan o confirma que vienes a uno!':'El historial aparecerá cuando activemos la experiencia.')+'</p>')+'</article><article class="pw-card"><h3>🎯 Retos y logros</h3><div class="pw-achievement-list"><div><span>📅</span><b>Primer plan</b><small>Organiza tu primer evento</small></div><div><span>🙌</span><b>Siempre presente</b><small>Participa en cinco planes</small></div><div><span>🧠</span><b>Mente Paquillera</b><small>Gana tu primer minijuego</small></div></div><p class="pw-muted">Los logros se activarán junto con los minijuegos.</p></article></div>'+
    renderGames()+'<div class="pw-bottom-note">💜 <b>Hecho por y para los Paquillos.</b> Sin compras, sin ventajas de pago y con el pique justo.</div>';
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
