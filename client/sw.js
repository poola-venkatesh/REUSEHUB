const CACHE_NAME = 'reusehub-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/css/styles.css',
  '/images/logo.png',
  '/images/logo.jpg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/js/api.js',
  '/js/app.js',
  '/js/components/navbar.js',
  '/js/components/home.js',
  '/js/components/explore.js',
  '/js/components/map.js',
  '/js/components/listingDetails.js',
  '/js/components/postItem.js',
  '/js/components/smartMatchModal.js',
  '/js/components/authModal.js',
  '/js/components/dashboard.js',
  '/js/components/transactionView.js',
  '/js/components/adminDashboard.js',
  '/js/components/impactModal.js'
];

// Install: Pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some assets failed to precache during sw install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET requests (POST, PUT, DELETE) pass directly to network
  if (request.method !== 'GET') {
    return;
  }

  // API calls: Network-First with offline JSON fallback
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response(
            JSON.stringify({ success: false, error: 'Offline mode: You are currently disconnected.' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
    );
    return;
  }

  // Static Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If offline and requesting navigation, return index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
