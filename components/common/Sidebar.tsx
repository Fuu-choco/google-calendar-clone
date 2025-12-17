'use client';

import { Plus, Calendar, CheckSquare, LayoutDashboard, Settings, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  onAddEvent?: () => void;
}

export function Sidebar({ onAddEvent }: SidebarProps) {
  const { currentTab, setCurrentTab, viewMode, setViewMode } = useAppStore();

  const navItems = [
    { id: 'calendar' as const, icon: Calendar, label: 'カレンダー' },
    { id: 'todo' as const, icon: CheckSquare, label: 'Todo' },
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'ダッシュボード' },
    { id: 'settings' as const, icon: Settings, label: '設定' },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="p-4">
        <Button
          onClick={onAddEvent}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          作成
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-blue-600 dark:text-blue-500')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {currentTab === 'calendar' && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2 px-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                表示モード
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    viewMode === 'month'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>月表示</span>
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                    viewMode === 'day'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium'
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
      </nav>
    </aside>
  );
}
