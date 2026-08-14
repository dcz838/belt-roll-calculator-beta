const CACHE_NAME = "brc-beta-2026-08-13-04-06";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./VERSION.json",
  "./css/app.css?v=202608130407", "./js/app.js?v=202608130407", "./js/cloud.js?v=202608130407", "./js/core.mjs",
  "./assets/logo/brc-logo.png", "./assets/icons/icon-180.png", "./assets/icons/icon-192.png", "./assets/icons/icon-256.png", "./assets/icons/icon-512.png"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 const fresh=url.pathname.endsWith('/VERSION.json')||url.pathname.endsWith('.js')||url.pathname.endsWith('.css');
 if(event.request.mode==="navigate"||fresh){
   event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request.mode==='navigate'?"./index.html":event.request,copy))}return response}).catch(()=>event.request.mode==='navigate'?caches.match("./index.html"):caches.match(event.request)));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}return response})));
});
