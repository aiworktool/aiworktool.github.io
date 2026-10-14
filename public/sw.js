const VERSION = 'app-shell-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!shouldHandle(event.request, url)) return;
  if (isDocument(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

function shouldHandle(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (request.method !== 'GET') return false;
  if (url.pathname.startsWith('/models/')) return false;
  if (url.pathname.startsWith('/assets/')) return false;
  if (url.pathname === '/sw.js') return false;
  if (isDocument(request)) return true;
  const dest = request.destination;
  return dest === 'script'
    || dest === 'style'
    || dest === 'worker'
    || url.pathname.startsWith('/ort/')
    || url.pathname.endsWith('.wasm');
}

function isDocument(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

async function dropOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('app-shell-') && key !== VERSION)
      .map((key) => caches.delete(key)),
  );
}

function remember(request, response) {
  if (!response.ok) return;
  const copy = response.clone();
  void caches.open(VERSION).then((cache) => cache.put(request, copy));
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    remember(request, response);
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  remember(request, response);
  return response;
}
