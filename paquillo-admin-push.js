/* Paquillo Events · centro de avisos push manuales para la administración */
(()=>{
"use strict";
const q=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const prettyDate=v=>{try{return new Date(v).toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"});}catch{return "";}}
const statusMeta={
  ready:["🟣","Preparado para envío"],
  accepted:["✅","Aceptada por el servicio push"],
  partial:["🟠","Aceptación parcial"],
  failed:["❌","No aceptada"],
  disabled:["🔕","Notificaciones desactivadas"],
  no_subscription:["📵","Sin dispositivo suscrito"],
  unlinked:["👤","Sin cuenta vinculada"]
};
const normalizedDetails=rows=>Array.isArray(rows)?rows.filter(row=>row&&typeof row==="object"):[];
function recipientView(rows,mode="preview"){
 const recipients=normalizedDetails(rows);
 if(!recipients.length)return '<p class="amp-empty">No hay destinatarios para esta selección.</p>';
 const intro=mode==="preview"?"<p>Destinatarios previstos. Todavía no se ha enviado nada.</p>":
  "<p>✅ significa que el servicio push aceptó el aviso; <b>no confirma que el móvil lo mostrase o que la persona lo leyese</b>.</p>";
 return '<div class="amp-recipients">'+intro+
  '<div class="amp-recipient-list">'+recipients.map((r)=>{
   const [symbol,label]=statusMeta[r.status]||["❔","Estado desconocido"];
   const detail=normalizedDetails(r.details);
   const devices=Number(r.devices)||0,accepted=Number(r.accepted)||0,failed=Number(r.failed)||0;
   return '<div class="amp-recipient-row"><div class="amp-recipient-top"><b>'+esc(r.name||"Paquillo")+'</b>'+
    '<span class="amp-recipient-status amp-status-'+esc(r.status)+'">'+symbol+' '+esc(label)+'</span></div>'+
    '<small>'+(devices?devices+' dispositivo'+(devices===1?"":"s")+
     (mode==="result"?" · "+accepted+" aceptada(s) · "+failed+" fallida(s)":""):
     "Ningún dispositivo elegible")+'</small>'+
    (detail.length&&mode==="result"?'<ul>'+detail.map(d=>'<li>'+esc(d.device||"Dispositivo")+
     ': <b>'+(d.result==="accepted"?"✅ Aceptada":"❌ Fallida")+'</b>'+
     (d.reason?' · '+esc(d.reason):'')+'</li>').join("")+'</ul>':'')+'</div>';
  }).join("")+'</div></div>';
}
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
 '</form><div class="amp-delivery-section" id="ampRecipientsSection" hidden><h4 id="ampRecipientTitle">👥 Estado de los destinatarios</h4><div id="ampRecipientDetails"></div></div>'+
 '<div class="amp-history"><h4>🕘 Últimos avisos enviados</h4><div id="ampHistory">Consultando historial…</div></div></section>';
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
 const showRecipients=(rows,mode)=>{
  const section=q("ampRecipientsSection"),content=q("ampRecipientDetails");
  if(!section||!content)return;
  if(!Array.isArray(rows)){section.hidden=true;return;}
  section.hidden=false;
  q("ampRecipientTitle").textContent=mode==="result"?"📨 Resultado por Paquillo":"👥 Estado de los destinatarios";
  content.innerHTML=recipientView(rows,mode);
 };
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
  showRecipients(null,"preview");
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
    ' aceptadas</span></article>'+
    (Array.isArray(x.delivery_details)&&x.delivery_details.length?
     '<details class="amp-history-details"><summary>👥 Ver resultado por persona</summary>'+
      recipientView(x.delivery_details,"result")+'</details>':
     '<p class="amp-legacy-note">Este envío no tiene desglose individual registrado.</p>')).join(""):
    '<p>Sin avisos enviados todavía.</p>';
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
   if(!Array.isArray(result.recipients))throw new Error("Actualiza la Edge Function en Supabase para consultar el detalle por persona.");
   showRecipients(result.recipients,"preview");
   setStatus("👥 "+result.users+" usuarios · "+result.devices+" dispositivos preparados. Aún no se ha enviado nada.");
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
   if(!Array.isArray(preview.recipients)){
    setStatus("Actualiza la Edge Function en Supabase antes de enviar: la versión actual no informa de los resultados por persona.",true);return;
   }
   showRecipients(preview.recipients,"preview");
   if(!preview.devices){setStatus("Ningún dispositivo tiene push activo para esta selección.",true);return;}
   const confirmation="¿ENVIAR PUSH AHORA?\n\n"+params.title+"\n"+params.message+
     "\n\nUsuarios: "+preview.users+" · Dispositivos: "+preview.devices+
     "\n\nEste envío no se puede deshacer.";
   if(!window.confirm(confirmation)){setStatus("Envío cancelado. No se ha enviado nada.");return;}
   if(!lastRequestId)lastRequestId=crypto.randomUUID();
   setStatus("Enviando notificaciones… No pulses de nuevo.");
   const result=await invoke({action:"send",request_id:lastRequestId,...params});
   showRecipients(result.recipients,"result");
   const summary="📨 Servicio push: "+result.sent+" aceptadas y "+result.failed+
    " fallidas de "+result.attempted+" dispositivos. Aceptada no significa mostrada en el móvil.";
   setStatus(summary);
   lastRequestId=null;
   await refreshHistory();
   setStatus(summary+(result.history_saved===false?" ⚠️ El historial no pudo guardar el desglose.":""));
  }catch(err){setStatus(err.message||String(err),true)}
  finally{send.disabled=!active;check.disabled=!active;}
 };
 updateMode();
 refreshHistory();
}
window.PaquilloAdminPush={mount};
})();
