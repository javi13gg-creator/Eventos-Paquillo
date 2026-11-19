/* Paquillo Events · galería comunitaria de stickers.
   Conserva los archivos clásicos del repositorio. No necesita servidor propio.
   Requiere paquillo-stickers-upload.sql ejecutado en Supabase. */
(()=>{
  'use strict';
  const BUCKET='paquillo-stickers',MAX_SOURCE=10*1024*1024;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null,user=null,role='member',items=null,originals=[],current=null;
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
    del.hidden=!item?.uploaded||!(item.createdBy===user?.id||role==='admin');
    label.textContent=item?.caption||'';
    label.hidden=!item?.caption;
  }
  async function refresh(){
    if(!client||!user||!items)return;
    if(loading)return loading;
    loading=(async()=>{
      const result=await client.from('paqui_stickers')
        .select('id,storage_path,caption,created_by,created_at')
        .order('created_at',{ascending:false}).limit(500);
      if(result.error){
        // Antes de ejecutar SQL, la galería clásica sigue funcionando.
        items.splice(0,items.length,...originals);gallery();
        const hint=$('stickerStorageNotice');
        if(hint){hint.hidden=false;hint.textContent='Para activar las subidas, administración debe ejecutar paquillo-stickers-upload.sql en Supabase.'}
        console.warn('Stickers de Supabase no disponibles:',result.error);
        return;
      }
      const uploaded=(result.data||[]).filter(r=>
        typeof r.storage_path==='string' &&
        /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/.test(r.storage_path)
      ).map(r=>{
        const {data}=client.storage.from(BUCKET).getPublicUrl(r.storage_path);
        return {t:data.publicUrl,f:data.publicUrl,id:r.id,path:r.storage_path,
          caption:r.caption||'',createdBy:r.created_by,uploaded:true};
      });
      items.splice(0,items.length,...uploaded,...originals);
      gallery();
      const hint=$('stickerStorageNotice');if(hint)hint.hidden=true;
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
    const s=current;if(!s?.uploaded||!(s.createdBy===user?.id||role==='admin'))return;
    if(!confirm('¿Eliminar este sticker de la galería del grupo? No se puede deshacer.'))return;
    const button=$('stickerDelete');button.disabled=true;
    try{
      const {data,error}=await client.from('paqui_stickers').delete().eq('id',s.id).select('id').single();
      if(error||!data)throw error||new Error('No se ha confirmado la eliminación.');
      const {error:storageError}=await client.storage.from(BUCKET).remove([s.path]);
      if(storageError)console.warn('Sticker borrado del catálogo, pero no del almacenamiento:',storageError);
      $('sv').hidden=true;current=null;await refresh();
      note('Sticker eliminado de la galería.');
    }catch(err){alert('No se pudo eliminar el sticker: '+(err.message||err))}
    finally{button.disabled=false}
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
  }
  function mount(context){
    if(!context?.client||!context?.user||!context?.items)return;
    client=context.client;user=context.user;role=context.role||'member';items=context.items;
    originals=items.filter(s=>!s.uploaded);attach();
    refresh().catch(err=>console.warn('No se pudo actualizar la galería:',err));
  }
  window.PaquilloStickers={mount,refresh,viewer};
})();