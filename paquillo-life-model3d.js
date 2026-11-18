/* Paquillo Life · piloto 3D procedural optativo. No sustituye el sprite aprobado. */
(()=>{
'use strict';
let modulePromise=null;
function getThree(){
 if(modulePromise)return modulePromise;
 // Dos orígenes independientes; la carga no debe bloquear indefinidamente la interfaz.
 const sources=[
  'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js',
  'https://unpkg.com/three@0.160.1/build/three.module.js'
 ];
 modulePromise=(async()=>{
  let lastError;
  for(const url of sources){
   try{
    const result=await Promise.race([
     import(url),
     new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tiempo de carga agotado')),3500))
    ]);
    return result;
   }catch(error){lastError=error;}
  }
  throw lastError||new Error('No se ha podido cargar Three.js');
 })().catch(error=>{modulePromise=null;throw error;});
 return modulePromise;
}
async function create(host){
 const THREE=await getThree();
 if(!host?.isConnected)throw Error('La habitación ya no está abierta');
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(32,1,.1,100);
 camera.position.set(0,2.2,8.4);camera.lookAt(0,1.65,0);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0,0);
 const canvas=renderer.domElement;canvas.className='pl-model3d-canvas';
 host.append(canvas);
 scene.add(new THREE.HemisphereLight(0xfff5dd,0x4e497a,2.1));
 const light=new THREE.DirectionalLight(0xffffff,2.6);light.position.set(-3,7,6);scene.add(light);
 const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
 const skin=mat(0xdba27e),hair=mat(0x342625),shirt=mat(0x209cbb),pants=mat(0x27365e),shoe=mat(0xf3f0e7),white=mat(0xffffff),dark=mat(0x29232b);
 const root=new THREE.Group();scene.add(root);
 const add=(parent,geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const ell=(parent,material,x,y,z,sx,sy,sz)=>{const m=add(parent,new THREE.SphereGeometry(1,18,12),material,x,y,z);m.scale.set(sx,sy,sz);return m;};
 ell(root,shirt,0,1.55,0,.59,.69,.32);
 ell(root,pants,0,.94,0,.51,.29,.32);
 const neck=ell(root,skin,0,2.16,0,.17,.2,.18);
 const head=new THREE.Group();head.position.set(0,2.4,0);root.add(head);
 ell(head,skin,0,.18,.03,.49,.58,.44);
 ell(head,hair,0,.61,-.04,.52,.27,.45);
 ell(head,hair,-.23,.64,.25,.29,.17,.22);
 ell(head,hair,.18,.66,.22,.32,.17,.24);
 ell(head,skin,-.47,.17,0,.09,.16,.13);
 ell(head,skin,.47,.17,0,.09,.16,.13);
 for(const x of [-.19,.19]){
  ell(head,white,x,.24,.432,.11,.12,.04);
  ell(head,dark,x,.24,.468,.055,.075,.027);
  ell(head,hair,x,.42,.426,.14,.038,.025);
 }
 ell(head,skin,0,.07,.46,.105,.14,.13);
 const smile=add(head,new THREE.TorusGeometry(.15,.019,6,18,Math.PI),dark,0,-.07,.453);
 smile.rotation.z=Math.PI;
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.55,1.97,0);root.add(arm);
  ell(arm,shirt,side*.045,-.27,0,.21,.39,.22);
  ell(arm,skin,side*.055,-.67,.01,.14,.16,.15);
  const leg=new THREE.Group();leg.position.set(side*.27,.85,0);root.add(leg);
  ell(leg,pants,0,-.32,0,.23,.43,.25);
  ell(leg,shoe,0,-.75,.13,.26,.15,.37);
  limbs.push({arm,leg,side});
 }
 let running=true,frame=0,observer;
 const resize=()=>{
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
 };
 resize();
 if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(host);}
 const clock=new THREE.Clock();
 function tick(){
  if(!running)return;
  frame=requestAnimationFrame(tick);
  if(document.hidden||!host.isConnected)return;
  const t=clock.getElapsedTime(),room=host.closest('#paquiLifePreview');
  const walk=room?.classList.contains('pl-walking'),sleep=room?.classList.contains('pl-action-sleep');
  const shower=room?.classList.contains('pl-action-shower'),celebrate=room?.classList.contains('pl-celebrating');
  const phase=t*(walk?8:3.1),swing=walk?.48:shower?.65:celebrate?.9:.055;
  for(const {arm,leg,side} of limbs){
   arm.rotation.x=Math.sin(phase+ (side===1?Math.PI:0))*swing;
   leg.rotation.x=walk?Math.sin(phase+(side===1?0:Math.PI))*.53:0;
   if(celebrate)arm.rotation.z=side*2.1;
   else arm.rotation.z=side*.1;
  }
  root.position.y=(walk?.06:celebrate?.22:.016)*Math.sin(phase*2);
  root.rotation.z=sleep?.17:Math.sin(t*.75)*.012;
  head.rotation.y=Math.sin(t*.55)*.12;
  // Giro tridimensional real, no reflejo especular del rostro.
  const facing=host.parentElement?.dataset.plFacing;
  root.rotation.y=walk?(facing==='left'?-0.48:.48):Math.sin(t*.3)*.12;
  renderer.render(scene,camera);
 }
 tick();
 return {destroy(){
  running=false;cancelAnimationFrame(frame);observer?.disconnect();
  scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});
  renderer.dispose();canvas.remove();
 }};
}
window.PaquilloLifeModel3D={create};
})();