/* Paquillo World · importador de avatares personalizados, exclusivo para administración. */
(()=>{'use strict';
const BUCKET='paquillo-characters';
const REQUIRED=[
 ['adri','Adri'],['carla','Carla'],['david','David'],['diego','Diego'],
 ['ines','Inés'],['ivan','Iván'],['javi','Javi'],['jb','JB'],
 ['joaquin','Joaquín'],['leti','Leti'],
 ['alba','Alba'],['jorge-r','Jorge R'],['julia','Julia'],['laura','Laura'],['maria','María'],
 ['mireia','Mireia'],['richy','Richy'],['roman','Román'],['rodri','Rodri'],['sara','Sara']
];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function mount(target,members,client){
 if(!target||!client)return;
 $('paquiWorldAvatarAdmin')?.remove();
 const normalized=(members||[]).filter(m=>m?.is_active&&m.auth_user_id);
 const byName=new Map(normalized.map(m=>[slug(m.display_name),m]));
 const selectedMembers=REQUIRED.map(([key,label])=>({
  key,label,member:byName.get(key),linked:!!byName.get(key)
 }));
 const html='<section id="paquiWorldAvatarAdmin" class="paqui-avatar-import">'+
  '<div class="paqui-avatar-import-head"><span class="paqui-avatar-import-icon">🎭</span><div><h3>Avatares personalizados de Paquillo World</h3>'+
  '<p>Importa personajes completos estilo sticker, sin sustituir las fotos reales ni los XP.</p></div></div>'+
  '<details id="paquiAvatarDetails"><summary>✨ Gestionar avatares del grupo <span>20 miembros · 2 packs</span></summary>'+
  '<p class="paqui-avatar-help">Para importar los renders finales validados, selecciona los archivos con el nombre de cada persona (por ejemplo <b>adri.webp</b>, <b>alba.webp</b>, <b>jorge-r.webp</b>, <b>maria.webp</b>). Los bocetos vectoriales que aparecen en Paquillo World son provisionales y no se asignan a Supabase.</p>'+
  '<label class="paqui-avatar-file-label" for="paquiAvatarFiles">📁 Seleccionar imágenes de los personajes</label>'+
  '<input id="paquiAvatarFiles" type="file" accept="image/webp,image/png,image/jpeg" multiple>'+
  '<div id="paquiAvatarMemberList" class="paqui-avatar-member-grid">'+
  selectedMembers.map(m=>'<div data-avatar-member="'+esc(m.key)+'" class="paqui-avatar-member">'+
   '<span class="paqui-avatar-name">'+esc(m.label)+'</span>'+
   '<span class="paqui-avatar-status">'+(m.linked?'Esperando archivo':'⚠️ Sin cuenta vinculada')+'</span>'+
   '</div>').join('')+'</div>'+
  '<button type="button" id="paquiAvatarUpload" class="btn" disabled>🚀 Asignar avatares seleccionados</button>'+
  '<p class="paqui-avatar-message" id="paquiAvatarMessage" aria-live="polite">La subida se hace desde tu navegador a Supabase, solo con permisos de administrador.</p>'+
  '<p class="paqui-avatar-help">Si aparece un error de permisos, ejecuta primero <code>paquillo-world-avatares.sql</code> desde Supabase SQL Editor.</p>'+
  '</details></section>';
 target.insertAdjacentHTML('afterbegin',html);
 const fileInput=$('paquiAvatarFiles'),upload=$('paquiAvatarUpload'),msg=$('paquiAvatarMessage'),list=$('paquiAvatarMemberList');
 let matched=[];
 const show=(text,isError=false)=>{msg.textContent=text;msg.classList.toggle('error',isError);};
 fileInput.onchange=()=>{
  const files=Array.from(fileInput.files||[]);
  const chosen=new Map();
  for(const file of files){
   const key=slug(file.name);
   if(!REQUIRED.some(r=>r[0]===key)){show('Archivo no reconocido: '+file.name+'. Usa los nombres del paquete aprobado.',true);continue;}
   if(!/^image\/(webp|png|jpeg)$/.test(file.type)||file.size>8*1024*1024||!file.size){
     show('El archivo '+file.name+' no es una imagen compatible o supera 8 MB.',true);continue;
   }
   chosen.set(key,file);
  }
  matched=selectedMembers.filter(m=>m.member&&chosen.has(m.key))
   .map(m=>({...m,file:chosen.get(m.key)}));
  for(const m of selectedMembers){
   const row=list.querySelector('[data-avatar-member="'+m.key+'"]');
   if(!row)continue;
   row.querySelector('.paqui-avatar-status').textContent=!m.linked?'⚠️ Sin cuenta vinculada':
     chosen.has(m.key)?'✅ '+(chosen.get(m.key).size/1024).toFixed(0)+' KB':'Pendiente de seleccionar';
   row.classList.toggle('selected',!!m.linked&&chosen.has(m.key));
  }
  upload.disabled=matched.length===0;
  if(matched.length)show('Preparados '+matched.length+' de los '+REQUIRED.length+' avatares. El botón los subirá y asignará por nombre.');
 };
 upload.onclick=async()=>{
  if(!matched.length)return;
  upload.disabled=true;fileInput.disabled=true;
  let success=0,failed=0;const names=[];
  for(const m of matched){
   const ext=m.file.type==='image/png'?'png':m.file.type==='image/jpeg'?'jpg':'webp';
   const id=Date.now()+'-'+Math.random().toString(36).slice(2,10);
   const path='portraits/'+m.key+'/'+id+'.'+ext;
   const status=list.querySelector('[data-avatar-member="'+m.key+'"] .paqui-avatar-status');
   try{
    status.textContent='⏳ Subiendo…';
    const {error:storageError}=await client.storage.from(BUCKET)
      .upload(path,m.file,{contentType:m.file.type,upsert:false,cacheControl:'31536000'});
    if(storageError)throw new Error('Storage: '+storageError.message);
    const publicUrl=client.storage.from(BUCKET).getPublicUrl(path)?.data?.publicUrl;
    if(!publicUrl)throw new Error('No se pudo obtener la URL del personaje.');
    const {error:assignError}=await client.rpc('paqui_world_set_character',{
      p_user_id:m.member.auth_user_id,p_image_url:publicUrl
    });
    if(assignError)throw new Error('Asignación: '+assignError.message);
    success++;names.push(m.label);status.textContent='✅ Asignado a su perfil';
   }catch(e){
    failed++;status.textContent='❌ '+String(e?.message||e).slice(0,90);
   }
   show('Asignados '+success+' · Fallidos '+failed+' · Procesados '+(success+failed)+'/'+matched.length);
  }
  if(success){
   window.dispatchEvent(new CustomEvent('paqui-world-characters-updated',{detail:{names}}));
   show('🎉 '+success+' personaje(s) asignado(s) correctamente.'+
    (failed?' Hay '+failed+' que requieren revisión.':' Ya se verán en Perfiles, Equipo y Carrera Paquillera.'));
  }else show('No se ha podido asignar ningún avatar. Comprueba que el SQL y el bucket estén activados.',true);
  fileInput.disabled=false;upload.disabled=false;
 };
}
window.PaquilloAdminAvatars={mount};
})();