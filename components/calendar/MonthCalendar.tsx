'use client';

// MonthCalendar component
import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
  isToday,
  parseISO,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MonthCalendarProps {
  onEventClick?: (event: any) => void;
  onDateClick?: (date: Date) => void;
}

export function MonthCalendar({ onEventClick, onDateClick }: MonthCalendarProps) {
  const { currentDate, events, setSelectedDate, setViewMode } = useAppStore();
  const [showDayModal, setShowDayModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['月', '火', '水', '木', '金', '土', '日'];

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.start);
      return isSameDay(eventDate, date);
    });
  };

  const handleDateClick = (date: Date) => {
    const dayEvents = getEventsForDay(date);
    const visibleEvents = dayEvents.filter(e => e.showInMonthView !== false);

    if (visibleEvents.length > 0) {
      // イベントがある日付：日表示に切り替え
      setSelectedDate(date);
      setViewMode('day');
    } else {
      // イベントがない日付：イベント作成
      onDateClick?.(date);
    }
  };

  const priorityColors = {
    high: 'border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
    medium: 'border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
    low: 'border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
  };

  const selectedDayEvents = modalDate
    ? getEventsForDay(modalDate).filter(e => e.showInMonthView !== false).sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
      )
    : [];

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const visibleEvents = dayEvents.filter(e => e.showInMonthView !== false);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                className={cn(
                  'border-r border-b border-slate-200 dark:border-slate-800 p-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative group min-h-[80px] md:min-h-[100px] flex flex-col',
                  !isCurrentMonth && 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full transition-colors mb-1',
                    isDayToday &&
                      'bg-blue-600 text-white font-bold',
                    !isDayToday && isCurrentMonth && 'text-slate-900 dark:text-white',
                    !isDayToday && !isCurrentMonth && 'text-slate-400'
                  )}
                >
                  {format(day, 'd')}
                </span>

                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {visibleEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        'text-[10px] md:text-xs px-1 py-0.5 rounded border-l-2 truncate',
                        priorityColors[event.priority]
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {visibleEvents.length > 3 && (
                    <p className="text-[9px] md:text-xs text-slate-500 dark:text-slate-400 px-1">
                      +{visibleEvents.length - 3}件
                    </p>
                  )}
                </div>

                {isDayToday && (
                  <div className="absolute inset-0 border-2 border-blue-600 dark:border-blue-500 rounded-lg pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalDate && format(modalDate, 'M月d日(E)', { locale: ja })}のタスク
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {selectedDayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  onEventClick?.(event);
                  setShowDayModal(false);
                }}
                className={cn(
                  'p-3 rounded-lg border-l-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors',
                  event.priority === 'high' && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                  event.priority === 'medium' && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
                  event.priority === 'low' && 'border-green-500 bg-green-50 dark:bg-green-950/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    {event.title}
                  </h3>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {format(parseISO(event.start), 'HH:mm')} - {format(parseISO(event.end), 'HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {event.category}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
