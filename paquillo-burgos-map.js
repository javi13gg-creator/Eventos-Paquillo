/* Paquillo World 2.0 · Barrio Burgos explorador.
 * Mapa ficticio inspirado en Burgos; NO son domicilios reales.
 * Grid, drag, pinch, mousewheel, búsqueda, selección y movimiento de parcela.
 * Persistencia solo vía RPC con RLS/validación servidor.
 */
(()=>{
'use strict';
const COLS=28,ROWS=20,CELL=84,WIDTH=COLS*CELL,HEIGHT=ROWS*CELL;
const ART='burgos-world-map-v1.avif';
const RESERVED=new Set([
 // Mantener las casillas reservadas por el SQL ya ejecutado.
 '7,4','12,8','12,10','5,9','19,8','18,4','21,2','16,11','24,15',
 // Nuevos monumentos visibles de la ilustración (migración Burgos v2.1).
 '7,7','6,7','8,7',           // Castillo
 '9,9','10,9','10,8','11,9',  // Catedral
 '12,9','13,9','14,9',        // Plaza Mayor
 '8,12','9,12',               // Arco Santa María
 '12,12','13,12','14,12',     // Espolón
 '2,10','3,10',               // Universidad
 '17,10','18,10','19,10','18,11', // El Plantío
 '21,10','22,10','23,10',     // Coliseum
 '24,12','25,12'              // Fuentes Blancas
]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const bounded=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const VALID=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<COLS&&y>=0&&y<ROWS&&
 y!==13&&!(y===14&&x>=8&&x<=24)&&!RESERVED.has(x+','+y);
// Posiciones de los lugares sobre el mapa ilustrado APROBADO, no direcciones personales.
const landmarks=[
 {x:7,y:7,emoji:'🏰',name:'Castillo de Burgos',info:'Fortaleza y mirador al noroeste del casco histórico.',kind:'castillo'},
 {x:10,y:9,emoji:'⛪',name:'Catedral de Burgos',info:'El corazón monumental del centro histórico.',kind:'catedral'},
 {x:13,y:9,emoji:'🏛️',name:'Plaza Mayor',info:'La plaza principal, situada al este de la Catedral.',kind:'plaza'},
 {x:8,y:12,emoji:'🏛️',name:'Arco de Santa María',info:'Acceso histórico junto al Arlanzón.',kind:'arco'},
 {x:13,y:12,emoji:'🌳',name:'Paseo del Espolón',info:'Paseo arbolado entre el centro y el río.',kind:'espolon'},
 {x:2,y:10,emoji:'🎓',name:'Universidad de Burgos',info:'La zona universitaria queda al oeste del centro.',kind:'universidad'},
 {x:18,y:10,emoji:'⚽',name:'Estadio El Plantío',info:'El estadio del Burgos CF, al este del centro.',kind:'plantio'},
 {x:22,y:10,emoji:'🏟️',name:'Coliseum Burgos',info:'Recinto deportivo y de eventos, al este de El Plantío.',kind:'coliseum'},
 {x:24,y:12,emoji:'🌲',name:'Fuentes Blancas',info:'Zona verde y recreativa al este de la ciudad.',kind:'fuentes'},
 {x:18,y:5,emoji:'🏘️',name:'G3 · Vista Alegre',info:'Zona noreste con parcelas disponibles para la cuadrilla.',kind:'g3',isNeighborhood:true},
 {x:25,y:5,emoji:'🏡',name:'Villímar',info:'Al este de G3, con espacio para colocar las casas del grupo.',kind:'villimar',isNeighborhood:true}
];
function hash(s){
 let h=2166136261;
 for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
 return h>>>0;
}
const pos=(x,y)=>'left:'+(x*CELL+CELL/2)+'px;top:'+(y*CELL+CELL/2)+'px';
const dayMadrid=()=>{
 const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),n=k=>p.find(x=>x.type===k)?.value;
 return n('year')+'-'+n('month')+'-'+n('day');
};
function classicBackdrop(){
 const trees=Array.from({length:155},(_,i)=>{
  const h=hash('arbol-paqui-'+i),x=(h%COLS),y=(Math.floor(h/31)%ROWS);
  if(!VALID(x,y)||Math.abs(x-12)<2&&Math.abs(y-8)<3||i%5===0)return '';
  return '<span class="pwb-tree" style="'+pos(x+.36,y+.36)+';--shade:'+(i%3)+'" aria-hidden="true">'+(i%7===0?'🌲':'🌳')+'</span>';
 }).join('');
 return '<svg class="pwb-map-land" viewBox="0 0 '+WIDTH+' '+HEIGHT+'" preserveAspectRatio="none" aria-hidden="true">'+
 '<defs><linearGradient id="pwbGround" x2=".85" y2="1"><stop stop-color="#b8da8a"/><stop offset=".58" stop-color="#78bf7b"/><stop offset="1" stop-color="#509b7b"/></linearGradient>'+
 '<linearGradient id="pwbRiver" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#86ebf5"/><stop offset=".52" stop-color="#38a7d9"/><stop offset="1" stop-color="#298cbb"/></linearGradient>'+
 '<filter id="pwbShadow"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#204f45" flood-opacity=".33"/></filter></defs>'+
 '<rect width="'+WIDTH+'" height="'+HEIGHT+'" fill="url(#pwbGround)"/>'+
 '<g fill="#44987d" opacity=".4"><ellipse cx="350" cy="250" rx="340" ry="180"/><ellipse cx="1930" cy="1320" rx="430" ry="300"/><ellipse cx="1710" cy="245" rx="290" ry="160"/><ellipse cx="1060" cy="1400" rx="430" ry="220"/></g>'+
 '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'+
 '<path d="M -80 890 C 430 1005 760 875 1190 870 S 1960 890 2440 740" stroke="#b9906e" stroke-width="112"/>'+
 '<path d="M -80 890 C 430 1005 760 875 1190 870 S 1960 890 2440 740" stroke="#ddc5a6" stroke-width="78"/>'+
 '<path d="M 290 -50 Q 300 410 730 750 T 1150 1750" stroke="#b28c74" stroke-width="90"/>'+
 '<path d="M 290 -50 Q 300 410 730 750 T 1150 1750" stroke="#e5cdac" stroke-width="59"/>'+
 '<path d="M 1630 -30 Q 1490 435 1760 760 T 1980 1750" stroke="#b28c74" stroke-width="86"/>'+
 '<path d="M 1630 -30 Q 1490 435 1760 760 T 1980 1750" stroke="#e7cfac" stroke-width="57"/>'+
 '<path d="M -60 1114 C 280 1060 500 1245 840 1138 S 1570 1190 1890 1180 S 2240 1080 2400 1150" stroke="#2b888d" stroke-width="145"/>'+
 '<path d="M -60 1114 C 280 1060 500 1245 840 1138 S 1570 1190 1890 1180 S 2240 1080 2400 1150" stroke="url(#pwbRiver)" stroke-width="123"/>'+
 '<path d="M -60 1100 C 280 1045 500 1230 840 1123 S 1570 1175 1890 1165 S 2240 1065 2400 1135" stroke="#c6fdff" stroke-opacity=".56" stroke-width="12"/>'+
 '<path d="M 780 1012L780 1220M1770 1050L1770 1285" stroke="#a86b47" stroke-width="85"/>'+
 '<path d="M 780 1012L780 1220M1770 1050L1770 1285" stroke="#ead1a8" stroke-width="64"/>'+
 '</g></svg>'+
 '<div class="pwb-map-grid" aria-hidden="true"></div>'+
 trees+
 zones.map(z=>'<span class="pwb-zone" style="'+pos(z.x,z.y)+'">'+esc(z.label)+'</span>').join('')+
 landmarks.map(z=>'<div class="pwb-landmark" style="'+pos(z.x,z.y)+'" title="'+esc(z.name)+'"><span>'+z.emoji+'</span><strong>'+esc(z.name)+'</strong></div>').join('');
}
function backdrop(){
 const protectedTiles=[];
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  if(!VALID(x,y))protectedTiles.push('<span style="left:'+(x*CELL)+'px;top:'+(y*CELL)+'px" class="pwb-protected-tile"></span>');
 }
 return '<div class="pwb-map-fallback" aria-hidden="true">'+classicBackdrop()+'</div>'+
  '<div class="pwb-art-layer"><img src="'+ART+'" class="pwb-map-illustration" data-pwb-art-image alt="Mapa ilustrado de Burgos, con Catedral, Castillo, G3 y Villímar" draggable="false"></div>'+
  '<div class="pwb-map-grid pwb-map-grid-final" aria-hidden="true"></div>'+
  '<div class="pwb-protected-layer" aria-hidden="true">'+protectedTiles.join('')+'</div>'+
  '<div class="pwb-occupied-layer" data-pwb-occupied aria-hidden="true"></div>'+
  landmarks.map((z,i)=>'<button type="button" class="pwb-landmark-pin '+(z.isNeighborhood?'is-neighborhood':'')+
   '" style="'+pos(z.x,z.y)+'" data-pwb-landmark="'+i+'" title="'+esc(z.name)+'" aria-label="Explorar '+esc(z.name)+'"><span aria-hidden="true">'+z.emoji+'</span></button>').join('');
}
function create(root,config){
 if(!root||!config?.members)return null;
 let mounted=true,zoom=.78,panX=0,panY=0,placement=false,busy=false,backendReady=false;
 let pointerList=new Map(),startGesture=null,pointerMoved=false;
 let homes=[],serverHomes=[],highlight=null;
 const secretDay=dayMadrid(),secretKey='paqui-burgos-secret-'+secretDay;
 let secretFound=false,secret={x:11,y:7};
 try{secretFound=localStorage.getItem(secretKey)==='found'}catch(_){};
 const members=config.members.map((m,i)=>({...m,index:i,key:m.user_id||'guest-'+i}));
 const html='<div class="pwb-app">'+
 '<header class="pwb-title"><div><small>🗺️ PAQUILLO WORLD · BURGOS</small><h2>El barrio de la cuadrilla</h2><p>Explora Burgos, encuentra a tus amigos y elige tu parcela.</p></div>'+
 '<strong class="pwb-beta">BETA</strong></header>'+
 '<div class="pwb-stats"><span data-pwb-total>🏡 Casas: '+members.length+'</span><span data-pwb-claimed>📍 Parcelas: comprobando…</span>'+
 '<span data-pwb-secret-status>🎁 Sorpresa oculta de hoy</span></div>'+
 '<div class="pwb-command"><button type="button" data-pwb-place>🏠 Elegir mi parcela</button><button type="button" data-pwb-me>📍 Mi casa</button>'+
 '<label><span class="sr-only">Buscar vecino</span><input data-pwb-search type="search" placeholder="🔎 Buscar vecino" autocomplete="off" aria-label="Buscar vecino en Burgos"></label>'+
 '<label class="pwb-jump"><span class="sr-only">Ir a un lugar del mapa</span><select data-pwb-jump aria-label="Ir a un lugar de Burgos"><option value="">📍 Lugares de Burgos</option>'+
 landmarks.map((z,i)=>'<option value="'+i+'">'+esc(z.name)+'</option>').join('')+'</select></label></div>'+
 '<div class="pwb-search-results" data-pwb-results hidden></div>'+
 '<div class="pwb-viewport" data-pwb-viewport tabindex="0" aria-label="Mapa ficticio de Burgos. Arrastra, usa el zoom y toca las casas.">'+
 '<div class="pwb-world" data-pwb-world style="width:'+WIDTH+'px;height:'+HEIGHT+'px">'+backdrop()+
 '<div class="pwb-homes" data-pwb-homes></div>'+
 '<button class="pwb-secret" type="button" data-pwb-secret aria-label="Sorpresa diaria del barrio" title="Hallazgo del día">✦</button>'+
 '<div class="pwb-target" data-pwb-target hidden></div></div>'+
 '<div class="pwb-map-controls"><button type="button" data-pwb-zoom-in aria-label="Acercar mapa">+</button>'+
 '<button type="button" data-pwb-zoom-out aria-label="Alejar mapa">−</button>'+
 '<button type="button" data-pwb-centre aria-label="Centrar mi casa">⌖</button>'+
 '<button type="button" data-pwb-reload aria-label="Actualizar casas de vecinos">↻</button></div>'+
 '<div class="pwb-map-help" data-pwb-map-help>👆 Arrastra para explorar · Pellizca para ampliar</div>'+
 '<section class="pwb-landmark-card" data-pwb-landmark-card hidden aria-label="Información del lugar">'+
 '<button type="button" class="pwb-landmark-close" data-pwb-landmark-close aria-label="Cerrar ficha">✕</button>'+
 '<div class="pwb-landmark-art" data-pwb-landmark-art></div>'+
 '<div class="pwb-landmark-detail"><strong data-pwb-landmark-name></strong><p data-pwb-landmark-info></p></div></section>'+
 '</div>'+
 '<div class="pwb-position" role="status" aria-live="polite" data-pwb-position>El mapa usa parcelas ficticias, no direcciones de Burgos.</div>'+
 '<div class="pwb-bottom"><span>🏰 Castillo · ⛪ Catedral · ⚽ El Plantío · 🏟️ Coliseum · 🏘️ G3 · 🏡 Villímar</span><small>Ilustración de Burgos, no cartografía exacta ni domicilios reales. Las parcelas se guardan por casilla.</small></div>'+
 '</div>';
 root.innerHTML=html;
 const $=sel=>root.querySelector(sel),world=$('[data-pwb-world]'),vp=$('[data-pwb-viewport]'),results=$('[data-pwb-results]');
 const art=$('[data-pwb-art-image]');
 if(art){
  art.addEventListener('load',()=>root.classList.add('pwb-art-ready'));
  art.addEventListener('error',()=>root.classList.add('pwb-art-missing'));
  if(art.complete&&art.naturalWidth)root.classList.add('pwb-art-ready');
 }
 const status=(message)=>{const item=$('[data-pwb-position]');if(item)item.textContent=message};
 function viable(x,y){return VALID(x,y)&&!homes.some(h=>h.x===x&&h.y===y&&h.user_id!==config.uid)}
 function mine(){return homes.find(h=>h.user_id===config.uid)}
 function initialHomes(){
  const taken=new Set();
  homes=[];
  // Posiciones de la base de datos primero: únicas y persistentes.
  serverHomes.forEach(p=>{
   const x=Number(p.tile_x),y=Number(p.tile_y);
   if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=COLS||y<0||y>=ROWS)return;
   const m=members.find(m=>m.user_id===p.user_id);
   if(!m)return;
   const cell=p.tile_x+','+p.tile_y;
   if(taken.has(cell))return;
   taken.add(cell);homes.push({...m,x:Number(p.tile_x),y:Number(p.tile_y),saved:true,needsMove:!VALID(x,y),moved_at:p.moved_at});
  });
  members.forEach(m=>{
   if(homes.some(h=>h.key===m.key))return;
   const seed=hash(m.key+'-'+m.name);
   // El reparto provisional prioriza G3 y Villímar. Cada jugador puede elegir cualquier zona.
   let x=17+seed%11,y=2+(Math.floor(seed/31)%7);
   for(let j=0;j<COLS*ROWS;j++){
    const index=(y*COLS+x+j)%(COLS*ROWS),cx=index%COLS,cy=Math.floor(index/COLS),cell=cx+','+cy;
    if(VALID(cx,cy)&&!taken.has(cell)){taken.add(cell);homes.push({...m,x:cx,y:cy,saved:false});break}
   }
  });
  paint();
  locateSecret();
 }
 function locateSecret(){
  const seed=hash('hallazgo-paqui-'+secretDay);
  for(let tries=0;tries<COLS*ROWS;tries++){
   const i=(seed+tries*17)%(COLS*ROWS),x=i%COLS,y=Math.floor(i/COLS);
   if(VALID(x,y)&&!homes.some(h=>h.x===x&&h.y===y)){secret={x,y};break}
  }
  const prize=$('[data-pwb-secret]'),status=$('[data-pwb-secret-status]');
  if(prize){prize.style.left=(secret.x+.5)*CELL+'px';prize.style.top=(secret.y+.5)*CELL+'px';
    prize.classList.toggle('is-found',secretFound);prize.textContent=secretFound?'✓':'✦'}
  if(status)status.textContent=secretFound?'🏅 Hallazgo del día conseguido':'🎁 Sorpresa oculta de hoy';
 }
 function paint(){
  const target=$('[data-pwb-homes]');
  if(!target)return;
  target.innerHTML=homes.map(h=>
   '<button type="button" class="pwb-house pwb-house-'+(h.index%5)+(h.user_id===config.uid?' is-own':'')+
   (!h.saved?' is-preview':'')+(h.needsMove?' is-legacy-protected':'')+'" style="'+pos(h.x,h.y)+'" data-pwb-house="'+h.index+
   '" aria-label="'+esc(h.user_id===config.uid?'Mi casa':'Casa de '+h.name)+'" title="'+esc(h.name)+' · '+h.x+','+h.y+'">'+
   '<span class="pwb-house-roof">⌂</span><span class="pwb-house-photo">'+
   (h.avatar?'<img src="'+esc(h.avatar)+'" alt="" loading="lazy">':'<b>'+esc(h.name.slice(0,2).toUpperCase())+'</b>')+
   '</span><span class="pwb-house-name">'+esc(h.name)+'</span>'+
   (h.user_id===config.uid?'<span class="pwb-own-label">'+(h.needsMove?'⚠️ REUBICAR':'TU CASA')+'</span>':'')+
   '</button>'
  ).join('');
  const occupied=$('[data-pwb-occupied]');
  if(occupied)occupied.innerHTML=homes.filter(h=>h.user_id!==config.uid).map(h=>
   '<span class="pwb-occupied-tile" style="left:'+(h.x*CELL)+'px;top:'+(h.y*CELL)+'px"></span>'
  ).join('');
  const count=$('[data-pwb-claimed]');if(count)count.textContent=backendReady?
   '📍 '+serverHomes.length+' parcelas elegidas':'🧭 Casas provisionales';
  const mineButton=$('[data-pwb-place]');if(mineButton)mineButton.textContent=placement?'✕ Cancelar elección':
   (mine()?.saved?'🏠 Mover mi casa':'🏠 Elegir mi parcela');
 }
 function clampPan(){
  const w=vp.clientWidth||400,h=vp.clientHeight||520;
  panX=WIDTH*zoom<w?(w-WIDTH*zoom)/2:bounded(panX,w-WIDTH*zoom-36,36);
  panY=HEIGHT*zoom<h?(h-HEIGHT*zoom)/2:bounded(panY,h-HEIGHT*zoom-36,36);
 }
 function render(){
  clampPan();world.style.transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')';
 }
 function focus(x,y,smooth=true){
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  if(smooth)world.style.transition='transform .38s cubic-bezier(.2,.7,.25,1)';
  panX=(vp.clientWidth||390)/2-(x+.5)*CELL*zoom;
  panY=(vp.clientHeight||520)/2-(y+.5)*CELL*zoom;render();
  if(smooth)setTimeout(()=>{if(mounted)world.style.transition='none'},420);
 }
 function zoomAt(z,clientX,clientY){
  const rect=vp.getBoundingClientRect(),cx=clientX-rect.left,cy=clientY-rect.top;
  const wx=(cx-panX)/zoom,wy=(cy-panY)/zoom;
  zoom=bounded(z,.5,2.1);
  panX=cx-wx*zoom;panY=cy-wy*zoom;render();
 }
 function myHouse(){const h=mine();if(h)focus(h.x,h.y);else focus(21,5)}
 function pointCell(clientX,clientY){
  const rect=vp.getBoundingClientRect();
  const x=Math.floor((clientX-rect.left-panX)/(CELL*zoom)),y=Math.floor((clientY-rect.top-panY)/(CELL*zoom));
  return {x,y};
 }
 function targetCell(x,y){
  highlight={x,y};
  const spot=$('[data-pwb-target]');
  if(!spot)return;
  spot.hidden=false;spot.style.left=x*CELL+'px';spot.style.top=y*CELL+'px';
  spot.classList.toggle('is-busy',!viable(x,y));
 }
 function choose(x,y){
  if(!placement)return;
  if(!VALID(x,y)){status('⛔ Es una casilla reservada (río, monumento o fuera del mapa).');return}
  if(!viable(x,y)){status('🏘️ Esta parcela ya está ocupada. Busca una casilla libre.');return}
  targetCell(x,y);
  status('📌 Parcela ('+x+','+y+') libre. Confirma para '+(backendReady?'guardar':'probar')+' el movimiento.');
  const bar=$('[data-pwb-position]');
  let btn=$('[data-pwb-confirm]');
  if(!btn){btn=document.createElement('button');btn.type='button';btn.dataset.pwbConfirm='';
   btn.className='pwb-confirm';bar.append(btn)}
  btn.textContent=backendReady?'✅ Confirmar nueva parcela':'🧪 Probar aquí (sin guardar)';
 }
 async function save(){
  if(!highlight||busy||!placement)return;
  const {x,y}=highlight;if(!viable(x,y)){status('La parcela ya no está libre.');return}
  if(!config.uid){status('Inicia sesión con un usuario del grupo para elegir casa.');return}
  const old=mine();
  if(!window.confirm('¿'+(old?.saved?'Mover':'Colocar')+' tu casa a la parcela '+x+','+y+'? '+(backendReady?'Se guardará para todo el grupo.':'Solo es una demostración en este dispositivo.')))return;
  busy=true;const button=$('[data-pwb-confirm]');if(button)button.disabled=true;
  if(!backendReady){
   if(old){old.x=x;old.y=y;old.saved=false}
   else{const m=members.find(m=>m.user_id===config.uid);if(m)homes.push({...m,x,y,saved:false})}
   placement=false;highlight=null;$('[data-pwb-target]').hidden=true;paint();focus(x,y);
   status('🧪 Prueba local: la casa se ha movido en pantalla, pero NO se ha guardado. Ejecuta la migración de Supabase.');
  }else try{
   const {data,error}=await config.client.rpc('paqui_world_place_home',{p_x:x,p_y:y});
   if(error)throw error;
   const row=Array.isArray(data)?data[0]:data;
   if(!row||row.user_id!==config.uid)throw new Error('No se ha confirmado el guardado');
   const index=serverHomes.findIndex(h=>h.user_id===config.uid);
   if(index>=0)serverHomes[index]=row;else serverHomes.push(row);
   placement=false;highlight=null;$('[data-pwb-target]').hidden=true;
   initialHomes();focus(x,y);
   status('✅ Casa guardada en Burgos, parcela ('+x+','+y+'). Los demás Paquillos verán tu nueva ubicación.');
  }catch(error){
   status('⚠️ No se pudo mover la casa: '+(error.message||'Error de Supabase')+'.');
  }finally{busy=false;if(button)button.disabled=false}
  if(!backendReady)busy=false;
 }
 function showLandmark(index){
  const place=landmarks[index],card=$('[data-pwb-landmark-card]');
  if(!place||!card||placement)return;
  const photo=$('[data-pwb-landmark-art]');
  const name=$('[data-pwb-landmark-name]');
  const info=$('[data-pwb-landmark-info]');
  if(name)name.textContent=place.emoji+' '+place.name;
  if(info)info.textContent=place.info;
  if(photo){
   // Recorte del propio mapa aprobado: el fondo de la ficha no usa fotografías externas.
   photo.style.backgroundImage="url('"+ART+"')";
   photo.style.backgroundPosition=Math.round(place.x/(COLS-1)*100)+'% '+Math.round(place.y/(ROWS-1)*100)+'%';
  }
  card.hidden=false;
 }
 function togglePlace(){
  placement=!placement;highlight=null;
  const spot=$('[data-pwb-target]');if(spot)spot.hidden=true;
  const button=$('[data-pwb-confirm]');button?.remove();
  vp.classList.toggle('pwb-is-placing',placement);paint();
  if(placement){const card=$('[data-pwb-landmark-card]');if(card)card.hidden=true;}
  status(placement?'🏗️ Modo parcela: toca una casilla libre. G3 y Villímar tienen numerosas parcelas.':
   '👆 Arrastra el mapa y toca una casa para ver su ficha.');
 }
 async function read(){
  if(!config.client)return;
  const {data,error}=await config.client.from('paqui_world_homes').select('user_id,tile_x,tile_y,moved_at');
  if(!mounted)return;
  if(error){
   backendReady=false;
   status('🧪 Modo exploración: ejecuta paquillo-world-burgos-v2.sql para guardar parcelas. Las casas son provisionales.');
  }else{
   backendReady=true;serverHomes=data||[];
   status('✅ Mapa compartido activo. Solo tú puedes mover tu casa; las parcelas quedan reservadas.');
   if(mine()?.needsMove)status('⚠️ Tu parcela anterior coincide ahora con un lugar protegido. Puedes moverla a una casilla libre sin perder tus datos.');
  }
  initialHomes();
  if(!placement)myHouse();
 }
 root.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-pwb-landmark-close')){$('[data-pwb-landmark-card]').hidden=true;return}
  if(b.hasAttribute('data-pwb-landmark')){
   if(!pointerMoved)showLandmark(Number(b.dataset.pwbLandmark));
   return;
  }
  if(b.hasAttribute('data-pwb-secret')){
   if(placement)return;
   if(secretFound){status('🏅 Ya encontraste la sorpresa de hoy. ¡Mañana habrá otra!');return}
   secretFound=true;try{localStorage.setItem(secretKey,'found')}catch(_){}
   locateSecret();
   status('✨ ¡Has encontrado el Paquillo escondido del día! Logro local, sin XP ni monedas.');
   return;
  }
  if(b.hasAttribute('data-pwb-reload')){status('🔄 Actualizando casas…');void read().catch(e=>status('No se pudo actualizar: '+e.message));return}
  if(b.hasAttribute('data-pwb-place')){togglePlace();return}
  if(b.hasAttribute('data-pwb-confirm')){void save();return}
  if(b.hasAttribute('data-pwb-me')||b.hasAttribute('data-pwb-centre')){myHouse();return}
  if(b.hasAttribute('data-pwb-zoom-in')){const r=vp.getBoundingClientRect();zoomAt(zoom*1.22,r.left+r.width/2,r.top+r.height/2);return}
  if(b.hasAttribute('data-pwb-zoom-out')){const r=vp.getBoundingClientRect();zoomAt(zoom/1.22,r.left+r.width/2,r.top+r.height/2);return}
  if(b.hasAttribute('data-pwb-find')){
   const h=homes.find(m=>m.index===Number(b.dataset.pwbFind));
   if(h){focus(h.x,h.y);results.hidden=true;$('[data-pwb-search]').value=h.name;status('📍 '+h.name+' · parcela '+h.x+','+h.y+(h.saved?' · ubicación elegida':' · provisional'))}
   return;
  }
  if(b.hasAttribute('data-pwb-house')&&!pointerMoved&&!placement){
   const idx=Number(b.dataset.pwbHouse);
   if(Number.isInteger(idx)&&idx>=0&&idx<members.length)config.onHouse?.(idx);
  }
 });
 const jump=$('[data-pwb-jump]');
 if(jump)jump.addEventListener('change',()=>{
  const idx=Number(jump.value);
  if(jump.value!==''&&landmarks[idx]){
   const place=landmarks[idx];focus(place.x,place.y);
   showLandmark(idx);
  }
  jump.value='';
 });
 const search=$('[data-pwb-search]');
 search.addEventListener('input',()=>{
  const text=normalize(search.value.trim());if(!text){results.hidden=true;return}
  const matching=members.filter(m=>normalize(m.name).includes(text)).slice(0,8);
  results.hidden=false;
  results.innerHTML=matching.length?matching.map(m=>'<button type="button" data-pwb-find="'+m.index+'">'+
   (m.avatar?'<img src="'+esc(m.avatar)+'" alt="">':'<span>👤</span>')+'<b>'+esc(m.name)+'</b><span>⌖</span></button>').join(''):
   '<p>No encontramos ningún vecino con ese nombre.</p>';
 });
 vp.addEventListener('wheel',event=>{
  event.preventDefault();
  zoomAt(zoom*(event.deltaY<0?1.11:.9),event.clientX,event.clientY);
 },{passive:false});
 function distance(points){
  const [a,b]=[...points.values()];return Math.hypot(a.x-b.x,a.y-b.y);
 }
 vp.addEventListener('pointerdown',event=>{
  if(event.target.closest('.pwb-map-controls'))return;
  world.style.transition='none';
  pointerList.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
  pointerMoved=false;
  startGesture=pointerList.size===2?{dist:distance(pointerList),zoom}:null;
 });
 vp.addEventListener('pointermove',event=>{
  const previous=pointerList.get(event.pointerId);if(!previous)return;
  const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
  pointerList.set(event.pointerId,{...previous,x:event.clientX,y:event.clientY});
  if(pointerList.size>=2){
   if(!startGesture)startGesture={dist:distance(pointerList),zoom};
   const pts=[...pointerList.values()],r=vp.getBoundingClientRect();
   const cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;
   zoomAt(startGesture.zoom*distance(pointerList)/Math.max(1,startGesture.dist),cx,cy);
   pointerMoved=true;return;
  }
  if(Math.abs(dx)+Math.abs(dy)>0){panX+=dx;panY+=dy;render()}
  if(Math.hypot(event.clientX-previous.startX,event.clientY-previous.startY)>7){
   if(!pointerMoved)vp.setPointerCapture?.(event.pointerId);
   pointerMoved=true;
  }
 });
 vp.addEventListener('pointerup',event=>{
  const wasTap=!pointerMoved&&pointerList.size===1;
  pointerList.delete(event.pointerId);startGesture=null;
  if(placement&&wasTap&&!event.target.closest('.pwb-map-controls')){
   const cell=pointCell(event.clientX,event.clientY);choose(cell.x,cell.y);
  }
  if(pointerMoved)setTimeout(()=>{pointerMoved=false},120);
 });
 vp.addEventListener('pointercancel',event=>{pointerList.delete(event.pointerId);startGesture=null});
 vp.addEventListener('keydown',event=>{
  const step=70;
  if(event.key==='ArrowLeft')panX+=step;
  else if(event.key==='ArrowRight')panX-=step;
  else if(event.key==='ArrowUp')panY+=step;
  else if(event.key==='ArrowDown')panY-=step;
  else if(event.key==='Escape'){if(placement)togglePlace();return}
  else return;
  event.preventDefault();render();
 });
 initialHomes();
 requestAnimationFrame(()=>{if(mounted){myHouse();read().catch(err=>status('No se pudo cargar el barrio: '+err.message))}});
 return {destroy(){mounted=false;pointerList.clear();},focusMyHome:myHouse,reload:read};
}
let running=null;
window.PaquilloBurgosMap={
 get available(){return true},
 mount(root,config){running?.destroy();running=create(root,config);return running},
 destroy(){running?.destroy();running=null},
 focusMyHome(){running?.focusMyHome()}
};
})();
