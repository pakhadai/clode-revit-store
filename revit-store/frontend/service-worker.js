/**
 * Service Worker для OhMyRevit PWA
 * Забезпечує офлайн функціональність та кешування
 */

const CACHE_NAME = 'ohmyrevit-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/core/api.js',
  '/js/core/utils.js',
  '/js/modules/auth.js',
  '/js/modules/products.js',
  '/js/modules/cart.js',
  '/js/modules/bonuses.js',
  '/js/modules/subscriptions.js',
  '/js/components/wheel-of-fortune.js',
  '/assets/locales/en.json',
  '/assets/locales/uk.json',
  '/assets/locales/ru.json'
  // Рядки з іконками видалено, щоб уникнути помилки 404
  // '/assets/icons/icon-192x192.png',
  // '/assets/icons/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Використовуємо індивідуальні запити, щоб ігнорувати помилки для некритичних файлів
        const cachePromises = urlsToCache.map(urlToCache => {
            return fetch(new Request(urlToCache, {cache: 'reload'}))
                .then(response => {
                    if (response.ok) {
                        return cache.put(urlToCache, response);
                    }
                    console.warn(`Failed to fetch and cache ${urlToCache}`);
                    return Promise.resolve(); // Продовжуємо, навіть якщо один файл не знайдено
                }).catch(err => {
                    console.error(`Fetch error for ${urlToCache}:`, err);
                });
        });
        return Promise.all(cachePromises);
      })
      .then(() => self.skipWaiting())
  );
});

// Активація Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехоплення запитів
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Стратегія кешування
  if (url.origin === location.origin) {
    // Для статичних ресурсів - cache first
    if (request.url.includes('/assets/') ||
        request.url.includes('/css/') ||
        request.url.includes('/js/')) {
      event.respondWith(cacheFirst(request));
    }
    // Для API запитів - network first
    else if (request.url.includes('/api/')) {
      event.respondWith(networkFirst(request));
    }
    // Для HTML - network first з fallback
    else {
      event.respondWith(networkFirstWithFallback(request));
    }
  }
});

// Стратегія Cache First
async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached || fetch(request).then(response => {
    if (response.ok) {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      });
    }
    return response;
  });
}

// Стратегія Network First
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // --- ВИПРАВЛЕННЯ: Кешуємо тільки успішні GET-запити ---
    if (request.method === 'GET' && response && response.ok) {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone); // Цей рядок більше не буде викликати помилку для POST
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response(
      JSON.stringify({ error: 'Офлайн режим' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Стратегія Network First з Fallback сторінкою
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Повертаємо офлайн сторінку
    return caches.match('/index.html');
  }
}

// Push сповіщення
self.addEventListener('push', event => {
  console.log('Push received:', event);

  let data = {
    title: 'OhMyRevit',
    body: 'Нове сповіщення',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/assets/icons/icon-192x192.png',
    badge: data.badge || '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Обробка кліку на сповіщення
self.addEventListener('notificationclick', event => {
  console.log('Notification click:', event);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Якщо є відкрите вікно - фокусуємо на ньому
        for (let client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Інакше відкриваємо нове
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});

// Синхронізація в фоні
self.addEventListener('sync', event => {
  console.log('Background sync:', event);

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  try {
    // Синхронізація незавершених замовлень
    const response = await fetch('/api/orders/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('Orders synced successfully');
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Періодична синхронізація
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  console.log('Updating content in background...');

  try {
    // Оновлюємо кеш з важливими даними
    const cache = await caches.open(CACHE_NAME);

    const updates = [
      '/api/products/featured/home',
      '/api/bonuses/available',
      '/assets/locales/uk.json',
      '/assets/locales/en.json',
      '/assets/locales/ru.json'
    ];

    await Promise.all(
      updates.map(url =>
        fetch(url).then(response => {
          if (response.ok) {
            cache.put(url, response);
          }
        })
      )
    );

    console.log('Content updated successfully');
  } catch (error) {
    console.error('Update failed:', error);
  }
}