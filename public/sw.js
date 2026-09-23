/* Service worker "interruptor de apagado".
 *
 * La app tuvo un service worker (VitePWA) que se retiró, pero los móviles que lo instalaron
 * seguían cargando la versión antigua desde su caché y no podían actualizarse porque /sw.js
 * ya no existía (devolvía HTML). Este archivo ocupa esa misma ruta: al detectarlo, el
 * navegador lo instala, borra todas las cachés, se da de baja a sí mismo y recarga la app
 * (conservando la URL completa, incluido el #token de "recuperar contraseña").
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) { /* sin cachés */ }
    try { await self.registration.unregister(); } catch (e) { /* ya dado de baja */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(function (c) { if (c.navigate) c.navigate(c.url); });
    } catch (e) { /* sin ventanas abiertas */ }
  })());
});

// Mientras esté activo no intercepta nada: todo va a la red.
self.addEventListener('fetch', function () {});
