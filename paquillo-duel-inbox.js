/* Paquillo Events: avisos de invitaciones pendientes al abrir la web/PWA.
   Sin permisos adicionales; consulta RLS por usuario. */
(()=>{'use strict';
 let uid='',seenSession=new Set(),busy=false;
 async function check(){
  if(busy||document.hidden||location.hash==='#world')return;
  const ctx=window.PaquilloWorldContext?.();
  if(!ctx?.client||!ctx?.currentAuthUser)return;
  const id=ctx.currentAuthUser.id;
  if(uid!==id){uid=id;seenSession=new Set();}
  busy=true;
  try{
   const {data,error}=await ctx.client.from('paqui_world_duels')
    .select('id,challenger,game,created_at').eq('opponent',id).eq('status','pending')
    .order('created_at',{ascending:false}).limit(30);
   if(error||!data?.length)return;
   const fresh=data.filter(x=>!seenSession.has(x.id));
   if(!fresh.length)return;
   data.forEach(x=>seenSession.add(x.id));
   document.querySelector('#paquiDuelInboxAlert')?.remove();
   const banner=document.createElement('button');
   banner.id='paquiDuelInboxAlert';banner.type='button';
   banner.textContent='⚔️ Tienes '+data.length+' reto'+(data.length===1?'':'s')+' pendiente'+(data.length===1?'':'s')+' en Paquillo World · Ver';
   banner.style.cssText='position:fixed;z-index:99998;bottom:calc(16px + env(safe-area-inset-bottom,0px));left:12px;right:12px;max-width:540px;margin:auto;padding:15px;border:2px solid #ffe187;border-radius:16px;background:#54318d;color:white;font:800 14px system-ui;box-shadow:0 8px 32px #0008;cursor:pointer';
   banner.addEventListener('click',()=>{banner.remove();location.hash='#world';});
   document.body.appendChild(banner);
  }finally{busy=false;}
 }
 window.addEventListener('load',()=>{setTimeout(check,2500);setTimeout(check,6500)});
 window.addEventListener('focus',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
 window.addEventListener('paqui-world-ready',check);
})();
