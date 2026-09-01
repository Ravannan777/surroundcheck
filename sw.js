const CACHE_NAME = 'surroundcheck-v3';

// ഓഫ്‌ലൈനായി സൂക്ഷിക്കേണ്ട ഫയലുകൾ
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Install Event - കാഷിങ് പ്രക്രിയ ആരംഭിക്കുന്നു
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell & Assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - പഴയ കാഷുകൾ ക്ലീൻ ചെയ്യുന്നു
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - ഓഫ്‌ലൈൻ ആക്സസ് നൽകുന്നു (Cache-First Strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // കാഷിൽ ഉണ്ടെങ്കിൽ അത് നൽകുക, ഇല്ലെങ്കിൽ നെറ്റിൽ നിന്ന് എടുക്കുക
      return cachedResponse || fetch(event.request).catch(() => {
        // നെറ്റും ഇല്ല കാഷിലും ഇല്ലെങ്കിൽ index.html ലേക്ക് ഫാൾബാക്ക് ചെയ്യുക
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});