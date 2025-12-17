'use client';

import { useAppStore } from '@/lib/store';
import { AppNotification } from '@/lib/types/notification';
import { Bell, X, Check, Calendar, CheckSquare, Info, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  onNotificationClick?: (notification: AppNotification) => void;
}

export function NotificationPanel({ onNotificationClick }: NotificationPanelProps) {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllNotifications, setSelectedDate, setViewMode, setCurrentTab } = useAppStore();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'event_reminder':
      case 'event_start':
        return <Calendar className="h-4 w-4" />;
      case 'todo_due':
        return <CheckSquare className="h-4 w-4" />;
      case 'system':
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'event_reminder':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
      case 'event_start':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'todo_due':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950';
      case 'system':
        return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950';
      default:
        return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950';
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    // 未読の場合は既読にする
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }

    // イベント通知の場合は該当日付に移動
    if (notification.eventId && notification.type !== 'system') {
      setCurrentTab('calendar');
      setViewMode('day');
      // イベントIDから日付を取得する処理（実装が必要）
      onNotificationClick?.(notification);
    }

    // Todo通知の場合はTodoタブに移動
    if (notification.todoId) {
      setCurrentTab('todo');
      onNotificationClick?.(notification);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  if (notifications.length === 0) {
    return (
      <div className="w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">通知</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            新しい通知はありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">通知</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllNotificationsAsRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              すべて既読
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllNotifications}
            className="text-xs text-slate-500 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            すべて削除
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                'p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900',
                !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
              )}
            >
              <div className="flex gap-3">
                <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', getIconColor(notification.type))}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium',
                        !notification.read && 'text-slate-900 dark:text-slate-100'
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
