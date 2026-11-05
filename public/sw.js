/* MarketPulse service worker: app-shell cache + notification actions (Snooze 1h / Done). */
const CACHE = 'mp-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }))
  );
});

// Web push payload: { id, title, body, url }
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { title: 'MarketPulse', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'MarketPulse', {
    body: d.body, tag: d.id, icon: '/icon.svg', data: d,
    actions: [{ action: 'snooze1h', title: 'Snooze 1h' }, { action: 'done', title: 'Done' }],
  }));
});
self.addEventListener('notificationclick', (e) => {
  const d = e.notification.data || {};
  e.notification.close();
  const url = d.url || '/reminders';
  const q = e.action ? `?action=${e.action}&rid=${encodeURIComponent(d.id || '')}` : '';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => {
    for (const c of cs) { if ('focus' in c) { c.navigate(url + q); return c.focus(); } }
    return self.clients.openWindow(url + q);
  }));
});
