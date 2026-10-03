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

  const action = e.action || 'open';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if (action === 'open') return client.focus();
        }
      }
      return self.clients.openWindow('./index.html');
    })
  );
});

// --- Programacion diaria a las 22:30 ---
let timerId = null;

const NOTIFY_DB_NAME = 'miagenda-notify-db';
const NOTIFY_STORE_NAME = 'snapshots';

function openNotificationDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFY_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTIFY_STORE_NAME)) {
        db.createObjectStore(NOTIFY_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir la base de datos de notificaciones'));
  });
}

async function readNotificationSummary() {
  try {
    const db = await openNotificationDb();
    const tx = db.transaction(NOTIFY_STORE_NAME, 'readonly');
    const request = tx.objectStore(NOTIFY_STORE_NAME).get('tomorrow-summary');

    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('No se pudo leer el resumen'));
    });
  } catch (e) {
    console.warn('Service Worker: no se pudo leer el resumen de mañana.', e);
    return null;
  }
}

// PRUEBA TEMPORAL: cambiar a las 00:49 para verificar la notificación.
const TEST_HOUR = 0;
const TEST_MINUTE = 54;

function msUntilNext2230() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), TEST_HOUR, TEST_MINUTE, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

async function showDailyReminder() {
  const snapshot = await readNotificationSummary();
  const title = snapshot && snapshot.title ? snapshot.title : '💬 Mi Agenda';
  const body = snapshot && snapshot.body ? snapshot.body : 'Abre la app y revisa tus tareas de mañana.';

  await self.registration.showNotification(title, {
    body: body.length > 180 ? body.slice(0, 177) + '...' : body,
    icon: 'images/icon3.png',
    badge: 'images/icon3.png',
    tag: 'aviso-2230',
    requireInteraction: true,
    renotify: true,
    vibrate: [70, 50, 70],
    actions: [{ action: 'open', title: 'Abrir app' }]
  });
}

function scheduleDaily2230() {
  if (timerId) clearTimeout(timerId);
  timerId = setTimeout(async () => {
    await showDailyReminder();
    scheduleDaily2230();
  }, msUntilNext2230());
}

self.addEventListener('message', (e) => {
  if (e.data === 'scheduleDaily') scheduleDaily2230();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim().then(scheduleDaily2230));
});