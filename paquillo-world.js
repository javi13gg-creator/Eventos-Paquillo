/* Paquillo World · Fase 1: perfil, experiencia y clasificación */
(()=>{
 const $=id=>document.getElementById(id);
 const target=$('paquiWorldContent');
 if(!target)return;
 let busy=false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
 const level=xp=>Math.floor(Math.max(0,Number(xp)||0)/250)+1;
 const xpLabel={event_created:'Creaste un plan',attendance_confirmed:'Confirmaste asistencia',poll_created:'Creaste una encuesta'};
 const avatar=(url,name)=>url?'<img class="pw-avatar" src="'+esc(url)+'" alt="Foto de '+esc(name)+'" onerror="this.style.display=\'none\'">':'<div class="pw-avatar" aria-hidden="true" style="display:grid;place-items:center;font-size:2rem;font-weight:900;color:var(--pk)">'+esc(initials(name))+'</div>';
 async function render(){
  if(busy)return;busy=true;
  try{
   const ctx=window.PaquilloWorldContext?.();
   if(!ctx?.client||!ctx?.currentAuthUser){target.innerHTML='<div class="empty">Inicia sesión para entrar en Paquillo World.</div>';return;}
   const db=ctx.client,uid=ctx.currentAuthUser.id;
   const [membersRes,profilesRes,ledgerRes]=await Promise.all([
    db.from('group_members').select('id,display_name,avatar_url,auth_user_id').eq('is_active',true).order('display_name'),
    db.from('paqui_world_profiles').select('user_id,total_xp,character_image_url,character_name'),
    db.from('paqui_world_xp_ledger').select('user_id,points,action,created_at').order('created_at',{ascending:false}).limit(80)
   ]);
   const err=membersRes.error||profilesRes.error||ledgerRes.error;
   if(err)throw err;
   const members=membersRes.data||[],profiles=new Map((profilesRes.data||[]).map(p=>[p.user_id,p])),ledger=ledgerRes.data||[];
   const mine=members.find(m=>m.auth_user_id===uid),myProfile=profiles.get(uid)||{total_xp:0};
   const xp=Number(myProfile.total_xp)||0,lvl=level(xp),progress=xp%250,percent=Math.round(progress/250*100);
   const ranked=members.map(m=>({...m,xp:Number(profiles.get(m.auth_user_id)?.total_xp)||0})).sort((a,b)=>b.xp-a.xp||a.display_name.localeCompare(b.display_name,'es'));
   const rank=mine?ranked.findIndex(m=>m.auth_user_id===uid)+1:0;
   const recent=ledger.filter(x=>x.user_id===uid).slice(0,6);
   target.innerHTML='<div class="pw-grid">'+
    '<article class="pw-card"><div class="pw-me">'+avatar(myProfile.character_image_url||mine?.avatar_url,mine?.display_name||'Tu personaje')+'<div><div class="pw-muted">TU PERSONAJE</div><div class="pw-level">Nivel '+lvl+'</div><b>'+esc(myProfile.character_name||mine?.display_name||'Paquillo')+'</b><div class="pw-muted">'+xp+' XP acumulados</div></div></div><div class="pw-xpbar"><span style="width:'+percent+'%"></span></div><div class="pw-muted">'+progress+' / 250 XP para el nivel '+(lvl+1)+'</div><p class="pw-muted">🎨 El retrato ilustrado personalizado llegará en la siguiente parte: estamos preparando el estilo de los personajes Paquillo.</p></article>'+
    '<article class="pw-card"><div class="pw-muted">TU POSICIÓN EN EL GRUPO</div><div class="pw-level">#'+(rank||'—')+'</div><b>de '+members.length+' Paquillos</b><p class="pw-muted">La clasificación se actualiza al realizar acciones que dan experiencia.</p><button class="btn secondary" id="pwRefresh" type="button">↻ Actualizar</button></article>'+
    '</div>'+
    '<div class="pw-grid"><article class="pw-card"><h3>🏆 Clasificación XP</h3><div class="pw-ranking">'+ranked.map((m,i)=>'<div class="pw-rank"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+'</span>'+(m.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="" onerror="this.style.display=\'none\'">':'')+'<b>'+esc(m.display_name)+'</b><strong>'+m.xp+' XP</strong></div>').join('')+'</div></article>'+
    '<article class="pw-card"><h3>✨ Cómo ganar experiencia</h3><div class="pw-action-list"><div class="pw-action"><span>📅 Crear una propuesta de plan</span><b>+100 XP</b></div><div class="pw-action"><span>🙋 Confirmar asistencia a un plan</span><b>+10 XP</b></div><div class="pw-action"><span>🗳️ Crear una encuesta</span><b>+40 XP</b></div></div><p class="pw-muted">Los puntos se asignan una sola vez por acción y se validan en la base de datos.</p></article></div>'+
    '<article class="pw-card"><h3>📜 Tus últimas acciones</h3>'+(recent.length?'<div class="pw-action-list">'+recent.map(x=>'<div class="pw-action"><span>'+esc(xpLabel[x.action]||'Actividad Paquillo')+' · '+new Date(x.created_at).toLocaleDateString('es-ES')+'</span><b>+'+x.points+' XP</b></div>').join('')+'</div>':'<p class="pw-muted">Todavía no tienes XP. ¡Propón un plan o confirma que vienes a uno!</p>')+'</article>';
   $('pwRefresh')?.addEventListener('click',render);
  }catch(e){target.innerHTML='<div class="empty">No se ha podido cargar Paquillo World: '+esc(e.message||e)+'<br><small>Comprueba que has ejecutado paquillo-world-fase1.sql en Supabase.</small><br><button class="btn secondary" id="pwRetry" type="button">Reintentar</button></div>';$('pwRetry')?.addEventListener('click',render);}
  finally{busy=false;}
 }
 window.addEventListener('paqui-world-ready',()=>{if(location.hash==='#world')render();});
 document.addEventListener('click',e=>{if(e.target.closest('[data-t="world"]'))setTimeout(render,0);});
 window.addEventListener('hashchange',()=>{if(location.hash==='#world')render();});
 if(location.hash==='#world')render();
})();
