'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { MonthCalendar } from './MonthCalendar';
import { DayTimeline } from './DayTimeline';
import { TaskEditModal } from './TaskEditModal';
import { Button } from '@/components/ui/button';
import { Calendar, List, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { generateDaySchedule } from '@/lib/scheduleGenerator';
import { useToast } from '@/hooks/use-toast';

export function CalendarView() {
  const {
    viewMode,
    setViewMode,
    currentDate,
    selectedDate,
    selectedEvent,
    setSelectedEvent,
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
      {/* 自動生成ボタン（日表示のみ） */}
      {viewMode === 'day' && (
        <div className="flex justify-end p-4 pb-2">
          <Button
            onClick={handleAutoGenerate}
            variant="outline"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            スケジュール自動生成
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
