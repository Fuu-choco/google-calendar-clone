/**
 * イベントから通知を自動生成する
 */

import { CalendarEvent } from './types';
import { AppNotification } from './types/notification';
import { parseISO, differenceInMinutes, format, isFuture, isPast, addMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * イベントの今後の通知を生成
 */
export function generateNotificationsForEvent(event: CalendarEvent): Omit<AppNotification, 'id' | 'timestamp' | 'read'>[] {
  const notifications: Omit<AppNotification, 'id' | 'timestamp' | 'read'>[] = [];

  // 通知が無効化されている場合はスキップ
  if (!event.notificationEnabled) {
    return notifications;
  }

  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);
  const now = new Date();

  // イベントが既に終了している場合はスキップ
  if (isPast(eventEnd)) {
    return notifications;
  }

  const durationMinutes = differenceInMinutes(eventEnd, eventStart);
  const durationText = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}時間${durationMinutes % 60 > 0 ? durationMinutes % 60 + '分' : ''}`
    : `${durationMinutes}分`;

  const startTime = format(eventStart, 'HH:mm');
  const dateText = format(eventStart, 'M月d日(E)', { locale: ja });

  // 事前通知を生成
  const reminderMinutes = event.notificationMinutes || [5, 15, 30];

  reminderMinutes.forEach((minutes) => {
    const notificationTime = addMinutes(eventStart, -minutes);

    // 通知時刻が未来の場合のみ追加
    if (isFuture(notificationTime)) {
      notifications.push({
        type: 'event_reminder',
        title: `📅 ${event.title}`,
        message: `${dateText} ${startTime}開始（${durationText}）\n${minutes}分前のリマインダーです`,
        eventId: event.id,
      });
    }
  });

  // イベント開始時の通知
  if (isFuture(eventStart)) {
    notifications.push({
      type: 'event_start',
      title: `🔔 ${event.title}`,
      message: `${dateText} ${startTime}から開始です（${durationText}）`,
      eventId: event.id,
    });
  }

  return notifications;
}

/**
 * 近日中のイベントの通知を一括生成
 * @param events すべてのイベント
 * @param hoursAhead 何時間先まで通知を生成するか（デフォルト: 24時間）
 */
export function generateUpcomingNotifications(
  events: CalendarEvent[],
  hoursAhead: number = 24
): Omit<AppNotification, 'id' | 'timestamp' | 'read'>[] {
  const notifications: Omit<AppNotification, 'id' | 'timestamp' | 'read'>[] = [];
  const now = new Date();
  const cutoffTime = addMinutes(now, hoursAhead * 60);

  events.forEach((event) => {
    const eventStart = parseISO(event.start);

    // cutoffTime以内に開始するイベントのみ処理
    if (isFuture(eventStart) && eventStart <= cutoffTime) {
      const eventNotifications = generateNotificationsForEvent(event);
      notifications.push(...eventNotifications);
    }
  });

  return notifications;
}

/**
 * イベントが間もなく開始するかチェック
 */
export function isEventStartingSoon(event: CalendarEvent, minutesBefore: number = 15): boolean {
  const eventStart = parseISO(event.start);
  const now = new Date();
  const diff = differenceInMinutes(eventStart, now);

  return diff > 0 && diff <= minutesBefore;
}

/**
 * イベントが進行中かチェック
 */
export function isEventOngoing(event: CalendarEvent): boolean {
  const now = new Date();
  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);

  return now >= eventStart && now <= eventEnd;
}
