/**
 * アプリ内通知の型定義
 */

export type NotificationType = 'event_reminder' | 'event_start' | 'todo_due' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  eventId?: string;
  todoId?: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  reminderMinutes: number[]; // 例: [5, 15, 30] - イベントの何分前に通知するか
  eventStart: boolean; // イベント開始時の通知
  todoDue: boolean; // Todo期限の通知
}
