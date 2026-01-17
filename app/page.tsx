'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { CalendarEvent } from '@/lib/types';
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
import { migrateIndexedDBToSupabase } from '@/lib/data-migration';
import { toast } from 'sonner';

export default function Home() {
  const {
    currentTab,
    fetchData,
    isLoading,
    events,
    addNotification,
    currentDate,
    setCurrentTab,
    setViewMode,
    setCurrentDate,
    setSelectedDate
  } = useAppStore();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const scheduledNotifications = useRef<Map<string, number[]>>(new Map());

  // 初回マウント時：データ取得とビューのリセット
  useEffect(() => {
    // 古いlocalStorageデータをクリア（userSettings, goals が含まれている場合）
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calendar-app-storage');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          // userSettingsやgoalsが含まれている場合は削除して再作成
          if (data.state && (data.state.userSettings || data.state.goals)) {
            console.log('🧹 Cleaning old localStorage data...');
            const cleaned = {
              state: {
                currentDate: data.state.currentDate,
                selectedDate: data.state.selectedDate,
                viewMode: data.state.viewMode,
                currentTab: data.state.currentTab,
              },
              version: data.version,
            };
            localStorage.setItem('calendar-app-storage', JSON.stringify(cleaned));
          }
        } catch (e) {
          console.error('Error cleaning localStorage:', e);
        }
      }
    }

    // データを取得
    fetchData();

    // 常に今日の日表示で開始
    setCurrentTab('calendar');
    setViewMode('day');
    setCurrentDate(new Date());
    setSelectedDate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URLパラメータで自動移行機能
  useEffect(() => {
    const checkAutoMigration = async () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const shouldMigrate = urlParams.get('migrate');
      const shouldExport = urlParams.get('export');

      if (shouldMigrate === 'true') {
        console.log('🚀 自動移行を開始します...');
        toast.loading('データを移行中...', { id: 'auto-migration' });

        try {
          const result = await migrateIndexedDBToSupabase();

          if (result.success) {
            toast.success(
              `移行完了！\n` +
              `イベント: ${result.eventsCount}件\n` +
              `TODO: ${result.todosCount}件\n` +
              `テンプレート: ${result.templatesCount}件\n` +
              `カテゴリ: ${result.categoriesCount}件`,
              { id: 'auto-migration', duration: 10000 }
            );

            // 設定画面を開く
            setCurrentTab('settings');

            // データをリロード
            await fetchData();

            // URLパラメータを削除
            window.history.replaceState({}, '', window.location.pathname);
          } else {
            toast.error(
              `移行中にエラーが発生しました:\n${result.errors.join('\n')}`,
              { id: 'auto-migration', duration: 10000 }
            );
          }
        } catch (error) {
          console.error('Auto-migration error:', error);
          toast.error('データ移行に失敗しました', { id: 'auto-migration' });
        }
      }

      if (shouldExport === 'true') {
        console.log('📦 自動エクスポートを開始します...');
        // エクスポート機能は後で実装
        toast.info('エクスポート機能を実行中...', { duration: 3000 });
      }
    };

    checkAutoMigration();
  }, [fetchData, setCurrentTab]);

  // 通知権限は設定画面でユーザーが明示的に許可する形にする
  // useEffect(() => {
  //   requestNotificationPermission();
  // }, []);

  // Service Workerを登録（PWA機能を有効化）
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // 通知コールバック（安定した参照を保つ）
  const handleAddNotification = useCallback((notification: any) => {
    addNotification(notification);
  }, [addNotification]);

  // イベントが変更されたら通知を再スケジュール
  useEffect(() => {
    // 既存の通知をキャンセル
    cancelAllNotifications(scheduledNotifications.current);

    // 新しい通知をスケジュール
    scheduledNotifications.current = scheduleAllNotifications(events, handleAddNotification);

    // クリーンアップ
    return () => {
      cancelAllNotifications(scheduledNotifications.current);
    };
  }, [events, handleAddNotification]);

  const handleEventClick = (event: CalendarEvent) => {
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
