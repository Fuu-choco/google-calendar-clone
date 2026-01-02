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
  const [selecting, setSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

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

  const getMinuteFromY = (y: number, containerTop: number) => {
    const relativeY = y - containerTop;
    const minutePerPixel = 24 * 60 / 1440; // 1440pxで24時間
    return Math.floor(relativeY * minutePerPixel / 15) * 15; // 15分単位で丸める
  };

  const handleTouchStart = (e: React.TouchEvent, containerRef: HTMLElement) => {
    const touch = e.touches[0];
    const containerRect = containerRef.getBoundingClientRect();
    const minute = getMinuteFromY(touch.clientY, containerRect.top);

    setSelecting(true);
    setSelectionStart(minute);
    setSelectionEnd(minute);
  };

  const handleTouchMove = (e: React.TouchEvent, containerRef: HTMLElement) => {
    if (!selecting || selectionStart === null) return;

    const touch = e.touches[0];
    const containerRect = containerRef.getBoundingClientRect();
    const minute = getMinuteFromY(touch.clientY, containerRect.top);

    setSelectionEnd(minute);
  };

  const handleTouchEnd = () => {
    if (!selecting || selectionStart === null || selectionEnd === null) {
      setSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const startMinute = Math.min(selectionStart, selectionEnd);
    const endMinute = Math.max(selectionStart, selectionEnd);

    // 最低15分の選択を保証
    const finalEndMinute = endMinute === startMinute ? startMinute + 60 : endMinute + 15;

    const start = new Date(displayDate);
    start.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);

    const end = new Date(displayDate);
    end.setHours(Math.floor(finalEndMinute / 60), finalEndMinute % 60, 0, 0);

    if (onTimeSlotClick) {
      onTimeSlotClick(start, end);
    }

    setSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleTimeSlotClick = (hour: number) => {
    // 選択中でない場合のみ通常のクリック処理
    if (selecting) return;

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
        <div className="border-b border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevDay} className="shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {format(displayDate, 'yyyy年M月d日(E)', { locale: ja })}
              </h2>
            </div>

            <div className="flex gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="hidden md:flex"
              >
                今日
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onTodoClick}
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAutoGenerate}
                className="h-8 w-8"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleNextDay} className="shrink-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1" {...handlers}>
          <div
            className="relative"
            style={{ height: '1440px' }}
            onTouchStart={(e) => {
              const container = e.currentTarget;
              handleTouchStart(e, container);
            }}
            onTouchMove={(e) => {
              const container = e.currentTarget;
              handleTouchMove(e, container);
            }}
            onTouchEnd={handleTouchEnd}
          >
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

            {/* 選択範囲の表示 */}
            {selecting && selectionStart !== null && selectionEnd !== null && (
              <div
                className="absolute left-16 right-0 bg-blue-200 dark:bg-blue-900 opacity-50 pointer-events-none z-20 border-2 border-blue-500 dark:border-blue-400"
                style={{
                  top: `${Math.min(selectionStart, selectionEnd)}px`,
                  height: `${Math.abs(selectionEnd - selectionStart) + 15}px`,
                }}
              />
            )}

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
