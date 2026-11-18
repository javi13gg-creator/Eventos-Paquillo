/* Paquillo Events · Social fase 1. Solo lecturas con el cliente autenticado y RLS existentes. */
(()=>{
 'use strict';
 const root=document.getElementById('paquiSocial');
 const feedRoot=document.getElementById('paquiSocialFeed');
 if(!root||!feedRoot)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const safeDate=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?d:null;};
 const labelDate=x=>{const d=safeDate(x);return d?d.toLocaleDateString('es-ES',{day:'numeric',month:'short'}):'Sin fecha';};
 const todayKey=()=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=k=>parts.find(p=>p.type===k)?.value||'';return part('year')+'-'+part('month')+'-'+part('day');};
 const getContext=()=>window.PaquilloWorldContext?.();
 const state={filter:'all',visible:6,items:[],loading:false,uid:null,lastFetch:0,loadId:0};
 const kindLabels={all:'Todo',event:'📅 Planes',poll:'🗳️ Encuestas',memory:'📸 Recuerdos'};
 root.innerHTML='<div class="ps-header"><div><span class="ps-kicker">✨ TU COMUNIDAD</span><h2 id="psHello">Tu rincón paquillero</h2><p>Tu resumen y lo que tienes pendiente.</p></div><div class="ps-head-actions"><button class="ps-help-link" type="button" data-ps-action="navigate" data-tab="ayuda" aria-label="Abrir ayuda" title="Ayuda">❔</button><button class="ps-refresh" type="button" data-ps-action="refresh" aria-label="Actualizar novedades" title="Actualizar novedades">↻</button></div></div><div class="ps-quick" id="psQuick" aria-live="polite"><p class="ps-empty">Preparando tu inicio…</p></div><div class="ps-pending-polls" id="psPendingPolls" hidden></div>';
 feedRoot.innerHTML='<div class="ps-feed-head"><div><h2>📢 Muro Paquillero</h2><p>Novedades del grupo, sin ruido ni publicaciones inventadas.</p></div></div><div class="ps-filters" id="psFilters" role="group" aria-label="Filtrar actividad"></div><div id="psFeed" class="ps-feed" aria-live="polite"><p class="ps-empty">Cargando actividad…</p></div><div class="ps-more" id="psMore"></div>';
 const filters=feedRoot.querySelector('#psFilters');
 const quick=root.querySelector('#psQuick');
 const feed=feedRoot.querySelector('#psFeed');
 const more=feedRoot.querySelector('#psMore');
 function drawFilters(){
  filters.innerHTML=Object.entries(kindLabels).map(([k,label])=>'<button type="button" class="ps-filter'+(k===state.filter?' active':'')+'" data-ps-action="filter" data-kind="'+k+'" aria-pressed="'+(k===state.filter)+'">'+label+'</button>').join('');
 }
 const EVENT_MONTHS=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
 function dateBadge(value){
  const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||'').slice(0,10));
  const month=parts?Number(parts[2]):0,day=parts?Number(parts[3]):0;
  if(!parts||month<1||month>12||day<1||day>31)return '<span class="paqui-calendar-month">FECHA</span><span class="paqui-calendar-day">?</span>';
  return '<span class="paqui-calendar-month">'+EVENT_MONTHS[month-1]+'</span><span class="paqui-calendar-day">'+day+'</span>';
 }
 function feedLink(item){
  const action=' type="button" data-ps-action="navigate" data-tab="'+esc(item.tab)+'" data-entity="'+esc(item.entity||'')+'"';
  if(item.kind==='event'){
   const date=String(item.eventDate||'');
   const attendees=Number.isInteger(item.yesCount)?'<span class="ps-event-attendees" title="'+item.yesCount+' personas han confirmado" aria-label="'+item.yesCount+' '+(item.yesCount===1?'persona ha confirmado':'personas han confirmado')+' asistencia">👥 '+item.yesCount+'</span>':'';
   const dateLabel=date?' · '+labelDate(date+'T12:00:00'):'';
   return '<button class="ps-feed-link ps-feed-event"'+action+' aria-label="Abrir plan '+esc(item.title+dateLabel)+'">'+
    '<span class="paqui-plan-summary-icon ps-feed-date" aria-hidden="true">'+dateBadge(date)+'</span>'+
    '<span class="ps-feed-copy"><strong>'+esc(item.title)+'</strong>'+attendees+'</span>'+
    '<span class="ps-feed-arrow" aria-hidden="true">›</span></button>';
  }
  return '<button class="ps-feed-link ps-feed-other"'+action+' aria-label="Abrir '+esc(item.category.toLowerCase()+': '+item.title)+'">'+
   '<span class="ps-feed-mini-icon" aria-hidden="true">'+item.icon+'</span>'+
   '<span class="ps-feed-copy"><strong>'+esc(item.title)+'</strong><small>'+esc(item.category)+'</small></span>'+
   '<span class="ps-feed-arrow" aria-hidden="true">›</span></button>';
 }
 function drawFeed(){
  drawFilters();
  const items=state.items.filter(x=>state.filter==='all'||x.kind===state.filter);
  if(!items.length){feed.innerHTML='<p class="ps-empty">No hay novedades de este tipo por ahora. ¡El próximo plan será el primero!</p>';more.innerHTML='';return;}
  feed.innerHTML=items.slice(0,state.visible).map(feedLink).join('');
  more.innerHTML=items.length>state.visible?'<button class="ps-load-more" type="button" data-ps-action="more">Mostrar más novedades ('+(items.length-state.visible)+')</button>':'';
 }
 function quickCard(icon,value,label,description,tab,entity){
  return '<button class="ps-quick-card" type="button" data-ps-action="navigate" data-tab="'+esc(tab)+'" data-entity="'+esc(entity||'')+'" aria-label="'+esc(label+': '+value+'. '+description)+'" title="'+esc(description)+'"><span class="ps-card-icon" aria-hidden="true">'+icon+'</span><span class="ps-card-number">'+esc(value)+'</span><strong>'+esc(label)+'</strong><small>'+esc(description)+'</small></button>';
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
   else if(tab==='pasados'){
    const history=Array.from(document.querySelectorAll('#pastEvents [data-history-detail]')).find(x=>x.dataset.historyDetail===entity);
    if(history){history.click();return;}
   }
   else if(tab==='planes'){
    const matches=Array.from(document.querySelectorAll('#events [data-event-db]')).filter(x=>x.dataset.eventDb===entity);
    el=matches.find(x=>x.tagName==='DETAILS')||matches[0]||null;
   }
   if(el){
    if(el.tagName==='DETAILS')el.open=true;
    const focusEl=el.closest('.paqui-plan-card')||el;
    focusEl.scrollIntoView({behavior:'smooth',block:'center'});
    focusEl.classList.add('flash');setTimeout(()=>focusEl.classList.remove('flash'),1800);
   }
   else if(++attempts<24)setTimeout(tryFocus,250);
  };
  setTimeout(tryFocus,180);
 }
 function onSocialClick(e){
  const b=e.target.closest('[data-ps-action]');
  if(!b)return;
  const action=b.dataset.psAction;
  if(action==='refresh')refresh(true);
  if(action==='filter'){state.filter=Object.prototype.hasOwnProperty.call(kindLabels,b.dataset.kind)?b.dataset.kind:'all';state.visible=6;drawFeed();}
  if(action==='more'){state.visible+=6;drawFeed();}
  if(action==='navigate')goTab(b.dataset.tab,b.dataset.entity);
 }
 root.addEventListener('click',onSocialClick);
 feedRoot.addEventListener('click',onSocialClick);
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
   // La participación propia se verifica con la RPC existente, sin consultar votos individuales.
   // Para las encuestas secretas nunca se deduce «ya votado» de la ausencia de nombres.
   let myPollStatus=null;
   if(member&&polls){
    const checks=await Promise.all(openPolls.map(async poll=>{
     try{
      const {data:rows,error}=await db.rpc('paqui_poll_participation',{p_poll_id:poll.id});
      if(error||!Array.isArray(rows)||!rows.length)return {poll,state:'unknown'};
      const pending=rows.some(x=>String(x.pending_name||'').trim()===String(member.display_name||'').trim());
      if(pending)return {poll,state:'pending'};
      // Total == votos registrados: incluso un voto secreto queda comprobado sin identificar a nadie.
      if(poll.vote_visibility==='named'||rows.some(x=>Number(x.total_members)>0&&Number(x.voted_count)>=Number(x.total_members)))return {poll,state:'answered'};
      return {poll,state:'unknown'};
     }catch(_){return {poll,state:'unknown'};}
    }));
    myPollStatus={pending:checks.filter(x=>x.state==='pending'),unknown:checks.filter(x=>x.state==='unknown')};
   }
   const ids=validFuture.map(x=>x.id).filter(Boolean);
   let attendance=null;
   if(member&&ids.length){
    const a=await db.from('event_attendance').select('event_id,member_id,status,updated_at').in('event_id',ids);
    if(!a.error)attendance=a.data||[];
    else console.warn('Paquillo Social: no se pudo cargar asistencia');
   }
   // Recuento de confirmados: solo un campo, en un máximo de 30 planes recientes.
   // No requiere nuevas tablas ni consultas de información personal.
   const recentIds=[...new Set((recentEvents||[]).filter(x=>x.id&&x.status!=='cancelled'&&x.status!=='draft').slice(0,30).map(x=>x.id))];
   let recentYes=null;
   if(recentIds.length){
    try{
     const a=await db.from('event_attendance').select('event_id').eq('status','yes').in('event_id',recentIds);
     if(!a.error)recentYes=a.data||[];
    }catch(e){console.warn('Paquillo Social: recuento no disponible',e);}
   }
   if(token!==state.loadId)return;
   const yesCounts=new Map();
   if(attendance)attendance.forEach(a=>{if(a.status==='yes'){const id=String(a.event_id);yesCounts.set(id,(yesCounts.get(id)||0)+1);}});
   if(recentYes){
    recentIds.forEach(id=>yesCounts.set(String(id),0));
    recentYes.forEach(a=>{const id=String(a.event_id);yesCounts.set(id,(yesCounts.get(id)||0)+1);});
   }
   const mine=new Map((attendance||[]).filter(a=>a.member_id===member?.id).map(a=>[String(a.event_id),a.status]));
   const yes=validFuture.filter(x=>mine.get(String(x.id))==='yes');
   const toAnswer=member&&attendance?validFuture.filter(x=>!mine.has(String(x.id))):null;
   const hello=document.getElementById('psHello');
   if(hello)hello.textContent=member?.display_name?'¡Hola, '+member.display_name+'! 👋':'Tu rincón paquillero 👋';
   const birthdayLabel=birthday?(birthday.days===0?'¡Hoy!':birthday.days===1?'Mañana':'En '+birthday.days+' días'):'Sin fechas';
   quick.innerHTML=quickCard('✅',attendance?yes.length:'—','Planes a los que vas',yes[0]?(yes[0].title+' · '+labelDate(yes[0].event_date+'T12:00:00')):'Consulta tu agenda','planes',yes[0]?.id)+
    quickCard('🙋',toAnswer?toAnswer.length:'—','Por confirmar',toAnswer?.length?'Tienes planes sin responder':'Consulta tus planes','planes',toAnswer?.[0]?.id)+
    quickCard('🗳️',myPollStatus?(myPollStatus.pending.length+(myPollStatus.unknown.length?' + ?':'')):'—','Encuestas sin responder',myPollStatus?(myPollStatus.unknown.length?myPollStatus.pending.length+' pendientes confirmadas · '+myPollStatus.unknown.length+' por comprobar':myPollStatus.pending.length?'Tienes votaciones pendientes':'Todas las encuestas abiertas comprobadas'):'No se pudo comprobar tu participación','votaciones',myPollStatus?.pending[0]?.poll.id||myPollStatus?.unknown[0]?.poll.id)+
    quickCard('🎂',birthdayLabel,'Próximo cumpleaños',birthday?birthday.name:'Consulta los cumpleaños','cumples','');
   const pendingEl=document.getElementById('psPendingPolls');
   if(pendingEl){
    const pending=myPollStatus?.pending||[];
    const unverified=myPollStatus?.unknown||[];
    pendingEl.hidden=!pending.length&&!unverified.length;
    pendingEl.innerHTML=(pending.length?'<div class="ps-pending-title">🗳️ Te falta responder</div><div class="ps-pending-list">'+pending.slice(0,4).map(x=>'<button type="button" data-ps-action="navigate" data-tab="votaciones" data-entity="'+esc(x.poll.id)+'" title="'+esc(x.poll.title)+'"><span class="ps-pending-name">'+esc(x.poll.title)+'</span><span>Votar ›</span></button>').join('')+'</div>':'')+
      (unverified.length?'<p class="ps-pending-unknown">'+unverified.length+' '+(unverified.length===1?'encuesta no comprobada':'encuestas no comprobadas')+' (por privacidad o permisos). Revisa Votaciones para saber si te falta responder.</p>':'');
   }
   const items=[];
   (recentEvents||[]).forEach(x=>{
    if(!x.created_at||x.status==='cancelled')return;
    const id=String(x.id);
    items.push({kind:'event',icon:'📅',category:'Planes',title:x.title,at:x.created_at,eventDate:x.event_date||'',status:x.status,
      yesCount:yesCounts.has(id)?yesCounts.get(id):null,
      tab:x.status==='completed'?'pasados':'planes',entity:x.id,linkLabel:'plan'});
   });
   (polls||[]).forEach(x=>{
    if(!x.created_at||x.status==='draft')return;
    items.push({kind:'poll',icon:'🗳️',category:'Encuestas',title:x.title,description:x.status==='open'?'Una encuesta para participar':'Encuesta del grupo',at:x.created_at,tab:'votaciones',entity:x.id,linkLabel:'encuesta'});
   });
   (memories||[]).forEach(x=>{
    if(!x.created_at)return;
    items.push({kind:'memory',icon:'📸',category:'Recuerdos',title:x.title,description:'Compartido por '+(x.group_members?.display_name||'un Paquillo'),at:x.created_at,tab:'horno',entity:x.id,linkLabel:'recuerdo'});
   });
   // Evitar duplicados: las confirmaciones ya se muestran como recuentos en cada plan.
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