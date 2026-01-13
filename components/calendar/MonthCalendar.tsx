'use client';

// MonthCalendar component
import { useState, useRef } from 'react';
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
  startOfDay,
  setHours,
  setMinutes,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { isEventOnDate } from '@/lib/repeatEventGenerator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';

interface MonthCalendarProps {
  onEventClick?: (event: any) => void;
  onDateClick?: (date: Date) => void;
}

export function MonthCalendar({ onEventClick, onDateClick }: MonthCalendarProps) {
  const { currentDate, events, setSelectedDate, setViewMode, updateEvent } = useAppStore();
  const [showDayModal, setShowDayModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    // 複数回呼び出されるのを防ぐ
    if (isUpdatingRef.current) {
      console.log('⚠️ Update already in progress, ignoring duplicate call');
      return;
    }

    const { active, over } = event;

    if (!over) {
      setDraggedEvent(null);
      return;
    }

    const eventId = active.id as string;
    const targetDateStr = over.id as string;
    const targetEvent = events.find(e => e.id === eventId);

    if (!targetEvent || targetEvent.isFixed) {
      // 固定イベントはドラッグ不可
      setDraggedEvent(null);
      return;
    }

    const targetDate = parseISO(targetDateStr);
    const oldStart = parseISO(targetEvent.start);
    const oldEnd = parseISO(targetEvent.end);

    // 時刻を保持したまま日付だけ変更
    const newStart = setMinutes(setHours(startOfDay(targetDate), oldStart.getHours()), oldStart.getMinutes());
    const newEnd = setMinutes(setHours(startOfDay(targetDate), oldEnd.getHours()), oldEnd.getMinutes());

    isUpdatingRef.current = true;
    try {
      // 繰り返しイベントのインスタンスの場合、元のイベントIDを使用
      const updateId = targetEvent._originalId || eventId;
      console.log('🔄 Moving event:', updateId, 'to', targetDate);
      await updateEvent(updateId, {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      toast.success(targetEvent._isRecurring ? 'すべての繰り返しイベントを移動しました' : 'イベントを移動しました');
    } catch (error) {
      console.error('❌ Failed to move event:', error);
      toast.error('イベントの移動に失敗しました');
    } finally {
      isUpdatingRef.current = false;
      setDraggedEvent(null);
    }
  };

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
      return isEventOnDate(event, date);
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={(e) => setDraggedEvent(e.active.id as string)}>
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
              <DroppableDay
                key={index}
                day={day}
                isCurrentMonth={isCurrentMonth}
                isDayToday={isDayToday}
                visibleEvents={visibleEvents}
                priorityColors={priorityColors}
                onDateClick={handleDateClick}
                onEventClick={onEventClick}
                draggedEvent={draggedEvent}
              />
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
    </DndContext>
  );
}

interface DroppableDayProps {
  day: Date;
  isCurrentMonth: boolean;
  isDayToday: boolean;
  visibleEvents: any[];
  priorityColors: any;
  onDateClick: (date: Date) => void;
  onEventClick?: (event: any) => void;
  draggedEvent: string | null;
}

function DroppableDay({
  day,
  isCurrentMonth,
  isDayToday,
  visibleEvents,
  priorityColors,
  onDateClick,
  onEventClick,
  draggedEvent,
}: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(day, 'yyyy-MM-dd'),
  });

  return (
    <button
      ref={setNodeRef}
      onClick={() => onDateClick(day)}
      className={cn(
        'border-r border-b border-slate-200 dark:border-slate-800 p-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative group min-h-[80px] md:min-h-[100px] flex flex-col',
        !isCurrentMonth && 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400',
        isOver && 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full transition-colors mb-1',
          isDayToday && 'bg-blue-600 text-white font-bold',
          !isDayToday && isCurrentMonth && 'text-slate-900 dark:text-white',
          !isDayToday && !isCurrentMonth && 'text-slate-400'
        )}
      >
        {format(day, 'd')}
      </span>

      <div className="flex-1 space-y-0.5 overflow-hidden">
        {visibleEvents.slice(0, 3).map((event) => (
          <DraggableEvent
            key={event.id}
            event={event}
            priorityColors={priorityColors}
            onEventClick={onEventClick}
            isDragging={draggedEvent === event.id}
          />
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
}

interface DraggableEventProps {
  event: any;
  priorityColors: any;
  onEventClick?: (event: any) => void;
  isDragging: boolean;
}

function DraggableEvent({ event, priorityColors, onEventClick, isDragging }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    // 固定イベントのみドラッグ不可（繰り返しイベントはドラッグ可能）
    disabled: event.isFixed,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        touchAction: 'none',
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
      }
    : {
        touchAction: 'none',
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick?.(event);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'text-[10px] md:text-xs px-1 py-0.5 rounded border-l-2 truncate cursor-move',
        priorityColors[event.priority],
        isDragging && 'opacity-50 shadow-lg',
        event.isFixed && 'cursor-not-allowed opacity-75'
      )}
    >
      {event.title}
    </div>
  );
}
