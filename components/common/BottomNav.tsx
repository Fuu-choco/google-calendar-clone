'use client';

import { Calendar, CheckSquare, BarChart3, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { currentTab, setCurrentTab } = useAppStore();

  const tabs = [
    { id: 'calendar' as const, icon: Calendar, label: 'カレンダー' },
    { id: 'todo' as const, icon: CheckSquare, label: 'Todo' },
    { id: 'dashboard' as const, icon: BarChart3, label: 'ダッシュボード' },
    { id: 'settings' as const, icon: Settings, label: '設定' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors relative',
                isActive
                  ? 'text-blue-600 dark:text-blue-500'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 dark:bg-blue-500 rounded-b-full" />
              )}
              <Icon className={cn('h-6 w-6 mb-1', isActive && 'scale-110')} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
