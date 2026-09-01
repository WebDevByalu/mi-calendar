// Service Worker Sencillo
self.addEventListener('install', (e) => {
    console.log('Service Worker instalado');
  });
  
  self.addEventListener('fetch', (e) => {
    // Permite que la app cargue el contenido normalmente
    e.respondWith(fetch(e.request));
  });