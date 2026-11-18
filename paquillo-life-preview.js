/* Paquillo Life · PRIMERA HABITACIÓN (preview visual, sin persistencia).
 * Usa el personaje aprobado de World. No escribe en Supabase, no concede XP,
 * no altera el estado de sus minijuegos ni de Paquillo Events.
 * Acceso privado: únicamente cuenta autenticada Javi (rol admin),
 * validada por Paquillo Events mediante user_profiles. */
(()=>{
 'use strict';
 // La URL ya no concede acceso: se verifica la identidad autenticada en cada apertura.
 const allowed=()=>window.PaquilloWorldContext?.()?.lifePreviewAllowed===true;
 let room=null,previousFocus=null,arcadeAction=null,memoryAction=null;
 let actionSerial=0;
 let careReady=false,careBusy=false,careSession=0;
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
   careReady=true;renderNeeds();
   room.querySelector('.pl-needs')?.setAttribute('aria-label','Necesidades guardadas en Supabase');
   const note=room.querySelector('[data-pl-persistence]');if(note)note.textContent='☁️ Cuidados guardados · sin XP';
   return true;
  }catch(error){
   if(session===careSession&&room){
    if(action)setStatus('No se ha guardado el cuidado. Espera o comprueba Supabase.');
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
  renderNeeds();
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
  for(const timer of timers)window.clearTimeout(timer);
  timers.clear();
  if(!room)return;
  room.classList.remove('pl-walking','pl-performing','pl-action-eat','pl-action-sleep','pl-action-shower','pl-action-play','pl-celebrating','pl-returning');
  room.querySelectorAll('[data-pl-place]').forEach(btn=>btn.setAttribute('aria-pressed','false'));
  const speech=room.querySelector('.pl-speech');
  if(speech){speech.hidden=true;speech.textContent='';}
 }
 function moveTo(place){
  if(!room)return;
  const data=places[place]||places.home;
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
    if(!careBusy){careBusy=true;care(action).finally(()=>{careBusy=false;});}
   }else improveNeeds(action);
   setStatus('¡Acción completada! ✨');
   speech('¡Así se vive en Paquillo World! ⭐');
   goHome(serial,prefersLessMotion()?250:450);
  },prefersLessMotion()?350:step.action,serial);
 }
 function interact(action){
  if(!room||!allowed()||!Object.prototype.hasOwnProperty.call(steps,action))return;
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
  },prefersLessMotion()?750:3000,serial);
 }
 function close(){
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
  careSession++;careReady=false;careBusy=false;
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
   '<span class="pl-preview-tag" title="No guarda progreso">ALFA</span>'+
   '</header>'+
   '<main class="pl-world">'+
    '<div class="pl-stage" aria-label="Habitación tropical interactiva">'+
     '<img class="pl-background" src="paquillo-life-room.svg?v=1" alt="Habitación tropical con vistas al mar, cama, nevera, ducha y recreativa">'+
     '<div class="pl-sunbeam" aria-hidden="true"></div>'+
     '<div class="pl-ambient pl-ambient-a" aria-hidden="true">✦</div>'+
     '<div class="pl-ambient pl-ambient-b" aria-hidden="true">✧</div>'+
     '<div class="pl-character-spot" aria-hidden="true"></div>'+
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
   '<div class="pl-needs" aria-label="Indicadores de prueba, sin guardar"><label>⚡ Energía <progress data-pl-need="energy" max="100" value="75"></progress></label><label>😊 Ánimo <progress data-pl-need="mood" max="100" value="75"></progress></label><label>💚 Bienestar <progress data-pl-need="wellbeing" max="100" value="75"></progress></label></div>'+
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
  renderNeeds();
  document.body.appendChild(room);
  renderNeeds();
  document.body.classList.add('paqui-life-room-open');
  care();
  room.addEventListener('click',event=>{
   if(!allowed()){close();return;}
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
  if(options.celebrate==='memory'){
   const serial=actionSerial;
   later(()=>celebrateMemory(),prefersLessMotion()?50:220,serial);
  }
  return true;
 }
 window.addEventListener('hashchange',()=>{if(room&&location.hash!=='#world')close();});
 window.addEventListener('paqui-world-ready',()=>{if(room&&!allowed())close();});
 document.addEventListener('visibilitychange',()=>{if(room&&document.hidden)cancelAction();});
 
 window.PaquilloLifePreview={get enabled(){return allowed();},open,close,get isOpen(){return !!room;}};
})();
