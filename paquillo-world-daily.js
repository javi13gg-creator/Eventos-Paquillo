/* Paquillo World 2.0 · Base diaria / check-in verificado.
 * Sin monedas. Únicamente +5 XP por visita con RPC y ledger idempotente.
 * Las puntuaciones de juegos sirven como actividad orientativa, NO conceden XP.
 */
(()=>{
'use strict';
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
const madridDate=()=>{const p=fmt.formatToParts(new Date()),part=k=>p.find(x=>x.type===k)?.value;return part('year')+'-'+part('month')+'-'+part('day')};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const instances=new Set();
const previousDay=s=>{
 const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);
};
function streak(rows){
 const dates=new Set(rows.map(r=>r.day));
 let cursor=madridDate(),count=0;
 if(!dates.has(cursor))cursor=previousDay(cursor);
 while(dates.has(cursor)&&count<365){count++;cursor=previousDay(cursor)}
 return count;
}
function mount(host,context){
 if(!host||!context?.client||!context.uid)return null;
 const old=[...instances].find(i=>i.host===host);old?.destroy();
 const ctx={host,config:context,disposed:false,loading:false,rows:[],ready:null,claimed:false,streak:0,awarded:null,visitsToday:0,visitsReady:false};
 instances.add(ctx);
 function info(){
  const today=madridDate(),done=ctx.rows.some(r=>r.day===today);
  ctx.claimed=done;ctx.streak=streak(ctx.rows);
  const pending=Math.max(0,Number(ctx.config.pendingDuels)||0);
  const active=Math.max(0,Number(ctx.config.activeDuels)||0);
  const played=!!ctx.config.playedToday;
  host.innerHTML='<section class="pwd-card" aria-label="Tu actividad diaria en Paquillo World">'+
   '<header class="pwd-heading"><div><small>✨ PAQUILLO WORLD · CADA DÍA</small><h3>Tu base de juego</h3></div><span>⭐ NIVEL '+Math.max(1,Number(ctx.config.level)||1)+'</span></header>'+
   '<div class="pwd-kpis"><div><b>🔥 '+ctx.streak+'</b><small>Racha de visitas</small></div>'+
    '<div><b>⚔️ '+pending+'</b><small>Retos pendientes</small></div>'+
    '<div><b>🎮 '+(played?'✓':'—')+'</b><small>Partida hoy*</small></div></div>'+
   '<div class="pwd-reward"><div><b>🎁 Tu visita diaria</b><small>'+
     (ctx.ready===null?'Comprobando si ya la has recogido…':
      ctx.ready===false?'Pendiente de activar en Supabase. Sin XP por ahora.':
      done?'Recompensa ya recogida hoy. ¡Vuelve mañana!':'+5 XP por entrar hoy, validado por el servidor.')+
    '</small></div>'+
    '<button type="button" data-pwd-claim '+(done||ctx.ready!==true||ctx.loading?'disabled':'')+'>'+
     (ctx.loading||ctx.ready===null?'⏳ Comprobando…':ctx.ready===false?'🔒 Pendiente':done?'✅ Recogido':'🎁 Recoger +5 XP')+
    '</button></div>'+
   '<div class="pwd-tasks"><h4>🎯 ¿Qué hacemos hoy?</h4>'+
    '<div class="pwd-task"><span>🎮</span><div><b>'+(played?'Ya has registrado una partida':'Juega una partida')+'</b><small>Trivial, Reflejos, Memoria o Carreras</small></div>'+
    '<button type="button" data-pwd-go="games">Jugar ›</button></div>'+
    '<div class="pwd-task"><span>🏘️</span><div><b>'+(ctx.visitsToday>=3?'¡Tres vecinos saludados!':'Visita casas del barrio')+'</b><small>'+
      (ctx.visitsReady?'👋 '+ctx.visitsToday+'/3 visitas a vecinos hoy · sin XP':'Explora el mapa de Burgos; visitas pendientes de activar')+
    '</small></div>'+
    '<button type="button" data-pwd-go="neighborhood">Explorar ›</button></div>'+
    '<div class="pwd-task"><span>⚔️</span><div><b>'+(pending?'¡'+pending+' reto'+(pending===1?'':'s')+' por responder!':active?'¡Tienes '+active+' partida'+(active===1?'':'s')+' en marcha!':'Lanza un pique')+'</b><small>Invita a tus amigos a competir</small></div>'+
    '<button type="button" data-pwd-go="duels">Ver retos ›</button></div></div>'+
   '<p class="pwd-disclaimer">* Los resultados de minijuegos son provisionales y no dan XP. Solo la visita diaria se valida con el servidor.</p>'+
   '<p class="pwd-notice" data-pwd-notice role="status" aria-live="polite"></p></section>';
  const n=host.querySelector('[data-pwd-notice]');
  if(n&&ctx.message)n.textContent=ctx.message;
 }
 async function load(){
  if(ctx.disposed||ctx.loading)return;
  ctx.loading=true;
  try{
   const [checkins,visits]=await Promise.all([
    ctx.config.client.from('paqui_world_daily_checkins')
      .select('day,claimed_at').eq('user_id',ctx.config.uid).order('day',{ascending:false}).limit(365),
    ctx.config.client.from('paqui_world_house_visits')
      .select('home_owner,day').eq('visitor_id',ctx.config.uid).eq('day',madridDate()).limit(10)
   ]);
   if(ctx.disposed)return;
   ctx.ready=!checkins.error;
   ctx.rows=checkins.error?[]:checkins.data||[];
   ctx.visitsReady=!visits.error;
   ctx.visitsToday=visits.error?0:(visits.data||[]).length;
   ctx.message=checkins.error?'🧪 Visita diaria pendiente: ejecuta paquillo-world-burgos-v2.sql en Supabase.':'';
  }catch(error){ctx.ready=false;ctx.visitsReady=false;ctx.message='No se pudo consultar la actividad: '+(error.message||error)}
  finally{ctx.loading=false;if(!ctx.disposed)info()}
 }
 async function claim(){
  if(ctx.disposed||ctx.loading||ctx.ready!==true||ctx.claimed)return;
  ctx.loading=true;info();
  try{
   const {data,error}=await ctx.config.client.rpc('paqui_world_claim_daily');
   if(error)throw error;
   ctx.message=(Number(data?.xp_awarded)||0)>0?
    '🎉 ¡Visita validada! +5 XP guardados en tu perfil.':
    '✅ La visita de hoy ya estaba registrada.';
   if(data?.day&&!ctx.rows.some(r=>r.day===data.day))ctx.rows.unshift({day:data.day});
   ctx.claimed=true;ctx.streak=streak(ctx.rows);
   ctx.config.onClaim?.(data);
   try{window.dispatchEvent(new CustomEvent('paqui-world-daily-claimed',{detail:data}))}catch(_){};
  }catch(error){ctx.message='⚠️ No se pudo recoger la visita: '+(error.message||error)}
  finally{ctx.loading=false;if(!ctx.disposed)info()}
 }
 function click(event){
  const button=event.target.closest('button');if(!button||!host.contains(button))return;
  if(button.hasAttribute('data-pwd-claim')){event.preventDefault();void claim();return}
  if(button.hasAttribute('data-pwd-go')){
   event.preventDefault();ctx.config.navigate?.(button.dataset.pwdGo);
  }
 }
 host.addEventListener('click',click);
 info();void load();
 return {destroy(){ctx.disposed=true;host.removeEventListener('click',click);instances.delete(ctx)},refresh:load};
}
window.PaquilloWorldDaily={mount,streak,madridDate};
})();
