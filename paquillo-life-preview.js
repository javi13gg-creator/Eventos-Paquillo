/* Paquillo Life · Habitación alfa con cuidados persistentes opcionales.
 * Usa el personaje aprobado de World. Solo la RPC autorizada escribe necesidades; no concede XP,
 * no altera el estado de sus minijuegos ni de Paquillo Events.
 * Acceso privado: únicamente cuenta autenticada Javi (rol admin),
 * validada por Paquillo Events mediante user_profiles. */
(()=>{
 'use strict';
 // La URL ya no concede acceso: se verifica la identidad autenticada en cada apertura.
 const allowed=()=>window.PaquilloWorldContext?.()?.lifePreviewAllowed===true;
 let room=null,previousFocus=null,arcadeAction=null,memoryAction=null;
 let model3d=null,modelRequest=0;
 let actionSerial=0;
 let careReady=false,careBusy=false,careSession=0;
 let moodMessage='';
 let lifeLevel=1,roomTheme='island';
 const themes={island:{label:'🏝️ Isla',min:1},sunset:{label:'🌅 Atardecer',min:3},night:{label:'🌙 Noche',min:7}};
 function chooseTheme(key,announce=true){
  if(!room||!themes[key]||lifeLevel<themes[key].min)return;
  roomTheme=key;room.dataset.plTheme=key;
  room.querySelectorAll('[data-pl-theme]').forEach(button=>{
   const item=themes[button.dataset.plTheme];
   button.disabled=lifeLevel<item.min;
   button.setAttribute('aria-pressed',String(key===button.dataset.plTheme));
   button.textContent=item.label+(lifeLevel<item.min?' · Nv '+item.min+' 🔒':'');
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
  if(el){el.textContent=mood.icon+' '+mood.label;el.title=mood.phrase;}
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
  }
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
  const data=override?{...places.home,...override}:places[place]||places.home;
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
     care(action).then(saved=>{if(saved&&room)setStatus('¡Cuidado guardado! ✨');}).finally(()=>{careBusy=false;});
    }else setStatus('Todavía se está guardando el cuidado anterior.');
   }else{
    improveNeeds(action);
    setStatus('Acción de demostración · sin guardar');
   }
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
  modelRequest++;
  model3d?.destroy();model3d=null;
  cancelAction();
  careSession++;careReady=false;careBusy=false;
  if(!room)return;
  room.remove();
  room=null;
  document.body.classList.remove('paqui-life-room-open');
  previousFocus?.focus?.({preventScroll:true});
  previousFocus=null;arcadeAction=null;memoryAction=null;
 }
 function open(options={}){
  if(!allowed())return false;
  if(room)close();
  careSession++;careReady=false;careBusy=false;moodMessage='';roamIndex=0;
  lifeLevel=Math.floor(Math.max(0,Number(options.xp)||0)/250)+1;roamPosition={left:48,bottom:15};
  previousFocus=document.activeElement;
  arcadeAction=typeof options.onArcade==='function'?options.onArcade:null;
  memoryAction=typeof options.onMemory==='function'?options.onMemory:null;
  const name=String(options.name||'Paquillo').slice(0,50);
  const source=window.PaquilloWorldCharacters?.imageFor(name)||'';
  room=document.createElement('section');
  room.id='paquiLifePreview';
  room.className='pl-screen';
  room.setAttribute('role','dialog');
  room.setAttribute('aria-modal','true');
  room.setAttribute('aria-label','Mi hogar de Paquillo Life, vista de prueba');
  room.innerHTML='<header class="pl-header">'+
   '<button class="pl-back" type="button" data-pl-close aria-label="Volver a Paquillo World"><span aria-hidden="true">‹</span><span>World</span></button>'+
   '<div class="pl-header-title"><small>🌴 PAQUILLO LIFE</small><b>Mi hogar</b></div>'+
   '<span class="pl-preview-tag" title="Animación de profundidad experimental">LIFE v13</span>'+
   '</header>'+
   '<main class="pl-world">'+
    '<div class="pl-stage" aria-label="Habitación tropical interactiva">'+
     '<img class="pl-background" src="paquillo-life-room.svg?v=1" alt="Habitación tropical con vistas al mar, cama, nevera, ducha y recreativa">'+
     '<div class="pl-sunbeam" aria-hidden="true"></div>'+
     '<div class="pl-ambient pl-ambient-a" aria-hidden="true">✦</div>'+
     '<div class="pl-ambient pl-ambient-b" aria-hidden="true">✧</div>'+
     '<div class="pl-character-spot" aria-hidden="true"></div>'+ 
     '<div class="pl-decor-light" aria-hidden="true">✦ ✦ ✦</div>'+ 
     '<button class="pl-decor pl-decor-lamp" type="button" data-pl-decor="lamp" aria-label="Encender o apagar guirnalda" aria-pressed="false">💡</button>'+ 
     '<button class="pl-decor pl-decor-plant" type="button" data-pl-decor="plant" aria-label="Saludar a la palmera">🌴</button>'+
     '<div class="pl-person" id="plPerson"></div>'+
     '<div class="pl-action-prop" aria-hidden="true"><span class="pl-prop-eat">🥥</span><span class="pl-prop-sleep">💤</span><span class="pl-prop-shower">🫧</span><span class="pl-prop-play">🎮</span></div>'+
     '<div class="pl-speech" role="status" aria-live="polite" hidden></div>'+
     '<button class="pl-object pl-object-eat" type="button" data-pl-place="eat" aria-label="Abrir nevera y comer" aria-pressed="false"><span class="pl-object-icon" aria-hidden="true">🥥</span><span>Comer</span></button>'+
     '<button class="pl-object pl-object-shower" type="button" data-pl-place="shower" aria-label="Ir a la ducha" aria-pressed="false"><span class="pl-object-icon" aria-hidden="true">🚿</span><span>Ducha</span></button>'+
     '<button class="pl-object pl-object-sleep" type="button" data-pl-place="sleep" aria-label="Descansar en la cama" aria-pressed="false"><span class="pl-object-icon" aria-hidden="true">💤</span><span>Dormir</span></button>'+
     '<button class="pl-object pl-object-play" type="button" data-pl-place="play" aria-label="Ir a los minijuegos de Paquillo World"><span class="pl-object-icon" aria-hidden="true">🎮</span><span>Jugar</span></button>'+
     '<div class="pl-action-stars" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></div>'+
     '<div class="pl-floor-caption"><b id="plName"></b><small>Tu rincón en la isla</small></div>'+
    '</div>'+
   '</main>'+
   '<footer class="pl-foot">'+
   '<div class="pl-mood-chip" data-pl-mood role="status" aria-live="polite">😊 Todo marcha bien</div>'+ 
   '<button type="button" class="pl-depth-toggle" data-pl-depth aria-pressed="false" title="Activar profundidad 2.5D conservando el sprite original">🎭 Movimiento 2.5D: OFF</button>'+ 
   '<button type="button" class="pl-depth-toggle pl-model-toggle" data-pl-model aria-pressed="false" title="Modo híbrido: aspecto original de MiniJavi y profundidad 3D experimental">✨ Probar modo híbrido</button>'+ 
   '<div class="pl-needs" aria-label="Necesidades de MiniPaquillo"><label>⚡ Energía <progress data-pl-need="energy" max="100" value="75"></progress></label><label>😊 Ánimo <progress data-pl-need="mood" max="100" value="75"></progress></label><label>💚 Bienestar <progress data-pl-need="wellbeing" max="100" value="75"></progress></label></div>'+
   '<button class="pl-memory-shortcut" type="button" data-pl-memory aria-label="Jugar directamente a Memoria Paquillera y volver al hogar al terminar"><span aria-hidden="true">🃏</span> Jugar a Memoria Paquillera <span aria-hidden="true">▶</span></button>'+
   '<p id="plStatus" role="status" aria-live="polite"><span>👆</span> Toca un objeto para ver los movimientos.</p>'+
   '<small data-pl-persistence>⏳ Comprobando guardado · sin XP</small></footer>';
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
  document.body.appendChild(room);
  renderNeeds();renderMood();
  let savedTheme='island';try{savedTheme=localStorage.getItem('paqui-life-theme-javi')||'island'}catch(_){}
  chooseTheme(themes[savedTheme]&&lifeLevel>=themes[savedTheme].min?savedTheme:'island',false);
  document.body.classList.add('paqui-life-room-open');
  care();
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
  room.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){
    const focusable=[...room.querySelectorAll('button:not(:disabled)')];
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
