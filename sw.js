/* Service Worker — 畜物語
   低帯域(通信の悪い場所)でも遊べるよう、一度開いたものは極力ネットワークを使わず出す。
   ・HTML   = stale-while-revalidate（キャッシュを即返す→裏で更新。次回最新）
   ・静的資産 = cache-first（あれば即返す。無ければ取得して保存）
   ・外部資産(Firebase/Googleフォント) もキャッシュ対象に含める（opaqueも保存）
   ・メッセージ PRECACHE_ALL で全ゲームを一括ダウンロード（オフライン保存ボタン用） */
const CACHE = 'chikumonogatari-v97';
const SHELL = [
  './',
  './index.html',
  './chikumo.svg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// 全ゲームが使う共有SDK。最初に入れておけば、以後どのゲームも回線に関係なく即ランキング接続できる
const SHELL_EXT = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 1つ失敗しても install 全体を止めない（取りこぼし対策）
      .then((c) => Promise.all([
        ...SHELL.map((u) => c.add(u).catch(() => null)),
        ...SHELL_EXT.map((u) => {
          const req = new Request(u, { mode: 'no-cors' });
          return fetch(req)
            .then((res) => { if (cacheable(res)) return c.put(req, res); })
            .catch(() => null);
        })
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 保存してよいレスポンスか（同一オリジンは200のみ、外部はopaque/200を許可）
function cacheable(res) {
  if (!res) return false;
  if (res.type === 'opaque') return true;          // 外部(no-cors): 中身は見えないが保存可
  return res.status === 200;
}

function isHTML(req) {
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // ── HTML: stale-while-revalidate（即キャッシュ→裏で更新。低帯域で待たせない）
  if (isHTML(req)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req).then((res) => {
          if (cacheable(res)) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        }).catch(() => cached || caches.match('./index.html'));
        return cached || net;     // キャッシュがあれば即返し、更新は裏で
      })
    );
    return;
  }

  // ── それ以外(JS/CSS/画像/フォント/Firebase): cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (cacheable(res)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      // HTMLを返すとJSとして実行されて壊れるため、素直に失敗を返す（呼び出し側のonerror再試行に任せる）
      }).catch(() => new Response('', { status: 504, statusText: 'offline' }));
    })
  );
});

// ── オフライン保存: ページから渡されたURL群をまとめてキャッシュし、進捗を返す
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'PRECACHE_ALL' || !Array.isArray(data.urls)) return;
  const src = event.source;
  const urls = data.urls;
  let done = 0;
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(urls.map((u) => {
        const external = /^https?:\/\//.test(u) && u.indexOf(self.location.origin) !== 0;
        const req = new Request(u, external ? { mode: 'no-cors' } : {});
        return fetch(req)
          .then((res) => { if (cacheable(res)) return c.put(req, res.clone()); })
          .catch(() => null)
          .then(() => {
            done++;
            if (src) src.postMessage({ type: 'PRECACHE_PROGRESS', done, total: urls.length });
          });
      })).then(() => {
        if (src) src.postMessage({ type: 'PRECACHE_DONE', total: urls.length });
      })
    )
  );
});
