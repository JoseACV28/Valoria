// Only the public application shell is cached. API responses and uploaded media are excluded.
const CACHE='valoria-shell-__BUILD__';
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const response=await fetch('/offline-assets.json',{cache:'no-store'});
  if(!response.ok)throw new Error('No offline manifest');
  const files=await response.json();
  const cache=await caches.open(CACHE);
  await cache.addAll(['/',...files]);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const previous=(await caches.keys()).filter(name=>name.startsWith('valoria-shell-')&&name!==CACHE);
  for(const name of previous.slice(0,-1))await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(async()=>{const cache=await caches.open(CACHE);return cache.match('/');}));
  else if(url.pathname.startsWith('/assets/'))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
