/* PAQUILLO EVENTS · Reacciones a planes · Fase social */
(()=>{
 'use strict';
 if(window.PaquilloReacciones)return;
 const EMOJIS=['😂','🔥','🍻','❤️','👏','🤯'];
 const context=()=>window.PaquilloWorldContext?.();
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const reactionRows=new Map();
 const namesByUser=new Map();
 const busy=new Set();
 const openPickers=new Set();
 let loaded=false,loadError='',sequence=0,userId='',mountedRoot=null,fetchingMembers=false,lastLoadedAt=0;
 const isMissingTable=err=>['42P01','PGRST205','PGRST116'].includes(String(err?.code||''))||/relation .*paqui_event_reactions.* does not exist|could not find the table.*paqui_event_reactions/i.test(String(err?.message||''));
 const validId=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value||''));
 function sectionsFor(id){
  return Array.from(document.querySelectorAll('[data-paqui-reaction-box]')).filter(el=>el.dataset.paquiReactionBox===id);
 }
 function teasersFor(id){
  return Array.from(document.querySelectorAll('[data-paqui-reaction-teaser]')).filter(el=>el.dataset.paquiReactionTeaser===id);
 }
 function aggregate(id){
  const rows=reactionRows.get(id)||[];
  const counts=Object.fromEntries(EMOJIS.map(e=>[e,0]));
  for(const row of rows)if(Object.prototype.hasOwnProperty.call(counts,row.emoji))counts[row.emoji]++;
  const mine=rows.find(x=>x.user_id===userId)?.emoji||'';
  return {rows,counts,mine,total:rows.length};
 }
 function renderEvent(id){
  const {rows,counts,mine,total}=aggregate(id);
  const teaser=EMOJIS.filter(e=>counts[e]>0).sort((a,b)=>counts[b]-counts[a]).slice(0,3).join(' ');
  for(const el of teasersFor(id)){
   el.hidden=!loaded||!!loadError||total===0;
   if(loaded&&!loadError&&total){
    el.textContent=teaser+' · '+total;
    el.setAttribute('aria-label',total+' reacciones al plan');
   }
  }
  for(const box of sectionsFor(id)){
   if(loadError){
    box.innerHTML='<p class="paqui-react-error">'+(loadError==='missing'?'⚠️ Las reacciones aún no están activadas en Supabase. Administración debe ejecutar <code>paquillo-reacciones.sql</code>.':'⚠️ No se han podido cargar las reacciones. Revisa la conexión y los permisos.')+
      ' <button type="button" class="paqui-react-retry" data-paqui-reaction-retry>Reintentar</button></p>';
    continue;
   }
   if(!loaded){box.innerHTML='<p class="paqui-react-loading">Cargando reacciones…</p>';continue;}
   const disabled=busy.has(id)?' disabled':'';
   const open=openPickers.has(id);
   const buttons=EMOJIS.map(e=>{
    const active=mine===e;
    return '<button type="button" class="paqui-react-option'+(active?' is-active':'')+'" data-paqui-react="'+e+'" data-paqui-react-event="'+escapeHtml(id)+'" aria-pressed="'+active+'" aria-label="'+(active?'Quitar mi reacción':'Reaccionar con')+' '+e+', '+counts[e]+' reacciones"'+disabled+'><span aria-hidden="true">'+e+'</span><b>'+counts[e]+'</b></button>';
   }).join('');
   const totals=EMOJIS.filter(e=>counts[e]>0).sort((a,b)=>counts[b]-counts[a]).map(e=>'<span class="paqui-react-chip" title="'+counts[e]+' reacciones '+e+'">'+e+' <b>'+counts[e]+'</b></span>').join('');
   const people=rows.map(row=>{
    const name=namesByUser.get(row.user_id)||'Paquillo';
    return '<span class="paqui-react-person">'+row.emoji+' '+escapeHtml(name)+'</span>';
   }).join('');
   box.innerHTML='<div class="paqui-react-toolbar">'+
      '<button type="button" class="paqui-react-trigger'+(mine?' has-reacted':'')+'" data-paqui-react-toggle="'+escapeHtml(id)+'" aria-expanded="'+open+'" aria-label="'+(mine?'Cambiar o quitar mi reacción '+mine:'Reaccionar al plan')+'"'+disabled+'><span aria-hidden="true">'+(mine||'😊')+'</span><span>'+(mine?'Tu reacción':'Reaccionar')+'</span></button>'+
      '<div class="paqui-react-totals" aria-live="polite">'+(totals||'<span class="paqui-react-empty">Sin reacciones</span>')+'</div>'+
      (total?'<details class="paqui-react-people"><summary aria-label="Ver quién ha reaccionado">👥 '+total+'</summary><div class="paqui-react-people-list">'+people+'</div></details>':'')+
     '</div>'+
     '<div class="paqui-react-picker"'+(open?'':' hidden')+'><div class="paqui-react-choices" role="group" aria-label="Elige tu reacción">'+buttons+'</div><small>Un emoji por persona · pulsa el mismo para quitarlo.</small></div>';
  }
 }
 function renderAll(){
  const ids=new Set([...reactionRows.keys()]);
  document.querySelectorAll('[data-paqui-reaction-box]').forEach(x=>ids.add(x.dataset.paquiReactionBox));
  document.querySelectorAll('[data-paqui-reaction-teaser]').forEach(x=>ids.add(x.dataset.paquiReactionTeaser));
  ids.forEach(renderEvent);
 }
 async function loadMembers(client){
  if(fetchingMembers)return;
  fetchingMembers=true;
  try{
   const {data,error}=await client.from('group_members').select('auth_user_id,display_name').eq('is_active',true).limit(150);
   if(error)return;
   namesByUser.clear();
   (data||[]).forEach(x=>{if(x.auth_user_id)namesByUser.set(x.auth_user_id,x.display_name||'Paquillo');});
   renderAll();
  }catch(err){console.warn('Paquillo reacciones: nombres no disponibles',err);}
  finally{fetchingMembers=false;}
 }
 async function mount(root){
  if(root)mountedRoot=root;
  const ctx=context();
  if(!ctx?.client||!ctx.currentAuthUser||ctx.authBootstrapping)return;
  userId=ctx.currentAuthUser.id;
  if(!mountedRoot)return;
  const ids=[...new Set(Array.from(mountedRoot.querySelectorAll('[data-paqui-reaction-box]')).map(x=>x.dataset.paquiReactionBox).filter(validId))];
  if(!ids.length){loaded=true;loadError='';renderAll();return;}
  loaded=false;loadError='';
  renderAll();
  const attempt=++sequence;
  try{
   const chunks=[];
   for(let i=0;i<ids.length;i+=40)chunks.push(ids.slice(i,i+40));
   const results=await Promise.all(chunks.map(chunk=>ctx.client.from('paqui_event_reactions').select('event_id,user_id,emoji').in('event_id',chunk)));
   if(attempt!==sequence)return;
   const err=results.find(x=>x.error)?.error;
   if(err)throw err;
   for(const id of ids)reactionRows.set(id,[]);
   results.forEach(result=>(result.data||[]).forEach(row=>{
    if(!validId(row.event_id)||!EMOJIS.includes(row.emoji))return;
    reactionRows.get(row.event_id)?.push({user_id:row.user_id,emoji:row.emoji});
   }));
   loaded=true;loadError='';lastLoadedAt=Date.now();
   renderAll();
   loadMembers(ctx.client);
  }catch(err){
   if(attempt!==sequence)return;
   loaded=false;loadError=isMissingTable(err)?'missing':'error';
   console.warn('Paquillo reacciones:',err?.message||err);
   renderAll();
  }
 }
 async function detail(host,id){
  if(!host||!validId(id))return;
  const el=document.createElement('section');
  el.className='paqui-reaction-box paqui-reaction-details';
  el.dataset.paquiReactionBox=id;
  el.innerHTML='<p class="paqui-react-loading">Cargando reacciones…</p>';
  host.appendChild(el);
  if(reactionRows.has(id)&&loaded&&!loadError)renderEvent(id);
  const ctx=context();
  if(!ctx?.client||!ctx.currentAuthUser)return;
  userId=ctx.currentAuthUser.id;
  try{
   const {data,error}=await ctx.client.from('paqui_event_reactions').select('event_id,user_id,emoji').eq('event_id',id);
   if(error)throw error;
   reactionRows.set(id,(data||[]).filter(x=>EMOJIS.includes(x.emoji)).map(x=>({user_id:x.user_id,emoji:x.emoji})));
   loaded=true;loadError='';renderEvent(id);
   if(!namesByUser.size)loadMembers(ctx.client);
  }catch(err){
   loadError=isMissingTable(err)?'missing':'error';
   renderEvent(id);
  }
 }
 async function clickReaction(button){
  const id=button.dataset.paquiReactEvent,emoji=button.dataset.paquiReact;
  const ctx=context();
  if(!validId(id)||!EMOJIS.includes(emoji)||busy.has(id)||!ctx?.client||!ctx.currentAuthUser)return;
  userId=ctx.currentAuthUser.id;
  const current=aggregate(id).mine;
  busy.add(id);renderEvent(id);
  try{
   if(current===emoji){
    const {error}=await ctx.client.from('paqui_event_reactions').delete().eq('event_id',id).eq('user_id',userId);
    if(error)throw error;
   }else{
    const {error}=await ctx.client.from('paqui_event_reactions').upsert({event_id:id,user_id:userId,emoji,updated_at:new Date().toISOString()},{onConflict:'event_id,user_id'});
    if(error)throw error;
   }
   const {data,error}=await ctx.client.from('paqui_event_reactions').select('event_id,user_id,emoji').eq('event_id',id);
   if(error)throw error;
   reactionRows.set(id,(data||[]).filter(x=>EMOJIS.includes(x.emoji)).map(x=>({user_id:x.user_id,emoji:x.emoji})));
   loaded=true;loadError='';renderEvent(id);
   sectionsFor(id)[0]?.querySelector('[data-paqui-react-toggle]')?.focus({preventScroll:true});
  }catch(err){
   console.warn('Paquillo reacciones: error al guardar',err);
   alert('No se pudo guardar tu reacción: '+(err?.message||'Revisa tu conexión o la configuración de Supabase.'));
  }finally{busy.delete(id);renderEvent(id);}
 }
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-paqui-react-toggle]');
  if(toggle){
   event.preventDefault();
   const id=toggle.dataset.paquiReactToggle;
   if(!validId(id)||busy.has(id))return;
   if(openPickers.has(id))openPickers.delete(id);
   else{openPickers.clear();openPickers.add(id);}
   renderAll();
   if(openPickers.has(id))sectionsFor(id)[0]?.querySelector('[data-paqui-react]')?.focus({preventScroll:true});
   else sectionsFor(id)[0]?.querySelector('[data-paqui-react-toggle]')?.focus({preventScroll:true});
   return;
  }
  const b=event.target.closest('[data-paqui-react], [data-paqui-reaction-retry]');
  if(b){
   event.preventDefault();
   if(b.hasAttribute('data-paqui-reaction-retry')){mount(mountedRoot);return;}
   openPickers.delete(b.dataset.paquiReactEvent);
   clickReaction(b);
   return;
  }
  if(openPickers.size&&!event.target.closest('.paqui-react-picker, .paqui-react-people')){
   const ids=[...openPickers];openPickers.clear();ids.forEach(renderEvent);
  }
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&openPickers.size){
   const ids=[...openPickers];openPickers.clear();ids.forEach(renderEvent);
   sectionsFor(ids[0])[0]?.querySelector('[data-paqui-react-toggle]')?.focus({preventScroll:true});
  }
 });
 window.PaquilloReacciones={mount,detail,refresh:()=>mount(mountedRoot)};
 window.addEventListener('paqui-world-ready',()=>{if(mountedRoot)mount(mountedRoot)});
 window.addEventListener('focus',()=>{if(mountedRoot&&Date.now()-lastLoadedAt>90000)mount(mountedRoot)});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mountedRoot&&Date.now()-lastLoadedAt>90000)mount(mountedRoot)});
})();