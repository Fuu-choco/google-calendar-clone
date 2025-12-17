'use client';

import { Todo } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, isBefore, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const dueDate = parseISO(todo.dueDate);
  const createdDate = parseISO(todo.createdDate);
  const today = startOfDay(new Date());
  const isOverdue = isBefore(dueDate, today) && !todo.completed;
  const isCarriedOver = isBefore(createdDate, today);

  const getDateLabel = () => {
    if (isToday(dueDate)) return '今日';
    if (isTomorrow(dueDate)) return '明日';
    return format(dueDate, 'M/d', { locale: ja });
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg border transition-all',
        todo.completed
          ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700',
        isOverdue && 'border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
      )}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={onToggle}
        className={cn(
          'transition-all',
          todo.completed && 'data-[state=checked]:bg-green-600'
        )}
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium transition-all',
            todo.completed
              ? 'line-through text-slate-500 dark:text-slate-600'
              : 'text-slate-900 dark:text-white'
          )}
        >
          {todo.content}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isOverdue
                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
            )}
          >
            {getDateLabel()}期限
          </span>
          {isCarriedOver && !todo.completed && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({format(createdDate, 'M/d')}から)
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
