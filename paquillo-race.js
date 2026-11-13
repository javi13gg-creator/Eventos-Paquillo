/* Carrera Paquillera · Escape del Festival. Juego móvil para Paquillo World. */
(()=>{'use strict';
const W=640,H=360,Y=285,X=105,G=1750;
const zones=[
 ['FESTIVAL','#522889','#e98b9b','🎪'],['RUTA VIAJERA','#258dba','#9ce7c2','🛩️'],
 ['CANCHA','#395ab2','#ce9ded','🏀'],['CUMPLEAÑOS','#8838a9','#f4b5c0','🎂'],
 ['EL AFTER','#1b1859','#7437a6','🎧']];
const obstacles=[
 ['🍺',42,37,false],['🎲',44,37,false],['🧳',47,37,false],['🎂',46,37,false],
 ['🏀',41,36,false],['🚧',43,38,false],['💦',24,44,false],['🎏',43,51,true]];
const powers=[
 ['🛡️','shield',0],['🧲','magnet',7],['⚡','turbo',5],['🚀','jump',8],
 ['✨','double',8],['🎉','fiesta',5]];
const achievements=[[100,'👟 Primeros pasos'],[500,'🎪 Superviviente del Festival'],
 [1000,'🌙 Corredor de after'],[2000,'👑 Leyenda Paquillera'],[5000,'🍹 Maratón del calimocho']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),rnd=(a,b)=>a+Math.random()*(b-a),q=id=>document.getElementById(id);
let options={},run=null,canvas=null,ctx=null,raf=0,last=0,portrait=null,life=0,handlers=[],soundOn=true,audio=null;
let scores=[],weekScores=[],online=false,loadingBoard=false,rankView='all';
function bind(el,name,fn,opts){if(!el)return;el.addEventListener(name,fn,opts);handlers.push(()=>el.removeEventListener(name,fn,opts));}
function key(){return 'paqui_race_v1_'+(options.uid||'guest');}
function week(){
 const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function local(){try{return JSON.parse(localStorage.getItem(key())||'{}')||{}}catch{return {}}}
function save(x){try{localStorage.setItem(key(),JSON.stringify(x))}catch(_){}}
function best(){const s=local();return {all:Math.max(0,s.all||0),weekly:s.week===week()?Math.max(0,s.weekly||0):0,
 tickets:Math.max(0,s.tickets||0),achievements:Array.isArray(s.achievements)?s.achievements:[]};}
function tone(f=420,t=.09){
 if(!soundOn)return;try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!audio)audio=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
  const o=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime;
  o.type='sine';o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(Math.max(100,f*.7),at+t);
  gain.gain.setValueAtTime(.027,at);gain.gain.exponentialRampToValueAtTime(.001,at+t);
  o.connect(gain);gain.connect(audio.destination);o.start(at);o.stop(at+t+.01);
 }catch(_){}
}
function initial(){
 const b=best();return {mode:'ready',m:0,time:0,speed:225,lives:3,shield:0,y:0,vy:0,duck:false,
  inv:0,objects:[],items:[],effects:[],nextObj:1.8,nextCoin:1,nextPower:6.4,
  tickets:0,coins:0,passed:0,power:{},zone:0,checkpoint:0,toastTimer:0,lastUi:'',saved:false,
  allBest:b.all,weekBest:b.weekly};
}
function markup(){
 return '<div class="pw-race" id="pwRace">'+
 '<header class="pw-race-title"><div><b>🏁 CARRERA PAQUILLERA</b><small>ESCAPE DEL FESTIVAL · RÉCORD DE DISTANCIA</small></div>'+
 '<button id="raceSound" class="pw-race-small" type="button" aria-label="Alternar sonido">🔊</button></header>'+
 '<div class="pw-race-stats"><b id="raceDist">🏁 0 m</b><b id="raceTickets">🎟️ 0</b><b id="raceLives">❤️❤️❤️</b></div>'+
 '<div class="pw-race-progress"><i id="raceProgress"></i><strong id="raceZone">🎪 Festival</strong><small id="raceNext">Siguiente: Ruta viajera</small></div>'+
 '<div class="pw-race-stage"><canvas id="raceCanvas" width="640" height="360" role="img" aria-label="Pista de carrera, usa Saltar y Agacharse para superar obstáculos"></canvas>'+
 '<div id="raceToast" class="pw-race-toast" hidden></div>'+
 '<div id="raceOverlay" class="pw-race-overlay"><div id="raceOverlayContent" class="pw-race-overlay-content"></div></div></div>'+
 '<div class="pw-race-buttons"><button id="raceJump" type="button">⬆️ <b>SALTAR</b></button>'+
 '<button id="raceDuck" type="button">⬇️ <b>AGACHARSE</b></button>'+
 '<button id="racePause" type="button" aria-label="Pausar la carrera">⏸</button></div>'+
 '<p class="pw-race-help">También puedes tocar la pista para saltar o usar ↑ / ↓ en el teclado.</p>'+
 '<div class="pw-race-personal"><span>🥇 Récord <b id="raceBest">0 m</b></span>'+
 '<span>📅 Semana <b id="raceWeek">0 m</b></span><span>🎟️ Acumulados <b id="raceTotalTickets">0</b></span></div>'+
 '<div class="pw-race-ranking"><div class="pw-race-ranking-head"><b>🏆 CLASIFICACIÓN</b>'+
 '<div><button id="raceRankAll" type="button" class="on">Histórico</button>'+
 '<button id="raceRankWeek" type="button">Semanal</button></div></div>'+
 '<div id="raceRankList" class="pw-race-ranking-list">Cargando marcas…</div></div></div>';
}
function cover(head,body,action='start',label='¡A CORRER! ▶',footer=''){
 const box=q('raceOverlay'),content=q('raceOverlayContent');if(!box||!content)return;
 content.innerHTML='<span class="pw-race-trophy">🏁</span><h2>'+esc(head)+'</h2><p>'+esc(body)+'</p>'+
 '<button type="button" data-race-action="'+esc(action)+'">'+esc(label)+'</button>'+
 (footer?'<small>'+esc(footer)+'</small>':'');
 box.hidden=false;
}
function hideCover(){if(q('raceOverlay'))q('raceOverlay').hidden=true;}
function popup(message,time=1.5){
 if(!run)return;run.toastTimer=time;const el=q('raceToast');
 if(el){el.hidden=false;el.textContent=message;}
}
function newPortrait(){
 portrait=null;if(!options.photo||!window.Image)return;
 const stamp=life,im=new Image();
 im.onload=()=>{if(stamp===life&&im.naturalWidth)portrait=im;};
 im.src=options.photo;
}
function open(config){
 destroy();options=config||{};
 if(typeof options.render!=='function')return;
 options.render(markup());
 canvas=q('raceCanvas');if(!canvas)return;
 ctx=canvas.getContext?.('2d',{alpha:false});
 if(!ctx){cover('Juego no compatible','Tu navegador no admite Canvas 2D.','close','Volver');return;}
 run=initial();last=0;rankView='all';scores=[];weekScores=[];online=false;loadingBoard=false;
 try{soundOn=localStorage.getItem('paqui_race_sound')!=='off';}catch(_){soundOn=true;}
 if(q('raceSound'))q('raceSound').textContent=soundOn?'🔊':'🔇';
 newPortrait();controls();resize();updateUI(true);draw();
 cover('¡ESCAPE DEL FESTIVAL!','Corre por el mundo Paquillo, salta obstáculos, agáchate bajo carteles y recoge tickets y power-ups. ¡Tienes 3 vidas!','start','¡A CORRER! ▶','Récords guardados en tu dispositivo · Controles táctiles.');
 loadRanking().catch(()=>{});
}
function destroy(){
 life++;if(raf)cancelAnimationFrame(raf);raf=0;
 for(const unbind of handlers)try{unbind()}catch(_){}
 handlers=[];run=null;canvas=null;ctx=null;portrait=null;last=0;
 if(audio){try{audio.close()}catch(_){}audio=null;}
}
function resize(){
 if(!canvas)return;const r=canvas.getBoundingClientRect(),d=clamp(window.devicePixelRatio||1,1,2);
 canvas.width=Math.round(Math.max(1,(r.width||640)*d));
 canvas.height=Math.round(Math.max(1,(r.height||360)*d));
 if(run)draw();
}
function begin(){
 if(!run)return;if(raf)cancelAnimationFrame(raf);
 run=initial();run.mode='running';last=0;hideCover();updateUI(true);tone(650);
 raf=requestAnimationFrame(tick);
}
function pause(){
 if(!run)return;
 if(run.mode==='running'){
  run.mode='paused';if(raf)cancelAnimationFrame(raf);raf=0;
  if(q('racePause'))q('racePause').textContent='▶';
  cover('CARRERA EN PAUSA','Estás a salvo mientras descansas.','resume','CONTINUAR ▶');
 }else if(run.mode==='paused')resume();
}
function resume(){
 if(!run||run.mode!=='paused')return;
 run.mode='running';last=0;if(q('racePause'))q('racePause').textContent='⏸';
 hideCover();raf=requestAnimationFrame(tick);
}
function finish(){
 if(!run||run.mode==='finished')return;
 const g=run;g.mode='finished';g.duck=false;if(raf)cancelAnimationFrame(raf);raf=0;
 const m=Math.max(0,Math.floor(g.m)),old=best();
 const unlocked=achievements.filter(([min])=>m>=min&&!old.achievements.includes(min));
 save({week:week(),all:Math.max(m,old.all),weekly:Math.max(m,old.weekly),
  tickets:old.tickets+g.tickets,last:m,achievements:[...old.achievements,...unlocked.map(([n])=>n)]});
 g.allBest=Math.max(m,old.all);g.weekBest=Math.max(m,old.weekly);
 updateUI(true);tone(190,.18);
 cover(m>old.all?'🏆 ¡NUEVO RÉCORD!':'¡FIN DE CARRERA!',
  'Has llegado a '+m+' metros, recogido '+g.tickets+' tickets y esquivado '+g.passed+' obstáculos. '+
  (unlocked.length?'Logros: '+unlocked.map(x=>x[1]).join(' · ')+'.':'¡A por una marca mejor!'),
  'start','VOLVER A CORRER ▶','Récord: '+g.allBest+' m · Los tickets no otorgan XP de World.');
 saveScore(m,g.tickets,Math.max(1,Math.floor(g.time))).catch(()=>{});
}
function jump(){
 if(!run||run.mode!=='running')return;
 if(run.y===0&&!run.duck){run.vy=run.power.jump>0?-825:-690;run.y=1;tone(750);}
}
function duck(yes){if(run)run.duck=!!yes&&run.mode==='running';if(yes&&run?.y>0)run.vy=Math.max(run.vy,190);}
function box(){const h=run.duck&&run.y===0?30:60;return {x:X+12,y:Y-run.y-h+3,w:30,h:h-5};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y+a.h>b.y&&a.y<b.y+b.h;}
function spawnObstacle(){
 const pool=run.m>120?obstacles:obstacles.filter(o=>!o[3]);
 const spec=pool[Math.floor(Math.random()*pool.length)];
 run.objects.push({x:W+rnd(10,50),spec,hit:false,passed:false});
}
function spawnItem(power=false){
 if(power){const p=powers[Math.floor(Math.random()*powers.length)];run.items.push({x:W+65,y:Y-95,power:p,used:false});}
 else run.items.push({x:W+30,y:Y-(Math.random()>.4?100:55),power:null,used:false});
}
function collideObstacle(o){
 if(o.hit||run.inv>0)return;
 const [emoji,size,width,high]=o.spec;
 const obj={x:o.x+3,y:high?Y-112:Y-size+5,w:width-6,h:high?65:size-10};
 if(!overlap(box(),obj))return;
 o.hit=true;
 if(run.shield){run.shield--;run.inv=.65;popup('🛡️ ¡ESCUDO SALVADOR!');tone(820);}
 else if(run.power.fiesta>0){run.inv=.45;popup('🎉 ¡INVENCIBLE!');}
 else {run.lives--;run.inv=1.35;popup(run.lives?'💥 ¡CUIDADO! QUEDAN '+run.lives+' VIDAS':'💀 ¡MENUDO GOLPE!',1.6);tone(140,.18);
  if(run.lives===0)finish();}
}
function collect(item){
 item.used=true;
 if(!item.power){run.tickets+=run.power.double>0?2:1;run.coins++;tone(920,.06);return;}
 const [icon,type,duration]=item.power;
 if(type==='shield')run.shield=Math.min(2,run.shield+1);
 else run.power[type]=duration;
 popup(icon+' '+(type==='shield'?'ESCUDO':type==='magnet'?'IMÁN':type==='turbo'?'TURBO':type==='jump'?'SUPERSALTO':type==='double'?'DOBLE TICKETS':'MODO FIESTA'));
 tone(950,.1);
}
function update(dt){
 if(!run||run.mode!=='running')return;
 const g=run;g.time+=dt;g.speed=Math.min(480,225+g.m*.12);
 const move=g.speed*(g.power.turbo>0?1.27:1)*dt;
 g.m+=move/12;g.inv=Math.max(0,g.inv-dt);
 for(const k in g.power){g.power[k]-=dt;if(g.power[k]<=0)delete g.power[k];}
 if(g.y>0||g.vy){g.y-=g.vy*dt;g.vy+=G*dt;if(g.y<=0){g.y=0;g.vy=0;}}
 g.nextObj-=dt;if(g.nextObj<=0){spawnObstacle();g.nextObj=rnd(1.18,1.7)*clamp(280/g.speed,.72,1.12);}
 g.nextCoin-=dt;if(g.nextCoin<=0){spawnItem();g.nextCoin=rnd(.55,1.0);}
 g.nextPower-=dt;if(g.nextPower<=0){spawnItem(true);g.nextPower=rnd(7.2,11.8);}
 for(const o of g.objects){o.x-=move;collideObstacle(o);if(g.mode!=='running')return;
  if(!o.passed&&o.x+o.spec[2]<X){o.passed=true;if(!o.hit)g.passed++;}}
 g.objects=g.objects.filter(o=>o.x>-60);
 const p=box();
 for(const item of g.items){
  item.x-=move;
  if(item.used)continue;
  if((g.power.magnet>0&&!item.power&&Math.abs(item.x-(X+24))<130)||
   (Math.abs(item.x-(X+27))<35&&Math.abs(item.y-(p.y+p.h*.45))<52))collect(item);
 }
 g.items=g.items.filter(it=>it.x>-40&&!it.used);
 g.zone=Math.floor(g.m/500)%zones.length;
 if(Math.floor(g.m/500)>g.checkpoint){g.checkpoint=Math.floor(g.m/500);popup('🏁 CHECKPOINT · '+zones[g.zone][0],2);tone(1090,.16);}
 if(g.toastTimer>0){g.toastTimer-=dt;if(g.toastTimer<=0&&q('raceToast'))q('raceToast').hidden=true;}
 updateUI();
}
function tick(time){
 raf=0;if(!run||run.mode!=='running')return;
 const dt=last?Math.min(.035,(time-last)/1000):.016;last=time;
 update(dt);draw();
 if(run?.mode==='running')raf=requestAnimationFrame(tick);
}
function rounded(x,y,w,h,r=7){
 r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);
 ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
 ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function draw(){
 if(!ctx||!canvas||!run)return;
 const g=run,z=zones[g.zone];
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,z[1]);grad.addColorStop(1,z[2]);
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 const scroll=g.m*3.8;
 for(let i=0;i<16;i++){const x=((i*54-scroll*.08+4000)%(W+80))-40,y=20+(i*41)%150;
  ctx.globalAlpha=.3+(i%3)*.16;ctx.fillStyle=i%2?'#fff9c7':'#fff';ctx.beginPath();ctx.arc(x,y,2+i%3,0,Math.PI*2);ctx.fill();}
 ctx.globalAlpha=1;
 ctx.fillStyle=z[1]+'cc';ctx.beginPath();ctx.moveTo(0,Y);
 for(let x=0;x<=W;x+=18)ctx.lineTo(x,215+Math.sin(x*.022+scroll*.0005)*17);
 ctx.lineTo(W,Y);ctx.fill();
 ctx.textAlign='center';ctx.font='49px "Apple Color Emoji","Segoe UI Emoji",system-ui';
 for(let i=0;i<6;i++){const x=((i*150-scroll*.19+5000)%(W+150))-70;
  ctx.globalAlpha=.48;ctx.fillText(z[3],x,223+(i%2)*17);}
 ctx.globalAlpha=1;
 ctx.fillStyle='#403262';ctx.fillRect(0,Y,W,H-Y);
 ctx.fillStyle='#9074b1';ctx.fillRect(0,Y,W,8);
 for(let i=0;i<11;i++){const x=((i*92-scroll*.9+7500)%(W+110))-60;
  ctx.fillStyle='#ffe18b';ctx.fillRect(x,Y+37,48,6);}
 ctx.textBaseline='bottom';
 for(const o of g.objects){
  ctx.font=(o.spec[0]==='🎏'?34:o.spec[1])+'px "Apple Color Emoji","Segoe UI Emoji",system-ui';
  if(o.spec[3]){
   ctx.fillStyle='#ffe47d';rounded(o.x-7,Y-112,o.spec[2]+14,65,5);ctx.fill();
   ctx.fillStyle='#43266e';ctx.font='bold 13px system-ui';ctx.fillText('AGÁCHATE',o.x+o.spec[2]/2,Y-69);
   ctx.font='26px "Apple Color Emoji","Segoe UI Emoji"';ctx.fillText('🎏',o.x+o.spec[2]/2,Y-112);
  }else ctx.fillText(o.spec[0],o.x+o.spec[2]/2,Y+2);
 }
 for(const it of g.items){ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#fff2a1';ctx.fillStyle='#ffdb63';
  ctx.beginPath();ctx.arc(it.x,it.y,17,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.textBaseline='middle';ctx.font='23px "Apple Color Emoji","Segoe UI Emoji"';ctx.fillText(it.power?it.power[0]:'🎟️',it.x,it.y);ctx.restore();}
 // Player is a cartoon body with current profile avatar/initial.
 const crouched=g.duck&&g.y===0,headY=Y-g.y-(crouched?53:75);
 ctx.save();ctx.globalAlpha=g.inv>0?.55+.45*Math.sin(g.time*48):1;
 if(g.shield||g.power.fiesta>0){ctx.shadowColor='#9df8ee';ctx.shadowBlur=22;}
 const stride=Math.sin(g.time*20)*8;
 ctx.lineWidth=9;ctx.lineCap='round';ctx.strokeStyle='#29245c';
 if(!crouched){ctx.beginPath();ctx.moveTo(X+24,Y-g.y-32);ctx.lineTo(X+15+stride,Y-g.y-4);
  ctx.moveTo(X+33,Y-g.y-32);ctx.lineTo(X+35-stride,Y-g.y-4);ctx.stroke();}
 ctx.fillStyle='#ffdf59';ctx.fillRect(X+10+stride*.25,Y-g.y-9,18,9);ctx.fillRect(X+30-stride*.25,Y-g.y-9,19,9);
 ctx.fillStyle='#fa478f';rounded(X+10,Y-g.y-(crouched?40:60),41,crouched?26:38,9);ctx.fill();
 ctx.fillStyle='#ffeb72';ctx.font='bold 12px system-ui';ctx.fillText('PAQ',X+30,Y-g.y-28);
 ctx.beginPath();ctx.arc(X+30,headY,21,0,Math.PI*2);ctx.clip();ctx.fillStyle='#ffcd9b';
 ctx.fillRect(X+9,headY-21,42,42);
 if(portrait?.complete&&portrait.naturalWidth){
  const n=Math.min(portrait.naturalWidth,portrait.naturalHeight),sx=(portrait.naturalWidth-n)/2,sy=(portrait.naturalHeight-n)/2;
  ctx.drawImage(portrait,sx,sy,n,n,X+9,headY-21,42,42);
 }else{ctx.fillStyle='#4c265e';ctx.font='bold 24px system-ui';ctx.textBaseline='middle';
  ctx.fillText((options.member?.display_name||'P').slice(0,1).toUpperCase(),X+30,headY);}
 ctx.restore();
 ctx.strokeStyle='#fde357';ctx.lineWidth=3;ctx.beginPath();ctx.arc(X+30,headY,21,0,Math.PI*2);ctx.stroke();
 if(g.shield){ctx.strokeStyle='#9cfff0';ctx.lineWidth=4;ctx.beginPath();ctx.arc(X+30,Y-g.y-46,56,0,Math.PI*2);ctx.stroke();}
 ctx.textAlign='left';ctx.setTransform(1,0,0,1,0,0);
}
function updateUI(force=false){
 if(!run)return;const g=run,d=Math.floor(g.m);
 if(!force&&g.lastUi===String(d))return;g.lastUi=String(d);
 q('raceDist').textContent='🏁 '+d+' m';q('raceTickets').textContent='🎟️ '+g.tickets+(g.power.double>0?' ×2':'');
 q('raceLives').textContent='❤️'.repeat(g.lives)+'🖤'.repeat(3-g.lives)+(g.shield?' 🛡️':'');
 q('raceProgress').style.width=(g.m%500/500*100)+'%';
 q('raceZone').textContent=zones[g.zone][3]+' '+zones[g.zone][0];
 q('raceNext').textContent='Siguiente: '+zones[(g.zone+1)%zones.length][0];
 const b=best();
 q('raceBest').textContent=Math.max(d,b.all)+' m';q('raceWeek').textContent=Math.max(d,b.weekly)+' m';
 q('raceTotalTickets').textContent=b.tickets+g.tickets;
}
function controls(){
 const jumpBtn=q('raceJump'),duckBtn=q('raceDuck'),stage=q('raceCanvas');
 bind(jumpBtn,'pointerdown',e=>{e.preventDefault();jump();});
 bind(jumpBtn,'click',e=>{if(e.detail===0)jump();});
 bind(duckBtn,'pointerdown',e=>{e.preventDefault();duck(true);duckBtn.classList.add('held');});
 for(const name of ['pointerup','pointercancel','pointerleave','lostpointercapture'])bind(duckBtn,name,()=>{
  duck(false);duckBtn.classList.remove('held');});
 bind(duckBtn,'click',e=>{if(e.detail===0){duck(true);setTimeout(()=>duck(false),450);}});
 bind(q('racePause'),'click',pause);
 bind(q('raceSound'),'click',()=>{soundOn=!soundOn;q('raceSound').textContent=soundOn?'🔊':'🔇';
  try{localStorage.setItem('paqui_race_sound',soundOn?'on':'off')}catch(_){}});
 let pressed=null;
 bind(stage,'pointerdown',e=>{pressed={y:e.clientY,type:e.pointerType};if(e.pointerType==='mouse')jump();});
 bind(stage,'pointerup',e=>{if(!pressed)return;const delta=e.clientY-pressed.y;
  if(delta>28){duck(true);setTimeout(()=>duck(false),550);}
  else if(pressed.type!=='mouse')jump();pressed=null;});
 bind(stage,'pointercancel',()=>{pressed=null;duck(false);});
 bind(q('pwRace'),'click',e=>{
  const action=e.target.closest('[data-race-action]')?.dataset.raceAction;
  if(action==='start')begin();else if(action==='resume')resume();else if(action==='close')options.onClose?.();
 });
 bind(q('raceRankAll'),'click',()=>{rankView='all';renderRank();});
 bind(q('raceRankWeek'),'click',()=>{rankView='week';renderRank();});
 bind(window,'resize',resize);
 bind(document,'visibilitychange',()=>{if(document.hidden&&run?.mode==='running')pause();});
 bind(document,'keydown',e=>{
  if(!run||!stage||e.target?.matches?.('input,textarea,select'))return;
  if(['ArrowUp','Space','KeyW'].includes(e.code)){e.preventDefault();if(!e.repeat)run.mode==='ready'?begin():jump();}
  if(['ArrowDown','KeyS'].includes(e.code)){e.preventDefault();duck(true);}
  if(e.code==='KeyP'){e.preventDefault();pause();}
 });
 bind(document,'keyup',e=>{if(['ArrowDown','KeyS'].includes(e.code))duck(false);});
}
function name(id){return options.members?.find(m=>m.auth_user_id===id)?.display_name||'Paquillo';}
function rankRows(){
 const latest=new Map(),from=new Date(week()+'T00:00:00');
 for(const s of (rankView==='week'?weekScores:scores)){
  if(rankView==='week'&&new Date(s.created_at)<from)continue;
  const prev=latest.get(s.user_id);
  if(!prev||s.distance_m>prev.distance_m)latest.set(s.user_id,s);
 }
 return [...latest.values()].sort((a,b)=>b.distance_m-a.distance_m).slice(0,7);
}
function renderRank(){
 const el=q('raceRankList');if(!el)return;
 q('raceRankAll').classList.toggle('on',rankView==='all');
 q('raceRankWeek').classList.toggle('on',rankView==='week');
 if(!online){
  const b=best();el.innerHTML='<div class="pw-race-ranking-row"><b>👑 '+esc(options.member?.display_name||'Tú')+
   '</b><strong>'+(rankView==='all'?b.all:b.weekly)+' m</strong></div>'+
   '<p>🏠 Récord local. Activa el SQL de carreras en Supabase para ver las marcas de todo el grupo.</p>';
  return;
 }
 const top=rankRows();el.innerHTML=top.length?top.map((s,i)=>
  '<div class="pw-race-ranking-row"><span>'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1+'.')+'</span>'+
  '<b>'+esc(name(s.user_id))+(s.user_id===options.uid?' (Tú)':'')+'</b>'+
  '<strong>'+Math.floor(s.distance_m)+' m</strong></div>').join(''):'<p>Sin carreras registradas esta semana. ¡Estrena la clasificación!</p>';
}
async function loadRanking(){
 const token=life;if(!options.client||loadingBoard){renderRank();return;}
 loadingBoard=true;
 try{
  const [allRes,weekRes]=await Promise.all([
   options.client.from('paqui_world_race_scores')
    .select('user_id,distance_m,created_at').order('distance_m',{ascending:false}).limit(180),
   options.client.from('paqui_world_race_scores')
    .select('user_id,distance_m,created_at').gte('created_at',new Date(week()+'T00:00:00').toISOString())
    .order('distance_m',{ascending:false}).limit(180)
  ]);
  if(token!==life)return;if(allRes.error||weekRes.error)throw allRes.error||weekRes.error;
  scores=allRes.data||[];weekScores=weekRes.data||[];online=true;
 }catch(_){if(token!==life)return;online=false;}
 finally{loadingBoard=false;if(token===life)renderRank();}
}
async function saveScore(distance,tickets,duration){
 if(distance<1||!options.client||!options.uid){renderRank();return;}
 const token=life;
 try{
  const {error}=await options.client.from('paqui_world_race_scores').insert({
   user_id:options.uid,distance_m:distance,tickets,duration_s:clamp(duration,1,600)
  });
  if(error)throw error;if(token===life)await loadRanking();
 }catch(_){if(token===life){online=false;renderRank();}}
}
window.PaquilloRace={
 open,destroy,
 get running(){return !!run&&run.mode==='running';},
 get snapshot(){return run?{mode:run.mode,distance:run.m,lives:run.lives,tickets:run.tickets}:null;}
};
})();