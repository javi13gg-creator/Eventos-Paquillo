/* Paquillo Life · Habitación alfa con cuidados persistentes opcionales.
 * Usa el personaje aprobado de World. Solo la RPC autorizada escribe necesidades; no concede XP,
 * no altera el estado de sus minijuegos ni de Paquillo Events.
 * Acceso privado: únicamente cuenta autenticada Javi (rol admin),
 * validada por Paquillo Events mediante user_profiles. */
(()=>{
 'use strict';
 // La URL ya no concede acceso: se verifica la identidad autenticada en cada apertura.
 const allowed=()=>window.PaquilloWorldContext?.()?.lifePreviewAllowed===true;
 let room=null,previousFocus=null,arcadeAction=null,memoryAction=null,neighborhoodAction=null,profileAction=null;
 let model3d=null,modelRequest=0,lifeDaily=null;
 let actionSerial=0;
 let careReady=false,careBusy=false,careSession=0;
 let moodMessage='';
 let lifeLevel=1,roomTheme='island';

 // Habitación personal: decoración real pero exclusivamente cosmética, guardada en el dispositivo.
 // No altera XP, monedas ni los objetos de otros usuarios; requiere habilitación de la preview.
 const furnitureCatalog={
  wall:[['none','Vacío','➖'],['poster','Póster','🖼️'],['neon','Neón','💜'],['trophy','Trofeo','🏆'],['clock','Reloj','🕒']],
  floor:[['none','Vacío','➖'],['rug','Alfombra','🟣'],['pet','Mascota','🐕'],['flowers','Flores','💐'],['skate','Monopatín','🛹']],
  shelf:[['none','Vacío','➖'],['plant','Maceta','🪴'],['globe','Globo','🌍'],['disco','Bola disco','🪩'],['trophy','Trofeo','🏆'],['medal','Medalla','🏅']]
 };
 const slotLabels={wall:'Pared',floor:'Suelo',shelf:'Rincón'};
 const furnitureDefaults={wall:'poster',floor:'pet',shelf:'trophy'};
 let furniture={...furnitureDefaults},furnitureSlot='wall',furnitureStorageKey='',roomTab='play';
 const safeHTML=text=>String(text||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function loadFurniture(userId){
  furnitureStorageKey='paqui-world-room-furniture-v1-'+String(userId||'preview');
  furniture={...furnitureDefaults};
  try{
   const saved=JSON.parse(localStorage.getItem(furnitureStorageKey)||'null');
   if(saved&&typeof saved==='object'){
    for(const slot of Object.keys(furnitureCatalog)){
     if(furnitureCatalog[slot].some(v=>v[0]===saved[slot]))furniture[slot]=saved[slot];
    }
   }
  }catch(_){}
 }
 function renderFurniture(){
  if(!room)return;
  for(const slot of Object.keys(furnitureCatalog)){
   const value=furniture[slot],item=furnitureCatalog[slot].find(v=>v[0]===value);
   const host=room.querySelector('[data-pl-furniture-slot="'+slot+'"]');
   if(host){
    host.dataset.value=value;host.querySelector('span').textContent=value==='none'?'':item[2];
    host.setAttribute('aria-label','Cambiar decoración de '+slotLabels[slot]+': '+item[1]);
    host.title=item[1]+' · Toca para cambiar';
   }
  }
  room.querySelectorAll('[data-pl-furn-slot]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.plFurnSlot===furnitureSlot));
  });
  const options=room.querySelector('[data-pl-furn-options]');
  if(options)options.innerHTML=furnitureCatalog[furnitureSlot].map(([id,label,icon])=>
   '<button type="button" data-pl-furn-option="'+id+'" aria-pressed="'+String(furniture[furnitureSlot]===id)+'">'+
   '<span class="pl-furn-icon" aria-hidden="true">'+icon+'</span>'+safeHTML(label)+'</button>'
  ).join('');
  const note=room.querySelector('[data-pl-furn-current]');
  if(note)note.textContent='Editando: '+slotLabels[furnitureSlot]+' · Los cambios se guardan en este dispositivo';
 }
 function chooseFurniture(slot,value){
  if(!allowed()||!room||!furnitureCatalog[slot]?.some(v=>v[0]===value))return;
  furnitureSlot=slot;furniture[slot]=value;
  try{localStorage.setItem(furnitureStorageKey,JSON.stringify(furniture))}catch(_){}
  renderFurniture();
  const item=furnitureCatalog[slot].find(v=>v[0]===value);
  setStatus('🎨 '+slotLabels[slot]+': '+item[1]+' · guardado en este dispositivo');
  if(value!=='none'&&!prefersLessMotion()){
   room.querySelector('[data-pl-furniture-slot="'+slot+'"]')?.animate?.(
    [{scale:'.7',opacity:.4},{scale:'1.12',opacity:1},{scale:'1',opacity:1}],{duration:330,easing:'ease-out'}
   );
  }
 }
 function setRoomTab(tab='play'){
  if(!room||!['play','decor','missions'].includes(tab))return;
  roomTab=tab;
  room.classList.remove('pl-ui-minimized');
  room.querySelectorAll('[data-pl-tab]').forEach(button=>{
   const yes=button.dataset.plTab===tab;
   button.setAttribute('aria-selected',String(yes));
   button.tabIndex=yes?0:-1;
  });
  room.querySelectorAll('[data-pl-panel]').forEach(panel=>{
   const yes=panel.dataset.plPanel===tab;
   panel.classList.toggle('is-active',yes);
   panel.hidden=!yes;
  });
  const toggle=room.querySelector('[data-pl-immersive]');
  if(toggle)toggle.textContent='⤢ Ver habitación';
 }

 // Actividad diaria en este dispositivo. No otorga XP ni simula logros de servidor.
 const dailyGoals=[['eat','🥥','Comer'],['shower','🚿','Ducha'],['sleep','💤','Descanso'],['memory','🃏','Memoria']];
 const todayMadrid=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
 let dailyState={day:'',done:[]};
 function readDaily(){
  const day=todayMadrid();
  try{const old=JSON.parse(localStorage.getItem('paqui-life-daily-javi')||'{}');
   dailyState={day,done:old.day===day&&Array.isArray(old.done)?old.done.filter(v=>dailyGoals.some(g=>g[0]===v)):[]};
  }catch(_){dailyState={day,done:[]}}
 }
 function renderDaily(){
  if(!room)return;
  if(dailyState.day!==todayMadrid())readDaily();
  const done=dailyGoals.filter(g=>dailyState.done.includes(g[0])).length;
  const count=room.querySelector('[data-pl-daily-count]'),bar=room.querySelector('[data-pl-daily-progress]'),chips=room.querySelector('[data-pl-daily-checks]');
  if(count)count.textContent=done+' / 4';
  if(bar)bar.style.width=done*25+'%';
  if(chips)chips.innerHTML=dailyGoals.map(g=>'<span class="'+(dailyState.done.includes(g[0])?'is-done':'')+'">'+(dailyState.done.includes(g[0])?'✓ ':g[1]+' ')+g[2]+'</span>').join('');
  const priorities=[
   [needs.energy,'sleep','Recuperar energía','MiniPaquillo necesita un descanso'],
   [needs.wellbeing,'shower','Cuidar bienestar','Una ducha le vendrá fenomenal'],
   [needs.mood,'memory','Subir el ánimo','Una partida de Memoria para cambiar de aires']
  ].sort((a,b)=>a[0]-b[0]);
  const next=dailyGoals.find(g=>!dailyState.done.includes(g[0]));
  const pick=priorities[0][0]<60?priorities[0]:
   next?[75,next[0],'Tu siguiente actividad','Completa '+next[2].toLowerCase()+' en tu rutina de hoy']:
   [100,'memory','¡Rutina completada!','Puedes disfrutar de otra partida de Memoria'];
  const title=room.querySelector('[data-pl-recommend-title]'),hint=room.querySelector('[data-pl-recommend-copy]'),btn=room.querySelector('[data-pl-suggest]');
  if(title)title.textContent=pick[2];
  if(hint)hint.textContent=pick[3];
  if(btn){btn.dataset.plSuggest=pick[1];btn.textContent=(pick[1]==='memory'?'🃏':'▶')+' Hacerlo'}
 }
 function markDaily(action){
  if(!dailyGoals.some(g=>g[0]===action)||!allowed())return;
  if(dailyState.day!==todayMadrid())readDaily();
  if(!dailyState.done.includes(action)){
   dailyState.done.push(action);
   try{localStorage.setItem('paqui-life-daily-javi',JSON.stringify(dailyState))}catch(_){}
  }
  renderDaily();
 }


 const lifeAchievements={
  eat:['🥥','Primer tentempié'],shower:['🚿','Como nuevo'],sleep:['💤','Descanso merecido'],memory:['🃏','Memoria completada']
 };
 let achievementState={};
 function loadAchievements(){
  try{achievementState=JSON.parse(localStorage.getItem('paqui-life-achievements-javi')||'{}')||{}}catch(_){achievementState={}}
 }
 function renderAchievements(){
  const holder=room?.querySelector('[data-pl-achievements]');
  if(!holder)return;
  holder.innerHTML=Object.entries(lifeAchievements).map(([key,[icon,name]])=>
   '<div class="pl-achievement'+(achievementState[key]?' is-earned':'')+'"><span>'+icon+'</span><b>'+name+'</b><small>'+(achievementState[key]?'✓ Conseguido':'Pendiente')+'</small></div>'
  ).join('');
  const count=Object.keys(lifeAchievements).filter(k=>achievementState[k]).length;
  const summary=room.querySelector('[data-pl-achievements-summary]');
  if(summary)summary.textContent='🏅 Logros · '+count+'/4';
 }
 function earnAchievement(key){
  if(!lifeAchievements[key]||achievementState[key]||!allowed())return;
  achievementState[key]=true;
  try{localStorage.setItem('paqui-life-achievements-javi',JSON.stringify(achievementState))}catch(_){}
  renderAchievements();
  setStatus('🏅 Nuevo logro: '+lifeAchievements[key][1]+' · sin XP');
 }
 const unlockAllThemesForPrivatePreview=true; // Solo la vista privada de Javi; no altera XP ni desbloqueos del servidor.
 const themeUnlocked=item=>unlockAllThemesForPrivatePreview||lifeLevel>=item.min;
 const themes={island:{label:'🏝️ Isla',min:1},sunset:{label:'🌅 Atardecer',min:3},night:{label:'🌙 Noche',min:7}};
 function chooseTheme(key,announce=true){
  if(!room||!themes[key]||!themeUnlocked(themes[key]))return;
  roomTheme=key;room.dataset.plTheme=key;
  room.querySelectorAll('[data-pl-theme]').forEach(button=>{
   const item=themes[button.dataset.plTheme];
   button.disabled=!themeUnlocked(item);
   button.setAttribute('aria-pressed',String(key===button.dataset.plTheme));
   button.textContent=item.label+(!themeUnlocked(item)?' · Nv '+item.min+' 🔒':'');
  });
  try{localStorage.setItem('paqui-life-theme-javi',key)}catch(_){}
  if(announce)setStatus('Decoración aplicada: '+themes[key].label+' · guardada en este dispositivo.');
 }

 let idleTimer=null,idleSequence=0,roamIndex=0;
 let roamPosition={left:48,bottom:15};
 const random=(min,max)=>min+Math.random()*(max-min);
 function stopIdle(){
  idleSequence++;
  if(idleTimer!==null)clearTimeout(idleTimer);
  idleTimer=null;
  room?.classList.remove('pl-idle-wave','pl-idle-rest','pl-roaming','pl-walking');
  room?.querySelector('#plPerson')?.style.removeProperty('--pl-facing');
 }
 function scheduleIdle(){
  stopIdle();
  if(!room||!allowed()||document.hidden||prefersLessMotion())return;
  const token=idleSequence;
  function next(){
   if(token!==idleSequence||!room||!allowed()||document.hidden)return;
   if(careBusy||room.classList.contains('pl-performing')||room.classList.contains('pl-celebrating')){
    idleTimer=setTimeout(next,700);return;
   }
   const tired=lifeMood().id==='tired';
   const pause=roamIndex>0&&(Math.random()<(tired?.45:.18));
   if(pause){
    room.classList.remove('pl-roaming','pl-walking','pl-idle-wave');
    room.classList.add(tired?'pl-idle-rest':'pl-idle-wave');
    idleTimer=setTimeout(next,random(700,tired?2500:1550));return;
   }
   room.classList.remove('pl-idle-wave','pl-idle-rest');
   // Cada destino es nuevo y cercano, sin repetir una ruta ni teletransportarse.
   let dest,dist=0;
   for(let tries=0;tries<10;tries++){
    dest={
     left:Math.max(27,Math.min(72,roamPosition.left+random(-21,21))),
     bottom:Math.max(14,Math.min(24,roamPosition.bottom+random(-6,6)))
    };
    dist=Math.hypot(dest.left-roamPosition.left,(dest.bottom-roamPosition.bottom)*1.5);
    if(dist>8)break;
   }
   if(!dest)return;
   const duration=Math.round(Math.max(1100,Math.min(3500,dist*random(105,150)*(tired?1.35:1))));
   const actor=room.querySelector('#plPerson');
   if(actor){
    actor.style.setProperty('--pl-roam-duration',duration+'ms');
    actor.dataset.plFacing=dest.left<roamPosition.left?'left':'right';
    actor.style.setProperty('--pl-facing',dest.left<roamPosition.left?'-1':'1');
   }
   room.classList.add('pl-roaming','pl-walking');
   // Primer destino se elige inmediatamente y cada trayecto tiene distancia y velocidad variables.
   moveTo('home',dest);
   roamPosition=dest;
   roamIndex++;
   idleTimer=setTimeout(()=>{
    if(token!==idleSequence||!room)return;
    room.classList.remove('pl-roaming','pl-walking');
    idleTimer=setTimeout(next,random(180,650));
   },duration);
  }
  idleTimer=setTimeout(next,120);
 }

 function lifeMood(){
  const low=Math.min(needs.energy,needs.mood,needs.wellbeing);
  if(low<=35)return {id:'tired',label:'Necesito un descanso',icon:'😴',phrase:'Hoy voy a mi ritmo. ¿Me echas una mano?'};
  if(low<=60)return {id:'calm',label:'Día tranquilo',icon:'🌤️',phrase:'Un poquito de mimo y vuelvo a estar a tope.'};
  if(low>=85)return {id:'great',label:'¡En plena forma!',icon:'✨',phrase:'¡Hoy tengo energía para todo!'};
  return {id:'good',label:'Todo marcha bien',icon:'😊',phrase:'¡Qué bien se está en mi rincón tropical!'};
 }
 function renderMood(announce=false){
  if(!room)return;
  const mood=lifeMood();
  room.dataset.plMood=mood.id;
  const el=room.querySelector('[data-pl-mood]');
  if(el){el.textContent=mood.icon;el.title=mood.label+' · '+mood.phrase;el.setAttribute('aria-label','Estado: '+mood.label);}
  if(announce&&moodMessage!==mood.id&&!room.classList.contains('pl-walking')&&!room.classList.contains('pl-performing')){
   speech(mood.phrase);
  }
  moodMessage=mood.id;
 }

 async function care(action=null){
  const client=window.PaquilloWorldContext?.()?.client;
  if(!allowed()||!client)return false;
  const session=careSession;
  try{
   const {data,error}=await client.rpc('paqui_life_care',{p_action:action});
   if(error)throw error;
   if(session!==careSession||!room||!allowed())return false;
   const result=Array.isArray(data)?data[0]:data;
   if(!result)throw Error('Respuesta vacía');
   needs={energy:result.energy,mood:result.mood,wellbeing:result.wellbeing};
   careReady=true;renderNeeds();renderMood();
   room.querySelector('.pl-needs')?.setAttribute('aria-label','Necesidades guardadas en Supabase');
   const note=room.querySelector('[data-pl-persistence]');if(note)note.textContent='☁️ Cuidados guardados · sin XP';
   return true;
  }catch(error){
   if(session===careSession&&room){
    if(action)setStatus('No se ha guardado: espera 30 segundos entre cuidados o comprueba la conexión.');
    const note=room.querySelector('[data-pl-persistence]');if(note)note.textContent='⚠️ Modo demostración · sin guardar';
   }
   return false;
  }
 }

 let needs={energy:75,mood:75,wellbeing:75};
 function renderNeeds(){
  if(!room)return;
  for(const [key,value] of Object.entries(needs)){
   const el=room.querySelector('[data-pl-need="'+key+'"]');
   if(el){el.value=value;el.setAttribute('aria-valuenow',String(value));}
   const out=room.querySelector('[data-pl-value="'+key+'"]');
   if(out)out.textContent=Math.round(value)+'%';
  }
  renderDaily();
 }
 function improveNeeds(action){
  const changes={eat:{energy:8,wellbeing:12},sleep:{energy:20,wellbeing:5},shower:{wellbeing:18,mood:5},play:{mood:12}}[action]||{};
  for(const [key,delta] of Object.entries(changes))needs[key]=Math.min(100,needs[key]+delta);
  renderNeeds();renderMood();
 }
 const timers=new Set();
 const places={
  home:{left:48,bottom:15,scale:1,speechBottom:57,propBottom:39},
  eat:{left:25,bottom:24,scale:.77,speechBottom:57,propBottom:42},
  sleep:{left:79,bottom:17,scale:.77,speechBottom:54,propBottom:37},
  shower:{left:80,bottom:43,scale:.62,speechBottom:73,propBottom:61},
  play:{left:62,bottom:30,scale:.77,speechBottom:65,propBottom:51}
 };
 const steps={
  eat:{travel:910,action:1750,message:'¡Ñam! Esto sí que es vida. 🥥'},
  sleep:{travel:1060,action:1950,message:'Cinco minutitos más… 😴'},
  shower:{travel:1070,action:1900,message:'¡Listo para salir con la cuadrilla! ✨'},
  play:{travel:880,action:600,message:'¡Vamos al Arcade! 🎮'}
 };
 const prefersLessMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 function later(fn,ms,serial){
  const timer=window.setTimeout(()=>{
   timers.delete(timer);
   if(serial!==actionSerial||!room||!allowed())return;
   fn();
  },ms);
  timers.add(timer);
 }
 function cancelAction(){
  actionSerial++;
  stopIdle();
  for(const timer of timers)window.clearTimeout(timer);
  timers.clear();
  if(!room)return;
  room.classList.remove('pl-walking','pl-performing','pl-action-eat','pl-action-sleep','pl-action-shower','pl-action-play','pl-celebrating','pl-returning');
  room.querySelectorAll('[data-pl-place]').forEach(btn=>btn.setAttribute('aria-pressed','false'));
  const speech=room.querySelector('.pl-speech');
  if(speech){speech.hidden=true;speech.textContent='';}
 }
 function moveTo(place,override=null){
  if(!room)return;
  // Posiciones adaptadas al plano panorámico: objetos y personaje alineados.
  const panoramic=(room.querySelector('.pl-stage')?.clientWidth||0)>=720;
  const widePlaces={
   home:{left:49,bottom:15,scale:1,speechBottom:60,propBottom:40},
   eat:{left:15,bottom:17,scale:.78,speechBottom:63,propBottom:47},
   sleep:{left:83,bottom:11,scale:.78,speechBottom:56,propBottom:37},
   shower:{left:88,bottom:35,scale:.72,speechBottom:75,propBottom:59},
   play:{left:70,bottom:17,scale:.78,speechBottom:68,propBottom:48}
  };
  const positions=panoramic?widePlaces:places;
  const data=override?{...positions.home,...override}:positions[place]||positions.home;
  if(!override&&place==='home')roamPosition={left:data.left,bottom:data.bottom};
  const actor=room.querySelector('#plPerson');
  if(actor){
   actor.style.setProperty('--pl-person-left',data.left+'%');
   actor.style.setProperty('--pl-person-bottom',data.bottom+'%');
   actor.style.setProperty('--pl-person-scale',String(data.scale));
  }
  room.style.setProperty('--pl-speech-left',Math.min(84,Math.max(16,data.left))+'%');
  room.style.setProperty('--pl-speech-bottom',data.speechBottom+'%');
  room.style.setProperty('--pl-prop-bottom',data.propBottom+'%');
 }
 function speech(message){
  const item=room?.querySelector('.pl-speech');
  if(!item)return;
  item.textContent=message;item.hidden=false;
 }
 function setStatus(text){
  const status=room?.querySelector('#plStatus');
  if(status)status.textContent=text;
 }
 function goHome(serial,delay){
  later(()=>{
   room.classList.remove('pl-performing');
   room.classList.add('pl-returning','pl-walking');
   moveTo('home');
   room.querySelector('.pl-speech')?.setAttribute('hidden','');
   setStatus('Volviendo al rincón de '+(room.querySelector('#plName')?.textContent||'Paquillo')+'…');
   later(()=>{
    room?.classList.remove('pl-walking','pl-returning');
    room?.querySelectorAll('[data-pl-place]').forEach(b=>b.setAttribute('aria-pressed','false'));
    setStatus('Toca un objeto para interactuar.');
    renderMood(true);
    scheduleIdle();
   },prefersLessMotion()?80:900,serial);
  },delay,serial);
 }
 function perform(action,serial){
  const step=steps[action];
  room.classList.remove('pl-walking','pl-returning');
  room.classList.add('pl-performing','pl-action-'+action);
  setStatus(action==='eat'?'Preparando un tentempié…':action==='sleep'?'Una siestecita…':action==='shower'?'Ducha refrescante…':'Arrancando el Arcade…');
  speech(step.message);
  if(action==='play'){
   later(()=>{
    const cb=arcadeAction;
    close();
    cb?.();
   },prefersLessMotion()?200:step.action,serial);
   return;
  }
  later(()=>{
   room?.classList.remove('pl-action-'+action);
   if(careReady){
    if(!careBusy){
     careBusy=true;
     setStatus('Guardando cuidado… ☁️');
     care(action).then(saved=>{if(saved&&room)earnAchievement(action);}).finally(()=>{careBusy=false;});
    }else setStatus('Todavía se está guardando el cuidado anterior.');
   }else{
    improveNeeds(action);
    setStatus('Acción de demostración · sin guardar');
   }
   markDaily(action);
   speech('¡Así se vive en Paquillo World! ⭐');
   goHome(serial,prefersLessMotion()?250:450);
  },prefersLessMotion()?350:step.action,serial);
 }
 function interact(action){
  if(!room||!allowed()||!Object.prototype.hasOwnProperty.call(steps,action))return;
  if(careBusy){setStatus('Espera a que termine de guardarse el cuidado anterior.');return;}
  cancelAction();
  const serial=actionSerial,step=steps[action];
  const button=room.querySelector('[data-pl-place="'+action+'"]');
  button?.setAttribute('aria-pressed','true');
  room.classList.add('pl-walking');
  room.dataset.plTarget=action;
  setStatus('Yendo a '+(action==='eat'?'la nevera':action==='sleep'?'la cama':action==='shower'?'la ducha':'la recreativa')+'…');
  moveTo(action);
  later(()=>perform(action,serial),prefersLessMotion()?80:step.travel,serial);
 }
 function celebrateMemory(){
  if(!room||!allowed())return;
  cancelAction();
  const serial=actionSerial;
  moveTo('home');
  room.classList.add('pl-celebrating');
  speech('¡Memoria completada! ¡Grande! 🏆');
  if(!careReady)improveNeeds('play');
  earnAchievement('memory');
  markDaily('memory');
  setStatus('¡Tu MiniPaquillo celebra la victoria!');
  later(()=>{
   room?.classList.remove('pl-celebrating');
   const bubble=room?.querySelector('.pl-speech');
   if(bubble)bubble.hidden=true;
   setStatus('¡A por la siguiente aventura!');
   scheduleIdle();
  },prefersLessMotion()?750:3000,serial);
 }
 function close(){
  lifeDaily?.destroy();lifeDaily=null;
  modelRequest++;
  model3d?.destroy();model3d=null;
  cancelAction();
  careSession++;careReady=false;careBusy=false;
  if(!room)return;
  room.remove();
  room=null;
  document.body.classList.remove('paqui-life-room-open');
  previousFocus?.focus?.({preventScroll:true});
  previousFocus=null;arcadeAction=null;memoryAction=null;neighborhoodAction=null;profileAction=null;
 }
 function open(options={}){
  if(!allowed())return false;
  if(room)close();
  careSession++;careReady=false;careBusy=false;moodMessage='';roamIndex=0;
  lifeLevel=Math.floor(Math.max(0,Number(options.xp)||0)/250)+1;roamPosition={left:48,bottom:15};
  previousFocus=document.activeElement;
  arcadeAction=typeof options.onArcade==='function'?options.onArcade:null;
  memoryAction=typeof options.onMemory==='function'?options.onMemory:null;
  neighborhoodAction=typeof options.onNeighborhood==='function'?options.onNeighborhood:null;
  profileAction=typeof options.onProfile==='function'?options.onProfile:null;
  const name=String(options.name||'Paquillo').slice(0,50);
  const authUserId=options.userId||window.PaquilloWorldContext?.()?.currentAuthUser?.id||'preview';
  loadFurniture(authUserId);
  const source=window.PaquilloWorldCharacters?.imageFor(name)||'';
  room=document.createElement('section');
  room.id='paquiLifePreview';
  room.className='pl-screen';
  room.setAttribute('role','dialog');
  room.setAttribute('aria-modal','true');
  room.setAttribute('aria-label','Mi casa en Paquillo World, experiencia privada en desarrollo');
  room.innerHTML='<header class="pl-header">'+
   '<button class="pl-back" type="button" data-pl-close aria-label="Volver a Paquillo World"><span aria-hidden="true">‹</span><span>World</span></button>'+
   '<div class="pl-header-title"><small>🏡 MI CASA EN WORLD</small><b>Mi habitación</b></div>'+
   '<button type="button" class="pl-neighborhood-top" data-pl-neighborhood>🏘️ Barrio</button>'+ 
   '<span class="pl-preview-tag" title="Vista privada de desarrollo">PRIVADA</span>'+
   '</header>'+
   '<main class="pl-world">'+
    '<div class="pl-stage" aria-label="Habitación tropical interactiva">'+
     '<picture class="pl-background-picture"><source media="(min-width:720px)" srcset="paquillo-life-room-wide.svg?v=1"><img class="pl-background" src="paquillo-life-room.svg?v=1" alt="Habitación tropical con nevera, ducha, cama y recreativa"></picture>'+
     '<div class="pl-sunbeam" aria-hidden="true"></div>'+
     '<div class="pl-scene-hud"><button type="button" data-pl-scene-tab="missions">🎯 Misiones</button>'+
      '<button type="button" data-pl-neighborhood>🏘️ Salir al barrio</button></div>'+
     '<div class="pl-furniture-scene" aria-label="Decoraciones de tu habitación">'+
      '<button type="button" class="pl-furn" data-pl-furniture-slot="wall" data-pl-scene-slot="wall" aria-label="Editar la pared"><span aria-hidden="true">🖼️</span></button>'+
      '<button type="button" class="pl-furn" data-pl-furniture-slot="floor" data-pl-scene-slot="floor" aria-label="Editar el suelo"><span aria-hidden="true">🐕</span></button>'+
      '<button type="button" class="pl-furn" data-pl-furniture-slot="shelf" data-pl-scene-slot="shelf" aria-label="Editar el rincón"><span aria-hidden="true">🏆</span></button></div>'+
     '<div class="pl-room-sticker"><strong>La casa de '+safeHTML(name)+'</strong><small>⭐ Nivel '+lifeLevel+' · decoración personal</small></div>'+
     '<div class="pl-ambient pl-ambient-a" aria-hidden="true">✦</div>'+
     '<div class="pl-ambient pl-ambient-b" aria-hidden="true">✧</div>'+
     '<div class="pl-character-spot" aria-hidden="true"></div>'+ 
     '<div class="pl-decor-light" aria-hidden="true">✦ ✦ ✦</div>'+ 


     '<div class="pl-person" id="plPerson"></div>'+
     '<div class="pl-action-prop" aria-hidden="true"><span class="pl-prop-eat">🥥</span><span class="pl-prop-sleep">💤</span><span class="pl-prop-shower">🫧</span><span class="pl-prop-play">🎮</span></div>'+
     '<div class="pl-speech" role="status" aria-live="polite" hidden></div>'+




     '<div class="pl-action-stars" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></div>'+
     '<div class="pl-floor-caption"><b id="plName"></b><small>Tu rincón paquillero</small></div>'+
    '</div>'+
   '</main>'+
   '<footer class="pl-foot pl-base-foot">'+
    '<div class="pl-base-intro"><div><small>✨ MI CASA</small><strong>Tu espacio en Paquillo World</strong></div><span>⭐ Nv '+lifeLevel+'</span></div>'+
    '<div class="pl-panel-headline"><span>👋 ¿Qué hacemos hoy?</span>'+
     '<button type="button" class="pl-immersive-toggle" data-pl-immersive aria-label="Ampliar la vista de la habitación">⤢ Ver habitación</button></div>'+
    '<nav class="pl-base-tabs" aria-label="Apartados de Mi casa" role="tablist">'+
     '<button type="button" role="tab" data-pl-tab="play" aria-selected="true">🎮 Jugar</button>'+
     '<button type="button" role="tab" data-pl-tab="decor" aria-selected="false">🎨 Decorar</button>'+
     '<button type="button" role="tab" data-pl-tab="missions" aria-selected="false">🎯 Misiones</button></nav>'+
    '<section class="pl-panel pl-play-panel is-active" role="tabpanel" data-pl-panel="play" aria-label="Juegos y mundo">'+
     '<button type="button" data-pl-place="play"><span>🕹️</span><div><b>Arcade</b><small>Juegos, récords y piques</small></div></button>'+
     '<button type="button" data-pl-memory><span>🃏</span><div><b>Memoria</b><small>Una partida rápida</small></div></button>'+
     '<button type="button" data-pl-neighborhood><span>🏘️</span><div><b>Barrio Burgos</b><small>Visita a tus vecinos</small></div></button>'+
     '<button type="button" data-pl-profile><span>🏆</span><div><b>Mi progreso</b><small>Nivel, XP y clasificación</small></div></button>'+
    '</section>'+
    '<section class="pl-panel pl-decor-panel" role="tabpanel" data-pl-panel="decor" aria-label="Personalización de la habitación" hidden>'+
     '<p class="pl-furn-note">🏡 Coloca adornos visibles en la habitación. Toca un objeto en el escenario para cambiarlo.</p>'+
     '<div class="pl-furn-slot-picker" role="group" aria-label="Lugar para decorar">'+
      '<button type="button" data-pl-furn-slot="wall" aria-pressed="true">🖼️ Pared</button>'+
      '<button type="button" data-pl-furn-slot="floor" aria-pressed="false">🐾 Suelo</button>'+
      '<button type="button" data-pl-furn-slot="shelf" aria-pressed="false">🏅 Rincón</button></div>'+
     '<p class="pl-furn-note" data-pl-furn-current>Editando: Pared</p>'+
     '<div class="pl-furn-options" data-pl-furn-options></div>'+
     '<div class="pl-custom-theme" role="group" aria-label="Ambiente de la habitación"><b>🌈 Ambiente</b>'+
      '<button type="button" data-pl-theme="island">🏝️ Isla</button>'+
      '<button type="button" data-pl-theme="sunset">🌅 Atardecer</button>'+
      '<button type="button" data-pl-theme="night">🌙 Noche</button>'+
      '<button type="button" data-pl-decor="lamp" aria-pressed="false">💡 Luces</button></div>'+
     '<p class="pl-furn-note">La decoración se guarda en este dispositivo. No cuesta XP ni se comparte todavía.</p></section>'+
    '<section class="pl-panel pl-missions-panel" role="tabpanel" data-pl-panel="missions" aria-label="Actividad diaria" hidden>'+
     '<div class="pl-daily-hub" data-pl-daily-hub></div>'+
     '<p class="pl-furn-note">🎯 Las recompensas de XP se validan en Supabase; los objetos decorativos no conceden XP.</p></section>'+
    '<details class="pl-room-extras"><summary>✨ Extras y recuerdos de la habitación</summary>'+
     '<nav class="pl-quick-actions" aria-label="Animaciones opcionales">'+
      '<button type="button" data-pl-place="eat">🥥 Comer</button>'+
      '<button type="button" data-pl-place="shower">🚿 Ducha</button>'+
      '<button type="button" data-pl-place="sleep">💤 Descansar</button></nav>'+
     '<details class="pl-achievements"><summary data-pl-achievements-summary>🏅 Recuerdos locales · 0/4</summary>'+
      '<div class="pl-achievements-grid" data-pl-achievements></div>'+
      '<small>Recuerdos de esta vista privada. No otorgan XP.</small></details></details>'+
    '<p id="plStatus" role="status" aria-live="polite">🎮 ¡Tu casa está lista! Elige qué quieres hacer.</p>'+
    '<small data-pl-persistence>ℹ️ Las interacciones opcionales no dan XP.</small></footer>';
  // Controles principales registrados antes de cargar sprites, necesidades o decoraciones.
  // Captura para que capas de escena o manejadores secundarios no bloqueen navegación.
  room.addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button||!room?.contains(button))return;
   if(button.hasAttribute('data-pl-close')){event.stopImmediatePropagation();close();return;}
   if(button.hasAttribute('data-pl-neighborhood')){
    event.stopImmediatePropagation();
    const cb=neighborhoodAction;close();cb?.();return;
   }
   if(button.hasAttribute('data-pl-tab')){
    event.stopImmediatePropagation();
    setRoomTab(button.dataset.plTab);return;
   }
   if(button.hasAttribute('data-pl-scene-tab')){
    event.stopImmediatePropagation();
    setRoomTab(button.dataset.plSceneTab);return;
   }
   if(button.hasAttribute('data-pl-immersive')){
    event.stopImmediatePropagation();
    const minimized=room.classList.toggle('pl-ui-minimized');
    button.textContent=minimized?'⤡ Abrir panel':'⤢ Ver habitación';
    button.setAttribute('aria-expanded',String(!minimized));
    return;
   }
   if(button.hasAttribute('data-pl-scene-slot')){
    event.stopImmediatePropagation();
    furnitureSlot=button.dataset.plSceneSlot;
    setRoomTab('decor');renderFurniture();return;
   }
   if(button.hasAttribute('data-pl-furn-slot')){
    event.stopImmediatePropagation();
    furnitureSlot=button.dataset.plFurnSlot;
    renderFurniture();return;
   }
   if(button.hasAttribute('data-pl-furn-option')){
    event.stopImmediatePropagation();
    chooseFurniture(furnitureSlot,button.dataset.plFurnOption);return;
   }
   if(button.hasAttribute('data-pl-profile')){
    event.stopImmediatePropagation();
    const cb=profileAction;
    if(cb){close();cb();}else setStatus('Tu perfil se encuentra en World.');
    return;
   }
   if(button.hasAttribute('data-pl-suggest')){
    event.stopImmediatePropagation();
    if(button.dataset.plSuggest==='memory'){
     const cb=memoryAction;
     if(cb){close();cb();}else setStatus('Memoria no disponible.');
    }else interact(button.dataset.plSuggest);
    return;
   }
   if(button.hasAttribute('data-pl-open-decor')){
    event.stopImmediatePropagation();setRoomTab('decor');return;
   }
   if(button.hasAttribute('data-pl-place')){
    event.stopImmediatePropagation();interact(button.dataset.plPlace);return;
   }
   if(button.hasAttribute('data-pl-memory')){
    event.stopImmediatePropagation();
    const cb=memoryAction;
    if(cb){close();cb();}else setStatus('Memoria no disponible.');
   }
  },true);
  room.addEventListener('click',event=>{
   const decoration=event.target.closest('[data-pl-decor]');
   if(decoration){
    const item=decoration.dataset.plDecor;
    if(item==='lamp'){
     const on=room.classList.toggle('pl-lamp-on');
     decoration.setAttribute('aria-pressed',String(on));
     setStatus(on?'💡 Guirnalda encendida':'💡 Guirnalda apagada');
    }else if(item==='plant'){
     room.classList.add('pl-plant-happy');
     setStatus('🌿 ¡La palmera está encantada!');
     setTimeout(()=>room?.classList.remove('pl-plant-happy'),1300);
    }
    return;
   }
   if(!allowed()){close();return;}
   if(event.target.closest('[data-pl-theme]')){
    chooseTheme(event.target.closest('[data-pl-theme]').dataset.plTheme);return;
   }
   if(event.target.closest('[data-pl-model]')){
    const button=event.target.closest('[data-pl-model]');
    if(model3d){
     modelRequest++;model3d.destroy();model3d=null;
     room.classList.remove('pl-model-active');
     button.setAttribute('aria-pressed','false');
     button.textContent='✨ Probar modo híbrido';
     setStatus('Sprite original restaurado.');
    }else{
     const token=++modelRequest;
     button.disabled=true;button.textContent='⏳ Cargando 3D…';
     const host=room.querySelector('.pl-person-figure');
     const loader=window.PaquilloLifeModel3D?.create;
     // Protección adicional: el botón siempre recupera el control aunque falle la red.
     let completed=false;
     const timer=setTimeout(()=>{
      if(completed||token!==modelRequest||!room)return;
      completed=true;modelRequest++;
      button.disabled=false;button.textContent='✨ Reintentar modo híbrido';
      setStatus('El modelo 3D tardó demasiado en cargar. Comprueba la conexión; el MiniJavi original sigue activo.');
     },8500);
     Promise.resolve().then(()=>{
      if(typeof loader!=='function')throw Error('Módulo 3D no disponible');
      return loader(host);
     }).then(model=>{
      if(completed||token!==modelRequest||!room){model?.destroy();return;}
      completed=true;clearTimeout(timer);
      model3d=model;room.classList.add('pl-model-active');
      button.setAttribute('aria-pressed','true');button.textContent='↩ Volver al modo clásico';
      setStatus('Modo híbrido: MiniJavi original visible con movimiento y profundidad 3D detrás.');
     }).catch(error=>{
      if(completed||token!==modelRequest||!room)return;
      completed=true;clearTimeout(timer);
      console.warn('Paquillo Life 3D:',error);
      setStatus('No se pudo cargar el 3D ('+(error?.message||'error de red')+'). El MiniJavi original sigue disponible.');
      button.textContent='✨ Reintentar modo híbrido';
     }).finally(()=>{
      if(token===modelRequest&&room)button.disabled=false;
     });
    }
    return;
   }
   if(event.target.closest('[data-pl-depth]')){
    const button=event.target.closest('[data-pl-depth]');
    const enabled=room.classList.toggle('pl-depth-mode');
    button.setAttribute('aria-pressed',String(enabled));
    button.textContent=enabled?'🎭 Movimiento 2.5D: ON':'🎭 Movimiento 2.5D: OFF';
    setStatus(enabled?'Profundidad experimental activada · aspecto original conservado.':'Animación clásica restaurada.');
    return;
   }
   if(event.target.closest('[data-pl-neighborhood]')){const cb=neighborhoodAction;if(cb){close();cb();}return;}
   if(event.target.closest('[data-pl-memory]')){
    const play=memoryAction;
    if(!play){setStatus('Memoria no está disponible. Abre Arcade para jugar.');return;}
    close();
    play();
    return;
   }
   const action=event.target.closest('[data-pl-place]')?.dataset.plPlace;
   if(action){interact(action);return;}
   if(event.target.closest('[data-pl-close]'))close();
  });
  const slot=room.querySelector('#plPerson');
  const hero=document.createElement('div');
  hero.className='pl-person-figure';
  const sprite=window.PaquilloLifeSprite?.create(name)||null;
  const puppet=sprite?null:(window.PaquilloLifePuppet?.create(name)||null);
  if(sprite){
   hero.classList.add('pl-has-sprite');
   hero.append(sprite);
  }else if(puppet){
   hero.classList.add('pl-has-rig');
   hero.append(puppet);
  }else if(source){
   const img=document.createElement('img');
   img.alt='MiniPaquillo de '+name;
   img.src=source;
   img.decoding='async';
   img.addEventListener('error',()=>{
    hero.textContent='🧑‍🎤';
    hero.classList.add('pl-person-fallback');
   });
   hero.append(img);
  }else{
   hero.textContent='🧑‍🎤';
   hero.classList.add('pl-person-fallback');
  }
  slot.append(hero);
  room.querySelector('#plName').textContent=name;
  needs={energy:75,mood:75,wellbeing:75};
   readDaily();
  document.body.appendChild(room);
  setRoomTab('play');
  renderFurniture();
  const context=window.PaquilloWorldContext?.();
  const daily=options.daily||{};
  lifeDaily=window.PaquilloWorldDaily?.mount(room.querySelector('[data-pl-daily-hub]'),{
   client:context?.client,uid:context?.currentAuthUser?.id,level:lifeLevel,
   pendingDuels:daily.pendingDuels||0,activeDuels:daily.activeDuels||0,
   playedToday:daily.playedToday||false,
   navigate:activity=>{
    if(activity==='games'||activity==='duels'){const cb=arcadeAction;close();cb?.();}
    else if(activity==='neighborhood'){const cb=neighborhoodAction;close();cb?.();}
    else if(activity==='events'){close();location.hash='proximos';}
   },
   onClaim:result=>{if(Number(result?.xp_awarded)>0)setStatus('⭐ ¡+5 XP guardados!');}
  })||null;
  renderNeeds();renderMood();
  loadAchievements();renderAchievements();
  let savedTheme='island';try{savedTheme=localStorage.getItem('paqui-life-theme-javi')||'island'}catch(_){}
  chooseTheme(themes[savedTheme]&&themeUnlocked(themes[savedTheme])?savedTheme:'island',false);
  document.body.classList.add('paqui-life-room-open');
  care();
  room.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    const tab=event.target.closest('[data-pl-tab]');
    if(tab){
     const keys=['play','decor','missions'];
     const index=keys.indexOf(tab.dataset.plTab);
     const next=keys[(index+(event.key==='ArrowRight'?1:2))%3];
     event.preventDefault();setRoomTab(next);
     room.querySelector('[data-pl-tab="'+next+'"]')?.focus();
    }
   }
   if(event.key==='Tab'){
    const focusable=[...room.querySelectorAll('button:not(:disabled)')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length>0);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  });
  room.querySelector('[data-pl-close]')?.focus({preventScroll:true});
  moveTo('home');
  scheduleIdle();
  if(options.celebrate==='memory'){
   const serial=actionSerial;
   later(()=>celebrateMemory(),prefersLessMotion()?50:220,serial);
  }
  return true;
 }
 window.addEventListener('hashchange',()=>{if(room&&location.hash!=='#world')close();});
 window.addEventListener('paqui-world-ready',()=>{if(room&&!allowed())close();});
 document.addEventListener('visibilitychange',()=>{
  if(!room)return;
  if(document.hidden)cancelAction();
  else if(allowed())scheduleIdle();
 });
 
 window.PaquilloLifePreview={get enabled(){return allowed();},open,close,get isOpen(){return !!room;}};
})();
