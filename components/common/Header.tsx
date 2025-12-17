'use client';

import { useState } from 'react';
import { Bell, Calendar, Menu, Plus, CheckSquare, BarChart3, Settings, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { requestNotificationPermission, sendNotification, getNotificationDiagnostics } from '@/lib/notifications';
import { toast } from 'sonner';
import { NotificationPanel } from './NotificationPanel';

interface HeaderProps {
  onMenuClick?: () => void;
  onAddClick?: () => void;
}

export function Header({ onMenuClick, onAddClick }: HeaderProps) {
  const { notifications, currentTab, setCurrentTab, viewMode, setViewMode } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const handleTestNotification = async () => {
    const diagnostics = getNotificationDiagnostics();

    // HTTPSでない場合の警告
    if (!diagnostics.canRequestPermission) {
      toast.error('通知はHTTPS接続でのみ利用できます', {
        description: `現在: ${window.location.protocol} | ブラウザ: ${diagnostics.browserType}`,
        duration: 5000,
      });
      console.log('📱 モバイルで通知を使用するには、HTTPSサーバーが必要です');
      console.log('💡 開発環境では、ngrokやlocaltunnelを使ってHTTPSトンネルを作成できます');
      return;
    }

    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      const now = new Date();
      const testTime = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });

      sendNotification('🔔 テスト通知', {
        body: `⏰ ${testTime}\n📱 通知機能が正常に動作しています！\n🎵 音とバイブレーションも確認できます`,
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
      });
      toast.success('テスト通知を送信しました', {
        description: `ブラウザ: ${diagnostics.browserType}`,
      });
    } else if (permission === 'denied') {
      toast.error('通知権限が拒否されています', {
        description: 'ブラウザの設定から通知を許可してください',
        duration: 5000,
      });
    } else {
      toast.error('通知権限が許可されていません');
    }
  };

  const tabs = [
    { id: 'calendar' as const, icon: Calendar, label: 'カレンダー' },
    { id: 'todo' as const, icon: CheckSquare, label: 'Todo' },
    { id: 'dashboard' as const, icon: BarChart3, label: 'ダッシュボード' },
    { id: 'settings' as const, icon: Settings, label: '設定' },
  ];

  const handleTabClick = (tabId: typeof currentTab) => {
    setCurrentTab(tabId);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Google Clone
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-9 h-9"
              onClick={onAddClick}
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative w-9 h-9"
                  title="通知"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 border-2 border-white dark:border-slate-950">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-0 w-auto">
                <NotificationPanel onNotificationClick={() => setNotificationOpen(false)} />
              </PopoverContent>
            </Popover>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              メニュー
            </SheetTitle>
          </SheetHeader>

          <nav className="mt-6 flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {currentTab === 'calendar' && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-2">
                  表示モード
                </h3>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setViewMode('month');
                      setMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                      viewMode === 'month'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>月表示</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('day');
                      setMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                      viewMode === 'day'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <List className="h-4 w-4" />
                    <span>日表示</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
