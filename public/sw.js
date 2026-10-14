const VERSION = 'app-shell-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('app-shell-') && key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/models/')) return;
  if (url.pathname === '/sw.js') return;
  const dest = event.request.destination;
  const cacheable =
    dest === 'document' ||
    dest === 'script' ||
    dest === 'style' ||
    dest === 'worker' ||
    url.pathname.startsWith('/ort/') ||
    url.pathname.endsWith('.wasm');
  if (!cacheable) return;
  event.respondWith(fromCache(event.request));
});

async function fromCache(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
