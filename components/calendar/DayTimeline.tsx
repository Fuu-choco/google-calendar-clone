'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { format, parseISO, isSameDay, addDays, subDays, addMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sparkles, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from './TaskCard';
import { toast } from 'sonner';
import { useSwipeable } from 'react-swipeable';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core';

interface DayTimelineProps {
  onEventClick?: (event: any) => void;
  onTimeSlotClick?: (start: Date, end: Date) => void;
  onTodoClick?: () => void;
  onAutoGenerate?: () => void;
}

export function DayTimeline({ onEventClick, onTimeSlotClick, onTodoClick, onAutoGenerate }: DayTimelineProps) {
  const {
    selectedDate,
    currentDate,
    events,
    setSelectedDate,
    updateEvent,
  } = useAppStore();

  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const displayDate = selectedDate || currentDate;
  const dayEvents = events.filter((event) => {
    const eventDate = parseISO(event.start);
    return isSameDay(eventDate, displayDate);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handlePrevDay = () => {
    setSelectedDate(subDays(displayDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(displayDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAutoGenerate = () => {
    if (onAutoGenerate) {
      onAutoGenerate();
    } else {
      toast.info('AI自動生成機能は準備中です');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const eventId = active.id as string;
    const targetEvent = events.find(e => e.id === eventId);

    if (!targetEvent || targetEvent.isFixed) {
      setDraggedEvent(null);
      return;
    }

    const minutesMoved = Math.round(delta.y / 1);
    const fifteenMinuteIntervals = Math.round(minutesMoved / 15);
    const adjustedMinutes = fifteenMinuteIntervals * 15;

    if (adjustedMinutes === 0) {
      setDraggedEvent(null);
      return;
    }

    const newStart = addMinutes(parseISO(targetEvent.start), adjustedMinutes);
    const newEnd = addMinutes(parseISO(targetEvent.end), adjustedMinutes);

    updateEvent(eventId, {
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    });

    toast.success('タスクの時間を更新しました');
    setDraggedEvent(null);
  };

  const handlers = useSwipeable({
    onSwipedLeft: handleNextDay,
    onSwipedRight: handlePrevDay,
    trackMouse: true,
  });

  const getEventPosition = (event: any) => {
    const start = parseISO(event.start);
    const hour = start.getHours();
    const minute = start.getMinutes();
    const top = (hour * 60 + minute) * 1;
    return top;
  };

  const handleTimeSlotClick = (hour: number) => {
    console.log('⏰ Time slot clicked:', hour);
    if (!onTimeSlotClick) {
      console.log('❌ onTimeSlotClick is not defined');
      return;
    }

    const start = new Date(displayDate);
    start.setHours(hour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);

    console.log('✅ Calling onTimeSlotClick with:', { start, end });
    onTimeSlotClick(start, end);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={(e) => setDraggedEvent(e.active.id as string)}>
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {format(displayDate, 'yyyy年M月d日(E)', { locale: ja })}
          </h2>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
            >
              今日
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onTodoClick}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              TODOリスト
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoGenerate}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              自動生成
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1" {...handlers}>
          <div className="relative" style={{ height: '1440px' }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-slate-200 dark:border-slate-800"
                style={{ height: '60px' }}
              >
                <div className="absolute left-0 top-0 w-16 -mt-3 pr-2 text-right">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                <div
                  className="ml-16 h-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative z-0"
                  onClick={() => handleTimeSlotClick(hour)}
                />
              </div>
            ))}

            <div className="absolute left-16 right-0 top-0 bottom-0 pointer-events-none z-10">
              {dayEvents.map((event) => (
                <DraggableTaskCard
                  key={event.id}
                  event={event}
                  position={getEventPosition(event)}
                  isDragging={draggedEvent === event.id}
                  onClick={() => onEventClick?.(event)}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </DndContext>
  );
}

function DraggableTaskCard({ event, position, isDragging, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    disabled: event.isFixed,
  });

  const style = transform
    ? {
        top: `${position + transform.y}px`,
        left: 0,
        right: 0,
      }
    : {
        top: `${position}px`,
        left: 0,
        right: 0,
      };

  return (
    <div
      ref={setNodeRef}
      className="absolute pointer-events-auto"
      style={style}
      {...listeners}
      {...attributes}
    >
      <TaskCard event={event} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}
