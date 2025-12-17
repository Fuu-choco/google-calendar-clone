'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { TodoItem } from './TodoItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, startOfDay, isBefore } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function TodoList() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useAppStore();
  const [newTodoText, setNewTodoText] = useState('');

  const today = startOfDay(new Date());

  const todayTodos = todos.filter((todo) => {
    const dueDate = parseISO(todo.dueDate);
    return isToday(dueDate);
  });

  const tomorrowTodos = todos.filter((todo) => {
    const dueDate = parseISO(todo.dueDate);
    return isTomorrow(dueDate);
  });

  const carriedOverTodos = todos.filter((todo) => {
    const dueDate = parseISO(todo.dueDate);
    const createdDate = parseISO(todo.createdDate);
    return !todo.completed && isBefore(createdDate, today) && !isToday(createdDate);
  });

  const handleAddTodo = async () => {
    if (newTodoText.trim()) {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        await addTodo({
          id: Math.random().toString(),
          content: newTodoText,
          completed: false,
          dueDate: todayStr,
          createdDate: todayStr,
        });
        setNewTodoText('');
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Todo リスト
        </h2>

        <div className="flex gap-2">
          <Input
            placeholder="新しいTodoを追加..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleAddTodo} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {carriedOverTodos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                明日に繰り越されたTodo
                <span className="text-xs bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded-full">
                  {carriedOverTodos.length}
                </span>
              </h3>
              <div className="space-y-2">
                {carriedOverTodos.map((todo) => (
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
          )}

          {carriedOverTodos.length > 0 && <Separator />}

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              今日のTodo
              <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {todayTodos.filter(t => !t.completed).length} / {todayTodos.length}
              </span>
            </h3>
            <div className="space-y-2">
              {todayTodos.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  今日のTodoはありません
                </p>
              ) : (
                todayTodos.map((todo) => (
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
                ))
              )}
            </div>
          </div>

          {tomorrowTodos.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  明日のTodo
                  <span className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {tomorrowTodos.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {tomorrowTodos.map((todo) => (
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
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
