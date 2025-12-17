'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { MonthCalendar } from './MonthCalendar';
import { DayTimeline } from './DayTimeline';
import { TaskEditModal } from './TaskEditModal';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateDaySchedule } from '@/lib/scheduleGenerator';
import { useToast } from '@/hooks/use-toast';

export function CalendarView() {
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    selectedDate,
    selectedEvent,
    setSelectedEvent,
    setCurrentTab,
    events,
    templates,
    userSettings,
    addEvent
  } = useAppStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [defaultTime, setDefaultTime] = useState<{ start: Date; end: Date } | null>(null);
  const { toast } = useToast();

  const displayDate = selectedDate || currentDate;

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setDefaultTime(null);
    setShowEditModal(true);
  };

  const handleTimeSlotClick = (start: Date, end: Date) => {
    setSelectedEvent(null);
    setDefaultTime({ start, end });
    setShowEditModal(true);
  };

  const handleDateClick = (date: Date) => {
    // 月表示で空の日付をクリックしたとき
    const start = new Date(date);
    start.setHours(9, 0, 0, 0); // デフォルト：9:00

    const end = new Date(start);
    end.setHours(10, 0, 0, 0); // デフォルト：10:00

    setSelectedEvent(null);
    setDefaultTime({ start, end });
    setShowEditModal(true);
  };

  const handleModalClose = (open: boolean) => {
    setShowEditModal(open);
    if (!open) {
      setSelectedEvent(null);
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


      <div className="flex-1 overflow-hidden">
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
        event={selectedEvent}
        defaultDate={displayDate}
        defaultTime={defaultTime}
      />
    </div>
  );
}
