// Service Worker Sencillo
self.addEventListener('install', (e) => {
    console.log('Service Worker instalado');
  });
  
  self.addEventListener('fetch', (e) => {
    // Permite que la app cargue el contenido normalmente
    e.respondWith(fetch(e.request));
  });

// Al pulsar la notificacion, abrir/focalizar la app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('./index.html');
    })
  );
});

// --- Programacion diaria a las 22:30 ---
let timerId = null;

function msUntilNext2230() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 20, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

function scheduleDaily2230() {
  if (timerId) clearTimeout(timerId);
  timerId = setTimeout(async () => {
    await self.registration.showNotification('Mi Agenda', {
      body: 'Abre la app para ver tus tareas de mañana.',
      icon: 'images/icon3.png',
      badge: 'images/icon3.png',
      tag: 'aviso-2230'
    });
    scheduleDaily2230();
  }, msUntilNext2230());
}

self.addEventListener('message', (e) => {
  if (e.data === 'scheduleDaily') scheduleDaily2230();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim().then(scheduleDaily2230));
});