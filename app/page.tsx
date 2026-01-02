'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TodoList } from '@/components/todo/TodoList';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { SettingsView } from '@/components/settings/SettingsView';
import { TaskEditModal } from '@/components/calendar/TaskEditModal';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  requestNotificationPermission,
  scheduleAllNotifications,
  cancelAllNotifications,
} from '@/lib/notifications';
import { registerServiceWorker } from '@/lib/registerServiceWorker';

export default function Home() {
  const { currentTab, fetchData, isLoading, events, addNotification, currentDate } = useAppStore();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const scheduledNotifications = useRef<Map<string, number[]>>(new Map());

  // IndexedDBからデータを取得（初回マウント時のみ）
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 通知権限をリクエスト（初回のみ）
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Service Workerを登録（PWA機能を有効化）
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // イベントが変更されたら通知を再スケジュール
  useEffect(() => {
    // 既存の通知をキャンセル
    cancelAllNotifications(scheduledNotifications.current);

    // 新しい通知をスケジュール（コールバックでストアに追加）
    scheduledNotifications.current = scheduleAllNotifications(events, (notification) => {
      // Web通知が送信された時にアプリ内通知も追加
      addNotification(notification);
    });

    // クリーンアップ
    return () => {
      cancelAllNotifications(scheduledNotifications.current);
    };
  }, [events, addNotification]);

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowAddEvent(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowAddEvent(open);
    if (!open) {
      setSelectedEvent(null);
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'calendar':
        return <CalendarView onEventClick={handleEventClick} />;
      case 'todo':
        return <TodoList />;
      case 'dashboard':
        return <DashboardView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <CalendarView onEventClick={handleEventClick} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header
        onMenuClick={() => setShowMobileSidebar(true)}
        onAddClick={() => setShowAddEvent(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar onAddEvent={() => setShowAddEvent(true)} />

        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>

      <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onAddEvent={() => {
            setShowAddEvent(true);
            setShowMobileSidebar(false);
          }} />
        </SheetContent>
      </Sheet>

      <TaskEditModal
        open={showAddEvent}
        onOpenChange={handleModalClose}
        event={selectedEvent}
        defaultDate={currentDate}
      />
    </div>
  );
}
