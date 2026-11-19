/* Paquillo Events · galería comunitaria de stickers.
   Conserva los archivos clásicos del repositorio. No necesita servidor propio.
   Requiere paquillo-stickers-upload.sql ejecutado en Supabase. */
(()=>{
  'use strict';
  const BUCKET='paquillo-stickers',MAX_SOURCE=10*1024*1024;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,user=null,role='member',items=null,originals=[],current=null;
  let hiddenLegacy=new Set(),hiddenSchemaReady=false;
  let bound=false,loading=null,previewUrl=null;

  function note(text,isError=false){
    const el=$('stickerUploadMessage');if(!el)return;
    el.textContent=text||'';el.classList.toggle('paqui-sticker-error',!!isError);
  }
  function gallery(){
    const grid=$('stk');if(!grid||!items)return;
    grid.innerHTML=items.length?items.map((item,i)=>{
      const description=item.caption?String(item.caption):'Sticker '+(i+1);
      return '<button type="button" class="st'+(item.uploaded?' paqui-sticker-member':'')+
        '" data-i="'+i+'" aria-label="Ver '+esc(description)+'" title="'+esc(description)+'">'+
        '<img src="'+esc(item.t)+'" alt="" loading="lazy">'+
        (item.caption?'<span class="paqui-sticker-caption">'+esc(item.caption)+'</span>':'')+
        '</button>';
    }).join(''):'<div class="empty">🫥 Todavía no hay stickers. ¡Sube el primero!</div>';
    const count=$('stickerCount');if(count)count.textContent=items.length+' stickers · '+items.filter(x=>x.uploaded).length+' añadidos por la cuadrilla';
  }
  function viewer(item){
    current=item||null;
    const del=$('stickerDelete'),label=$('stickerViewerCaption');if(!del||!label)return;
    const canDelete=!!item&&(role==='admin'||(item.uploaded&&item.createdBy===user?.id));
    del.hidden=!canDelete;
    del.textContent=item?.uploaded?'🗑️ Eliminar sticker':'🙈 Retirar sticker de la galería';
    label.textContent=item?.caption||'';
    label.hidden=!item?.caption;
  }
  function hiddenPanel(){
    const panel=$('stickerHiddenPanel'),list=$('stickerHiddenList');
    if(!panel||!list)return;
    const visibleFiles=originals.filter(x=>hiddenLegacy.has(x.f));
    panel.hidden=role!=='admin'||!visibleFiles.length;
    if(!panel.hidden){
      list.innerHTML=visibleFiles.map(item=>
        '<div class="paqui-hidden-sticker"><img src="'+esc(item.t)+'" alt="Sticker retirado" loading="lazy">'+
        '<span>'+esc(item.f)+'</span><button type="button" class="btn secondary" data-restore-sticker="'+esc(item.f)+'">↩️ Restaurar</button></div>'
      ).join('');
    }else list.innerHTML='';
  }
  async function refresh(){
    if(!client||!user||!items)return;
    if(loading)return loading;
    loading=(async()=>{
      const [result,hiddenResult]=await Promise.all([
        client.from('paqui_stickers')
          .select('id,storage_path,caption,created_by,created_at')
          .order('created_at',{ascending:false}).limit(500),
        client.from('paqui_hidden_stickers').select('file_name')
      ]);
      hiddenSchemaReady=!hiddenResult.error;
      hiddenLegacy=new Set(hiddenSchemaReady?(hiddenResult.data||[]).map(x=>x.file_name):[]);
      if(hiddenResult.error)console.warn('Archivo de stickers antiguos aún no configurado:',hiddenResult.error);
      const classic=originals.filter(x=>!hiddenLegacy.has(x.f));
      let uploaded=[];
      if(result.error){
        console.warn('Stickers de Supabase no disponibles:',result.error);
      }else{
        uploaded=(result.data||[]).filter(r=>
          typeof r.storage_path==='string' &&
          /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/.test(r.storage_path)
        ).map(r=>{
          const {data}=client.storage.from(BUCKET).getPublicUrl(r.storage_path);
          return {t:data.publicUrl,f:data.publicUrl,id:r.id,path:r.storage_path,
            caption:r.caption||'',createdBy:r.created_by,uploaded:true};
        });
      }
      items.splice(0,items.length,...uploaded,...classic);
      gallery();hiddenPanel();
      const hint=$('stickerStorageNotice');
      if(hint){
        hint.hidden=!result.error&&!hiddenResult.error;
        hint.textContent=[
          result.error?'Para subir stickers, ejecuta paquillo-stickers-upload.sql en Supabase.':'',
          hiddenResult.error?'Para retirar stickers antiguos, ejecuta paquillo-stickers-admin.sql en Supabase.':''
        ].filter(Boolean).join(' ');
      }
    })().finally(()=>{loading=null});
    return loading;
  }
  function imageToWebp(file){
    return new Promise((resolve,reject)=>{
      const src=URL.createObjectURL(file),im=new Image();
      const cleanup=()=>URL.revokeObjectURL(src);
      im.onload=()=>{
        try{
          const w=im.naturalWidth,h=im.naturalHeight;
          if(!w||!h||w*h>50_000_000)throw new Error('La imagen no es válida o tiene una resolución excesiva.');
          const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
          const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador no permite convertir la imagen.');
          ctx.clearRect(0,0,512,512);
          const k=Math.min(512/w,512/h),dw=w*k,dh=h*k;
          ctx.drawImage(im,(512-dw)/2,(512-dh)/2,dw,dh);
          canvas.toBlob(blob=>{
            cleanup();
            if(!blob||blob.type!=='image/webp')return reject(new Error('No se pudo convertir a WebP. Prueba con Chrome o Safari actualizado.'));
            if(blob.size>2*1024*1024)return reject(new Error('El sticker supera el tamaño máximo permitido (2 MB).'));
            resolve(blob);
          },'image/webp',0.88);
        }catch(err){cleanup();reject(err)}
      };
      im.onerror=()=>{cleanup();reject(new Error('No se pudo abrir la imagen. Elige un JPG, PNG o WebP válido.'))};
      im.src=src;
    });
  }
  async function upload(ev){
    ev.preventDefault();const form=$('stickerUploadForm'),button=$('stickerUploadSubmit');
    if(!form||!button||button.disabled)return;
    const file=$('stickerFile')?.files?.[0];
    if(!client||!user){note('Necesitas iniciar sesión para subir stickers.',true);return}
    if(!file){note('Selecciona primero una imagen.',true);return}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){note('Solo se admiten PNG, JPG y WebP estáticos.',true);return}
    if(file.size>MAX_SOURCE){note('El archivo original no puede superar los 10 MB.',true);return}
    const caption=String($('stickerCaption')?.value||'').trim().slice(0,80);
    button.disabled=true;button.textContent='⏳ Subiendo…';
    note('Preparando tu sticker de 512 × 512 píxeles…');
    let path='';
    try{
      const blob=await imageToWebp(file);
      const id=crypto.randomUUID();
      path=user.id+'/'+id+'.webp';
      note('Guardando sticker…');
      const {error:uploadError}=await client.storage.from(BUCKET).upload(path,blob,
        {contentType:'image/webp',cacheControl:'31536000',upsert:false});
      if(uploadError)throw uploadError;
      const {error:dbError}=await client.from('paqui_stickers').insert({
        storage_path:path,caption,created_by:user.id
      });
      if(dbError){
        try{await client.storage.from(BUCKET).remove([path])}catch(_){}
        throw dbError;
      }
      form.reset();const preview=$('stickerUploadPreview');if(preview)preview.hidden=true;
      if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
      note('✅ Sticker añadido. ¡Ya lo puede ver toda la cuadrilla!');
      await refresh();
      $('stickerUploadDisclosure').open=false;
      $('stk')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(err){
      const migration=/bucket not found|not found|paqui_stickers|does not exist|relation/i.test(err.message||'');
      note('No se pudo subir: '+(err.message||'Error desconocido')+
        (migration?' · Comprueba que has ejecutado paquillo-stickers-upload.sql en Supabase.':''),true);
    }finally{button.disabled=false;button.textContent='🎉 Publicar sticker'}
  }
  async function download(event){
    if(!current?.uploaded)return;
    event.preventDefault();
    const a=$('svd'),label=a.textContent;a.textContent='Descargando…';
    try{
      const {data,error}=await client.storage.from(BUCKET).download(current.path);
      if(error)throw error;
      const url=URL.createObjectURL(data),link=document.createElement('a');
      link.href=url;link.download='paquillo-sticker-'+String(current.id||'nuevo').slice(0,8)+'.webp';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    }catch(err){
      alert('No se pudo descargar automáticamente. Se abrirá el archivo para que puedas guardarlo.');
      window.open(current.f,'_blank','noopener');
    }finally{a.textContent=label}
  }
  async function removeSelected(){
    const s=current,allowed=!!s&&(role==='admin'||(s.uploaded&&s.createdBy===user?.id));
    if(!allowed)return;
    if(!s.uploaded&&role==='admin'&&!hiddenSchemaReady){
      alert('Para retirar los stickers antiguos primero ejecuta paquillo-stickers-admin.sql en Supabase.');
      return;
    }
    const question=s.uploaded
      ?'¿Eliminar este sticker de la galería del grupo? No se puede deshacer.'
      :'¿Retirar este sticker antiguo de la galería para todos? El archivo original de GitHub se conservará y podrás restaurarlo.';
    if(!confirm(question))return;
    const button=$('stickerDelete');button.disabled=true;
    try{
      if(s.uploaded){
        const {data,error}=await client.from('paqui_stickers').delete().eq('id',s.id).select('id').single();
        if(error||!data)throw error||new Error('No se ha confirmado la eliminación.');
        const {error:storageError}=await client.storage.from(BUCKET).remove([s.path]);
        if(storageError)console.warn('Sticker retirado del catálogo, pero no del almacenamiento:',storageError);
      }else{
        if(!originals.some(item=>item.f===s.f)||!/^[a-f0-9]{8}\.webp$/.test(s.f))throw new Error('Sticker antiguo no reconocido.');
        const {error}=await client.from('paqui_hidden_stickers').insert({file_name:s.f,hidden_by:user.id});
        if(error)throw error;
      }
      $('sv').hidden=true;current=null;await refresh();
      note(s.uploaded?'Sticker eliminado de la galería.':'Sticker antiguo retirado. Puedes restaurarlo en Administración de stickers.');
    }catch(err){alert('No se pudo retirar el sticker: '+(err.message||err))}
    finally{button.disabled=false}
  }
  async function restoreSticker(name,button){
    if(role!=='admin'||!hiddenSchemaReady||!hiddenLegacy.has(name))return;
    button.disabled=true;
    try{
      const {data,error}=await client.from('paqui_hidden_stickers').delete().eq('file_name',name).select('file_name').single();
      if(error||!data)throw error||new Error('No se ha confirmado la restauración.');
      await refresh();note('Sticker restaurado en la galería.');
    }catch(err){alert('No se pudo restaurar: '+(err.message||err));button.disabled=false}
  }
  function attach(){
    if(bound)return;
    const form=$('stickerUploadForm');if(!form)return;
    bound=true;
    form.addEventListener('submit',upload);
    $('stickerFile').addEventListener('change',()=>{
      const file=$('stickerFile').files?.[0],preview=$('stickerUploadPreview');
      if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
      if(file){previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false}
      else preview.hidden=true;
      note('');
    });
    $('svd')?.addEventListener('click',download);
    $('stickerDelete')?.addEventListener('click',removeSelected);
    $('stickerHiddenList')?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-restore-sticker]');
      if(btn)return restoreSticker(btn.dataset.restoreSticker,btn);
    });
  }
  function mount(context){
    if(!context?.client||!context?.user||!context?.items)return;
    client=context.client;user=context.user;role=context.role||'member';items=context.items;
    if(!originals.length)originals=items.filter(s=>!s.uploaded);attach();
    refresh().catch(err=>console.warn('No se pudo actualizar la galería:',err));
  }
  window.PaquilloStickers={mount,refresh,viewer};
})();