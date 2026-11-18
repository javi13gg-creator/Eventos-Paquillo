/* Navegación móvil Paquillo Events · no duplica handlers existentes. */
(()=>{
 'use strict';
 const topNav=document.getElementById('tabs');
 const bottom=document.getElementById('paquiMobileNav');
 const searchToggle=document.getElementById('paquiSearchToggle');
 const search=document.getElementById('globalSearch');
 const menuToggle=document.getElementById('menuToggle');
 const menuPanel=document.getElementById('menuPanel');
 const menuBackdrop=document.getElementById('menuBackdrop');
 if(!topNav||!bottom||!menuToggle)return;
 let mainView='home';
 let activeTab=location.hash.slice(1)||'proximos';
 const delay=fn=>setTimeout(fn,0);
 function closeSearch(){
  topNav.classList.remove('paqui-search-open');
  searchToggle?.setAttribute('aria-expanded','false');
  const results=document.getElementById('globalSearchResults');if(results)results.hidden=true;
 }
 function closeMenu(){
  if(menuPanel)menuPanel.hidden=true;
  if(menuBackdrop)menuBackdrop.hidden=true;
  menuToggle.setAttribute('aria-expanded','false');
  document.body.classList.remove('paqui-menu-open');
 }
 function menuState(){
  const open=!!menuPanel&&!menuPanel.hidden;
  document.body.classList.toggle('paqui-menu-open',open);
  if(open){closeSearch();document.getElementById('settingsPanel')?.setAttribute('hidden','');}
 }
 function sync(tab){
  if(!tab||!document.getElementById('p-'+tab))tab='proximos';
  activeTab=tab;
  if(tab!=='world')closeMenu();
  else{closeMenu();closeSearch();}
  let active=tab==='proximos'?mainView:tab==='votaciones'?'polls':tab==='world'?'world':'more';
  for(const btn of bottom.querySelectorAll('[data-mobile-destination]')){
   const current=btn.dataset.mobileDestination===active;
   btn.classList.toggle('active',current);
   if(current)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  }
 }
 function clickOriginal(tab){
  const original=topNav.querySelector('[data-t="'+tab+'"]');
  if(original)original.click();
  else if(typeof window.showTab==='function')window.showTab(tab);
 }
 function goHome(){
  mainView='home';
  clickOriginal('proximos');
  sync('proximos');
  window.scrollTo({top:0,behavior:'instant'});
 }
 function goPlans(){
  mainView='plans';
  clickOriginal('proximos');
  sync('proximos');
  const target=document.getElementById('paquiPlansAnchor');
  if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),70);
 }
 bottom.addEventListener('click',event=>{
  const button=event.target.closest('[data-mobile-destination]');
  if(!button)return;
  const action=button.dataset.mobileDestination;
  if(action==='home'){goHome();}
  else if(action==='plans'){goPlans();}
  else if(action==='polls'){clickOriginal('votaciones');sync('votaciones');window.scrollTo({top:0,behavior:'instant'});}
  else if(action==='world'){clickOriginal('world');sync('world');}
  else if(action==='more'){menuToggle.click();menuState();}
 });
 searchToggle?.addEventListener('click',()=>{
  const opening=!topNav.classList.contains('paqui-search-open');
  if(opening)closeMenu();
  topNav.classList.toggle('paqui-search-open',opening);
  searchToggle.setAttribute('aria-expanded',String(opening));
  if(opening)requestAnimationFrame(()=>search?.focus());
 });
 document.addEventListener('click',e=>{
  if(topNav.classList.contains('paqui-search-open')&&!e.target.closest('#paquiSearchToggle, #tabs .global-search'))closeSearch();
  if(e.target.closest('#menuToggle,#menuClose,#menuBackdrop'))delay(menuState);
  if(e.target.closest('#tabs [data-t]')){closeSearch();delay(()=>sync(location.hash.slice(1)||'proximos'));}
  if(e.target.closest('#tabs #settingsToggle,#tabs #newsBell'))closeSearch();
  if(e.target.closest('#paquiMyProfileBtn')){closeSearch();clickOriginal('perfil');sync('perfil');}
  if(e.target.closest('#paquiInstallFromMenu')){
   const original=document.getElementById('installAppButton');
   if(original&&!original.hidden)original.click();
   else{closeMenu();clickOriginal('ayuda');sync('ayuda');}
  }
 });
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(topNav.classList.contains('paqui-search-open')){closeSearch();searchToggle?.focus();}
  else if(menuPanel&&!menuPanel.hidden){closeMenu();}
 });
 // The original showTab function handles all modules. This sync hook handles programmatic changes.
 window.PaquilloMobileNav={sync,closeSearch,closeMenu};
 window.addEventListener('hashchange',()=>delay(()=>sync(location.hash.slice(1)||'proximos')));
 sync(activeTab);
})();