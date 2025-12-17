/**
 * Service Worker Registration
 * PWA機能を有効化するためのService Worker登録処理
 */

export function registerServiceWorker() {
  // Service Workerがサポートされているか確認
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker is not supported in this browser');
    return;
  }

  // Service Workerを登録可能な環境かチェック
  const isProduction = process.env.NODE_ENV === 'production';
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost';
  const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.hostname);

  // 開発環境では常に登録（オフラインテスト用）
  // 本番環境ではHTTPS必須
  if (isProduction && !isHTTPS && !isLocalhost && !isLocalIP) {
    console.log('[PWA] Service Worker requires HTTPS in production');
    return;
  }

  console.log('[PWA] Registering Service Worker...');

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered successfully:', registration.scope);

      // 更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] New Service Worker found, installing...');

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新しいService Workerがインストールされた
            console.log('[PWA] New content available, please refresh');

            // ユーザーに更新を通知（オプション）
            if (window.confirm('新しいバージョンが利用可能です。更新しますか？')) {
              window.location.reload();
            }
          }
        });
      });

      // 定期的に更新をチェック
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // 1時間ごと

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });
}

// Service Workerの登録解除（デバッグ用）
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[PWA] Service Worker unregistered');
    }
  }
}

// インストール可能かチェック
export function checkInstallability() {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのインストールプロンプトを防ぐ
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] App is installable');

    // カスタムインストールボタンを表示するイベントを発火
    window.dispatchEvent(new Event('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
  });

  return deferredPrompt;
}
