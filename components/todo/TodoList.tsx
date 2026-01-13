'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { TodoItem } from './TodoItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar, Repeat } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, startOfDay, isBefore, isAfter, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RepeatType } from '@/lib/types';
import { generateId } from '@/lib/utils';

export function TodoList() {
  const { todos, addTodo, toggleTodo, deleteTodo, setCurrentTab, setViewMode, selectedDate, setSelectedDate } = useAppStore();
  const [newTodoText, setNewTodoText] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('none');

  const today = startOfDay(new Date());

  // storeのselectedDateを文字列形式で取得（ない場合は今日）
  const displayDate = selectedDate || new Date();
  const selectedDateStr = format(displayDate, 'yyyy-MM-dd');

  // Todoを未完了と完了済みに分ける
  const incompleteTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  // 未完了Todoを日付ごとにグループ化
  const incompleteTodosByDate = incompleteTodos.reduce((acc, todo) => {
    const dateKey = todo.dueDate;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(todo);
    return acc;
  }, {} as Record<string, typeof incompleteTodos>);

  // 完了済みTodoを日付ごとにグループ化
  const completedTodosByDate = completedTodos.reduce((acc, todo) => {
    const dateKey = todo.dueDate;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(todo);
    return acc;
  }, {} as Record<string, typeof completedTodos>);

  // 日付をソート（過去→未来）
  const sortedIncompleteDates = Object.keys(incompleteTodosByDate).sort((a, b) => {
    return parseISO(a).getTime() - parseISO(b).getTime();
  });

  const sortedCompletedDates = Object.keys(completedTodosByDate).sort((a, b) => {
    return parseISO(a).getTime() - parseISO(b).getTime();
  });

  const handleAddTodo = async () => {
    if (newTodoText.trim()) {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const selectedDateObj = parseISO(selectedDateStr);

        await addTodo({
          id: generateId(),
          content: newTodoText,
          completed: false,
          dueDate: selectedDateStr,
          createdDate: todayStr,
          repeat: repeatType,
          repeatDays: repeatType === 'weekly' ? [selectedDateObj.getDay()] : undefined,
          repeatDate: repeatType === 'monthly' ? selectedDateObj.getDate() : undefined,
        });
        setNewTodoText('');
        setRepeatType('none');
      } catch (error) {
        console.error('Todoの追加に失敗しました:', error);
        alert('Todoの追加に失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const handleGoToCalendar = () => {
    setViewMode('day');
    setCurrentTab('calendar');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Todo リスト
          </h2>
          <Button
            onClick={handleGoToCalendar}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            カレンダー
          </Button>
        </div>

        <div className="space-y-2">
          {/* 1段目: 日付選択、繰り返し設定、追加ボタン */}
          <div className="flex gap-2">
            <Input
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                const newDate = parseISO(e.target.value);
                setSelectedDate(newDate);
              }}
              className="flex-1 md:w-40 md:flex-initial"
            />
            <Select value={repeatType} onValueChange={(value: RepeatType) => setRepeatType(value)}>
              <SelectTrigger className="flex-1 md:w-32 md:flex-initial">
                <div className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  <SelectValue placeholder="繰り返しなし" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">繰り返しなし</SelectItem>
                <SelectItem value="daily">毎日</SelectItem>
                <SelectItem value="weekly">毎週</SelectItem>
                <SelectItem value="monthly">毎月</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddTodo} size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 2段目: テキスト入力（全幅） */}
          <div className="w-full">
            <Input
              placeholder="新しいTodoを追加..."
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {todos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              Todoはありません
            </p>
          ) : (
            <>
              {/* 未完了Todoセクション */}
              {sortedIncompleteDates.map((dateKey, index) => {
                const dateTodos = incompleteTodosByDate[dateKey];
                const date = parseISO(dateKey);
                const isPast = isBefore(date, today);
                const isTodayDate = isToday(date);
                const isTomorrowDate = isTomorrow(date);

                // 日付ラベルを決定
                let dateLabel = format(date, 'M月d日(E)', { locale: ja });
                if (isTodayDate) {
                  dateLabel = '今日のTodo';
                } else if (isTomorrowDate) {
                  dateLabel = '明日のTodo';
                } else if (isPast) {
                  dateLabel = `${format(date, 'M月d日(E)', { locale: ja })} (過去)`;
                }

                // スタイルを決定
                const headerColor = isPast
                  ? 'text-red-600 dark:text-red-400'
                  : isTodayDate
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-700 dark:text-slate-300';

                const badgeColor = isPast
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                  : isTodayDate
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400';

                return (
                  <div key={`incomplete-${dateKey}`}>
                    {index > 0 && <Separator />}
                    <div>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${headerColor}`}>
                        {dateLabel}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {dateTodos.length}件
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {dateTodos.map((todo) => (
                          <TodoItem
                            key={todo.id}
                            todo={todo}
                            onToggle={async () => {
                              try {
                                await toggleTodo(todo.id);
                              } catch (error) {
                                console.error('Todoの更新に失敗しました:', error);
                              }
                            }}
                            onDelete={async () => {
                              try {
                                await deleteTodo(todo.id);
                              } catch (error) {
                                console.error('Todoの削除に失敗しました:', error);
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 完了済みTodoセクション */}
              {completedTodos.length > 0 && (
                <>
                  {sortedIncompleteDates.length > 0 && <Separator className="my-6" />}
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      完了済み
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                        {completedTodos.length}件
                      </span>
                    </h3>
                    <div className="space-y-4">
                      {sortedCompletedDates.map((dateKey) => {
                        const dateTodos = completedTodosByDate[dateKey];
                        const date = parseISO(dateKey);
                        const dateLabel = format(date, 'M月d日(E)', { locale: ja });

                        return (
                          <div key={`completed-${dateKey}`}>
                            <h4 className="text-xs text-slate-400 dark:text-slate-500 mb-2 ml-1">
                              {dateLabel}
                            </h4>
                            <div className="space-y-2">
                              {dateTodos.map((todo) => (
                                <TodoItem
                                  key={todo.id}
                                  todo={todo}
                                  onToggle={async () => {
                                    try {
                                      await toggleTodo(todo.id);
                                    } catch (error) {
                                      console.error('Todoの更新に失敗しました:', error);
                                    }
                                  }}
                                  onDelete={async () => {
                                    try {
                                      await deleteTodo(todo.id);
                                    } catch (error) {
                                      console.error('Todoの削除に失敗しました:', error);
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
