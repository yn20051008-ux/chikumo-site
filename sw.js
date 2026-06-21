/* Service Worker — 畜物語 */
const CACHE = 'chikumonogatari-v64';
const ASSETS = [
  './',
  './index.html',
  './chikumo.svg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // 🏝 島ぐらし（こっこの森）はオフラインでも遊べるよう先読みキャッシュ
  './mori/',
  './mori/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // ページ(HTML)はネットワーク優先 — メニュー更新や新ゲームを即反映、オフライン時のみキャッシュ
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() =>
        // オフラインで取得できないサブリソース（例：Firebase SDK）は、HTMLを代返せず
        // 空レスポンスを返す。ゲーム側は firebase 未読込を検知してランキングだけ無効化し続行する。
        caches.match('./index.html').then((idx) =>
          (req.destination === 'document') ? idx : new Response('', { status: 504, statusText: 'offline' })
        )
      );
    })
  );
});
