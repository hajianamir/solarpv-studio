// SolarPV Studio Offline Service Worker (OFF-03)
// Implements app-shell caching, asset versioning, and offline capability

// vite.config.ts replaces these build placeholders with a manifest-derived,
// content-versioned cache name and every emitted application asset.
const CACHE_NAME = 'solarpv-studio-build-placeholder';
const STATIC_ASSETS = [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Do not activate a partially cached worker. An update waits for every
    // controlled old-version tab to close: those tabs may still need their old
    // lazy chunks and may contain unsaved work. There is deliberately no
    // skipWaiting() or automatic reload here.
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // The lifecycle only activates an update after old controlled clients close.
  // At that point its prior application caches can be retired safely.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('solarpv-studio-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Provider/API results are never silently replaced by an old cached result.
  if (
    url.hostname.includes('nasa.gov') ||
    url.hostname.includes('europa.eu') ||
    url.hostname.includes('isric.org') ||
    url.hostname.includes('openstreetmap.org') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith((async () => {
    // Look only in this worker's cache, not caches.match() across waiting
    // versions. In particular, never revalidate the old shell into the old
    // cache while a different build is being installed: that would mix versions
    // and strand old tabs when they request an unvisited lazy chunk offline.
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, {
      ignoreSearch: url.origin === self.location.origin && STATIC_ASSETS.includes(url.pathname),
    });
    if (cached) return cached;
    if (url.origin === self.location.origin && event.request.mode === 'navigate') {
      const shell = await cache.match('/index.html');
      if (shell) return shell;
    }
    const response = await fetch(event.request);
    if (response.ok) {
      try {
        await cache.put(event.request, response.clone());
      } catch (error) {
        // A cache quota error must not hide an otherwise valid network response.
        console.warn('[SW] Unable to cache runtime resource:', error);
      }
    }
    return response;
  })());
});
