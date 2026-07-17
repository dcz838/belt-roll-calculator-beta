const CACHE_NAME='brc-web-2-2-beta-20260716-02';
const ASSETS=['./','./index.html','./manifest.webmanifest','./VERSION.json','./css/app.css','./js/app.js','./assets/logo/brc-logo.png','./assets/icons/icon-180.png','./assets/icons/icon-192.png','./assets/icons/icon-256.png','./assets/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
