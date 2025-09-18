// QAAQ Connect Service Worker
// Version: 1.0.0

const CACHE_NAME = 'qaaq-connect-v1.0.0';
const STATIC_CACHE_NAME = 'qaaq-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'qaaq-dynamic-v1.0.0';

// Define what to cache
const STATIC_ASSETS = [
  '/',
  '/rfq',
  '/qaaq-logo.png',
  '/favicon.ico',
  '/favicon.png',
  '/manifest.json'
];

// API endpoints that should use network-first strategy
const API_ROUTES = [
  '/api/rfq',
  '/api/auth',
  '/api/user'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Force activation
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // API requests - Network first with cache fallback
    if (API_ROUTES.some(route => pathname.startsWith(route))) {
      return await networkFirstStrategy(request);
    }
    
    // Static assets - Cache first
    if (isStaticAsset(pathname)) {
      return await cacheFirstStrategy(request);
    }
    
    // HTML pages - Stale while revalidate
    if (isHTMLRequest(request)) {
      return await staleWhileRevalidateStrategy(request);
    }
    
    // Default - Network first
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('[SW] Error handling request:', error);
    return await handleOfflineFallback(request);
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
      console.log('[SW] Cached new static asset:', request.url);
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    throw error;
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses for offline access
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
      console.log('[SW] Cached API response:', request.url);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving stale API response from cache:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy for HTML pages
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Always try to fetch fresh content in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE_NAME);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(error => {
      console.log('[SW] Background fetch failed:', error);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving from cache (updating in background):', request.url);
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return fetchPromise;
}

// Offline fallback handling
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Try to serve cached version
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // For HTML requests, try to serve cached homepage
  if (isHTMLRequest(request)) {
    const homepageCache = await caches.match('/');
    if (homepageCache) {
      return homepageCache;
    }
  }
  
  // Return a basic offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This request requires an internet connection',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Helper functions
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname.includes('/static/') || 
         pathname.includes('/assets/');
}

function isHTMLRequest(request) {
  const acceptHeader = request.headers.get('Accept') || '';
  return acceptHeader.includes('text/html');
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'rfq-sync') {
    event.waitUntil(syncOfflineRFQs());
  }
});

async function syncOfflineRFQs() {
  try {
    // This would sync any offline RFQ submissions
    // Implementation depends on your offline storage strategy
    console.log('[SW] Syncing offline RFQs...');
    
    // Example: Retrieve from IndexedDB and POST to server
    // const offlineData = await getOfflineData();
    // for (const item of offlineData) {
    //   await fetch('/api/rfq', { method: 'POST', body: JSON.stringify(item) });
    // }
    
    console.log('[SW] Offline RFQ sync completed');
  } catch (error) {
    console.error('[SW] Offline sync failed:', error);
  }
}

// Handle push notifications (if needed)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New maritime RFQ available',
    icon: '/qaaq-logo.png',
    badge: '/qaaq-logo.png',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View RFQ'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('QAAQ Connect', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/rfq')
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', event => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service worker script loaded successfully');