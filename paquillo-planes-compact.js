/* Paquillo Events · convierte la vista de planes en tarjetas compactas sin reemplazar sus controles */
(()=>{
 'use strict';
 if(window.PaquilloCompactPlans)return;
 const make=(tag,className)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  return el;
 };
 const shortLabel=(button,text,emoji)=>{
  if(!button)return;
  button.innerHTML='<span class="paqui-tool-emoji" aria-hidden="true">'+emoji+'</span><span>'+text+'</span>';
  button.title=text;
 };
 function transform(details){
  if(!details||details.closest('.paqui-plan-card'))return;
  const summary=details.querySelector(':scope > summary.paqui-plan-summary');
  const article=details.querySelector(':scope > .ev-card');
  const quick=article?.querySelector('.event-quick-actions');
  if(!summary||!article||!quick)return;
  const card=make('section','paqui-plan-card');
  card.dataset.paquiPlanCard=details.dataset.eventDb||'';
  details.before(card);
  card.appendChild(details);
  const top=make('button','paqui-plan-top');
  top.type='button';
  top.innerHTML=summary.innerHTML;
  top.querySelector('[data-paqui-reaction-teaser]')?.remove();
  const title=top.querySelector('.paqui-plan-summary-text strong')?.textContent||'plan';
  top.setAttribute('aria-controls',details.id);
  top.setAttribute('aria-label','Abrir o cerrar detalles de '+title);
  top.setAttribute('aria-expanded',String(details.open));
  // Cartel accesible directamente desde la cabecera: miniatura + ficha con imagen completa.
  // La imagen original sigue dentro de los detalles; nunca se elimina del DOM.
  const heading=make('div','paqui-plan-header-row');
  card.insertBefore(heading,details);
  heading.append(top);
  const originalPoster=article.querySelector(':scope > .poster img');
  if(originalPoster&&details.dataset.eventDb){
   const preview=make('button','paqui-plan-poster-preview');
   preview.type='button';
   preview.dataset.eventDetail=details.dataset.eventDb;
   preview.title='Ver cartel completo';
   preview.setAttribute('aria-label','Ver cartel completo de '+title);
   const thumb=originalPoster.cloneNode(true);
   thumb.className='paqui-plan-poster-thumb';
   thumb.alt='';
   thumb.loading='lazy';
   thumb.setAttribute('aria-hidden','true');
   thumb.addEventListener('error',()=>{preview.hidden=true;});
   preview.append(thumb);
   heading.append(preview);
  }
  top.addEventListener('click',()=>{details.open=!details.open;});
  details.addEventListener('toggle',()=>{
   top.setAttribute('aria-expanded',String(details.open));
   card.classList.toggle('is-expanded',details.open);
  });
  summary.className='paqui-plan-detail-toggle';
  summary.innerHTML='<span>ℹ️ Información y opciones</span><span class="paqui-fold-arrow" aria-hidden="true">⌄</span>';
  const facts=article.querySelector(':scope > div:first-child');
  facts?.classList.add('paqui-plan-facts');
  const description=article.querySelector(':scope > p[style]');
  description?.classList.add('paqui-plan-details-description');
  if(description&&!description.textContent.trim())description.remove();
  // Participación y reacciones quedan visibles incluso con la ficha plegada.
  const interact=make('div','paqui-plan-interact');
  const rsvp=make('div','paqui-plan-rsvp');
  rsvp.setAttribute('role','group');
  rsvp.setAttribute('aria-label','Confirmar asistencia a '+title);
  const choiceLabels={yes:'Voy',maybe:'Quizá',no:'No voy'};
  const choiceIcons={yes:'✅',maybe:'🤔',no:'❌'};
  quick.querySelector('.attendance-prompt')?.remove();
  Array.from(quick.querySelectorAll('[data-attendance-choice]')).forEach(button=>{
   const kind=button.dataset.attendanceChoice;
   if(!choiceLabels[kind])return;
   button.innerHTML='<span aria-hidden="true">'+choiceIcons[kind]+'</span><span class="paqui-rsvp-text">'+choiceLabels[kind]+'</span>';
   button.setAttribute('aria-label',choiceLabels[kind]);
   const cell=make('div','paqui-rsvp-choice');
   cell.append(button);
   const total=make('button','paqui-rsvp-total');
   total.type='button';
   total.dataset.paquiAttendanceCounter=kind;
   total.setAttribute('aria-live','polite');
   total.setAttribute('aria-label','Cargando respuestas: '+choiceLabels[kind]);
   total.textContent='…';
   cell.append(total);
   rsvp.append(cell);
  });
  const reaction=article.querySelector('[data-paqui-reaction-box]');
  if(reaction){
   reaction.classList.add('paqui-reaction-inline');
   rsvp.classList.add('has-reactions');
   rsvp.append(reaction);
  }
  interact.append(rsvp);
  const voters=make('div','paqui-inline-voters');
  voters.hidden=true;
  voters.setAttribute('aria-live','polite');
  interact.append(voters);
  rsvp.querySelectorAll('[data-paqui-attendance-counter]').forEach(counter=>counter.addEventListener('click',async event=>{
   event.preventDefault();event.stopPropagation();
   const key=counter.dataset.paquiAttendanceCounter;
   document.dispatchEvent(new CustomEvent('paqui:close-reaction-people',{detail:{id:card.dataset.paquiPlanCard}}));
   const attendance=card.querySelector('[data-attendance-info]');
   if(!attendance)return;
   if(!attendance.querySelector('[data-attendance-show]'))await window.PaquilloRenderAttendanceCounts?.();
   const trigger=attendance.querySelector('[data-attendance-show="'+key+'"]');
   if(!trigger){voters.hidden=false;voters.textContent='No se han podido cargar las respuestas.';return;}
   const closing=!voters.hidden&&voters.dataset.open===key;
   rsvp.querySelectorAll('[data-paqui-attendance-counter]').forEach(x=>x.setAttribute('aria-expanded','false'));
   if(closing){voters.hidden=true;voters.dataset.open='';return;}
   trigger.click();
   const names=attendance.querySelector('.attendance-selected-list');
   voters.innerHTML=names?.innerHTML||'<p>Sin respuestas todavía.</p>';
   voters.hidden=false;voters.dataset.open=key;counter.setAttribute('aria-expanded','true');
  }));
  card.addEventListener('paqui:reaction-people',event=>{
   const {html,open}=event.detail||{};
   rsvp.querySelectorAll('[data-paqui-attendance-counter]').forEach(x=>x.setAttribute('aria-expanded','false'));
   if(!open){voters.hidden=true;voters.dataset.open='';voters.innerHTML='';return;}
   voters.innerHTML='<div class="paqui-react-people-list">'+(html||'')+'</div>';
   voters.dataset.open='reactions';voters.hidden=false;
  });
  card.insertBefore(interact,details);
  // Acciones más frecuentes, una fila de tres iconos.
  const primary=make('div','paqui-plan-primary-tools');
  for(const [selector,text,emoji] of [
   ['[data-event-detail]','Ficha','📋'],
   ['[data-share-event]','Compartir','📲'],
   ['[data-event-calendar]','Calendario','📆']
  ]){
   const b=quick.querySelector(selector);
   if(!b)continue;
   shortLabel(b,text,emoji);
   primary.append(b);
  }
  quick.replaceWith(primary);
  // Acciones ocasionales bajo un solo acordeón. Mismos nodos y data-*.
  const more=make('details','paqui-plan-extra');
  const moreSummary=make('summary');
  moreSummary.textContent='⋯ Más opciones';
  const moreBody=make('div','paqui-plan-extra-items');
  for(const [selector,text] of [
   ['[data-remind-event]','🔔 Recordar'],
   ['[data-google-calendar]','📆 Google Calendar'],
   ['[data-event-expenses]','💸 Gastos']
  ]){
   const b=quick.querySelector(selector);
   if(b){b.textContent=text;moreBody.append(b);}
  }
  Array.from(article.querySelectorAll(':scope > div > a.btn')).forEach(link=>{
   const wrapper=link.parentElement;
   moreBody.append(link);
   if(wrapper&&!wrapper.children.length)wrapper.remove();
  });
  const poll=article.querySelector('.event-poll-actions');
  if(poll){
   const b=poll.querySelector('[data-create-event-poll]');
   if(b)b.textContent='🗳️ Crear encuesta';
   moreBody.append(poll);
  }
  const manage=article.querySelector('.event-manage');
  if(manage)moreBody.append(manage);
  if(moreBody.children.length){
   more.append(moreSummary,moreBody);
   primary.after(more);
  }
  // El cartel no debe ocupar media pantalla por defecto.
  const poster=article.querySelector(':scope > .poster');
  if(poster){
   const wrapper=make('details','paqui-plan-poster');
   const open=make('summary');open.textContent='🖼️ Ver cartel completo aquí';
   poster.before(wrapper);
   wrapper.append(open,poster);
  }
  // Detalle completo de asistentes accesible solo cuando se solicite.
  const attendance=article.querySelector('[data-attendance-info]');
  if(attendance){
   const wrapper=make('details','paqui-plan-attendees');
   const open=make('summary');
   open.textContent='👥 Ver participantes y respuestas';
   attendance.before(wrapper);
   wrapper.append(open,attendance);
  }
 }
 function mount(root){
  if(!root)return;
  root.querySelectorAll('.paqui-plan-fold').forEach(transform);
 }
 window.PaquilloCompactPlans={mount};
 // En sesiones ya restauradas, la consulta de planes puede terminar antes de cargar este archivo.
 const initial=document.getElementById('events');
 if(initial?.querySelector('.paqui-plan-fold')){
  mount(initial);
  // Restaura los contadores si la asistencia llegó antes que el módulo compacto.
  window.PaquilloRenderAttendanceCounts?.();
 }
})();
