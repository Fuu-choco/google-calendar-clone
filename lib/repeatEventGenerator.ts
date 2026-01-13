import { CalendarEvent } from './types';
import { parseISO, isSameDay, addDays, addWeeks, addMonths, isBefore, isAfter, getDay } from 'date-fns';

/**
 * 繰り返しイベントを展開して、指定された日付範囲内のイベントを生成する
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  const expandedEvents: CalendarEvent[] = [];

  for (const event of events) {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    const duration = eventEnd.getTime() - eventStart.getTime();

    // 繰り返しなしの場合
    if (!event.repeat || event.repeat === 'none') {
      // イベントが範囲内にあるかチェック
      if (
        (isSameDay(eventStart, startDate) || isAfter(eventStart, startDate)) &&
        (isSameDay(eventStart, endDate) || isBefore(eventStart, endDate))
      ) {
        expandedEvents.push(event);
      }
      continue;
    }

    // 繰り返しありの場合
    let currentDate = new Date(eventStart);

    // 開始日が範囲より前の場合、範囲の開始まで進める
    while (isBefore(currentDate, startDate)) {
      const nextDate = getNextOccurrence(currentDate, event.repeat, event.repeatDays, event.repeatDate);
      if (!nextDate) break;
      currentDate = nextDate;
    }

    // 範囲内のすべての繰り返しを生成（最大100回まで）
    let count = 0;
    const maxOccurrences = 100;

    while (currentDate && !isAfter(currentDate, endDate) && count < maxOccurrences) {
      const newEnd = new Date(currentDate.getTime() + duration);

      expandedEvents.push({
        ...event,
        id: `${event.id}-${currentDate.toISOString()}`,
        start: currentDate.toISOString(),
        end: newEnd.toISOString(),
        _originalId: event.id, // 元のイベントIDを保持
        _isRecurring: true, // 繰り返しイベントであることを示す
      } as CalendarEvent);

      const nextDate = getNextOccurrence(currentDate, event.repeat, event.repeatDays, event.repeatDate);
      if (!nextDate) break;
      currentDate = nextDate;
      count++;
    }
  }

  return expandedEvents;
}

/**
 * 指定された日付に繰り返しイベントが発生するかチェック
 */
export function isEventOnDate(event: CalendarEvent, targetDate: Date): boolean {
  const eventStart = parseISO(event.start);

  // 繰り返しなしの場合
  if (!event.repeat || event.repeat === 'none') {
    return isSameDay(eventStart, targetDate);
  }

  // イベント開始日より前の日付は対象外
  if (isBefore(targetDate, eventStart)) {
    return false;
  }

  // 繰り返しパターンに基づいてチェック
  let currentDate = new Date(eventStart);
  const maxIterations = 1000; // 無限ループ防止
  let iterations = 0;

  while (!isAfter(currentDate, targetDate) && iterations < maxIterations) {
    if (isSameDay(currentDate, targetDate)) {
      return true;
    }
    const nextDate = getNextOccurrence(currentDate, event.repeat, event.repeatDays, event.repeatDate);
    if (!nextDate || isSameDay(nextDate, currentDate)) break;
    currentDate = nextDate;
    iterations++;
  }

  return false;
}

/**
 * 次の繰り返し日を計算
 */
function getNextOccurrence(
  currentDate: Date,
  repeatType: string,
  repeatDays?: number[],
  repeatDate?: number
): Date | null {
  switch (repeatType) {
    case 'daily':
      return addDays(currentDate, 1);

    case 'weekly':
      if (!repeatDays || repeatDays.length === 0) {
        // 曜日が指定されていない場合は1週間後
        return addWeeks(currentDate, 1);
      }
      // 次の指定曜日を探す
      let nextDate = addDays(currentDate, 1);
      for (let i = 0; i < 7; i++) {
        const dayOfWeek = getDay(nextDate);
        // date-fnsのgetDayは日曜日が0なので、repeatDaysと合わせる（月曜日=1）
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        if (repeatDays.includes(adjustedDay)) {
          return nextDate;
        }
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;

    case 'monthly':
      if (repeatDate) {
        // 指定日付に繰り返し
        const nextMonth = addMonths(currentDate, 1);
        nextMonth.setDate(Math.min(repeatDate, new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()));
        return nextMonth;
      }
      return addMonths(currentDate, 1);

    default:
      return null;
  }
}
