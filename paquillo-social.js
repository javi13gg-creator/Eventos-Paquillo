/* Paquillo Events · Social fase 1. Solo lecturas con el cliente autenticado y RLS existentes. */
(()=>{
 'use strict';
 const root=document.getElementById('paquiSocial');
 if(!root)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const safeDate=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?d:null;};
 const labelDate=x=>{const d=safeDate(x);return d?d.toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'Sin fecha';};
 const todayKey=()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=k=>parts.find(p=>p.type===k)?.value||'';return part('year')+'-'+part('month')+'-'+part('day');};
 const getContext=()=>window.PaquilloWorldContext?.();
 const state={filter:'all',visible:6,items:[],loading:false,uid:null,lastFetch:0,loadId:0};
 const kindLabels={all:'Todo',event:'📅 Planes',poll:'🗳️ Encuestas',memory:'📸 Recuerdos'};
 root.innerHTML='<div class="ps-header"><div><span class="ps-kicker">✨ TU COMUNIDAD</span><h2 id="psHello">Tu rincón paquillero</h2><p>Lo que tienes pendiente y lo que se mueve en el grupo.</p></div><button class="ps-refresh" type="button" data-ps-action="refresh" aria-label="Actualizar novedades">↻ Actualizar</button></div><div class="ps-quick" id="psQuick" aria-live="polite"><p class="ps-empty">Preparando tu inicio…</p></div><div class="ps-feed-head"><div><h2>📢 Muro Paquillero</h2><p>Novedades del grupo, sin ruido ni publicaciones inventadas.</p></div></div><div class="ps-filters" id="psFilters" role="group" aria-label="Filtrar actividad"></div><div id="psFeed" class="ps-feed" aria-live="polite"><p class="ps-empty">Cargando actividad…</p></div><div class="ps-more" id="psMore"></div>';
 const filters=root.querySelector('#psFilters');
 const quick=root.querySelector('#psQuick');
 const feed=root.querySelector('#psFeed');
 const more=root.querySelector('#psMore');
 function drawFilters(){
  filters.innerHTML=Object.entries(kindLabels).map(([k,label])=>'<button type="button" class="ps-filter'+(k===state.filter?' active':'')+'" data-ps-action="filter" data-kind="'+k+'" aria-pressed="'+(k===state.filter)+'">'+label+'</button>').join('');
 }
 function drawFeed(){
  drawFilters();
  const items=state.items.filter(x=>state.filter==='all'||x.kind===state.filter);
  if(!items.length){feed.innerHTML='<p class="ps-empty">No hay novedades de este tipo por ahora. ¡El próximo plan será el primero!</p>';more.innerHTML='';return;}
  feed.innerHTML=items.slice(0,state.visible).map(x=>'<article class="ps-post"><div class="ps-post-icon" aria-hidden="true">'+x.icon+'</div><div class="ps-post-body"><div class="ps-post-meta"><span>'+esc(x.category)+'</span><time datetime="'+esc(x.at)+'">'+esc(labelDate(x.at))+'</time></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.description)+'</p><button type="button" class="ps-open" data-ps-action="navigate" data-tab="'+esc(x.tab)+'" data-entity="'+esc(x.entity||'')+'">Ver '+esc(x.linkLabel)+' <span aria-hidden="true">›</span></button></div></article>').join('');
  more.innerHTML=items.length>state.visible?'<button class="ps-load-more" type="button" data-ps-action="more">Mostrar más novedades ('+(items.length-state.visible)+')</button>':'';
 }
 function quickCard(icon,value,label,description,tab,entity){
  return '<button class="ps-quick-card" type="button" data-ps-action="navigate" data-tab="'+esc(tab)+'" data-entity="'+esc(entity||'')+'"><span class="ps-card-icon">'+icon+'</span><span class="ps-card-number">'+esc(value)+'</span><strong>'+esc(label)+'</strong><small>'+esc(description)+'</small></button>';
 }
 function getBirthdays(members,today){
  const parts=today.split('-').map(Number),base=new Date(parts[0],parts[1]-1,parts[2]);
  return members.map(m=>{
   const raw=String(m.birthday||''),p=raw.match(/^\d{4}-(\d{2})-(\d{2})/);
   if(!p)return null;
   let next=new Date(parts[0],Number(p[1])-1,Number(p[2]));
   if(next<base)next=new Date(parts[0]+1,Number(p[1])-1,Number(p[2]));
   return {name:m.display_name||'Paquillo',next,days:Math.round((next-base)/86400000)};
  }).filter(Boolean).sort((a,b)=>a.days-b.days);
 }
 function goTab(tab,entity){
  const b=document.querySelector('#tabs [data-t="'+tab+'"]');
  if(!b)return;
  b.click();
  if(!entity)return;
  let attempts=0;
  const tryFocus=()=>{
   let el=null;
   if(tab==='votaciones')el=document.getElementById('poll-'+entity);
   else if(tab==='horno')el=document.getElementById('memory-'+entity);
   else if(tab==='proximos')el=Array.from(document.querySelectorAll('#events [data-event-db]')).find(x=>x.dataset.eventDb===entity);
   if(el){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1800);}
   else if(++attempts<24)setTimeout(tryFocus,250);
  };
  setTimeout(tryFocus,180);
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('[data-ps-action]');
  if(!b||!root.contains(b))return;
  const action=b.dataset.psAction;
  if(action==='refresh')refresh(true);
  if(action==='filter'){state.filter=Object.prototype.hasOwnProperty.call(kindLabels,b.dataset.kind)?b.dataset.kind:'all';state.visible=6;drawFeed();}
  if(action==='more'){state.visible+=6;drawFeed();}
  if(action==='navigate')goTab(b.dataset.tab,b.dataset.entity);
 });
 async function refresh(force){
  const context=getContext();
  if(!context?.client||!context.currentAuthUser||context.authBootstrapping)return;
  if(state.loading)return;
  if(!force&&state.uid===context.currentAuthUser.id&&Date.now()-state.lastFetch<120000)return;
  state.loading=true;state.uid=context.currentAuthUser.id;const token=++state.loadId;
  root.classList.add('ps-loading');
  try{
   const db=context.client,today=todayKey();
   const results=await Promise.allSettled([
    db.from('group_members').select('id,auth_user_id,display_name,birthday').eq('is_active',true).order('display_name').limit(100),
    db.from('group_events').select('id,title,event_date,event_time,status,created_at,created_by').order('created_at',{ascending:false}).limit(80),
    db.from('group_events').select('id,title,event_date,event_time,status,created_at').gte('event_date',today).order('event_date',{ascending:true}).limit(80),
    db.from('polls').select('id,title,status,created_at,closes_at,vote_visibility').order('created_at',{ascending:false}).limit(60),
    db.from('group_memories').select('id,title,created_at,group_members(display_name)').order('created_at',{ascending:false}).limit(40)
   ]);
   if(token!==state.loadId)return;
   const data=results.map(r=>r.status==='fulfilled'&&!r.value?.error?(r.value?.data||[]):null);
   if(data.every(x=>x===null))throw Error('No se han podido consultar los datos de Supabase.');
   const [members,recentEvents,futureEvents,polls,memories]=data;
   const memberByAuth=new Map((members||[]).filter(x=>x.auth_user_id).map(x=>[x.auth_user_id,x]));
   const member=memberByAuth.get(context.currentAuthUser.id);
   const birthday=getBirthdays(members||[],today)[0];
   const validFuture=(futureEvents||[]).filter(x=>x.status!=='completed'&&x.status!=='cancelled'&&x.status!=='draft');
   const openPolls=(polls||[]).filter(x=>x.status==='open'&&(!x.closes_at||new Date(x.closes_at).getTime()>Date.now()));
   const ids=validFuture.map(x=>x.id).filter(Boolean);
   let attendance=null;
   if(member&&ids.length){
    const a=await db.from('event_attendance').select('event_id,member_id,status,updated_at').in('event_id',ids);
    if(!a.error)attendance=a.data||[];
    else console.warn('Paquillo Social: no se pudo cargar asistencia');
   }
   if(token!==state.loadId)return;
   const mine=new Map((attendance||[]).filter(a=>a.member_id===member?.id).map(a=>[String(a.event_id),a.status]));
   const yes=validFuture.filter(x=>mine.get(String(x.id))==='yes');
   const toAnswer=member&&attendance?validFuture.filter(x=>!mine.has(String(x.id))):null;
   const hello=document.getElementById('psHello');
   if(hello)hello.textContent=member?.display_name?'¡Hola, '+member.display_name+'! 👋':'Tu rincón paquillero 👋';
   const birthdayLabel=birthday?(birthday.days===0?'¡Hoy!':birthday.days===1?'Mañana':'En '+birthday.days+' días'):'Sin fechas';
   quick.innerHTML=quickCard('✅',attendance?yes.length:'—','Planes a los que vas',yes[0]?(yes[0].title+' · '+labelDate(yes[0].event_date+'T12:00:00')):'Consulta tu agenda','proximos',yes[0]?.id)+
    quickCard('🙋',toAnswer?toAnswer.length:'—','Por confirmar',toAnswer?.length?'Tienes planes sin responder':'Consulta tus planes','proximos',toAnswer?.[0]?.id)+
    quickCard('🗳️',polls?openPolls.length:'—','Encuestas abiertas','Puedes votar en las encuestas activas','votaciones',openPolls[0]?.id)+
    quickCard('🎂',birthdayLabel,'Próximo cumpleaños',birthday?birthday.name:'Consulta los cumpleaños','cumples','');
   const items=[];
   (recentEvents||[]).forEach(x=>{
    if(!x.created_at||x.status==='cancelled')return;
    items.push({kind:'event',icon:x.status==='completed'?'🏁':'📅',category:'Planes',title:x.title,description:(x.status==='completed'?'Plan realizado':'Nuevo plan en la agenda')+(x.event_date?' · '+labelDate(x.event_date+'T12:00:00'):' · Fecha pendiente'),at:x.created_at,tab:x.status==='completed'?'pasados':'proximos',entity:x.id,linkLabel:'plan'});
   });
   (polls||[]).forEach(x=>{
    if(!x.created_at||x.status==='draft')return;
    items.push({kind:'poll',icon:'🗳️',category:'Encuestas',title:x.title,description:x.status==='open'?'Una encuesta para participar':'Encuesta del grupo',at:x.created_at,tab:'votaciones',entity:x.id,linkLabel:'encuesta'});
   });
   (memories||[]).forEach(x=>{
    if(!x.created_at)return;
    items.push({kind:'memory',icon:'📸',category:'Recuerdos',title:x.title,description:'Compartido por '+(x.group_members?.display_name||'un Paquillo'),at:x.created_at,tab:'horno',entity:x.id,linkLabel:'recuerdo'});
   });
   if(attendance&&members){
    const upcomingById=new Map(validFuture.map(x=>[String(x.id),x]));
    const recentCutoff=Date.now()-14*86400000,grouped=new Map();
    attendance.forEach(a=>{
     const time=safeDate(a.updated_at)?.getTime()||0,ev=upcomingById.get(String(a.event_id));
     if(a.status!=='yes'||!ev||time<recentCutoff||!memberByAuth.size)return;
     const k=String(a.event_id),g=grouped.get(k)||{count:0,last:0,event:ev};
     g.count++;g.last=Math.max(g.last,time);grouped.set(k,g);
    });
    Array.from(grouped.values()).sort((a,b)=>b.last-a.last).slice(0,5).forEach(g=>items.push({kind:'event',icon:'🙌',category:'Confirmaciones',title:g.event.title,description:g.count+' '+(g.count===1?'persona ha confirmado':'personas han confirmado')+' asistencia recientemente',at:new Date(g.last).toISOString(),tab:'proximos',entity:g.event.id,linkLabel:'asistentes'}));
   }
   state.items=items.filter(x=>safeDate(x.at)).sort((a,b)=>new Date(b.at)-new Date(a.at));
   state.lastFetch=Date.now();
   drawFeed();
   const sectionsMissing=data.map((x,i)=>x===null?['miembros','planes recientes','agenda','encuestas','recuerdos'][i]:null).filter(Boolean);
   if(sectionsMissing.length){
    const p=document.createElement('p');p.className='ps-partial';p.textContent='Algunas novedades no están disponibles: '+sectionsMissing.join(', ')+'.';quick.after(p);
    root.querySelectorAll('.ps-partial').forEach((e,i)=>{if(i>0)e.remove();});
   }else root.querySelectorAll('.ps-partial').forEach(e=>e.remove());
  }catch(e){
   console.warn('Paquillo Social:',e);
   quick.innerHTML='<p class="ps-empty">No hemos podido cargar tu resumen. Prueba a actualizar.</p>';
   feed.innerHTML='<p class="ps-empty">Las novedades no están disponibles ahora.</p>';more.innerHTML='';
  }finally{
   state.loading=false;root.classList.remove('ps-loading');
  }
 }
 window.PaquilloSocial={refresh:()=>refresh(true)};
 window.addEventListener('paqui-world-ready',()=>refresh(true));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false)});
 window.addEventListener('focus',()=>refresh(false));
 const context=getContext();if(context?.currentAuthUser&&!context.authBootstrapping)refresh(true);
 drawFilters();
})();