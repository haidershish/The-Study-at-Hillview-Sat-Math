const CACHE = 'sat-math-lab-v3';
const DESMOS_ORIGIN = 'https://www.desmos.com';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Never intercept or cache the official Desmos API script (or any Desmos
  // asset). Its URL embeds the API key, and the script is Desmos proprietary
  // software that must not be self-hosted or cached.
  const url = new URL(event.request.url);
  if (url.origin === DESMOS_ORIGIN) return;

  // Navigation: network-first with an offline fallback to the cached shell, so
  // a newly deployed release is always served and old releases never pin.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // Same-origin assets: cache-first for offline use, but only for our own origin.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
