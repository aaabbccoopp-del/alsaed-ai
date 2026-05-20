'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — sw.js  (Service Worker)
   دعم PWA والعمل بدون إنترنت
   ═══════════════════════════════════════════════════ */

const CACHE_NAME = 'saeed-ai-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './storage.js',
  './markdown.js',
  './theme.js',
  './ui.js',
  './voice.js',
  './chat.js',
  './app.js',
  './avatar.png',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  /* لا تخزّن طلبات TTS أو AI أو خارجية */
  if (!url.origin.includes(self.location.origin)) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
