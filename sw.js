// ============================================
// SERVICE WORKER - NeuroAgent Hub
// Offline Support & Caching Strategy
// ============================================

const CACHE_NAME = 'neuro-agent-v1.0.0';
const RUNTIME_CACHE = 'neuro-agent-runtime-v1';
const API_CACHE = 'neuro-agent-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231a1a2e" width="192" height="192"/><text x="96" y="110" font-size="140" fill="%2300d4ff" text-anchor="middle" font-weight="bold">🤖</text></svg>'
];

// ============================================
// 1. INSTALLATION EVENT
// ============================================

self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Installation error:', error);
      })
  );
});

// ============================================
// 2. ACTIVATION EVENT
// ============================================

self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== API_CACHE) {
              console.log(`🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================
// 3. FETCH EVENT - CACHING STRATEGY
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.origin !== location.origin) {
    return;
  }

  // ============ STRATEGY 1: STATIC ASSETS ============
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            console.log(`✅ Cache hit: ${url.pathname}`);
            return response;
          }

          return fetch(request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }

              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              console.log(`⚠️ Offline - serving cached: ${url.pathname}`);
              return caches.match(request)
                .then((response) => {
                  if (response) return response;
                  return offlineFallback();
                });
            });
        })
    );
  }

  // ============ STRATEGY 2: API REQUESTS ============
  else if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(API_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          console.log(`⚠️ API offline: ${url.pathname}`);
          
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              
              // Return offline API response
              return new Response(
                JSON.stringify({
                  offline: true,
                  message: 'Sie sind offline. Einige Funktionen sind begrenzt.',
                  cached: false,
                  timestamp: new Date().toISOString()
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
  }

  // ============ STRATEGY 3: NETWORK FIRST ============
  else {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              if (response) {
                console.log(`✅ Fallback cache: ${url.pathname}`);
                return response;
              }
              return offlineFallback();
            });
        })
    );
  }
});

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function isStaticAsset(url) {
  const path = url.pathname;
  const ext = path.split('.').pop().toLowerCase();
  
  const staticExtensions = ['html', 'css', 'js', 'json', 'svg', 'png', 'jpg', 'gif', 'woff', 'woff2'];
  
  return staticExtensions.includes(ext) || 
         path === '/' ||
         path === '/index.html';
}

function offlineFallback() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - NeuroAgent Hub</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
          color: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1rem;
        }
        .container {
          text-align: center;
          background: rgba(42, 42, 78, 0.6);
          border: 2px solid #00d4ff;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
        }
        h1 {
          color: #00d4ff;
          margin-bottom: 1rem;
          font-size: 2rem;
        }
        p {
          color: rgba(224, 224, 224, 0.8);
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        .emoji {
          font-size: 4rem;
          margin: 1rem 0;
        }
        .status {
          background: rgba(0, 212, 255, 0.1);
          border-left: 3px solid #00d4ff;
          padding: 1rem;
          margin: 1.5rem 0;
          border-radius: 6px;
          text-align: left;
        }
        .status strong {
          color: #ff0055;
        }
        button {
          background: linear-gradient(90deg, #00d4ff 0%, #00a8cc 100%);
          color: #1a1a2e;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0, 212, 255, 0.5);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">📡</div>
        <h1>Offline Modus</h1>
        <p>Du bist derzeit offline. NeuroAgent Hub ist im Offline-Modus verfügbar.</p>
        
        <div class="status">
          <strong>Verfügbare Funktionen:</strong>
          <ul style="text-align: left; margin-top: 0.5rem;">
            <li>✅ Gecachte Seiten</li>
            <li>✅ Lokal gespeicherte Daten</li>
            <li>✅ Offline Interface</li>
            <li>❌ Live API Requests (wenn nicht gecacht)</li>
          </ul>
        </div>

        <p>Warte auf Internetverbindung oder versuche es erneut.</p>
        <button onclick="window.location.reload()">🔄 Neu laden</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}

// ============================================
// 5. MESSAGE HANDLING
// ============================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
      console.log('🗑️ All caches cleared');
    });
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    let cacheSize = 0;
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.open(cacheName).then((cache) => {
          cache.keys().then((requests) => {
            cacheSize += requests.length;
            event.ports[0].postMessage({ cacheSize });
          });
        });
      });
    });
  }
});

// ============================================
// 6. BACKGROUND SYNC (Optional)
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Sync pending requests when back online
      Promise.resolve()
        .then(() => {
          console.log('🔄 Syncing data...');
        })
        .catch((error) => {
          console.error('Sync error:', error);
        })
    );
  }
});

// ============================================
// 7. PUSH NOTIFICATIONS (Optional)
// ============================================

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'NeuroAgent Hub Update',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231a1a2e" width="192" height="192"/><text x="96" y="110" font-size="140" fill="%2300d4ff" text-anchor="middle" font-weight="bold">🤖</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%2300d4ff" width="192" height="192"/><text x="96" y="110" font-size="140" fill="%231a1a2e" text-anchor="middle" font-weight="bold">🤖</text></svg>',
    vibrate: [100, 50, 100],
    tag: 'neuro-agent-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('NeuroAgent Hub', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// ============================================
// 8. LOGGING & DEBUG
// ============================================

console.log('🤖 NeuroAgent Hub Service Worker loaded');
console.log(`Cache Strategy: Hybrid (Static/API/Network)`);
console.log(`Offline Support: Enabled ✅`);
console.log(`Push Notifications: Available`);
console.log(`Background Sync: Available`);
