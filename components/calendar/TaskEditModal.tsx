'use client';

import { useState, useEffect } from 'react';
import { CalendarEvent, Priority, RepeatType } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { AIEventInput } from './AIEventInput';
import { ParsedEvent } from '@/lib/ai/eventParser';
import { Separator } from '@/components/ui/separator';
import { generateId } from '@/lib/utils';

interface TaskEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
  defaultTime?: { start: Date; end: Date } | null;
}

export function TaskEditModal({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultTime,
}: TaskEditModalProps) {
  const { templates, addEvent, updateEvent, deleteEvent, categories } = useAppStore();

  const [formData, setFormData] = useState({
    title: '',
    date: format(defaultDate || new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    category: '学習',
    priority: 'medium' as Priority,
    isFixed: false,
    showInMonthView: true,
    notificationEnabled: false,
    notification5: true,
    notification10: false,
    notification15: false,
    notificationCustom: false,
    notificationCustomMinutes: 10,
    repeat: 'none' as RepeatType,
    repeatDays: [] as number[],
    repeatDate: 1,
  });

  // AIで指定された日付を保持
  const [aiDate, setAiDate] = useState<Date | null>(null);

  useEffect(() => {
    if (event) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      setFormData({
        title: event.title,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        category: event.category,
        priority: event.priority,
        isFixed: event.isFixed,
        showInMonthView: event.showInMonthView !== false,
        notificationEnabled: event.notificationEnabled,
        notification5: event.notificationMinutes.includes(5),
        notification10: event.notificationMinutes.includes(10),
        notification15: event.notificationMinutes.includes(15),
        notificationCustom: false,
        notificationCustomMinutes: 10,
        repeat: event.repeat || 'none',
        repeatDays: event.repeatDays || [],
        repeatDate: event.repeatDate || 1,
      });
      // イベント編集時はAI日付をクリア
      setAiDate(null);
    } else if (defaultTime) {
      setFormData((prev) => ({
        ...prev,
        date: format(defaultTime.start, 'yyyy-MM-dd'),
        startTime: format(defaultTime.start, 'HH:mm'),
        endTime: format(defaultTime.end, 'HH:mm'),
      }));
      // 新規作成時もAI日付をクリア
      setAiDate(null);
    } else if (defaultDate) {
      // defaultDateをDateオブジェクトに変換（文字列の場合にも対応）
      const dateObj = defaultDate instanceof Date ? defaultDate : new Date(defaultDate);
      const endTime = new Date(dateObj.getTime() + 60 * 60 * 1000);
      setFormData((prev) => ({
        ...prev,
        startTime: format(dateObj, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
      }));
      // 新規作成時もAI日付をクリア
      setAiDate(null);
    }
  }, [event, defaultDate, defaultTime]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => {
        const [hours, minutes] = prev.startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours, minutes + template.duration);
        return {
          ...prev,
          title: template.name,
          endTime: format(endDate, 'HH:mm'),
          category: template.category,
          priority: template.priority,
        };
      });
    }
  };

  const handleAIEventParsed = (parsedEvent: ParsedEvent) => {
    // ISO文字列から日付と時刻を直接抽出（タイムゾーン変換を避ける）
    const startDateTime = parsedEvent.start.substring(0, 19); // "2026-01-05T14:00:00"
    const endDateTime = parsedEvent.end.substring(0, 19);

    const startDate = new Date(startDateTime); // タイムゾーンなしでパース → ローカル時刻として解釈
    const date = startDateTime.substring(0, 10); // "2026-01-05"
    const startTime = startDateTime.substring(11, 16); // "14:00"
    const endTime = endDateTime.substring(11, 16);

    // AIで指定された日付を保存
    setAiDate(startDate);

    setFormData((prev) => ({
      ...prev,
      title: parsedEvent.title,
      date: date,
      startTime: startTime,
      endTime: endTime,
      category: parsedEvent.category || 'その他',
      priority: parsedEvent.priority || 'medium',
    }));
  };

  const handleSave = async () => {
    // バリデーション: 週次繰り返しの場合は曜日を選択必須
    if (formData.repeat === 'weekly' && formData.repeatDays.length === 0) {
      alert('週次繰り返しの場合は、少なくとも1つの曜日を選択してください。');
      return;
    }

    // formData.dateを使用
    const baseDate = new Date(formData.date + 'T00:00:00');
    const [startHour, startMinute] = formData.startTime.split(':').map(Number);
    const [endHour, endMinute] = formData.endTime.split(':').map(Number);

    const startDate = new Date(baseDate);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(baseDate);
    endDate.setHours(endHour, endMinute, 0, 0);

    const notificationMinutes = [];
    if (formData.notification5) notificationMinutes.push(5);
    if (formData.notification10) notificationMinutes.push(10);
    if (formData.notification15) notificationMinutes.push(15);
    if (formData.notificationCustom) notificationMinutes.push(formData.notificationCustomMinutes);

    // カテゴリに応じた色を取得
    const category = categories.find(c => c.name === formData.category);
    const eventColor = category?.color || '#3B82F6';

    // 週繰り返しの場合、曜日が選択されていなければイベント日の曜日を自動設定
    let repeatDays = formData.repeatDays;
    if (formData.repeat === 'weekly' && (!repeatDays || repeatDays.length === 0)) {
      const eventDay = startDate.getDay(); // 0=日曜, 6=土曜
      const adjustedDay = eventDay === 0 ? 7 : eventDay; // 1=月曜, 7=日曜
      repeatDays = [adjustedDay];
      console.log(`📅 Auto-set repeatDays to [${adjustedDay}] based on event date`);
    }

    const eventData: CalendarEvent = {
      id: event?.id || generateId(),
      title: formData.title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      category: formData.category,
      priority: formData.priority,
      color: eventColor,
      isFixed: formData.isFixed,
      showInMonthView: formData.showInMonthView,
      notificationEnabled: formData.notificationEnabled,
      notificationMinutes,
      repeat: formData.repeat || 'none',
      repeatDays: formData.repeat === 'weekly' ? repeatDays : undefined,
      repeatDate: formData.repeat === 'monthly' ? formData.repeatDate : undefined,
    };

    try {
      console.log('💾 Saving event:', eventData);
      if (event) {
        await updateEvent(event.id, eventData);
      } else {
        await addEvent(eventData);
      }
      console.log('✅ Event saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('❌ タスクの保存に失敗しました:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      alert('タスクの保存に失敗しました。ブラウザのコンソールを確認してください。');
    }
  };

  const handleDelete = async () => {
    if (event) {
      try {
        await deleteEvent(event.id);
        onOpenChange(false);
      } catch (error) {
        console.error('タスクの削除に失敗しました:', error);
        alert('タスクの削除に失敗しました。もう一度お試しください。');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'タスクを編集' : 'タスクを作成'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!event && (
            <>
              <AIEventInput onEventParsed={handleAIEventParsed} />
              <Separator className="my-4" />
            </>
          )}

          <div className="space-y-2">
            <Label>テンプレート</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {templates
                  .filter((template) => template.id && template.id.trim() !== '')
                  .map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.duration}分)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>タスク名</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="タスク名を入力"
            />
          </div>

          <div className="space-y-2">
            <Label>日付</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始時刻</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>終了時刻</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <Select
              value={formData.category}
              onValueChange={(value: string) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((category) => category.name && category.name.trim() !== '')
                  .map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>優先度</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: Priority) =>
                setFormData((prev) => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="優先度を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isFixed}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isFixed: checked }))
              }
            />
            <Label>時間変更不可（マストタスク）</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.showInMonthView}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, showInMonthView: checked }))
              }
            />
            <Label>月カレンダーに表示</Label>
          </div>

          <div className="space-y-3 p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.notificationEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, notificationEnabled: checked }))
                }
              />
              <Label>通知を有効化</Label>
            </div>

            {formData.notificationEnabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.notification5}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, notification5: !!checked }))
                    }
                  />
                  <Label className="text-sm">5分前</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.notification10}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, notification10: !!checked }))
                    }
                  />
                  <Label className="text-sm">10分前</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.notification15}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, notification15: !!checked }))
                    }
                  />
                  <Label className="text-sm">15分前</Label>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>繰り返し</Label>
            <RadioGroup
              value={formData.repeat}
              onValueChange={(value: RepeatType) =>
                setFormData((prev) => ({ ...prev, repeat: value }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="text-sm">なし</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="text-sm">毎日</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="text-sm">毎週</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="text-sm">毎月</Label>
              </div>
            </RadioGroup>

            {formData.repeat === 'weekly' && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">繰り返す曜日</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 1, label: '月' },
                    { value: 2, label: '火' },
                    { value: 3, label: '水' },
                    { value: 4, label: '木' },
                    { value: 5, label: '金' },
                    { value: 6, label: '土' },
                    { value: 7, label: '日' },
                  ].map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.repeatDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          setFormData((prev) => ({
                            ...prev,
                            repeatDays: checked
                              ? [...prev.repeatDays, day.value]
                              : prev.repeatDays.filter((d) => d !== day.value),
                          }));
                        }}
                      />
                      <Label className="text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.repeat === 'monthly' && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">繰り返す日</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.repeatDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, repeatDate: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {event && (
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
