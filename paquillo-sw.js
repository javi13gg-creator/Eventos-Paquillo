/* Paquillo Events · Service Worker de notificaciones */
const PAQUI_SCOPE='/Eventos-Paquillo/';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('push',event=>{
  let data={title:'Paquillo Events',body:'Hay novedades en el grupo.',url:PAQUI_SCOPE};
  try{if(event.data)data={...data,...event.data.json()};}catch(_){if(event.data)data.body=event.data.text();}
  event.waitUntil(self.registration.showNotification(data.title||'Paquillo Events',{
    body:data.body||'Hay un nuevo plan.',icon:PAQUI_SCOPE+'favicon.png',badge:PAQUI_SCOPE+'favicon.png',
    tag:data.tag||'paquillo-new-event',renotify:false,data:{url:data.url||PAQUI_SCOPE}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=new URL(event.notification.data?.url||PAQUI_SCOPE,self.location.origin).href;
  event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if('focus' in client){await client.focus();if('navigate' in client)await client.navigate(target);return;}}if(self.clients.openWindow)await self.clients.openWindow(target);})());
});
