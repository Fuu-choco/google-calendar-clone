'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { CalendarEvent } from '@/lib/types';
import { MonthCalendar } from './MonthCalendar';
import { DayTimeline } from './DayTimeline';
import { TaskEditModal } from './TaskEditModal';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateDaySchedule } from '@/lib/scheduleGenerator';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({ onEventClick }: CalendarViewProps) {
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    selectedDate,
    setCurrentTab,
    events,
    templates,
    userSettings,
    addEvent,
    fetchData
  } = useAppStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [defaultTime, setDefaultTime] = useState<{ start: Date; end: Date } | null>(null);
  const { toast } = useToast();

  // プルトゥリフレッシュ用の状態
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayDate = selectedDate || currentDate;

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const handleTimeSlotClick = (start: Date, end: Date) => {
    setDefaultTime({ start, end });
    setShowEditModal(true);
  };

  const handleDateClick = (date: Date) => {
    // 月表示で空の日付をクリックしたとき
    const start = new Date(date);
    start.setHours(9, 0, 0, 0); // デフォルト：9:00

    const end = new Date(start);
    end.setHours(10, 0, 0, 0); // デフォルト：10:00

    setDefaultTime({ start, end });
    setShowEditModal(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowEditModal(open);
    if (!open) {
      setDefaultTime(null);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAutoGenerate = async () => {
    try {
      // 自動生成を実行
      const generatedEvents = generateDaySchedule(
        displayDate,
        events,
        templates,
        userSettings
      );

      if (generatedEvents.length === 0) {
        toast({
          title: '空き時間がありません',
          description: '固定タスクで埋まっているため、新しいタスクを配置できませんでした。',
          variant: 'destructive',
        });
        return;
      }

      // 生成されたイベントを追加
      for (const event of generatedEvents) {
        await addEvent(event);
      }

      toast({
        title: 'スケジュールを自動生成しました',
        description: `${generatedEvents.length}件のタスクを配置しました。`,
      });
    } catch (error) {
      console.error('自動生成エラー:', error);
      toast({
        title: '自動生成に失敗しました',
        description: 'もう一度お試しください。',
        variant: 'destructive',
      });
    }
  };

  // プルトゥリフレッシュハンドラー
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container || isRefreshing) return;

    // 一番上にスクロールしている場合のみプルを有効化
    if (container.scrollTop <= 5) { // 5px以内なら一番上と判定（誤差を考慮）
      touchStartY.current = e.touches[0].clientY;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || touchStartY.current === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    // スクロール位置が一番上で、かつ下方向にドラッグしている場合のみ
    if (container.scrollTop <= 5 && distance > 10) { // 10px以上引っ張ったらプル開始
      if (!isPulling) {
        setIsPulling(true);
      }
      setPullDistance(Math.min(distance - 10, 100)); // 最大100px

      // ブラウザのデフォルト動作を防ぐ
      e.preventDefault();
    } else if (isPulling && distance <= 0) {
      // 上にスワイプしたらプルをキャンセル
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    touchStartY.current = 0;

    if (!isPulling) return;

    setIsPulling(false);

    // 60px以上引っ張ったらリフレッシュ
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      sonnerToast.loading('データを更新中...', { id: 'pull-refresh' });

      try {
        await fetchData();
        sonnerToast.success('データを更新しました', { id: 'pull-refresh' });
      } catch (error) {
        console.error('リフレッシュエラー:', error);
        sonnerToast.error('更新に失敗しました', { id: 'pull-refresh' });
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, isRefreshing, fetchData]);

  return (
    <div className="flex flex-col h-full">
      {/* 月表示ヘッダー（月表示のみ） */}
      {viewMode === 'month' && (
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevMonth}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleNextMonth}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-lg font-semibold">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </h2>

          <Button
            onClick={handleToday}
            variant="outline"
            size="sm"
          >
            今日
          </Button>
        </div>
      )}

      {/* プルトゥリフレッシュインジケーター */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center py-2 bg-slate-100 dark:bg-slate-800 transition-all"
          style={{ height: `${Math.min(pullDistance, 60)}px`, opacity: Math.min(pullDistance / 50, 1) }}
        >
          <RefreshCw
            className={`h-5 w-5 text-slate-600 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3.6}deg)` }}
          />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {viewMode === 'month' ? (
          <MonthCalendar
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
          />
        ) : (
          <DayTimeline
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            onTodoClick={() => setCurrentTab('todo')}
            onAutoGenerate={handleAutoGenerate}
          />
        )}
      </div>

      <TaskEditModal
        open={showEditModal}
        onOpenChange={handleModalClose}
        defaultDate={displayDate}
        defaultTime={defaultTime}
      />
    </div>
  );
}
