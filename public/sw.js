const CACHE_NAME = 'ad-suzano-sub7-v1.0.12';
const APP_SHELL = ['./', './manifest.webmanifest', './ad-suzano-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./'))),
  );
});

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Agenda Sub-7 atualizada',
    body: 'Confira a programacao da semana e o jogo contra o Chute Futsal.',
    url: './',
  };
  const data = event.data ? event.data.json() : fallback;

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: './ad-suzano-logo.png',
      badge: './ad-suzano-logo.png',
      data: { url: data.url || fallback.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const client = clientList.find((item) => item.url.includes(self.registration.scope));
      if (client) return client.focus();
      return clients.openWindow(url);
    }),
  );
});
