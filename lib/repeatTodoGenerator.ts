import { Todo } from './types';
import { format, addDays, addWeeks, addMonths, parseISO, startOfDay, isAfter, isSameDay } from 'date-fns';
import { generateId } from './utils';

/**
 * 繰り返しTodoから次のTodoを生成する
 */
export function generateNextTodo(parentTodo: Todo, nextDate: Date): Todo {
  return {
    id: generateId(),
    content: parentTodo.content,
    completed: false,
    dueDate: format(nextDate, 'yyyy-MM-dd'),
    createdDate: format(new Date(), 'yyyy-MM-dd'),
    priority: parentTodo.priority,
    repeat: parentTodo.repeat,
    repeatDays: parentTodo.repeatDays,
    repeatDate: parentTodo.repeatDate,
    parentTodoId: parentTodo.parentTodoId || parentTodo.id,
  };
}

/**
 * 次の繰り返し日を計算する
 */
export function calculateNextRepeatDate(todo: Todo, fromDate: Date): Date | null {
  const baseDate = parseISO(todo.dueDate);

  switch (todo.repeat) {
    case 'daily':
      // 毎日：次の日を返す
      return addDays(fromDate, 1);

    case 'weekly':
      // 毎週：次の同じ曜日を返す
      if (!todo.repeatDays || todo.repeatDays.length === 0) {
        return addWeeks(fromDate, 1);
      }
      // 指定された曜日の次の日を探す
      let nextWeeklyDate = addDays(fromDate, 1);
      const maxDays = 7;
      for (let i = 0; i < maxDays; i++) {
        if (todo.repeatDays.includes(nextWeeklyDate.getDay())) {
          return nextWeeklyDate;
        }
        nextWeeklyDate = addDays(nextWeeklyDate, 1);
      }
      return addWeeks(fromDate, 1);

    case 'monthly':
      // 毎月：次の同じ日付を返す
      if (!todo.repeatDate) {
        return addMonths(fromDate, 1);
      }
      const nextMonth = addMonths(fromDate, 1);
      // 日付が存在しない場合（例：31日がない月）は月末に設定
      try {
        return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), todo.repeatDate);
      } catch {
        return new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
      }

    case 'none':
    default:
      return null;
  }
}

/**
 * 既存のTodoから繰り返しTodoを生成する必要があるかチェックし、必要に応じて生成する
 */
export function generateRepeatTodos(
  todos: Todo[],
  targetDate: Date = new Date(),
  daysAhead: number = 30
): Todo[] {
  const newTodos: Todo[] = [];
  const today = startOfDay(new Date());
  const targetDateStart = startOfDay(targetDate);
  const endDate = addDays(targetDateStart, daysAhead);

  // 繰り返し設定のあるTodoを取得（親Todoのみ）
  const repeatTodos = todos.filter(
    (todo) => todo.repeat && todo.repeat !== 'none' && !todo.parentTodoId
  );

  for (const repeatTodo of repeatTodos) {
    const baseDueDate = parseISO(repeatTodo.dueDate);
    let currentCheckDate = startOfDay(baseDueDate);

    // 基準日が過去の場合、今日から開始
    if (isAfter(today, currentCheckDate)) {
      currentCheckDate = today;
    }

    // 終了日まで繰り返しTodoを生成
    while (!isAfter(currentCheckDate, endDate)) {
      // この日付のTodoが既に存在するかチェック
      const existingTodo = todos.find(
        (t) =>
          (t.id === repeatTodo.id ||
           (t.parentTodoId && (t.parentTodoId === repeatTodo.id ||
                               (repeatTodo.parentTodoId && t.parentTodoId === repeatTodo.parentTodoId)))) &&
          isSameDay(parseISO(t.dueDate), currentCheckDate)
      );

      // 存在しない場合のみ新しいTodoを生成
      if (!existingTodo && !isSameDay(currentCheckDate, baseDueDate)) {
        const newTodo = generateNextTodo(repeatTodo, currentCheckDate);
        newTodos.push(newTodo);
      }

      // 次の繰り返し日を計算
      const nextDate = calculateNextRepeatDate(repeatTodo, currentCheckDate);
      if (!nextDate || isAfter(nextDate, endDate)) {
        break;
      }
      currentCheckDate = nextDate;
    }
  }

  return newTodos;
}
