
const CACHE_NAME="academia-classica-v96";
const APP_SHELL=[
  "./","./index.html","./manifest.webmanifest","./version.json",
  "./icon-192.png","./icon-512.png","./icon-maskable-512.png"
];
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  const isHTML=req.mode==="navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  const isVersion=url.pathname.endsWith("/version.json");
  if(isHTML || isVersion){
    event.respondWith(
      fetch(req,{cache:"no-store"})
        .then(resp=>{
          const copy=resp.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,copy));
          return resp;
        })
        .catch(()=>caches.match(req).then(r=>r || caches.match("./index.html")))
    );
  }else{
    event.respondWith(
      caches.match(req).then(cached=>cached || fetch(req).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req,copy));
        return resp;
      }))
    );
  }
});
