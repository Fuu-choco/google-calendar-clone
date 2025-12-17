'use client';

import { CalendarEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Bell, Lock } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

interface TaskCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ event, onClick, isDragging }: TaskCardProps) {
  const priorityColors = {
    high: 'bg-red-500 border-red-600',
    medium: 'bg-yellow-500 border-yellow-600',
    low: 'bg-green-500 border-green-600',
  };

  const priorityBgColors = {
    high: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    medium: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900',
    low: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
  };

  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const duration = differenceInMinutes(end, start);
  const height = Math.max((duration / 60) * 60, 40);

  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute left-0 right-0 mx-1 rounded-lg border-l-4 p-2 cursor-pointer transition-all hover:shadow-md group',
        priorityBgColors[event.priority],
        priorityColors[event.priority],
        isDragging && 'opacity-50 shadow-lg scale-105',
        !event.isFixed && 'hover:scale-[1.02]'
      )}
      style={{ height: `${height}px` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {event.title}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
          </p>
          {duration >= 60 && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {event.category}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {event.isFixed && (
            <Lock className="h-3 w-3 text-slate-600 dark:text-slate-400" />
          )}
          {event.notificationEnabled && (
            <Bell className="h-3 w-3 text-slate-600 dark:text-slate-400" />
          )}
        </div>
      </div>
    </div>
  );
}
