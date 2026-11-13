/* Paquillo Events · centro de avisos push manuales para la administración */
(()=>{
"use strict";
const q=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const prettyDate=v=>{try{return new Date(v).toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"});}catch{return "";}}
function view(events){
 const options=events.filter(e=>e.id&&e.title&&!["draft","cancelled","completed"].includes(e.status))
   .map(e=>'<option value="'+esc(e.id)+'">'+esc(e.title)+' · '+esc(e.event_date||"sin fecha")+'</option>').join("");
 return '<section class="admin-manual-push" id="adminManualPushRoot" aria-labelledby="adminManualPushTitle">'+
 '<div class="amp-heading"><span class="amp-bubble" aria-hidden="true">📣</span><div><h3 id="adminManualPushTitle">Avisos push manuales</h3>'+
 '<p>Envía anuncios y recordatorios fuera de la programación automática.</p></div></div>'+
 '<form id="adminManualPushForm">'+
 '<div class="amp-fields">'+
 '<label>Tipo de aviso<select id="ampKind" required><option value="announcement">📢 Anuncio importante</option><option value="event">📅 Recordatorio de plan</option></select></label>'+
 '<label id="ampEventWrap" hidden>Plan que quieres recordar<select id="ampEventId"><option value="">Selecciona un plan</option>'+options+'</select></label>'+
 '<label id="ampDestinationWrap">Abrir al tocar el aviso<select id="ampDestination"><option value="proximos">🏠 Inicio / Planes</option><option value="world">🎮 Paquillo World</option><option value="cumples">🎂 Cumpleaños</option><option value="votaciones">🗳️ Encuestas</option></select></label>'+
 '<label id="ampAudienceWrap">Destinatarios<select id="ampAudience"><option value="all">📣 Todos los usuarios con push activo</option><option value="attendees">✅ Solo los que marcaron Voy o Quizá</option></select></label>'+
 '<label class="amp-full">Título del aviso<input id="ampTitle" maxlength="75" minlength="4" required placeholder="Ej.: ¡Paquillo World tiene novedades!"></label>'+
 '<label class="amp-full">Mensaje<textarea id="ampMessage" rows="3" maxlength="220" minlength="6" required placeholder="Escribe qué ha cambiado o qué deben recordar…"></textarea></label></div>'+
 '<div class="amp-preview"><b>🔔 Vista previa</b><strong id="ampSampleTitle">Tu título aparecerá aquí</strong><span id="ampSampleMessage">Tu mensaje se mostrará en el dispositivo.</span></div>'+
 '<div class="amp-actions"><button class="btn secondary" type="button" id="ampCheck">👀 Comprobar destinatarios</button>'+
 '<button class="btn" type="submit" id="ampSend" disabled>🚀 Enviar aviso push</button></div>'+
 '<p class="amp-status" id="ampStatus" role="status" aria-live="polite">Comprobando conexión con el servidor…</p>'+
 '<small class="amp-tip">Solo recibirán el aviso los miembros activos que hayan autorizado las notificaciones en su navegador o aplicación. No se enviará nada hasta que confirmes.</small>'+
 '</form><div class="amp-history"><h4>🕘 Últimos avisos enviados</h4><div id="ampHistory">Consultando historial…</div></div></section>';
}
function mount(container,events,client){
 if(!container||!client)return;
 const existing=q("adminManualPushRoot");if(existing)existing.remove();
 container.insertAdjacentHTML("afterbegin",view(events||[]));
 const kind=q("ampKind"),event=q("ampEventId"),audience=q("ampAudience"),destination=q("ampDestination");
 const title=q("ampTitle"),message=q("ampMessage"),send=q("ampSend"),status=q("ampStatus");
 const check=q("ampCheck"),sampleTitle=q("ampSampleTitle"),sampleMessage=q("ampSampleMessage");
 let active=false;
 let lastRequestId=null;
 const setStatus=(text,failed=false)=>{status.textContent=text;status.classList.toggle("amp-error",failed);};
 const invoke=async body=>{
  const {data,error}=await client.functions.invoke("paquillo-manual-push",{body});
  if(error)throw new Error(error.context?.status===404
   ?"Falta desplegar la función paquillo-manual-push en Supabase."
   :"No se pudo contactar con Supabase: "+(error.message||"sin respuesta"));
  if(data?.error)throw new Error(data.error);
  return data||{};
 };
 const payload=()=>({
  kind:kind.value,event_id:kind.value==="event"?event.value:null,
  audience:kind.value==="event"?audience.value:"all",
  destination:destination.value,title:title.value.trim(),message:message.value.trim(),
 });
 const updateMode=()=>{
  const on=kind.value==="event";
  q("ampEventWrap").hidden=!on;
  q("ampDestinationWrap").hidden=on;
  q("ampAudienceWrap").hidden=!on;
  if(!on)audience.value="all";
  if(on&&event.value&&!title.value.trim()){
   const selected=event.options[event.selectedIndex];
   title.value=("📅 Recordatorio: "+selected.text.split(" · ")[0]).slice(0,75);
  }
  updateSample();
 };
 const updateSample=()=>{
  sampleTitle.textContent=title.value.trim()||"Tu título aparecerá aquí";
  sampleMessage.textContent=message.value.trim()||"Tu mensaje se mostrará en el dispositivo.";
  lastRequestId=null;
 };
 const refreshHistory=async()=>{
  const block=q("ampHistory");if(!block)return;
  try{
   const result=await invoke({action:"history"});
   active=true;send.disabled=false;check.disabled=false;
   const rows=result.items||[];
   block.innerHTML=rows.length?rows.map(x=>'<article class="amp-history-row"><div><b>'+esc(x.title)+
    '</b><small>'+esc(prettyDate(x.created_at))+' · '+(x.kind==="event"?"📅 Plan":"📢 Anuncio")+
    '</small><p>'+esc(x.body)+'</p></div><span>'+Number(x.sent||0)+' / '+Number(x.attempted||0)+
    ' dispositivos</span></article>').join(""):'<p>Sin avisos enviados todavía.</p>';
   setStatus("✅ Servicio preparado. Puedes comprobar destinatarios o enviar un aviso.");
  }catch(e){
   active=false;send.disabled=true;check.disabled=true;
   block.innerHTML='<p class="amp-empty">Historial pendiente de activar en Supabase.</p>';
   setStatus((e.message||String(e))+" Ejecuta el SQL y despliega la Edge Function para activar el envío.",true);
  }
 };
 kind.onchange=updateMode;
 event.onchange=()=>{if(kind.value==="event"){const selected=event.options[event.selectedIndex];
   if(selected&&selected.value)title.value=("📅 Recordatorio: "+selected.text.split(" · ")[0]).slice(0,75);}
  updateSample();};
 audience.onchange=updateSample;
 destination.onchange=updateSample;
 title.oninput=updateSample;
 message.oninput=updateSample;
 check.onclick=async()=>{
  if(!active)return;
  if(kind.value==="event"&&!event.value){setStatus("Selecciona el plan que quieres recordar.",true);return;}
  check.disabled=true;setStatus("Contando destinatarios…");
  try{
   const result=await invoke({action:"preview",...payload()});
   setStatus("👥 "+result.users+" usuarios · "+result.devices+" dispositivos suscritos recibirían este aviso. Aún no se ha enviado nada.");
  }catch(e){setStatus(e.message||String(e),true)}
  finally{check.disabled=!active;}
 };
 q("adminManualPushForm").onsubmit=async e=>{
  e.preventDefault();
  if(!active)return;
  const form=e.currentTarget;
  if(!form.reportValidity())return;
  if(kind.value==="event"&&!event.value){setStatus("Selecciona un plan.",true);return;}
  send.disabled=true;check.disabled=true;
  try{
   const params=payload();
   const preview=await invoke({action:"preview",...params});
   if(!preview.devices){setStatus("Ningún dispositivo tiene push activo para esta selección.",true);return;}
   const confirmation="¿ENVIAR PUSH AHORA?\n\n"+params.title+"\n"+params.message+
     "\n\nUsuarios: "+preview.users+" · Dispositivos: "+preview.devices+
     "\n\nEste envío no se puede deshacer.";
   if(!window.confirm(confirmation)){setStatus("Envío cancelado. No se ha enviado nada.");return;}
   if(!lastRequestId)lastRequestId=crypto.randomUUID();
   setStatus("Enviando notificaciones… No pulses de nuevo.");
   const result=await invoke({action:"send",request_id:lastRequestId,...params});
   setStatus("📨 Envío finalizado: "+result.sent+" aceptadas, "+result.failed+" fallidas de "+result.attempted+" dispositivos.");
   lastRequestId=null;
   await refreshHistory();
   setStatus("📨 Envío finalizado: "+result.sent+" aceptadas, "+result.failed+" fallidas de "+result.attempted+" dispositivos.");
  }catch(err){setStatus(err.message||String(err),true)}
  finally{send.disabled=!active;check.disabled=!active;}
 };
 updateMode();
 refreshHistory();
}
window.PaquilloAdminPush={mount};
})();
