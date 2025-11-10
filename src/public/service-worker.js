// Service Worker untuk PWA - Handle Push Notification + Offline Support

const CACHE_NAME = 'story-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/styles.css',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((error) => {
      console.warn('Cache addAll error:', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Network first strategy untuk API calls
  if (request.url.includes('/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback ke cache jika offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page jika ada
            return caches.match('/index.html');
          });
        })
    );
  } else {
    // Cache first strategy untuk assets (CSS, JS, images)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // Fallback untuk requests yang gagal
        if (request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification diterima:', event);

  let notificationData = {
    title: 'Story App Notification',
    options: {
      body: 'Anda menerima notifikasi baru',
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Story App Notification',
        options: {
          body: data.options?.body || 'Anda menerima notifikasi baru',
          icon: '/images/icon-192x192.png',
          badge: '/images/badge-72x72.png',
          data: data.options?.data || {}
        }
      };
    } catch (error) {
      notificationData.options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData.options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Cek apakah window aplikasi sudah terbuka
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika belum terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
