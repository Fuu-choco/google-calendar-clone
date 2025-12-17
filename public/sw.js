// Service Worker for PWA - Complete Offline Support
const CACHE_NAME = 'calendar-clone-v2';
const RUNTIME_CACHE = 'runtime-cache-v2';

// インストール時: 即座にアクティブ化
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  // 新しいService Workerを即座にアクティブ化
  self.skipWaiting();
});

// アクティベーション時: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated and claiming clients');
      // 現在のページで即座にService Workerを有効化
      return self.clients.claim();
    })
  );
});

// フェッチ時: スマートなキャッシュ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 外部APIリクエスト（OpenAI等）はキャッシュしない
  if (url.origin !== location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // APIルート（/api/*）はネットワーク優先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'オフラインです' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // ナビゲーションリクエスト（HTMLページ）: ネットワーク優先、失敗時はキャッシュ
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功したらキャッシュに保存
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュから返す
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // キャッシュもない場合はルートページを返す
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 静的アセット（JS、CSS、画像等）: キャッシュ優先
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // キャッシュがあればそれを返し、バックグラウンドで更新
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, response);
            });
          }
        }).catch(() => {
          // ネットワークエラーは無視
        });
        return cachedResponse;
      }

      // キャッシュがなければネットワークから取得
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        // 成功したらキャッシュに保存
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  }
});

async function syncEvents() {
  // TODO: オフライン時に保存したイベントをSupabaseと同期
  console.log('[SW] Syncing events...');
}

// プッシュ通知の受信（将来の拡張用）
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'イベントの通知です',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Calendar Clone', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
