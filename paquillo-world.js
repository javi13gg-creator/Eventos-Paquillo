/* Paquillo World v5 · experiencia a pantalla completa mobile first */
(()=>{
'use strict';
const root=document.getElementById('paquiWorldContent');
if(!root)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const level=xp=>Math.floor(Math.max(0,Number(xp)||0)/250)+1;
const nameInitial=s=>String(s||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const points=n=>Number(n||0).toLocaleString('es-ES');
const actionNames={event_created:'Creaste un plan',attendance_confirmed:'Confirmaste asistencia',poll_created:'Creaste una encuesta'};
const chapters=[['home','🌴','Inicio'],['games','🎮','Juegos'],['people','👥','Equipo'],['ranking','🏆','Ranking'],['profile','⭐','Perfil']];
let state={view:'home',members:[],ranked:[],ledger:[],profiles:new Map(),mine:null,xp:0,ready:false,uid:null,loading:false,loaded:false};
let reaction={timer:null,armed:0,phase:'idle'};
const image=(src,alt,cls)=>src?'<img class="'+(cls||'')+'" src="'+esc(src)+'" alt="'+esc(alt||'')+'" loading="lazy" onerror="this.style.display=\'none\'">':'';
const memberPhoto=m=>state.profiles.get(m?.auth_user_id)?.character_image_url||m?.avatar_url||'';
function toWeb(){clearReaction();location.hash='proximos';}
function screenTitle(title,sub){return '<div class="pw-panel-head"><h2>'+title+'</h2><p>'+sub+'</p></div>';}
function nav(){return '<nav class="pw-bottom-nav" aria-label="Secciones de Paquillo World">'+chapters.map(([key,ico,label])=>'<button class="pw-nav-btn'+(state.view===key?' on':'')+'" data-pw-view="'+key+'" type="button" aria-label="'+label+'" aria-current="'+(state.view===key?'page':'false')+'"><i aria-hidden="true">'+ico+'</i><span>'+label+'</span></button>').join('')+'</nav>';}
function playerHero(){
 const m=state.mine||{display_name:'Paquillo'},lvl=level(state.xp),xp=state.xp%250;
 return '<div class="pw-scene" aria-label="El mundo ilustrado de los Paquillos">'+
 '<div class="pw-cloud"></div><div class="pw-palm pw-palm-left" aria-hidden="true">🌴</div><div class="pw-palm pw-palm-right" aria-hidden="true">🌴</div>'+
 '<div class="pw-wood-sign"><strong>PAQUILLO<br>WORLD</strong><span>Tu grupo. Tus personajes. Tus piques.</span></div>'+
 '<img class="pw-scene-cast" src="paqui-world-cast.webp" alt="La pandilla Paquillo en estilo cartoon" onerror="this.hidden=true">'+
 '<div class="pw-hero-player">'+(memberPhoto(m)?image(memberPhoto(m),m.display_name,''):'<span style="font-size:1.5rem">🎮</span>')+
 '<div><b>'+esc(m.display_name)+'</b><small>⭐ Nivel '+lvl+' · '+points(state.xp)+' XP</small><div class="pw-xp-track"><i style="width:'+((xp/250)*100)+'%"></i></div></div></div>'+
 '<div class="pw-hero-label">🎉 ¡Juntos es mejor!</div></div>';
}
function gameTiles(){
 const games=[
  ['trivia','🧠','Trivial<br>Paquillero','¿Cuánto sabes del grupo?','',false],
  ['reflex','⏱️','Duelo de<br>Reflejos','¿Serás el más rápido?','pw-game-blue',true],
  ['races','🏁','Carreras<br>Paquilleras','Compite con tus amigos','pw-game-green',false],
  ['challenges','🏆','Retos<br>Semanales','Sube de nivel jugando','pw-game-orange',true]
 ];
 return '<div class="pw-game-grid">'+games.map(([id,ico,title,desc,cls,ready])=>
 '<button type="button" class="pw-game '+cls+'" data-pw-game="'+id+'" aria-disabled="'+(!ready)+'"><span class="pw-game-art">'+ico+'</span><strong>'+title+'</strong><p>'+desc+'</p><span class="pw-play-chip">'+(id==='challenges'?'Ver retos':ready?'Jugar ▶':'Muy pronto 🔒')+'</span></button>').join('')+'</div>';
}
function homeView(){
 const top=state.ranked.slice(0,3);
 return '<section class="pw-screen" data-pw-screen="home">'+playerHero()+
 '<h2 class="pw-section-title">🎮 ELIGE TU AVENTURA</h2>'+gameTiles()+
 '<button type="button" class="pw-bottom-motto" data-pw-view="ranking" style="display:block;width:100%;cursor:pointer">🏆 TOP PAQUILLERO: '+(top.length?top.map((m,i)=>(i+1)+'. '+esc(m.display_name)).join(' · '):'Preparando clasificación')+' <em>Ver ranking ›</em></button>'+
 '<div class="pw-bottom-motto">✨ Sigue participando para desbloquear nuevas recompensas. <em>¡Paquillo siempre!</em></div></section>';
}
function gamesView(){
 return '<section class="pw-screen pw-panel" data-pw-screen="games">'+screenTitle('🎮 ZONA DE JUEGOS','Minijuegos rápidos, con tu personaje y contra tus amigos cuando estén listos.')+
 '<h2 class="pw-section-title">🕹️ ¿A QUÉ JUGAMOS?</h2>'+gameTiles()+
 '<div class="pw-demo-notice">⚡ <b>Duelo de reflejos</b> ya permite jugar una prueba individual en este dispositivo. El multijugador, el trivial y las carreras están todavía en desarrollo. Las partidas de prueba no generan XP.</div></section>';
}
function rankingView(){
 return '<section class="pw-screen pw-panel" data-pw-screen="ranking">'+screenTitle('🏆 CLASIFICACIÓN','La tabla de honor de los Paquillos, ordenada por XP reales.')+
 (!state.ready?'<div class="pw-demo-notice">La base de datos de XP aún no está activada. Ejecuta <code>paquillo-world-fase1.sql</code> en Supabase para activar la clasificación.</div>':'')+
 '<article class="pw-surface"><h3>🌟 TOP PAQUILLEROS</h3>'+
 (state.ranked.length?state.ranked.map((m,i)=>'<div class="pw-rank-row"><span class="pw-rank-pos">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+'</span>'+
 (memberPhoto(m)?image(memberPhoto(m),'',''):'<span class="pw-initial">'+esc(nameInitial(m.display_name))+'</span>')+
 '<b>'+esc(m.display_name)+(m.auth_user_id===state.uid?' (Tú)':'')+'</b><strong>'+points(m.xp)+' XP</strong></div>').join(''):'<p>No hay miembros activos todavía.</p>')+'</article></section>';
}
function peopleView(){
 return '<section class="pw-screen pw-panel" data-pw-screen="people">'+screenTitle('👥 SELECCIÓN DE PERSONAJES','Tu pandilla completa. Los avatares 3D cartoon personalizados llegarán aquí.')+
 '<div class="pw-person-grid">'+state.ranked.map((m,i)=>'<button type="button" data-pw-member="'+i+'" class="pw-person-card"><div class="pw-person-art">'+(memberPhoto(m)?image(memberPhoto(m),'Retrato de '+m.display_name,''):'<span class="pw-initial">'+esc(nameInitial(m.display_name))+'</span>')+'</div><b>'+esc(m.display_name)+'</b><small>NIVEL '+level(m.xp)+' · '+points(m.xp)+' XP</small></button>').join('')+'</div>'+
 '<div class="pw-demo-notice">🎨 La galería muestra por ahora las fotos de perfil. La estética 3D y los accesorios se incorporarán cuando estén terminados los personajes.</div></section>';
}
function profileView(){
 const m=state.mine||{display_name:'Paquillo'},xp=state.xp,progress=xp%250;
 const actions=state.ledger.filter(x=>x.user_id===state.uid).slice(0,8);
 return '<section class="pw-screen pw-panel" data-pw-screen="profile">'+screenTitle('⭐ MI PERSONAJE','Tu aventura Paquillera empieza aquí.')+
 '<div class="pw-surface pw-player-card">'+(memberPhoto(m)?image(memberPhoto(m),m.display_name,''):'<span style="font-size:3rem">🦸</span>')+
 '<div><b>'+esc(m.display_name)+'</b><small>⭐ NIVEL '+level(xp)+' · '+points(xp)+' XP</small><p class="pw-muted">Próximo nivel: '+(250-progress)+' XP</p><div class="pw-xp-track"><i style="width:'+Math.round(progress/250*100)+'%"></i></div></div></div>'+
 '<div class="pw-surface"><h3>⚡ Cómo ganar XP</h3><div class="pw-actions-grid">'+
 [['📅 Crear un plan',100],['🙋 Confirmar asistencia',10],['🗳️ Crear encuesta',40]].map(([x,n])=>'<div class="pw-action-row"><span>'+x+'</span><b>+'+n+' XP</b></div>').join('')+'</div></div>'+
 '<div class="pw-surface"><h3>📜 Historial de experiencia</h3>'+
 (actions.length?actions.map(x=>'<div class="pw-rank-row"><span>✨</span><b>'+esc(actionNames[x.action]||'Actividad')+'</b><strong>+'+x.points+' XP</strong></div>').join(''):'<p class="pw-muted">No hay puntos registrados todavía.</p>')+'</div>'+
 '<div class="pw-demo-notice">💡 Los XP de planes, confirmaciones y encuestas se asignan desde Supabase. Los juegos todavía no reparten experiencia.</div></section>';
}
function challengesView(){
 return '<section class="pw-screen pw-panel" data-pw-screen="challenges">'+screenTitle('🏆 RETOS Y LOGROS','Desafíos para animar al grupo a participar.')+
 '<div class="pw-surface"><h3>🎯 Próximos retos</h3><div class="pw-rank-row"><span>📅</span><b>Organizador nato</b><strong>Próximamente</strong></div><div class="pw-rank-row"><span>🧠</span><b>Trivial de la semana</b><strong>Próximamente</strong></div><div class="pw-rank-row"><span>🏃</span><b>Campeón de reflejos</b><strong>Próximamente</strong></div></div>'+
 '<div class="pw-demo-notice">Los retos están diseñados, pero todavía no hay seguimiento ni recompensas automáticas. Aquí aparecerán cuando se active esa fase.</div></section>';
}
function renderShell(){
 const mine=state.mine||{display_name:'Paquillo'},lvl=level(state.xp);
 root.innerHTML='<div class="pw-shell">'+
 '<header class="pw-head"><button type="button" class="pw-return" data-pw-exit title="Volver a la web de Paquillo Events"><span>🏠</span><span>WEB</span></button><div class="pw-head-brand"><span>👑</span><span>PAQUILLO <b>WORLD</b></span></div><span class="pw-head-xp">⭐ NV '+lvl+' · '+points(state.xp)+' XP</span></header>'+
 '<div class="pw-scroll" id="pwScroll">'+homeView()+gamesView()+peopleView()+rankingView()+profileView()+challengesView()+'</div>'+
 nav()+
 '<div class="pw-modal" id="pwModal" hidden><div class="pw-modal-card" id="pwModalCard" role="dialog" aria-modal="true" aria-label="Ventana de Paquillo World"></div></div>'+
 '</div>';
 setView(state.view,false);
}
function setView(view,scroll=true){
 state.view=view;
 root.querySelectorAll('[data-pw-screen]').forEach(x=>{x.hidden=x.dataset.pwScreen!==view});
 root.querySelectorAll('.pw-nav-btn').forEach(x=>{const yes=x.dataset.pwView===view;x.classList.toggle('on',yes);x.setAttribute('aria-current',yes?'page':'false')});
 if(scroll){const el=document.getElementById('pwScroll');if(el)el.scrollTop=0}
 clearReaction();
}
function modal(body){
 const overlay=document.getElementById('pwModal'),c=document.getElementById('pwModalCard');
 if(!overlay||!c)return;
 c.innerHTML=body+'<button type="button" class="pw-secondary-button" data-pw-close>Cerrar ✕</button>';
 overlay.hidden=false;
}
function closeModal(){
 clearReaction();
 const overlay=document.getElementById('pwModal');if(overlay)overlay.hidden=true;
}
function clearReaction(){
 if(reaction.timer)clearTimeout(reaction.timer);
 reaction={timer:null,armed:0,phase:'idle'};
}
function reactionDialog(){
 clearReaction();
 modal('<div class="pw-modal-icon">⚡</div><h2>DUELO DE REFLEJOS</h2><p>Espera a que el panel se ponga verde y tócalo lo más rápido posible. Si pulsas antes, pierdes esa ronda.</p><div class="pw-reflex-pad" id="pwReflexPad" role="button" tabindex="0">Pulsa «Empezar»</div><p id="pwReflexScore" aria-live="polite">Modo individual · No otorga XP</p><button type="button" class="pw-action-button" data-pw-reflex-start>¡EMPEZAR! ⚡</button>');
}
function startReaction(){
 clearReaction();reaction.phase='waiting';
 const p=document.getElementById('pwReflexPad'),score=document.getElementById('pwReflexScore');
 if(!p)return;
 p.className='pw-reflex-pad ready';p.textContent='ESPERA...';if(score)score.textContent='Cuando se ponga verde, toca el panel.';
 reaction.timer=setTimeout(()=>{reaction.phase='go';reaction.armed=performance.now();p.className='pw-reflex-pad go';p.textContent='¡AHORA!';reaction.timer=null},1400+Math.random()*2100);
}
function hitReaction(){
 const p=document.getElementById('pwReflexPad'),score=document.getElementById('pwReflexScore');
 if(!p||!score)return;
 if(reaction.phase==='waiting'){
  clearReaction();p.className='pw-reflex-pad';p.textContent='¡DEMASIADO PRONTO!';score.textContent='Te has adelantado 😅. Inténtalo de nuevo.';
 }else if(reaction.phase==='go'){
  const ms=Math.max(0,Math.round(performance.now()-reaction.armed));
  clearReaction();p.className='pw-reflex-pad';p.textContent=ms+' ms';score.textContent=ms<220?'¡Reflejos de leyenda! 🔥':ms<350?'¡Muy buena reacción! 😎':'¡La próxima será más rápida! 💪';
  const key='paqui_world_reflex_best_'+state.uid;
  try{const best=Number(localStorage.getItem(key)||0);if(!best||ms<best){localStorage.setItem(key,String(ms));score.textContent+=' · ¡Nuevo récord personal!'}}catch(e){}
 }
}
function showMember(idx){
 const m=state.ranked[idx];if(!m)return;
 modal('<div class="pw-modal-icon">👑</div><h2>'+esc(m.display_name)+'</h2>'+
 (memberPhoto(m)?image(memberPhoto(m),m.display_name,''):'<div class="pw-modal-icon">🦸</div>')+
 '<p><b>⭐ Nivel '+level(m.xp)+'</b> · '+points(m.xp)+' XP</p><p>Personaje 3D cartoon pendiente de incorporar.</p>');
}
function gameAction(id){
 if(id==='reflex'){reactionDialog();return}
 if(id==='challenges'){setView('challenges');return}
 const names={trivia:'Trivial Paquillero',races:'Carreras Paquilleras'};
 modal('<div class="pw-modal-icon">🎮</div><h2>'+esc(names[id]||'Minijuego')+'</h2><p>Este minijuego está todavía en construcción. Pronto podrás competir con tus amigos desde Paquillo World.</p>');
}
async function refresh(){
 if(state.loading)return;
 state.loading=true;
 try{
  const ctx=window.PaquilloWorldContext?.();
  if(!ctx?.client||!ctx?.currentAuthUser){
   root.innerHTML='<div class="pw-shell"><header class="pw-head"><button class="pw-return" data-pw-exit>🏠 WEB</button><b>PAQUILLO WORLD</b></header><div class="pw-screen"><div class="pw-demo-notice">Inicia sesión en Paquillo Events para jugar.</div></div></div>';
   return;
  }
  state.uid=ctx.currentAuthUser.id;
  const db=ctx.client;
  const [mr,pr,lr]=await Promise.all([
   db.from('group_members').select('id,display_name,avatar_url,auth_user_id').eq('is_active',true).order('display_name'),
   db.from('paqui_world_profiles').select('user_id,total_xp,character_image_url,character_name'),
   db.from('paqui_world_xp_ledger').select('user_id,points,action,created_at').order('created_at',{ascending:false}).limit(250)
  ]);
  if(mr.error)throw mr.error;
  state.ready=!pr.error&&!lr.error;
  state.members=mr.data||[];
  state.profiles=new Map((pr.data||[]).map(x=>[x.user_id,x]));
  state.ledger=lr.data||[];
  state.mine=state.members.find(x=>x.auth_user_id===state.uid)||null;
  state.xp=state.ready?Number(state.profiles.get(state.uid)?.total_xp)||0:0;
  state.ranked=state.members.map(m=>({...m,xp:state.ready?(Number(state.profiles.get(m.auth_user_id)?.total_xp)||0):0})).sort((a,b)=>b.xp-a.xp||a.display_name.localeCompare(b.display_name,'es'));
  state.loaded=true;renderShell();
  if(!state.ready){const p=root.querySelector('.pw-screen');p?.insertAdjacentHTML('afterbegin','<div class="pw-demo-notice">⚙️ XP pendiente de activar: ejecuta <b>paquillo-world-fase1.sql</b> en Supabase. Se muestran valores sin experiencia hasta entonces.</div>')}
 }catch(e){
  root.innerHTML='<div class="pw-shell"><header class="pw-head"><button class="pw-return" data-pw-exit>🏠 WEB</button><b>PAQUILLO WORLD</b></header><div class="pw-screen"><div class="pw-demo-notice">Error cargando Paquillo World: '+esc(e.message||e)+'</div><button class="pw-action-button" data-pw-refresh>Reintentar</button></div></div>';
 }finally{state.loading=false;}
}
root.addEventListener('click',e=>{
 const btn=e.target.closest('button,[data-pw-close],#pwReflexPad');if(!btn)return;
 if(btn.hasAttribute('data-pw-exit')){toWeb();return}
 if(btn.hasAttribute('data-pw-refresh')){refresh();return}
 if(btn.hasAttribute('data-pw-close')){closeModal();return}
 if(btn.dataset.pwView){setView(btn.dataset.pwView);return}
 if(btn.dataset.pwGame){gameAction(btn.dataset.pwGame);return}
 if(btn.dataset.pwMember){showMember(Number(btn.dataset.pwMember));return}
 if(btn.hasAttribute('data-pw-reflex-start')){startReaction();return}
 if(btn.id==='pwReflexPad'){hitReaction();return}
});
root.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if((e.key==='Enter'||e.key===' ')&&e.target.id==='pwReflexPad'){e.preventDefault();hitReaction()}});
window.addEventListener('paqui-world-ready',()=>{if(location.hash==='#world')refresh()});
window.addEventListener('hashchange',()=>{if(location.hash==='#world')refresh();else{closeModal();clearReaction()}});
document.addEventListener('click',e=>{if(e.target.closest('[data-t="world"]'))setTimeout(refresh,0)});
if(location.hash==='#world')refresh();
})();
