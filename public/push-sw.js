/* Service worker de AVISOS AL MÓVIL (Web Push). No guarda nada en caché: la app sigue
 * cargándose siempre de la red (así las versiones nuevas llegan al momento).
 * Solo hace dos cosas: enseñar el aviso cuando llega y abrir la app al pulsarlo. */
self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) { /* sin cachés */ }
    await self.clients.claim();
  })());
});

self.addEventListener('push', function (event) {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  const options = {
    body: d.body || '',
    icon: '/icons/icon-192.png?v=2',
    badge: '/icons/icon-192.png?v=2',
    data: { url: d.url || '/' },
    lang: 'es'
  };
  if (d.tag) { options.tag = d.tag; options.renotify = true; }
  event.waitUntil(self.registration.showNotification(d.title || 'Escuela de Tenis Marineda', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async function () {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { try { await c.focus(); } catch (e) { /* */ } return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
