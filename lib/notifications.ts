// 通知機能のヘルパーライブラリ

import { CalendarEvent } from './types';
import { AppNotification } from './types/notification';
import { parseISO, differenceInMinutes, format } from 'date-fns';
import { ja } from 'date-fns/locale';

// ブラウザ環境の診断情報を取得
export function getNotificationDiagnostics() {
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasNotificationAPI = 'Notification' in window;
  const userAgent = navigator.userAgent;

  // ブラウザの種類を判定
  let browserType = 'Unknown';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    browserType = 'iOS Safari';
  } else if (userAgent.includes('Android') && userAgent.includes('Chrome')) {
    browserType = 'Android Chrome';
  } else if (userAgent.includes('Chrome')) {
    browserType = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browserType = 'Safari';
  } else if (userAgent.includes('Firefox')) {
    browserType = 'Firefox';
  }

  return {
    isHTTPS,
    isLocalhost,
    hasNotificationAPI,
    browserType,
    currentPermission: hasNotificationAPI ? Notification.permission : 'not-supported',
    canRequestPermission: hasNotificationAPI && (isHTTPS || isLocalhost),
  };
}

// 通知権限をリクエスト
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const diagnostics = getNotificationDiagnostics();

  console.log('🔍 通知診断情報:', diagnostics);

  if (!diagnostics.hasNotificationAPI) {
    console.warn('❌ このブラウザは通知をサポートしていません');
    console.warn(`ブラウザ: ${diagnostics.browserType}`);
    return 'denied';
  }

  if (!diagnostics.canRequestPermission) {
    console.warn('❌ 通知を使用するにはHTTPS接続が必要です');
    console.warn(`現在の接続: ${window.location.protocol}`);
    console.warn(`HTTPS: ${diagnostics.isHTTPS ? 'はい' : 'いいえ'}`);
    console.warn(`localhost: ${diagnostics.isLocalhost ? 'はい' : 'いいえ'}`);
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    console.log('✅ 通知権限は既に許可されています');
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    console.log('📱 通知権限をリクエストしています...');
    const permission = await Notification.requestPermission();
    console.log(`通知権限の結果: ${permission}`);
    return permission;
  }

  console.warn('❌ 通知権限が拒否されています');
  return Notification.permission;
}

// 通知を送信
export function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    console.warn('このブラウザは通知をサポートしていません');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      ...options,
    });
  }
}

// イベント用の通知をスケジュール
export function scheduleEventNotification(
  event: CalendarEvent,
  onNotificationSent?: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
) {
  console.log('📅 イベントの通知をチェック:', event.title);
  console.log('  - notificationEnabled:', event.notificationEnabled);
  console.log('  - notificationMinutes:', event.notificationMinutes);

  if (!event.notificationEnabled || !event.notificationMinutes.length) {
    console.log('  ❌ 通知は無効です');
    return [];
  }

  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);
  const now = new Date();
  const timeoutIds: number[] = [];

  // イベントの継続時間を計算
  const durationMinutes = differenceInMinutes(eventEnd, eventStart);
  const durationText = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}時間${durationMinutes % 60 > 0 ? durationMinutes % 60 + '分' : ''}`
    : `${durationMinutes}分`;

  console.log('  ⏰ イベント開始時刻:', eventStart.toLocaleString('ja-JP'));
  console.log('  ⏰ 現在時刻:', now.toLocaleString('ja-JP'));

  event.notificationMinutes.forEach((minutes) => {
    const notificationTime = new Date(eventStart.getTime() - minutes * 60 * 1000);
    const delay = notificationTime.getTime() - now.getTime();

    console.log(`  🔔 ${minutes}分前の通知:`);
    console.log(`    - 通知時刻: ${notificationTime.toLocaleString('ja-JP')}`);
    console.log(`    - 待機時間: ${Math.round(delay / 1000)}秒`);

    // 通知時刻が未来の場合のみスケジュール
    if (delay > 0) {
      console.log(`    ✅ スケジュール成功`);
      const timeoutId = window.setTimeout(() => {
        console.log(`🔔 通知を送信: ${event.title} (${minutes}分前)`);

        // 通知本文を充実させる
        const startTime = eventStart.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const dateText = format(eventStart, 'M月d日(E)', { locale: ja });
        const bodyLines = [
          `⏰ ${startTime} 開始（${durationText}）`,
          `📁 ${event.category}`,
          `🔔 あと ${minutes}分で開始します`,
        ];

        const bodyText = bodyLines.join('\n');

        // Web通知を送信
        sendNotification(event.title, {
          body: bodyText,
          tag: `event-${event.id}-${minutes}`,
          requireInteraction: false,
          silent: false, // 音を有効化
          vibrate: [200, 100, 200], // バイブレーションパターン（モバイル用）
        });

        // アプリ内通知を追加
        if (onNotificationSent) {
          onNotificationSent({
            type: 'event_reminder',
            title: `📅 ${event.title}`,
            message: `${dateText} ${startTime}開始（${durationText}）\n${minutes}分前のリマインダーです`,
            eventId: event.id,
          });
        }
      }, delay);

      timeoutIds.push(timeoutId);
    } else {
      console.log(`    ❌ 通知時刻が過去のためスキップ`);
    }
  });

  console.log(`  📌 合計 ${timeoutIds.length} 件の通知をスケジュールしました`);
  return timeoutIds;
}

// すべてのイベントの通知をスケジュール
export function scheduleAllNotifications(
  events: CalendarEvent[],
  onNotificationSent?: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
): Map<string, number[]> {
  const scheduledNotifications = new Map<string, number[]>();

  events.forEach((event) => {
    const timeoutIds = scheduleEventNotification(event, onNotificationSent);
    if (timeoutIds.length > 0) {
      scheduledNotifications.set(event.id, timeoutIds);
    }
  });

  return scheduledNotifications;
}

// 通知をキャンセル
export function cancelNotifications(timeoutIds: number[]) {
  timeoutIds.forEach((id) => window.clearTimeout(id));
}

// 特定のイベントの通知をキャンセル
export function cancelEventNotifications(
  scheduledNotifications: Map<string, number[]>,
  eventId: string
) {
  const timeoutIds = scheduledNotifications.get(eventId);
  if (timeoutIds) {
    cancelNotifications(timeoutIds);
    scheduledNotifications.delete(eventId);
  }
}

// すべての通知をキャンセル
export function cancelAllNotifications(scheduledNotifications: Map<string, number[]>) {
  scheduledNotifications.forEach((timeoutIds) => {
    cancelNotifications(timeoutIds);
  });
  scheduledNotifications.clear();
}
