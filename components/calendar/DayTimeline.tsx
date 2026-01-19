'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { CalendarEvent } from '@/lib/types';
import { format, parseISO, isSameDay, addDays, subDays, addMinutes, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sparkles, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from './TaskCard';
import { toast } from 'sonner';
import { useSwipeable } from 'react-swipeable';
import { DndContext, DragEndEvent, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core';

interface DayTimelineProps {
  events: CalendarEvent[]; // 展開済みイベントを受け取る
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (start: Date, end: Date) => void;
  onTodoClick?: () => void;
  onAutoGenerate?: () => void;
}

export function DayTimeline({ events, onEventClick, onTimeSlotClick, onTodoClick, onAutoGenerate }: DayTimelineProps) {
  const {
    selectedDate,
    currentDate,
    setSelectedDate,
    updateEvent,
  } = useAppStore();

  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const [selecting, setSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressStartY, setLongPressStartY] = useState<number | null>(null);
  const [isLongPressActivated, setIsLongPressActivated] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [lastVibrateMinute, setLastVibrateMinute] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasScrolledToCurrentTime = useRef<boolean>(false);

  // 型安全なバイブレーション関数
  const safeVibrate = useCallback((duration: number): boolean => {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        return navigator.vibrate(duration);
      } catch (error) {
        console.error('Vibration failed:', error);
        return false;
      }
    }
    return false;
  }, []);

  // 選択中または長押し有効化中はグローバルなタッチイベントを防ぐ
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (selecting || isLongPressActivated) {
        e.preventDefault();
      }
    };

    if (selecting || isLongPressActivated) {
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    }

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = 'auto';
    };
  }, [selecting, isLongPressActivated]);

  // タイマーのクリーンアップ（メモリリーク防止）
  useEffect(() => {
    const timer = longPressTimer;
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [longPressTimer]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // イベントカード上での長押しドラッグ用
        tolerance: 5,
      },
    })
  );

  const displayDate = selectedDate || currentDate;

  // 現在時刻を管理（今日の場合のみ）
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // 今日の場合のみ1分ごとに更新
    if (isToday(displayDate)) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // 1分ごと
      return () => clearInterval(timer);
    }
  }, [displayDate]);

  // 現在時刻のライン位置を計算
  const currentTimeLinePosition = useMemo(() => {
    if (!isToday(displayDate)) return null;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours * 60 + minutes; // 1時間 = 60px
  }, [displayDate, currentTime]);

  // 初回マウント時または日付変更時に現在時刻にスクロール
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    // ScrollAreaのViewportを取得（Radix UIの内部構造）
    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (!viewport) return;

    // 今日の日付の場合のみ現在時刻にスクロール
    if (isToday(displayDate)) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const scrollPosition = hours * 60 + minutes - 30; // 30分前を表示（現在時刻が中央付近に来るように）

      // 少し遅延させてDOMが確実に描画された後にスクロール
      setTimeout(() => {
        viewport.scrollTop = Math.max(0, scrollPosition);
        hasScrolledToCurrentTime.current = true;
      }, 100);
    } else {
      // 今日以外の日付の場合は朝9時の位置にスクロール
      setTimeout(() => {
        viewport.scrollTop = 9 * 60; // 9:00
      }, 100);
    }
  }, [displayDate]);

  // dayEventsをメモ化してパフォーマンスを改善
  // 展開済みイベントを使用するため、シンプルな日付比較で十分
  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventStart = parseISO(event.start);
      return isSameDay(eventStart, displayDate);
    });
  }, [events, displayDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // イベントハンドラをメモ化してパフォーマンスを改善
  const handlePrevDay = useCallback(() => {
    setSelectedDate(subDays(displayDate, 1));
  }, [displayDate]);

  const handleNextDay = useCallback(() => {
    setSelectedDate(addDays(displayDate, 1));
  }, [displayDate]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleAutoGenerate = useCallback(() => {
    if (onAutoGenerate) {
      onAutoGenerate();
    } else {
      toast.info('AI自動生成機能は準備中です');
    }
  }, [onAutoGenerate]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    // 複数回呼び出されるのを防ぐ
    if (isUpdatingRef.current) {
      console.log('⚠️ Update already in progress, ignoring duplicate call');
      return;
    }

    const { active, delta } = event;
    const eventId = active.id as string;

    // dayEventsから探す（展開されたイベントを含む）
    const targetEvent = dayEvents.find(e => e.id === eventId);

    if (!targetEvent || targetEvent.isFixed) {
      // 固定イベントはドラッグ不可
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

    isUpdatingRef.current = true;
    try {
      // 繰り返しイベントのインスタンスの場合、元のイベントIDを使用
      const updateId = targetEvent._originalId || eventId;
      console.log('🔄 Updating event:', updateId, 'from', targetEvent.start, 'to', newStart.toISOString());
      await updateEvent(updateId, {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      toast.success(targetEvent._isRecurring ? 'すべての繰り返しタスクの時間を更新しました' : 'タスクの時間を更新しました');
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      toast.error('イベントの更新に失敗しました');
    } finally {
      isUpdatingRef.current = false;
      setDraggedEvent(null);
    }
  }, [dayEvents, updateEvent]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNextDay,
    onSwipedRight: handlePrevDay,
    trackMouse: true,
  });

  // refを除外したhandlers（ScrollAreaに独自のrefを使うため）
  const { ref: _swipeRef, ...handlers } = swipeHandlers;

  const getEventPosition = useCallback((event: CalendarEvent) => {
    const start = parseISO(event.start);
    const hour = start.getHours();
    const minute = start.getMinutes();
    const top = (hour * 60 + minute) * 1;
    return top;
  }, []);

  const getMinuteFromY = useCallback((y: number, containerTop: number) => {
    const relativeY = y - containerTop;
    const minutePerPixel = 24 * 60 / 1440; // 1440pxで24時間
    return Math.floor(relativeY * minutePerPixel / 15) * 15; // 15分単位で丸める
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, containerRef: HTMLElement) => {
    // イベントカードやボタンなど、他の要素をタップした場合は無視
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-card]') || target.closest('button')) {
      return;
    }

    const touch = e.touches[0];
    const containerRect = containerRef.getBoundingClientRect();
    const minute = getMinuteFromY(touch.clientY, containerRect.top);

    // 開始位置を保存
    setLongPressStartY(touch.clientY);
    setSelectionStart(minute);
    setSelectionEnd(minute);
    setIsLongPressActivated(false);
    setHasMoved(false);
    setLastVibrateMinute(null);

    // 300ms後に長押しを有効化（イベントカードのドラッグ開始より早く）
    const timer = setTimeout(() => {
      console.log('⏱️ Long press activated!');
      setIsLongPressActivated(true);
      // バイブレーション（対応デバイスのみ）
      const vibrated = safeVibrate(50);
      console.log(vibrated ? '✅ Long press vibration triggered' : '❌ Vibration not supported');
    }, 300);

    setLongPressTimer(timer);
  }, [getMinuteFromY, safeVibrate]);

  const handleTouchMove = useCallback((e: React.TouchEvent, containerRef: HTMLElement) => {
    const touch = e.touches[0];

    // 長押しが有効化されていない場合
    if (!isLongPressActivated) {
      // タイマーをキャンセル（移動した場合は長押しキャンセル）
      if (longPressTimer && longPressStartY !== null) {
        const moveDistance = touch.clientY - longPressStartY;
        // 10px以上移動したらタイマーをキャンセル（通常のスクロール）
        if (Math.abs(moveDistance) > 10) {
          setHasMoved(true);
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
          setLongPressStartY(null);
          setSelectionStart(null);
          setSelectionEnd(null);
        }
      }
      // 通常のスクロールを許可するため、returnしてスクロールを許可
      return;
    }

    // 長押しが有効化されている場合
    if (!selecting && longPressStartY !== null) {
      // 長押し有効化中は常にpreventDefaultを呼んでリロードを防ぐ
      e.preventDefault();

      const moveDistance = touch.clientY - longPressStartY;

      // 下方向への移動（正の値）のみ選択モードを開始
      if (moveDistance > 20) {
        console.log('🎯 Selection mode started!');
        setHasMoved(true);
        setSelecting(true);
        // 選択モードに入った時にバイブレーション
        const vibrated = safeVibrate(30);
        console.log(vibrated ? '✅ Selection mode vibration triggered' : '❌ Vibration not supported');
        // 現在のマス目を記録（次のマス目で比較するため）
        const containerRect = containerRef.getBoundingClientRect();
        const currentMinute = getMinuteFromY(touch.clientY, containerRect.top);
        setLastVibrateMinute(currentMinute);
        console.log('📍 Initial minute set:', currentMinute);
        // body要素のoverscroll-behaviorを設定
        document.body.style.overscrollBehavior = 'none';
      } else if (moveDistance < -10) {
        // 上方向への移動は選択をキャンセル
        setHasMoved(true);
        setIsLongPressActivated(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        setLongPressStartY(null);
        return;
      } else {
        // まだ閾値に達していない場合でもpreventDefaultは呼ばれている
        return;
      }
    }

    if (!selecting || selectionStart === null) return;

    // 選択中はスクロールとプルトゥリフレッシュを防ぐ
    e.preventDefault();

    const containerRect = containerRef.getBoundingClientRect();
    const minute = getMinuteFromY(touch.clientY, containerRect.top);

    // マス目を跨ぐたびにバイブレーション（Google Calendarライク）
    if (lastVibrateMinute !== minute) {
      console.log('🔔 Vibrate at minute:', minute, 'Previous:', lastVibrateMinute);
      const vibrated = safeVibrate(20); // 短い軽いバイブレーション
      console.log(vibrated ? '✅ Vibration triggered' : '❌ Vibration not supported');
      setLastVibrateMinute(minute);
    }

    setSelectionEnd(minute);
  }, [isLongPressActivated, longPressTimer, longPressStartY, selecting, selectionStart, lastVibrateMinute, safeVibrate, getMinuteFromY]);

  const handleTouchEnd = useCallback(() => {
    // タイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // body要素のoverscroll-behaviorを元に戻す
    document.body.style.overscrollBehavior = 'auto';

    // 選択モードの場合
    if (selecting && selectionStart !== null && selectionEnd !== null) {
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
    } else if (!hasMoved && longPressStartY !== null && selectionStart !== null) {
      // 短いタップ（移動していない、かつタッチが終了）
      // 1時間分の予定を作成
      const start = new Date(displayDate);
      start.setHours(Math.floor(selectionStart / 60), selectionStart % 60, 0, 0);

      const end = new Date(start);
      end.setTime(start.getTime() + 60 * 60 * 1000); // 1時間後

      if (onTimeSlotClick) {
        onTimeSlotClick(start, end);
      }
    }

    // 状態をリセット
    setSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsLongPressActivated(false);
    setLongPressStartY(null);
    setHasMoved(false);
    setLastVibrateMinute(null);
  }, [longPressTimer, selecting, selectionStart, selectionEnd, displayDate, onTimeSlotClick, hasMoved, longPressStartY]);

  const handleTimeSlotClick = useCallback((hour: number) => {
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
  }, [selecting, displayDate, onTimeSlotClick]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={(e) => setDraggedEvent(e.active.id as string)}>
      <div className="flex flex-col h-full bg-white dark:bg-slate-950" style={{ overscrollBehavior: 'contain' }}>
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

        <ScrollArea ref={scrollAreaRef} className="flex-1" {...((selecting || isLongPressActivated) ? {} : handlers)}>
          <div
            className="relative"
            style={{
              height: '1440px',
              touchAction: (selecting || isLongPressActivated) ? 'none' : 'auto'
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
                  className="ml-16 h-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative z-0 select-none"
                  onClick={() => handleTimeSlotClick(hour)}
                  onTouchStart={(e) => {
                    const container = e.currentTarget.closest('[style*="1440px"]') as HTMLElement;
                    if (container) {
                      handleTouchStart(e, container);
                    }
                  }}
                />
              </div>
            ))}

            {/* 長押し準備中のインジケーター */}
            {isLongPressActivated && !selecting && selectionStart !== null && (
              <div
                className="absolute left-16 right-0 bg-green-200 dark:bg-green-900 opacity-30 pointer-events-none z-20 border-2 border-green-500 dark:border-green-400"
                style={{
                  top: `${selectionStart}px`,
                  height: '60px',
                }}
              >
                <div className="flex items-center justify-center h-full text-green-700 dark:text-green-300 text-xs font-bold">
                  下にドラッグして範囲を選択
                </div>
              </div>
            )}

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

            {/* 現在時刻のライン（今日の場合のみ） */}
            {currentTimeLinePosition !== null && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-30"
                style={{
                  top: `${currentTimeLinePosition}px`,
                }}
              >
                <div className="flex items-center">
                  <div className="w-14 flex items-center justify-end pr-2">
                    <span className="text-[10px] font-bold text-red-500 dark:text-red-400 bg-white dark:bg-slate-950 px-1 rounded">
                      {format(currentTime, 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 h-[2px] bg-red-500 dark:bg-red-400 relative">
                    <div className="absolute -left-1 -top-1 w-3 h-3 rounded-full bg-red-500 dark:bg-red-400" />
                  </div>
                </div>
              </div>
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

interface DraggableTaskCardProps {
  event: CalendarEvent;
  position: number;
  isDragging: boolean;
  onClick: () => void;
}

function DraggableTaskCard({ event, position, isDragging, onClick }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    // 固定イベントのみドラッグ不可（繰り返しイベントはドラッグ可能）
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
      data-event-card
      {...listeners}
      {...attributes}
    >
      <TaskCard event={event} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}
