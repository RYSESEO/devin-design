const CACHE = 'ryse-dash-v2';
const ASSETS = ['./', 'index.html', 'app.js', 'connectors.js', 'toolkit.js', 'intelligence.js', 'ecosystem.js', 'content-hub.js', 'social-dashboard.js', 'cross-post.js', 'onboarding.js', 'cinematic.js', 'styles.css'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
