/* Paquillo Life · PRIMERA HABITACIÓN (preview visual, sin persistencia).
 * Usa el personaje aprobado de World. No escribe en Supabase, no concede XP,
 * no altera el estado de sus minijuegos ni de Paquillo Events.
 * Acceso de prueba: ?life-preview=1#world. */
(()=>{
 'use strict';
 const enabled=new URLSearchParams(window.location.search).get('life-preview')==='1';
 let room=null,activeTimer=0,previousFocus=null,arcadeAction=null;
 const labels={eat:'Comer',sleep:'Descansar',shower:'Ducharse',play:'Jugar'};
 const reactions={
  eat:{message:'¡Ñam! Ahora sí que apetece un plan. 🥥',motion:'eat'},
  sleep:{message:'Cinco minutitos más… 😴',motion:'sleep'},
  shower:{message:'¡Listo para salir con la cuadrilla! ✨',motion:'shower'}
 };
 const $=(id)=>document.getElementById(id);
 function clearMotion(){
  window.clearTimeout(activeTimer);
  if(!room)return;
  for(const key of Object.keys(reactions))room.classList.remove('pl-action-'+key);
 }
 function notify(action){
  const entry=reactions[action];
  if(!entry||!room)return;
  clearMotion();
  void room.offsetWidth;
  room.classList.add('pl-action-'+action);
  const speech=room.querySelector('.pl-speech');
  speech.textContent=entry.message;
  speech.hidden=false;
  room.querySelector('[data-pl-place="'+action+'"]')?.setAttribute('aria-pressed','true');
  activeTimer=window.setTimeout(()=>{
   room?.classList.remove('pl-action-'+action);
   room?.querySelectorAll('[data-pl-place]').forEach(b=>b.setAttribute('aria-pressed','false'));
   if(speech)speech.hidden=true;
  },2300);
 }
 function close(){
  clearMotion();
  if(!room)return;
  room.remove();
  room=null;
  document.body.classList.remove('paqui-life-room-open');
  previousFocus?.focus?.({preventScroll:true});
  previousFocus=null;arcadeAction=null;
 }
 function open(options={}){
  if(!enabled)return false;
  if(room)close();
  previousFocus=document.activeElement;
  arcadeAction=typeof options.onArcade==='function'?options.onArcade:null;
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
     '<div class="pl-speech" role="status" aria-live="polite" hidden></div>'+
     '<button class="pl-object pl-object-eat" type="button" data-pl-place="eat" aria-label="Abrir nevera y comer" aria-pressed="false"><span class="pl-object-icon" aria-hidden="true">🥥</span><span>Comer</span></button>'+
     '<button class="pl-object pl-object-shower" type="button" data-pl-place="shower" aria-label="Ir a la ducha" aria-pressed="false"><span class="pl-object-icon" aria-hidden="true">🚿</span><span>Ducha</span></button>'+
     '<button class="pl-object pl-object-sleep" type="button" data-pl-place="sleep" aria-label="Descansar en la cama" aria-pressed="false"><span class="pl-object-icon" aria-hidden="true">💤</span><span>Dormir</span></button>'+
     '<button class="pl-object pl-object-play" type="button" data-pl-place="play" aria-label="Ir a los minijuegos de Paquillo World"><span class="pl-object-icon" aria-hidden="true">🎮</span><span>Jugar</span></button>'+
     '<div class="pl-action-stars" aria-hidden="true"><span>✦</span><span>✦</span><span>✦</span></div>'+
     '<div class="pl-floor-caption"><b id="plName"></b><small>Tu rincón en la isla</small></div>'+
    '</div>'+
   '</main>'+
   '<footer class="pl-foot"><p><span>👆</span> Toca los objetos de la habitación para descubrir sus animaciones.</p>'+
   '<small>Vista visual de prueba · sin guardar necesidades ni XP</small></footer>';
  const slot=room.querySelector('#plPerson');
  const hero=document.createElement('div');
  hero.className='pl-person-figure';
  if(source){
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
  document.body.appendChild(room);
  document.body.classList.add('paqui-life-room-open');
  room.addEventListener('click',event=>{
   const action=event.target.closest('[data-pl-place]')?.dataset.plPlace;
   if(action==='play'){
    const cb=arcadeAction;
    close();
    cb?.();
    return;
   }
   if(action&&Object.prototype.hasOwnProperty.call(reactions,action)){notify(action);return;}
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
  return true;
 }
 window.addEventListener('hashchange',()=>{if(room&&location.hash!=='#world')close();});
 window.PaquilloLifePreview={enabled,open,close,get isOpen(){return !!room;}};
})();
