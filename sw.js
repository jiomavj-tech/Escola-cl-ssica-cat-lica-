/* Service worker da Academia Clássica Católica.
   Estratégia: cache-first para os arquivos próprios do app.
   Para publicar uma versão nova, altere CACHE abaixo — o navegador
   descarta o cache antigo e busca os arquivos atualizados. */
const CACHE = 'acc-v80-1';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './icone-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request).then(rede => {
      const copia = rede.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
      return rede;
    }).catch(() => caches.match('./index.html')))
  );
});
