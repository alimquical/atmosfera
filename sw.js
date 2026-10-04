/* ============================================================
   Service Worker — Atmósfera Financiera del Hogar
   Cache-first para el shell completo: la app funciona offline.
   ============================================================ */
const VERSION = 'atmosfera-v1.0.0';
const CACHE = VERSION + '-shell';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/util.js',
  './assets/js/engine.js',
  './assets/js/stats.js',
  './assets/js/store.js',
  './assets/js/agent.js',
  './assets/js/docs.js',
  './assets/js/app-core.js',
  './assets/js/vistas-panel.js',
  './assets/js/vistas-plan.js',
  './assets/js/vistas-mov.js',
  './assets/js/vistas-analisis.js',
  './assets/js/vistas-gestion.js',
  './assets/js/app-modales.js',
  './assets/js/cloud.js',
  './assets/js/auth.js',
  './assets/lib/xlsx.full.min.js',
  './assets/lib/jspdf.umd.min.js',
  './assets/lib/chart.umd.js',
  './iconos/icon-192.png',
  './iconos/icon-512.png',
  './iconos/icon-maskable-512.png',
  './iconos/apple-touch-icon.png',
  './iconos/favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k.indexOf('atmosfera-') === 0).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Navegaciones: siempre el shell (la app es una SPA)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copia));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto: cache-first con actualización en segundo plano
  e.respondWith(
    caches.match(req).then((hit) => {
      const red = fetch(req).then((r) => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
