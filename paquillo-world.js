/* Paquillo World v5 · experiencia a pantalla completa mobile first */
(()=>{
'use strict';
const root=document.getElementById('paquiWorldContent');
if(!root)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const level=xp=>Math.floor(Math.max(0,Number(xp)||0)/250)+1;
const nameInitial=s=>String(s||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const points=n=>Number(n||0).toLocaleString('es-ES');
const actionNames={event_created:'Creaste un plan',attendance_confirmed:'Confirmaste asistencia',poll_created:'Creaste una encuesta',event_approved:'Plan validado por administración',daily_game:'Podio diario',weekly_challenge:'Reto semanal'};
const chapters=[['home','🌴','Inicio'],['neighborhood','🏘️','Barrio'],['games','🎮','Juegos'],['ranking','🏆','Ranking'],['profile','⭐','Perfil']];
let dailyScores=[];let historicalScores=[]; const gameLabels={trivia:'🧠 Trivial',reflex:'⚡ Reflejos',memory:'🃏 Memoria',races:'🏁 Carreras'}; const madridDay=()=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k)?.value;return `${v('year')}-${v('month')}-${v('day')}`;};const scoreDay=v=>String(v||'').slice(0,10);let scoreError='';
let state={view:'home',members:[],ranked:[],ledger:[],profiles:new Map(),mine:null,xp:0,ready:false,uid:null,loading:false,loaded:false,previewCharacters:true};
let reaction={timer:null,armed:0,phase:'idle'};
let enteredFromLife=false;
let duels=[],duelReady=false,duelError='',duelPlaying=null,duelSeenKey='';
const viewHistory=[];
const pageState={people:0,ranking:0,profile:0};
const viewportWidth=()=>window.innerWidth||390;
const viewportHeight=()=>window.innerHeight||750;
const peoplePageSize=()=>viewportHeight()<480?(viewportWidth()>540?8:4):6;
const rankingPageSize=()=>viewportHeight()<480?3:viewportHeight()<650?5:7;
function pageButtons(kind,current,total){return total<=1?'':'<nav class="pw-pagination" aria-label="Páginas de '+(kind==='people'?'personajes':'clasificación')+'">'+
 '<button type="button" data-pw-page="'+kind+'" data-pw-page-index="'+(current-1)+'" '+(current===0?'disabled':'')+' aria-label="Página anterior">‹ Anterior</button>'+
 '<strong>'+(current+1)+' / '+total+'</strong>'+
 '<button type="button" data-pw-page="'+kind+'" data-pw-page-index="'+(current+1)+'" '+(current+1===total?'disabled':'')+' aria-label="Página siguiente">Siguiente ›</button></nav>';}

let trivia=null;
let memory=null;
const shuffle=arr=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
async function submitGlobalScore(game,score){
 const ctx=window.PaquilloWorldContext?.();
 if(!state.uid||!ctx?.client){scoreError='Inicia sesión para compartir resultados.';return false;}
 try{
  const {error}=await ctx.client.rpc('paqui_world_submit_score',{p_game:game,p_score:Math.round(score)});
  if(error)throw error;
  const {data,error:readError}=await ctx.client.from('paqui_world_daily_scores').select('user_id,game,day,score,updated_at').order('day',{ascending:false}).limit(10000);
  if(readError)throw readError;
  historicalScores=data||[];scoreError='';dailyScores=historicalScores.filter(x=>scoreDay(x.day)===madridDay());
  const panel=root.querySelector('[data-pw-screen="games"]');if(panel)panel.outerHTML=gamesView();
  return true;
 }catch(e){scoreError='No se pudo compartir el resultado: '+(e.message||String(e));console.warn('Paquillo World: error publicando puntuación',e);const panel=root.querySelector('[data-pw-screen="games"]');if(panel)panel.outerHTML=gamesView();return false;}
}
const safeBest=(key,score)=>{try{const prev=Number(localStorage.getItem(key))||0;if(score>prev){localStorage.setItem(key,String(score));return score;}return prev;}catch(_){return score;}};

const image=(src,alt,cls,fallback='')=>src?'<img class="'+(cls||'')+'" src="'+esc(src)+'" alt="'+esc(alt||'')+'" loading="lazy"'+
 (fallback&&fallback!==src?' data-fallback="'+esc(fallback)+'"':'')+
 ' onerror="if(this.dataset.fallback){const fallback=this.dataset.fallback;this.removeAttribute(\'data-fallback\');this.src=fallback}else{this.style.display=\'none\'}">':'';
const normalizePersonName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim();
const defaultPhotoLookup=new Map((window.PaquilloPeople||[]).filter(p=>p?.n&&p?.i).map(p=>[normalizePersonName(p.n),p.i]));
const memberDefaultPhoto=m=>defaultPhotoLookup.get(normalizePersonName(m?.display_name))||'';
const latestApprovedCutout=m=>{
 const source=window.PaquilloWorldCharacters?.imageFor(m?.display_name)||'';
 return source.startsWith('paquillo-world-art/')?source:'';
};
const memberPhoto=m=>m?(state.previewCharacters?(latestApprovedCutout(m)||state.profiles.get(m.auth_user_id)?.character_image_url||window.PaquilloWorldCharacters?.imageFor(m.display_name)||m.avatar_url||memberDefaultPhoto(m)):(m.avatar_url||memberDefaultPhoto(m)||state.profiles.get(m.auth_user_id)?.character_image_url||'')):'';
const hasStoredCharacter=m=>!!state.profiles.get(m?.auth_user_id)?.character_image_url;
const memberImage=(m,alt,cls)=>image(memberPhoto(m),alt,cls,memberDefaultPhoto(m));
function toWeb(){closeModal();location.hash='proximos';}
function screenTitle(title,sub){return '<div class="pw-panel-head"><h2>'+title+'</h2><p>'+sub+'</p></div>';}
function nav(){return '<nav class="pw-bottom-nav" aria-label="Secciones de Paquillo World">'+
 '<button class="pw-nav-btn pw-nav-back" data-pw-back type="button" aria-label="Volver atrás"><i aria-hidden="true">↩️</i><span>Atrás</span></button>'+
 chapters.map(([key,ico,label])=>'<button class="pw-nav-btn'+((state.view===key||(state.view==='challenges'&&key==='games'))?' on':'')+'" data-pw-view="'+key+'" type="button" aria-label="'+label+'" aria-current="'+(state.view===key?'page':'false')+'"><i aria-hidden="true">'+ico+'</i><span>'+label+'</span></button>').join('')+'</nav>';}
function playerCard(){
 const m=state.mine||{display_name:'Paquillo'},lvl=level(state.xp),progress=state.xp%250;
 const pic=memberPhoto(m);
 return '<button class="pw-hero-player" type="button" data-pw-view="profile" aria-label="Ver mi personaje">'+
 (pic?memberImage(m,m.display_name,''):'<span class="pw-avatar-placeholder">🦸</span>')+
 '<span class="pw-hero-player-stats"><b>'+esc(m.display_name)+'</b><small>⭐ Nivel '+lvl+' · '+(state.ready?points(state.xp)+' XP':'XP pendiente')+'</small>'+
 '<span class="pw-xp-track"><i style="width:'+((progress/250)*100)+'%"></i></span></span><span class="pw-hero-chevron">›</span></button>';
}
function playerHero(){
 const m=state.mine||{display_name:'Paquillo'},lvl=level(state.xp),progress=state.xp%250;
 const pic=memberPhoto(m);
 return '<div class="pw-scene" aria-label="Isla tropical de Paquillo World">'+
 '<div class="pw-sun" aria-hidden="true"></div><div class="pw-cloud" aria-hidden="true"></div>'+
 '<div class="pw-palm pw-palm-left" aria-hidden="true">🌴</div><div class="pw-palm pw-palm-right" aria-hidden="true">🌴</div>'+
 '<div class="pw-mountain pw-mountain-left" aria-hidden="true"></div><div class="pw-mountain pw-mountain-right" aria-hidden="true"></div>'+
 '<div class="pw-wood-sign"><span class="pw-logo-crown">👑</span><strong><span>PAQUILLO</span><em>WORLD</em></strong><small>Tu grupo. Tus personajes. Tus piques.</small></div>'+
 '<img class="pw-scene-cast" src="paqui-world-cast.webp" alt="La pandilla Paquillo en estilo cartoon" onerror="this.hidden=true">'+
 playerCard()+
 '<button class="pw-quest-bubble" type="button" data-pw-view="challenges"><span>🌟</span><b>¡Sigue participando!</b><small>Descubre los próximos retos</small></button>'+
 '<span class="pw-island-ribbon" aria-hidden="true">¡PAQUILLO SIEMPRE! 💛</span>'+
 '</div>';
}
function gameTiles(includePlanned=false){
 const games=[
  ['trivia','🧠','Trivial<br>Paquillero','Demuestra cuánto sabes','purple',true],
  ['reflex','⏱️','Duelo de<br>Reflejos','¡A ver quién es más rápido!','blue',true],
  ['memory','🃏','Memoria<br>Paquillera','Encuentra las parejas','green',true],
  ['races','🏁','Carrera<br>Paquillera','¡Escapa del festival!','red',true]
 ];
 if(includePlanned)games.push(['challenges','🏆','Retos<br>Semanales','Logros y desafíos','orange',true]);
 return '<div class="pw-game-grid">'+games.map(([id,ico,title,desc,tone,ready])=>
 '<button type="button" class="pw-game pw-tile-'+tone+'" data-pw-game="'+id+'" aria-disabled="'+(!ready)+'"><span class="pw-tile-glow" aria-hidden="true"></span><span class="pw-game-art" aria-hidden="true">'+ico+'</span>'+
 '<strong>'+title+'</strong><p>'+desc+'</p><span class="pw-play-chip">'+(id==='challenges'?'Ver retos ›':ready?'¡Jugar! ▶':'En desarrollo 🔒')+'</span></button>').join('')+'</div>';
}
function homeView(){
 const ranked=state.ready?state.ranked.slice(0,5):[];
 const rankingRows=ranked.map((m,i)=>'<button class="pw-league-row" data-pw-view="ranking" type="button"><span class="pw-medal">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+'</span>'+
 (memberPhoto(m)?memberImage(m,'',''):'<span class="pw-small-initial">'+esc(nameInitial(m.display_name))+'</span>')+
 '<b>'+esc(m.display_name)+'</b><strong>'+points(m.xp)+' XP</strong></button>').join('');
 return '<section class="pw-screen pw-lobby-screen" data-pw-screen="home"><div class="pw-lobby-land">'+
 playerHero()+
 (window.PaquilloLifePreview?.enabled?
  '<div class="pw-life-preview-strip"><button type="button" data-pw-life-open aria-label="Abrir nueva habitación en vista previa"><span aria-hidden="true">🏡</span> Mi hogar · Conoce tu habitación <small>VISTA PREVIA ›</small></button></div>':'')+
 '<button type="button" class="pw-neighborhood-entry" data-pw-view="neighborhood">🗺️ BARRIO BURGOS · Explora el mapa y visita a tus vecinos ›</button>'+
 '<div class="pw-lobby-layout">'+
 '<aside class="pw-shortcut-rail" aria-label="Accesos del mundo">'+
 '<button type="button" data-pw-view="profile"><span>🦸</span>Mi personaje</button>'+
 '<button type="button" data-pw-view="people"><span>👥</span>Personajes</button>'+
 '<button type="button" data-pw-view="ranking"><span>🏆</span>Clasificación</button>'+
 '<button type="button" data-pw-view="challenges"><span>🎖️</span>Retos y logros</button>'+
 '<button type="button" data-pw-view="games"><span>🎮</span>Minijuegos</button></aside>'+
 '<div class="pw-hub-center"><h2 class="pw-island-section-title">🎮 ¡ELIGE TU AVENTURA!</h2>'+gameTiles()+
 '<div class="pw-stage-ticker"><span>🎉</span><b>¡Bienvenido a Paquillo World!</b><span>La aventura con tu grupo empieza aquí.</span></div></div>'+
 '<aside class="pw-lobby-right">'+
 '<section class="pw-league"><header><h2>🏆 Clasificación</h2><button type="button" data-pw-view="ranking">Ver todos ›</button></header>'+
 (rankingRows||'<p class="pw-awaiting">⏳ Clasificación disponible al activar los XP reales de Supabase.</p>')+'</section>'+
 '<section class="pw-achievements"><header><h2>🎖️ Tus logros</h2><button type="button" data-pw-view="challenges">Ver retos ›</button></header>'+
 '<div class="pw-medal-grid"><span>🏆</span><span>⭐</span><span>🎯</span><span>🌴</span><span>🚀</span><span>🎉</span></div>'+
 '<p>¡Los próximos logros están en preparación!</p><small>Desbloqueos todavía no disponibles</small></section>'+
 '</aside></div><div class="pw-lobby-foot"><span>🌴 Juntos es mejor</span><span>Paquillo siempre 💛</span></div>'+
 '</div></section>';
}
function dailyRanking(){const day=madridDay();return '<section class="pw-surface"><h3>🏆 Rankings de hoy · '+day+'</h3><p>Clasificación compartida · sin premios XP hasta validar partidas</p>'+Object.entries(gameLabels).map(([id,label])=>{const rows=dailyScores.filter(x=>x.game===id&&scoreDay(x.day)===day).sort((a,b)=>(id==='reflex'||id==='memory'?a.score-b.score:b.score-a.score)||a.updated_at.localeCompare(b.updated_at)).slice(0,10);return '<h3>'+label+'</h3>'+(rows.length?rows.map((x,i)=>{const m=state.members.find(y=>y.auth_user_id===x.user_id);return '<div class="pw-rank-row"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1)+'</span><b>'+esc(m?.display_name||'Paquillo')+'</b><strong>'+points(x.score)+'</strong></div>'}).join(''):'<p class="pw-muted">Sin puntuaciones compartidas todavía.</p>')}).join('')+'<p class="pw-local-note">Ranking global provisional: puntuaciones de jugadores, no verificadas contra trampas. Sin XP.</p></section>';}
function allTimeRanking(){return '<section class="pw-surface"><h3>👑 RÉCORDS HISTÓRICOS · TOP 3</h3><p>La mejor marca de cada persona en toda la historia, con su autor y fecha.</p>'+Object.entries(gameLabels).map(([id,label])=>{const best=new Map();for(const x of historicalScores){if(x.game!==id)continue;const prev=best.get(x.user_id);if(!prev||(id==='reflex'||id==='memory'?x.score<prev.score:x.score>prev.score)||(x.score===prev.score&&x.day<prev.day))best.set(x.user_id,x)}const rows=[...best.values()].sort((a,b)=>(id==='reflex'||id==='memory'?a.score-b.score:b.score-a.score)||a.day.localeCompare(b.day)).slice(0,3);return '<h3>'+label+'</h3>'+(rows.length?rows.map((x,i)=>{const m=state.members.find(y=>y.auth_user_id===x.user_id);return '<div class="pw-rank-row"><span>'+['🥇','🥈','🥉'][i]+'</span><b>'+esc(m?.display_name||'Paquillo')+'<small style="display:block;opacity:.75">'+esc(x.day)+'</small></b><strong>'+points(x.score)+'</strong></div>'}).join(''):'<p class="pw-muted">Todavía no hay récords compartidos.</p>')}).join('')+'</section>';}
function gamesView(){
 return '<section class="pw-screen pw-panel pw-games-screen" data-pw-screen="games">'+screenTitle('🎮 ZONA DE JUEGOS','Elige un minijuego')+
 '<div class="pw-games-board">'+gameTiles(true)+'</div>'+duelRows()+'<button type="button" class="pw-action-button" data-pw-duel-refresh>🔄 Actualizar invitaciones</button>'+(scoreError?'<p class="pw-demo-notice" role="alert">⚠️ '+esc(scoreError)+'</p>':'')+dailyRanking()+allTimeRanking()+
 '<p class="pw-games-coming">🏁 ¡Carrera Paquillera disponible! · Ranking compartido · Sin XP por ahora</p></section>';
}

function rankingView(){
 const size=rankingPageSize(),pageCount=Math.max(1,Math.ceil(state.ranked.length/size));
 const page=Math.min(Math.max(0,pageState.ranking),pageCount-1);pageState.ranking=page;
 const items=state.ranked.slice(page*size,(page+1)*size);
 return '<section class="pw-screen pw-panel pw-paged-screen" data-pw-screen="ranking">'+screenTitle('🏆 CLASIFICACIÓN','Ranking de XP de los Paquillos')+
 '<article class="pw-surface pw-paged-surface"><h3>🌟 TOP PAQUILLEROS</h3>'+
 (items.length?items.map((m,i)=>'<div class="pw-rank-row"><span class="pw-rank-pos">'+(page*size+i===0?'🥇':page*size+i===1?'🥈':page*size+i===2?'🥉':(page*size+i+1)+'.')+'</span>'+
 (memberPhoto(m)?memberImage(m,'',''):'<span class="pw-initial">'+esc(nameInitial(m.display_name))+'</span>')+
 '<b>'+esc(m.display_name)+(m.auth_user_id===state.uid?' (Tú)':'')+'</b><strong>'+points(m.xp)+' XP</strong></div>').join(''):'<p>Los jugadores aparecerán aquí.</p>')+'</article>'+
 pageButtons('ranking',page,pageCount)+
 (!state.ready?'<p class="pw-paged-hint">Los XP necesitan la configuración de Supabase para reflejar la puntuación real.</p>':'')+'</section>';
}

function peopleView(){
 const size=peoplePageSize(),count=Math.max(1,Math.ceil(state.ranked.length/size));
 const page=Math.min(Math.max(0,pageState.people),count-1);pageState.people=page;
 const items=state.ranked.slice(page*size,(page+1)*size);
 return '<section class="pw-screen pw-panel pw-paged-screen pw-people-screen" data-pw-screen="people">'+
 screenTitle('👥 PERSONAJES',state.previewCharacters?'Los 24 Paquillos con sus personajes 3D':'Fotos reales de perfil y cumpleaños')+
 '<div class="pw-avatar-mode"><span>🎭 24/24 · Todos en 3D</span><button type="button" data-pw-avatar-toggle>'+(state.previewCharacters?'📷 Ver fotos':'🎨 Ver personajes')+'</button></div>'+
 '<div class="pw-person-grid">'+items.map((m,i)=>'<button type="button" data-pw-member="'+(page*size+i)+'" class="pw-person-card"><div class="pw-person-art">'+
 (memberPhoto(m)?memberImage(m,'Retrato de '+m.display_name,''):'<span class="pw-initial">'+esc(nameInitial(m.display_name))+'</span>')+
 '</div><span class="pw-person-copy"><b>'+esc(m.display_name)+'</b><small>NIVEL '+level(m.xp)+' · '+points(m.xp)+' XP</small></span></button>').join('')+'</div>'+
 pageButtons('people',page,count)+'</section>';
}

const duelName=id=>state.members.find(m=>m.auth_user_id===id)?.display_name||'Paquillo';
const duelScore=(game,n)=>n===null?'Pendiente':game==='reflex'?n+' ms':game==='memory'?n+' intentos':game==='races'?n+' m':n+' aciertos';
const duelWinner=d=>d.status!=='completed'?'':d.challenger_score===d.opponent_score?'🤝 Empate':((d.game==='reflex'||d.game==='memory'?d.challenger_score<d.opponent_score:d.challenger_score>d.opponent_score)?duelName(d.challenger):duelName(d.opponent))+' gana 🏆';
async function loadDuels(){
 const db=window.PaquilloWorldContext?.()?.client;
 if(!db||!state.uid)return;
 const {data,error}=await db.from('paqui_world_duels').select('*').order('created_at',{ascending:false}).limit(200);
 duelReady=!error;duelError=error?'Activa paquillo-world-duelos.sql en Supabase para usar los retos.':'';
 duels=data||[];
 updateDuelNotice();
}
function updateDuelNotice(){
 if(!state.uid)return;
 const pending=duels.filter(d=>d.opponent===state.uid&&d.status==='pending');
 const badge=root.querySelector('[data-pw-duel-badge]');
 if(badge){badge.textContent=pending.length?'📩 '+pending.length+' reto'+(pending.length===1?'':'s'):'';badge.hidden=!pending.length;}
 const latest=pending.map(d=>d.id).sort().join(',');
 const key='paqui-duel-seen-'+state.uid;
 let seen='';try{seen=localStorage.getItem(key)||''}catch(_){}
 if(latest&&latest!==seen&&duelSeenKey!==latest){
  const bar=root.querySelector('.pw-shell');
  if(bar){
   duelSeenKey=latest;
   const alert=document.createElement('button');alert.type='button';alert.className='pw-duel-alert';alert.dataset.pwDuelNotice='';
   alert.textContent='📩 Tienes '+pending.length+' reto'+(pending.length===1?'':'s')+' pendiente'+(pending.length===1?'':'s')+' · Ver invitaciones';
   bar.prepend(alert);
  }
 }
}
function markDuelsSeen(){
 if(!state.uid)return;
 try{localStorage.setItem('paqui-duel-seen-'+state.uid,duels.filter(d=>d.opponent===state.uid&&d.status==='pending').map(d=>d.id).sort().join(','))}catch(_){}
 root.querySelector('.pw-duel-alert')?.remove();
}
async function duelRpc(action,values={}){
 const db=window.PaquilloWorldContext?.()?.client;
 if(!db)return;
 const {data,error}=await db.rpc('paqui_world_duel',{p_action:action,p_duel:values.id||null,p_opponent:values.opponent||null,p_game:values.game||null,p_score:values.score??null});
 if(error){modal('<h2>⚠️ Reto no guardado</h2><p>'+esc(error.message)+'</p>');return false;}
 if(action==='create'&&data?.id){void db.functions.invoke('paquillo-duel-push',{body:{duel_id:data.id}}).then(({error:pushError})=>{if(pushError)console.info('Retos: push no disponible; la invitación seguirá visible en la app.',pushError.message)}).catch(()=>{});}
 await loadDuels();
 const screen=root.querySelector('[data-pw-screen="neighborhood"]');
 if(screen){screen.outerHTML=neighborhoodView();mountBurgos();}
 const games=root.querySelector('[data-pw-screen="games"]');if(games)games.outerHTML=gamesView();
 return true;
}
function duelRows(){
 const mine=duels.filter(d=>d.challenger===state.uid||d.opponent===state.uid).sort((a,b)=>{
    const priority=d=>d.opponent===state.uid&&d.status==='pending'?0:
      d.status==='active'?1:d.status==='pending'?2:d.status==='completed'?3:4;
    return priority(a)-priority(b)||new Date(b.created_at)-new Date(a.created_at);
  });
 return '<div class="pw-duels"><h3>⚔️ Mis retos · '+mine.length+'</h3>'+
 (duelError?'<p class="pw-demo-notice">'+esc(duelError)+'</p>':'')+
 (mine.length?mine.map(d=>{
  const rival=duelName(d.challenger===state.uid?d.opponent:d.challenger);
  const mineScore=d.challenger===state.uid?d.challenger_score:d.opponent_score;
  const otherScore=d.challenger===state.uid?d.opponent_score:d.challenger_score;
  return '<article class="pw-duel-row"><b>'+esc(gameLabels[d.game])+' · '+esc(rival)+'</b><small>'+esc(d.status==='pending'?'📩 Invitación pendiente':d.status==='active'?'🎮 Partida en curso':d.status==='declined'?'Rechazado':'🏁 Finalizado')+'</small>'+
  '<p>Tú: '+duelScore(d.game,mineScore)+' · Rival: '+duelScore(d.game,otherScore)+'</p>'+
  (d.status==='completed'?'<strong>'+esc(duelWinner(d))+'</strong>':'')+
  (d.status==='pending'&&d.opponent===state.uid?'<button data-pw-duel-accept="'+d.id+'">✅ Aceptar</button><button data-pw-duel-decline="'+d.id+'">Rechazar</button>':'')+
  (d.status==='active'&&mineScore===null?'<button data-pw-duel-play="'+d.id+'">▶ Jugar mi partida</button>':'')+
  '</article>';
 }).join(''):'<p>Aún no tienes retos. Visita una casa para invitar a jugar.</p>')+'</div>';
}
function showDuelInvite(idx){
 const m=state.ranked[idx];if(!m?.auth_user_id||m.auth_user_id===state.uid){modal('<h2>⚔️ No disponible</h2><p>Solo puedes retar a otro Paquillo con cuenta vinculada.</p>');return;}
 modal('<h2>⚔️ Retar a '+esc(m.display_name)+'</h2><p>Una partida cada uno. Gana el mejor resultado de este reto, no el récord histórico.</p>'+
 '<div class="pw-house-challenges">'+[['trivia','🧠 Trivial'],['memory','🃏 Memoria'],['reflex','⚡ Reflejos'],['races','🏁 Carreras']].map(([id,label])=>'<button data-pw-duel-create="'+id+'" data-pw-opponent="'+esc(m.auth_user_id)+'">'+label+'</button>').join('')+'</div>');
}
function startDuelGame(id){
 const d=duels.find(x=>x.id===id);
 if(!d||d.status!=='active'||(d.challenger===state.uid?d.challenger_score:d.opponent_score)!==null)return;
 duelPlaying=id;gameAction(d.game);
}
function completeDuelGame(game,score){
 if(!duelPlaying)return;
 const d=duels.find(x=>x.id===duelPlaying);
 if(!d||d.game!==game)return;
 const id=duelPlaying;duelPlaying=null;
 void duelRpc('score',{id,score}).then(ok=>{
  if(ok)modal('<h2>⚔️ Partida registrada</h2><p>Tu resultado: '+esc(duelScore(game,score))+'. Consulta el barrio para ver si tu rival ya ha terminado.</p><button class="pw-action-button" data-pw-view="neighborhood">🏘️ Ver mis retos</button>');
 });
}
function neighborhoodView(){
 const pending=duels.filter(d=>d.opponent===state.uid&&d.status==='pending').length;
 return '<section class="pw-screen pw-panel pw-burgos-screen" data-pw-screen="neighborhood">'+
  '<div id="pwBurgosMap" aria-label="Mapa explorable ficticio de Burgos"></div>'+
  '<details class="pwb-duels-drawer"><summary>⚔️ Retos del barrio '+(pending?'· '+pending+' sin responder':'· Ver mis partidas')+'</summary>'+duelRows()+'</details>'+
  '</section>';
}
function mountBurgos(){
 const holder=root.querySelector('#pwBurgosMap');
 if(!holder||!window.PaquilloBurgosMap?.mount)return;
 const ctx=window.PaquilloWorldContext?.();
 window.PaquilloBurgosMap.mount(holder,{
  uid:state.uid,client:ctx?.client,
  members:state.ranked.map(m=>({user_id:m.auth_user_id,name:m.display_name,avatar:memberPhoto(m)})),
  onHouse:idx=>showHouse(idx)
 });
}
function showHouse(idx){
 const m=state.ranked[idx];if(!m)return;
 const isMine=m.auth_user_id===state.uid;
 const records=Object.entries(gameLabels).map(([game,label])=>{
  const scores=historicalScores.filter(x=>x.user_id===m.auth_user_id&&x.game===game);
  const best=scores.sort((a,b)=>game==='reflex'||game==='memory'?a.score-b.score:b.score-a.score)[0];
  return '<div class="pw-house-record"><span>'+label+'</span><b>'+(best?points(best.score):'Sin marca')+'</b></div>';
 }).join('');
 const shared=duels.filter(d=>(d.challenger===state.uid||d.opponent===state.uid)&&
   (d.challenger===m.auth_user_id||d.opponent===m.auth_user_id));
 const open=shared.filter(d=>d.status==='active'||d.status==='pending').length;
 modal('<div class="pw-house-detail"><h2>'+(isMine?'🏡 Mi hogar':'🏡 Casa de '+esc(m.display_name))+'</h2>'+
  (memberPhoto(m)?memberImage(m,m.display_name,'pw-house-portrait'):'')+
  '<p>⭐ Nivel '+level(m.xp)+' · '+points(m.xp)+' XP</p>'+
  '<h3>🏆 Récords del personaje</h3>'+records+
  (isMine?
   '<p class="pw-muted">Este es tu hogar dentro del barrio.</p><button class="pw-action-button" data-pw-view="profile">⭐ Ver mi progreso</button>':
   '<h3>⚔️ Desafiar a '+esc(m.display_name)+'</h3>'+
    (open?'<p class="pw-muted">Tenéis '+open+' reto'+(open===1?'':'s')+' abierto'+(open===1?'':'s')+'.</p>':'')+
    '<button class="pw-action-button" data-pw-duel-invite="'+idx+'">📩 Enviar reto a una partida</button>')+
  '</div>');
}
function profileView(){
 const m=state.mine||{display_name:'Paquillo'},xp=state.xp,progress=xp%250;
 const actions=state.ledger.filter(x=>x.user_id===state.uid).slice(0,viewportHeight()<480?3:viewportHeight()<650?4:6);
 const tabs=[['🦸','Personaje'],['⚡','Ganar XP'],['📜','Historial']];
 const page=Math.max(0,Math.min(2,pageState.profile));
 const body=page===0?'<div class="pw-surface pw-player-card">'+(memberPhoto(m)?memberImage(m,m.display_name,''):'<span style="font-size:3rem">🦸</span>')+
 '<div><b>'+esc(m.display_name)+'</b><small>⭐ NIVEL '+level(xp)+' · '+points(xp)+' XP</small><p class="pw-muted">Próximo nivel: '+(250-progress)+' XP</p><div class="pw-xp-track"><i style="width:'+Math.round(progress/250*100)+'%"></i></div></div></div>'+
 '<p class="pw-profile-hint">🎭 Tu personaje Paquillero. Los avatares personalizados muestran sus gestos originales y se mueven suavemente.</p>':
 page===1?'<div class="pw-surface"><h3>⚡ Cómo ganar XP</h3><div class="pw-actions-grid">'+
 [['📅 Plan aprobado por Javi',100],['🙋 Confirmar asistencia',10],['🗳️ Crear encuesta',40]].map(([x,n])=>'<div class="pw-action-row"><span>'+x+'</span><b>+'+n+' XP</b></div>').join('')+'</div></div><p class="pw-profile-hint">Los podios diarios darán XP cuando se active la validación segura de resultados.</p>':
 '<div class="pw-surface"><h3>📜 Última actividad</h3>'+
 (actions.length?actions.map(x=>'<div class="pw-rank-row"><span>✨</span><b>'+esc(actionNames[x.action]||'Actividad')+'</b><strong>+'+x.points+' XP</strong></div>').join(''):'<p class="pw-muted">No hay puntos registrados todavía.</p>')+'</div>';
 return '<section class="pw-screen pw-panel pw-paged-screen pw-profile-screen" data-pw-screen="profile">'+screenTitle('⭐ MI PERSONAJE','Tu progreso en Paquillo World')+
 '<nav class="pw-profile-tabs" aria-label="Apartados de mi personaje">'+tabs.map(([ico,lab],i)=>'<button type="button" data-pw-profile-page="'+i+'" class="'+(page===i?'selected':'')+'">'+ico+' '+lab+'</button>').join('')+'</nav>'+
 '<div class="pw-profile-content">'+body+'</div></section>';
}

function challengesView(){
 const challenges=[
 ['📅','Organizador nato','Consigue que administración valide un plan','+75 XP'],
 ['🧠','Cerebrito semanal','Termina entre los tres primeros del Trivial durante la semana','+50 XP'],
 ['⚡','Relámpago','Termina entre los tres primeros en Reflejos durante la semana','+50 XP'],
 ['🎮','Todoterreno','Consigue una marca válida en los cuatro minijuegos en una semana','+80 XP'],
 ['🏆','Rey de la isla','Consigue tres podios diarios en una semana','+100 XP']
 ];
 return '<section class="pw-screen pw-panel pw-challenges-screen" data-pw-screen="challenges">'+screenTitle('🏆 RETOS SEMANALES','Objetivos y recompensas propuestas')+
 '<div class="pw-surface">'+challenges.map(([icon,name,desc,xp])=>'<div class="pw-rank-row"><span>'+icon+'</span><div><b>'+name+'</b><p>'+desc+'</p></div><strong>'+xp+'</strong></div>').join('')+'</div>'+
 '<p class="pw-paged-hint">Retos definidos, pendientes de verificación y activación de recompensas en Supabase. No se acreditan XP automáticamente todavía.</p>'+
 '<button type="button" class="pw-action-button pw-challenges-games" data-pw-view="games">🎮 Ir a Juegos</button></section>';
}

function renderShell(){
 window.PaquilloRace?.destroy();
 clearMemoryTimer();memory=null;trivia=null;
 const mine=state.mine||{display_name:'Paquillo'},lvl=level(state.xp);
 root.innerHTML='<div class="pw-shell">'+
 '<header class="pw-head"><button type="button" class="pw-return" data-pw-exit title="Volver a la web de Paquillo Events"><span>🏠</span><span>WEB</span></button><div class="pw-head-brand"><span>👑</span><span>PAQUILLO <b>WORLD</b></span></div><span class="pw-head-xp">⭐ NV '+lvl+' · '+points(state.xp)+' XP</span></header>'+
 '<div class="pw-duel-badge" data-pw-duel-badge hidden></div><div class="pw-scroll" id="pwScroll">'+homeView()+gamesView()+peopleView()+rankingView()+profileView()+challengesView()+neighborhoodView()+'</div>'+
 nav()+
 '<div class="pw-modal" id="pwModal" hidden><div class="pw-modal-card" id="pwModalCard" role="dialog" aria-modal="true" aria-label="Ventana de Paquillo World"></div></div>'+
 '</div>';
 setView(state.view,false,false);
 mountBurgos();
}
function setView(view,scroll=true,remember=true){
 if(!['home','games','people','ranking','profile','challenges','neighborhood'].includes(view))view='home';
 const overlay=document.getElementById('pwModal');
 if(overlay&&!overlay.hidden)closeModal();
 if(remember&&state.view!==view){viewHistory.push(state.view);if(viewHistory.length>20)viewHistory.shift();}
 state.view=view;
 root.querySelectorAll('[data-pw-screen]').forEach(x=>{x.hidden=x.dataset.pwScreen!==view});
 root.querySelectorAll('.pw-nav-btn[data-pw-view]').forEach(x=>{const yes=x.dataset.pwView===(view==='challenges'?'games':view);x.classList.toggle('on',yes);x.setAttribute('aria-current',yes?'page':'false')});
 if(scroll){const el=document.getElementById('pwScroll');if(el)el.scrollTop=0}
 if(view==='neighborhood')requestAnimationFrame(()=>window.PaquilloBurgosMap?.focusMyHome());
 clearReaction();
}
function goBack(){
 const overlay=document.getElementById('pwModal');
 if(overlay&&!overlay.hidden){closeModal();return;}
 if(viewHistory.length){setView(viewHistory.pop(),true,false);return;}
 if(state.view!=='home'){setView('home',true,false);return;}
 toWeb();
}
function modal(body){
 const overlay=document.getElementById('pwModal'),c=document.getElementById('pwModalCard');
 if(!overlay||!c)return;
 overlay.dataset.game=body.includes('class="pw-quiz"')?'trivia':body.includes('class="pw-memory"')?'memory':body.includes('pw-reflex-pad')?'reflex':body.includes('class="pw-race"')?'race':'other';
 c.innerHTML='<div class="pw-modal-top"><button type="button" class="pw-modal-back" data-pw-close>← Volver</button><span>🎮 PAQUILLO WORLD</span></div>'+body+
 '<button type="button" class="pw-secondary-button" data-pw-close>Cerrar ✕</button>';
 overlay.hidden=false;
}
function openRaceApp(body){
 closeRaceApp();
 const app=document.createElement('div');app.id='pw-race-app';app.setAttribute('role','dialog');app.setAttribute('aria-label','Carrera Paquillera');
 app.innerHTML=body;document.body.appendChild(app);document.body.classList.add('pw-race-app-open');
}
function closeRaceApp(){
 window.PaquilloRace?.destroy();document.getElementById('pw-race-app')?.remove();document.body.classList.remove('pw-race-app-open');
}
function closeModal(){
 duelPlaying=null;
 window.PaquilloRace?.destroy();
 clearReaction();clearMemoryTimer();trivia=null;memory=null;
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
  if(duelPlaying)completeDuelGame('reflex',ms);else void submitGlobalScore('reflex',ms);
   const key='paqui_world_reflex_best_'+state.uid;
  try{const best=Number(localStorage.getItem(key)||0);if(!best||ms<best){localStorage.setItem(key,String(ms));score.textContent+=' · ¡Nuevo récord personal!'}}catch(e){}
 }
}
function showMember(idx){
 const m=state.ranked[idx];if(!m)return;
 modal('<div class="pw-modal-icon">👑</div><h2>'+esc(m.display_name)+'</h2>'+
 (memberPhoto(m)?memberImage(m,m.display_name,''):'<div class="pw-modal-icon">🦸</div>')+
 '<p><b>⭐ Nivel '+level(m.xp)+'</b> · '+points(m.xp)+' XP</p><p>'+(window.PaquilloWorldCharacters?.approvedNames?.some(name=>normalizePersonName(name)===normalizePersonName(m.display_name))?'Personaje 3D aprobado y disponible en Paquillo World.':hasStoredCharacter(m)?'Personaje personalizado vinculado desde Supabase.':window.PaquilloWorldCharacters?.has(m.display_name)?'Personaje 3D disponible en Paquillo World.':'Personaje de Paquillo World disponible.')+'</p>');
}
/* Trivial de 10 preguntas: fechas de group_members + cultura general.
   Las respuestas y puntos son locales; nunca se acreditan XP. */
const generalQuiz=[
 ['¿Cuántas caras tiene un dado convencional?','6','4','8','12'],
 ['¿Cuántos jugadores tiene cada equipo en pista en baloncesto?','5','6','7','11'],
 ['¿Cuál es la capital de Portugal?','Lisboa','Oporto','Coímbra','Braga'],
 ['¿Cuántas casillas tiene un tablero de ajedrez?','64','48','60','72'],
 ['¿Qué planeta se conoce como el planeta rojo?','Marte','Venus','Júpiter','Saturno'],
 ['¿En qué ciudad se celebran los Sanfermines?','Pamplona','Burgos','León','Zaragoza'],
 ['¿Qué mide el IBU de una cerveza?','Su amargor','Su color','Su alcohol','Su espuma'],
 ['¿Cuántas cartas tiene una baraja francesa sin comodines?','52','40','48','54'],
 ['¿Qué símbolo químico corresponde al oro?','Au','Ag','Fe','O'],
 ['¿Cuál es el océano de mayor superficie?','Pacífico','Índico','Atlántico','Ártico'],
 ['¿En qué país está el monte Fuji?','Japón','China','Tailandia','Corea del Sur'],
 ['¿Cuántos minutos dura cada tiempo reglamentario de fútbol?','45','30','40','60'],
 ['¿Qué animal es un mamífero?','Delfín','Tiburón','Pulpo','Trucha'],
 ['¿Cuántos continentes se suelen representar en el modelo de seis continentes?','6','4','5','8'],
 ['¿Cuántas caras tiene un cubo?','6','8','12','4'],
 ['¿Cuál es la unidad habitual de la intensidad de corriente eléctrica?','Amperio','Vatio','Voltio','Ohmio'],
 ['¿Qué instrumento musical tiene teclas blancas y negras?','Piano','Trompeta','Violín','Flauta'],
 ['¿Qué deporte utiliza una canasta y un balón?','Baloncesto','Tenis','Balonmano','Rugby']
];
function quizQuestions(){
 const general=generalQuiz.map(row=>({q:row[0],correct:row[1],options:row.slice(1),origin:'Cultura general'}));
 const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
 const local=[];
 for(const m of state.members){
  if(!m.display_name||!m.birthday)continue;
  const date=String(m.birthday).match(/^\d{4}-(\d\d)-(\d\d)/);
  if(!date)continue;
  const mo=Number(date[1]),day=Number(date[2]);
  if(mo<1||mo>12||day<1||day>31)continue;
  const month=months[mo-1];
  const wrongMonths=shuffle(months.filter(x=>x!==month)).slice(0,3);
  local.push({q:'¿En qué mes cumple años '+m.display_name+'?',correct:month,options:[month,...wrongMonths],origin:'Cumpleaños del grupo'});
  const days=shuffle(Array.from({length:31},(_,i)=>String(i+1)).filter(x=>x!==String(day))).slice(0,3);
  local.push({q:'¿Qué día del mes cumple años '+m.display_name+'?',correct:String(day),options:[String(day),...days],origin:'Cumpleaños del grupo'});
 }
 const selected=[...shuffle(local).slice(0,6),...shuffle(general).slice(0,local.length>=6?4:10)];
 return shuffle(selected).slice(0,10).map(q=>({...q,options:shuffle(q.options)}));
}
function startTrivia(){
 trivia={questions:quizQuestions(),index:0,score:0,selected:null};
 renderTrivia();
}
function renderTrivia(){
 if(!trivia)return;
 const item=trivia.questions[trivia.index],selected=trivia.selected;
 if(!item){finishTrivia();return;}
 const answered=selected!==null;
 modal('<div class="pw-quiz"><div class="pw-quiz-head"><span>🧠 TRIVIAL PAQUILLERO</span><b>'+(trivia.index+1)+' / '+trivia.questions.length+'</b></div>'+
 '<div class="pw-quiz-progress"><span style="width:'+(trivia.index/trivia.questions.length*100)+'%"></span></div>'+
 '<p class="pw-quiz-type">'+esc(item.origin)+'</p><h2>'+esc(item.q)+'</h2>'+
 '<div class="pw-quiz-options">'+item.options.map((answer,i)=>'<button type="button" class="pw-quiz-answer'+(answered?(answer===item.correct?' pw-correct':i===selected?' pw-wrong':''):'')+'" data-pw-trivia-answer="'+i+'" '+(answered?'disabled':'')+'>'+esc(answer)+'</button>').join('')+'</div>'+
 (answered?'<p class="pw-quiz-feedback" aria-live="polite">'+(item.options[selected]===item.correct?'✅ ¡Correcto!':'💡 La respuesta era '+esc(item.correct))+'.</p><button type="button" class="pw-action-button" data-pw-trivia-next>'+(trivia.index+1===trivia.questions.length?'Ver resultado 🏆':'Siguiente pregunta ›')+'</button>':'<p class="pw-quiz-score">⭐ Aciertos: '+trivia.score+'</p>')+
 '<p class="pw-local-note">Partida local · No da XP ni modifica el ranking</p></div>');
}
function answerTrivia(choice){
 if(!trivia||trivia.selected!==null)return;
 const q=trivia.questions[trivia.index];if(!q||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return;
 trivia.selected=choice;
 if(q.options[choice]===q.correct)trivia.score++;
 renderTrivia();
}
function advanceTrivia(){
 if(!trivia||trivia.selected===null)return;
 trivia.index++;trivia.selected=null;
 if(trivia.index>=trivia.questions.length)finishTrivia();else renderTrivia();
}
function finishTrivia(){
 if(!trivia)return;
 const total=trivia.questions.length,score=trivia.score;
 const best=safeBest('paqui_world_trivia_best_'+(state.uid||'guest'),score);
 if(duelPlaying)completeDuelGame('trivia',score);else void submitGlobalScore('trivia',score);
 trivia=null;
 modal('<div class="pw-game-finish"><span class="pw-finish-icon">🏆</span><h2>¡TRIVIAL COMPLETADO!</h2><p class="pw-final-score">'+score+' / '+total+'</p>'+
 '<p>'+(score===total?'¡Pleno de aciertos! 🔥':score>=7?'¡Qué bien conoces el mundo! 😎':'¡La próxima ronda será mejor! 💪')+'</p><p>Tu récord en este dispositivo: <b>'+best+' aciertos</b></p>'+
 '<p class="pw-local-note">La puntuación se envía al ranking global si está habilitado. Sin XP.</p><button type="button" class="pw-action-button" data-pw-trivia-restart>Otra partida ▶</button></div>');
}
/* Memoria Paquillera: empareja retratos y nombres reales de group_members.
   Sin fotos se muestran iniciales. Los resultados son únicamente locales. */
function clearMemoryTimer(){if(memory?.timeout){clearTimeout(memory.timeout);memory.timeout=null;}}
function startMemory(){
 clearMemoryTimer();
 const members=state.members.filter(m=>m.id&&m.display_name);
 if(members.length<3){
  modal('<div class="pw-game-finish"><span class="pw-finish-icon">🃏</span><h2>Memoria Paquillera</h2><p>Aún no hay suficientes perfiles del grupo para esta partida. Vuelve cuando se hayan cargado los Paquillos.</p></div>');
  return;
 }
 const withPhotos=shuffle(members.filter(m=>!!memberPhoto(m)));
 const others=shuffle(members.filter(m=>!memberPhoto(m)));
 const picked=[...withPhotos,...others].slice(0,Math.min(6,members.length));
 const cards=shuffle(picked.flatMap(m=>[{id:m.id,m,kind:'photo'},{id:m.id,m,kind:'name'}]));
 memory={cards,flipped:[],matched:new Set(),moves:0,startedAt:Date.now(),timeout:null,locked:false};
 renderMemory();
}
function renderMemory(){
 if(!memory)return;
 const win=memory.matched.size===memory.cards.length/2;
 if(win){finishMemory();return;}
 modal('<div class="pw-memory"><div class="pw-quiz-head"><span>🃏 MEMORIA PAQUILLERA</span><b>'+memory.matched.size+' / '+(memory.cards.length/2)+'</b></div>'+
 '<p>Encuentra las parejas: <b>foto + nombre</b> de cada Paquillo.</p><div class="pw-memory-stats"><span>🎯 '+memory.moves+' intentos</span><span>✅ '+memory.matched.size+' parejas</span></div>'+
 '<div class="pw-memory-grid">'+memory.cards.map((c,i)=>{
 const face=memory.matched.has(c.id)||memory.flipped.includes(i);
 const content=!face?'<span class="pw-memory-back">❔</span>':c.kind==='name'?'<span class="pw-memory-name">'+esc(c.m.display_name)+'</span>':memberPhoto(c.m)?memberImage(c.m,'Foto de '+c.m.display_name,'pw-memory-photo'):'<span class="pw-memory-initials">'+esc(nameInitial(c.m.display_name))+'</span>';
 return '<button type="button" class="pw-memory-card'+(face?' flipped':'')+(memory.matched.has(c.id)?' matched':'')+'" data-pw-memory-card="'+i+'" '+(face?'disabled':'')+' aria-label="'+(face?'Carta descubierta':'Carta oculta '+(i+1))+'">'+content+'</button>';
 }).join('')+'</div><p class="pw-local-note">Partida en este dispositivo · Sin XP</p>'+
 (enteredFromLife&&window.PaquilloLifePreview?.enabled?'<button class="pw-action-button pw-life-return-button" type="button" data-pw-life-leave>🏡 Volver a mi hogar</button>':'')+
 '<button class="pw-secondary-button" type="button" data-pw-memory-restart>Reiniciar ↻</button></div>');
}
function flipMemory(i){
 if(!memory||memory.locked||!Number.isInteger(i)||i<0||i>=memory.cards.length)return;
 if(memory.flipped.includes(i)||memory.matched.has(memory.cards[i].id))return;
 memory.flipped.push(i);
 if(memory.flipped.length===2){
  memory.moves++;
  const [a,b]=memory.flipped.map(idx=>memory.cards[idx]);
  if(a.id===b.id){
   memory.matched.add(a.id);memory.flipped=[];renderMemory();
  }else{
   memory.locked=true;renderMemory();
   const running=memory;
   running.timeout=setTimeout(()=>{
    if(memory!==running)return;
    running.flipped=[];running.locked=false;running.timeout=null;
    if(!document.getElementById('pwModal')?.hidden)renderMemory();
   },1100);
  }
 }else renderMemory();
}
function finishMemory(){
 if(!memory)return;
 const moves=memory.moves,seconds=Math.max(1,Math.round((Date.now()-memory.startedAt)/1000));
 const key='paqui_world_memory_best_'+(state.uid||'guest');
 let best=moves;
 try{const old=Number(localStorage.getItem(key));if(!old||moves<old){localStorage.setItem(key,String(moves));}else best=old;}catch(_){}
 memory=null;
 if(duelPlaying)completeDuelGame('memory',moves);else void submitGlobalScore('memory',moves);
 modal('<div class="pw-game-finish"><span class="pw-finish-icon">🎊</span><h2>¡MEMORIA COMPLETADA!</h2>'+
 '<p class="pw-final-score">'+moves+' intentos</p><p>⏱️ '+seconds+' segundos · Mejor partida local: '+best+' intentos.</p>'+
 '<p class="pw-local-note">Se envía al ranking global si está habilitado. Sin XP.</p>'+
 (enteredFromLife&&window.PaquilloLifePreview?.enabled?'<button class="pw-action-button pw-life-return-button" type="button" data-pw-life-return>🏡 Volver a mi hogar · ¡celebrar! ✨</button>':'')+
 '<button class="pw-action-button" type="button" data-pw-memory-restart>Jugar otra vez ▶</button></div>');
}

function gameAction(id){
 if(id==='reflex'){reactionDialog();return}
 if(id==='trivia'){startTrivia();return}
 if(id==='memory'){startMemory();return}
 if(id==='challenges'){setView('challenges');return}
 if(id==='races'){
  if(!window.PaquilloRace){
   modal('<div class="pw-modal-icon">🏁</div><h2>Carrera Paquillera</h2><p>No se ha podido cargar el minijuego. Actualiza Paquillo World y vuelve a entrar.</p>');
   return;
  }
  const raceApproved=latestApprovedCutout(state.mine);
  const racePhoto=raceApproved||memberPhoto(state.mine);
  const isFullBody=racePhoto.includes('/paquillo-characters/')||
   /(?:^|\/)paquillo-world-art\/[^?#]+\.webp(?:\?|$)/.test(racePhoto);
  window.PaquilloRace.open({
   uid:state.uid,member:state.mine,photo:racePhoto,sticker:isFullBody,
   members:state.members,client:window.PaquilloWorldContext?.()?.client,
   render:openRaceApp,onClose:closeRaceApp,onScore:(distance)=>{if(duelPlaying)completeDuelGame('races',Math.floor(distance));else void submitGlobalScore('races',distance)}
  });
  return;
 }
 modal('<div class="pw-modal-icon">🎮</div><h2>Juego no disponible</h2>');
}
async function refresh(){
 if(state.loading)return;
 state.loading=true;
 try{
  const ctx=window.PaquilloWorldContext?.();
  if(!ctx?.client||!ctx?.currentAuthUser){
   const pending=!!ctx?.authBootstrapping;
   root.innerHTML='<div class="pw-shell"><header class="pw-head"><button class="pw-return" data-pw-exit>🏠 WEB</button><b>PAQUILLO WORLD</b></header><div class="pw-scroll"><div class="pw-screen"><div class="pw-demo-notice">'+(pending?'🌴 Recuperando tu sesión de Paquillo Events…':'Inicia sesión en Paquillo Events para jugar.')+'</div></div></div>'+nav()+'</div>';
   return;
  }
  state.uid=ctx.currentAuthUser.id;
  const db=ctx.client;
  const [mr,pr,lr,dr]=await Promise.all([
   db.from('group_members').select('id,display_name,avatar_url,auth_user_id,birthday').eq('is_active',true).order('display_name'),
   db.from('paqui_world_profiles').select('user_id,total_xp,character_image_url,character_name'),
   db.from('paqui_world_xp_ledger').select('user_id,points,action,created_at').order('created_at',{ascending:false}).limit(250),
   db.from('paqui_world_daily_scores').select('user_id,game,day,score,updated_at').order('day',{ascending:false}).limit(10000)
  ]);
  if(mr.error)throw mr.error;
  state.ready=!pr.error&&!lr.error;
  state.members=mr.data||[];
  state.profiles=new Map((pr.data||[]).map(x=>[x.user_id,x]));
  state.ledger=lr.data||[];historicalScores=dr.error?[]:(dr.data||[]);scoreError=dr.error?'No se pudo cargar el ranking global: '+dr.error.message:'';if(dr.error)console.warn('Paquillo World: error de ranking global',dr.error);dailyScores=historicalScores.filter(x=>scoreDay(x.day)===madridDay());
  state.mine=state.members.find(x=>x.auth_user_id===state.uid)||null;
  state.xp=state.ready?Number(state.profiles.get(state.uid)?.total_xp)||0:0;
  state.ranked=state.members.map(m=>({...m,xp:state.ready?(Number(state.profiles.get(m.auth_user_id)?.total_xp)||0):0})).sort((a,b)=>b.xp-a.xp||a.display_name.localeCompare(b.display_name,'es'));
  await loadDuels();
  state.loaded=true;renderShell();updateDuelNotice();
  if(!state.ready){const p=root.querySelector('.pw-screen');p?.insertAdjacentHTML('afterbegin','<div class="pw-demo-notice">⚙️ XP pendiente de activar: ejecuta <b>paquillo-world-fase1.sql</b> en Supabase. Se muestran valores sin experiencia hasta entonces.</div>')}
 }catch(e){
  root.innerHTML='<div class="pw-shell"><header class="pw-head"><button class="pw-return" data-pw-exit>🏠 WEB</button><b>PAQUILLO WORLD</b></header><div class="pw-scroll"><div class="pw-screen"><div class="pw-demo-notice">Error cargando Paquillo World: '+esc(e.message||e)+'</div><button class="pw-action-button" data-pw-refresh>Reintentar</button></div></div>'+nav()+'</div>';
 }finally{state.loading=false;}
}
root.addEventListener('click',e=>{
 const btn=e.target.closest('button,[data-pw-close],#pwReflexPad');if(!btn)return;
 if(btn.hasAttribute('data-pw-exit')){toWeb();return}
 if(btn.hasAttribute('data-pw-refresh')){refresh();return}
 if(btn.hasAttribute('data-pw-life-open')){
  window.PaquilloLifePreview?.open({
   name:state.mine?.display_name||'Paquillo',
   xp:state.xp,
   onArcade:()=>{enteredFromLife=true;setView('games')},
   onMemory:()=>{enteredFromLife=true;setView('games');startMemory()},
   onNeighborhood:()=>{setView('neighborhood')}
  });
  return;
 }
 if(btn.hasAttribute('data-pw-neighbor-focus')){
  const drawer=root.querySelector('[data-pw-screen="neighborhood"] .pw-neigh-duel-drawer');
  if(drawer){drawer.open=true;drawer.scrollIntoView({behavior:'smooth',block:'start'})}
  return;
 }
 if(btn.hasAttribute('data-pw-house')){showHouse(Number(btn.dataset.pwHouse));return}
 if(btn.hasAttribute('data-pw-duel-notice')){markDuelsSeen();setView('games');return}
 if(btn.hasAttribute('data-pw-duel-refresh')){void loadDuels().then(()=>{const el=root.querySelector('[data-pw-screen="games"]');if(el)el.outerHTML=gamesView()});return}
 if(btn.hasAttribute('data-pw-duel-invite')){showDuelInvite(Number(btn.dataset.pwDuelInvite));return}
 if(btn.hasAttribute('data-pw-duel-create')){const game=btn.dataset.pwDuelCreate,opponent=btn.dataset.pwOpponent;if(!duelReady){modal('<h2>⚠️ Retos no activados</h2><p>Hay que ejecutar paquillo-world-duelos.sql en Supabase.</p>');return}void duelRpc('create',{game,opponent}).then(ok=>{if(ok)modal('<h2>📩 ¡Invitación enviada!</h2><p>Tu amigo podrá aceptarla desde el barrio.</p>')});return}
 if(btn.hasAttribute('data-pw-duel-accept')){void duelRpc('accept',{id:btn.dataset.pwDuelAccept});return}
 if(btn.hasAttribute('data-pw-duel-decline')){void duelRpc('decline',{id:btn.dataset.pwDuelDecline});return}
 if(btn.hasAttribute('data-pw-duel-play')){startDuelGame(btn.dataset.pwDuelPlay);return}
 if(btn.hasAttribute('data-pw-close')){closeModal();return}
 if(btn.hasAttribute('data-pw-avatar-toggle')){state.previewCharacters=!state.previewCharacters;renderShell();return}
 if(btn.hasAttribute('data-pw-back')){goBack();return}
 if(btn.hasAttribute('data-pw-page')){
  const kind=btn.dataset.pwPage,idx=Number(btn.dataset.pwPageIndex);
  if(!btn.disabled&&(kind==='people'||kind==='ranking')&&Number.isInteger(idx)&&idx>=0){
   pageState[kind]=idx;const old=root.querySelector('[data-pw-screen="'+kind+'"]');
   if(old){old.outerHTML=kind==='people'?peopleView():rankingView();setView(kind,false,false);}
  }
  return;
 }
 if(btn.hasAttribute('data-pw-profile-page')){
  const idx=Number(btn.dataset.pwProfilePage);
  if(Number.isInteger(idx)&&idx>=0&&idx<3){
   pageState.profile=idx;const old=root.querySelector('[data-pw-screen="profile"]');
   if(old){old.outerHTML=profileView();setView('profile',false,false);}
  }
  return;
 }
 if(btn.hasAttribute('data-pw-trivia-answer')){answerTrivia(Number(btn.dataset.pwTriviaAnswer));return}
 if(btn.hasAttribute('data-pw-trivia-next')){advanceTrivia();return}
 if(btn.hasAttribute('data-pw-trivia-restart')){startTrivia();return}
 if(btn.hasAttribute('data-pw-memory-card')){flipMemory(Number(btn.dataset.pwMemoryCard));return}
 if(btn.hasAttribute('data-pw-memory-restart')){startMemory();return}
 if(btn.hasAttribute('data-pw-life-leave')){
  if(!window.PaquilloLifePreview?.enabled)return;
  closeModal();
  const opened=window.PaquilloLifePreview?.open({
   name:state.mine?.display_name||'Paquillo',
   onArcade:()=>{enteredFromLife=true;setView('games')},
   onMemory:()=>{enteredFromLife=true;setView('games');startMemory()}
  });
  if(opened)enteredFromLife=false;
  return;
 }
 if(btn.hasAttribute('data-pw-life-return')){
  if(!window.PaquilloLifePreview?.enabled)return;
  closeModal();
  const opened=window.PaquilloLifePreview?.open({
   name:state.mine?.display_name||'Paquillo',
   celebrate:'memory',
   onArcade:()=>{enteredFromLife=true;setView('games')},
   onMemory:()=>{enteredFromLife=true;setView('games');startMemory()}
  });
  if(opened)enteredFromLife=false;
  return;
 }
 if(btn.dataset.pwView){if(root.querySelector('[data-pw-screen]'))setView(btn.dataset.pwView);else if(window.PaquilloWorldContext?.()?.currentAuthUser)refresh();return}
 if(btn.dataset.pwGame){gameAction(btn.dataset.pwGame);return}
 if(btn.dataset.pwMember){showMember(Number(btn.dataset.pwMember));return}
 if(btn.hasAttribute('data-pw-reflex-start')){startReaction();return}
 if(btn.id==='pwReflexPad'){hitReaction();return}
});
function filterNeighborhood(){
 const screen=root.querySelector('[data-pw-screen="neighborhood"]');
 if(!screen)return;
 const input=screen.querySelector('[data-pw-neighbor-search]');
 const only=screen.querySelector('[data-pw-neighbor-available]')?.checked===true;
 const term=(input?.value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 let visible=0;
 screen.querySelectorAll('.pw-neighborhood-houses [data-pw-house]').forEach(house=>{
  const show=(!term||house.dataset.pwHouseName.includes(term))&&
   (!only||house.dataset.pwHouseAvailable==='true');
  house.hidden=!show;if(show)visible++;
 });
 const empty=screen.querySelector('[data-pw-neighbor-empty]');
 if(empty)empty.hidden=visible!==0;
}
root.addEventListener('input',event=>{
 if(event.target.matches('[data-pw-neighbor-search],[data-pw-neighbor-available]'))filterNeighborhood();
});
root.addEventListener('change',event=>{
 if(event.target.matches('[data-pw-neighbor-available]'))filterNeighborhood();
});
root.addEventListener('keydown',e=>{if(e.key==='Escape')goBack();if((e.key==='Enter'||e.key===' ')&&e.target.id==='pwReflexPad'){e.preventDefault();hitReaction()}});
window.addEventListener('paqui-world-ready',()=>{if(location.hash==='#world')refresh()});
window.addEventListener('paqui-world-characters-updated',()=>{
 if(location.hash==='#world'&&document.getElementById('pwModal')?.hidden!==false)refresh();
});
window.addEventListener('resize',()=>{
 if(location.hash!=='#world'||!state.loaded||document.getElementById('pwModal')?.hidden===false)return;
 const area=document.getElementById('pwScroll');
 if(!area)return;
 const selected=state.view;
 const existing=area.querySelector('[data-pw-screen="people"]');
 const rank=area.querySelector('[data-pw-screen="ranking"]');
 if(existing)existing.outerHTML=peopleView();
 if(rank)rank.outerHTML=rankingView();
 setView(selected,false,false);
});
window.addEventListener('hashchange',()=>{if(location.hash==='#world')refresh();else{closeModal();clearReaction()}});
document.addEventListener('click',e=>{if(e.target.closest('[data-t="world"]'))setTimeout(refresh,0)});
if(location.hash==='#world')refresh();
})();
