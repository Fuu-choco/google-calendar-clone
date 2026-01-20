import { CalendarEvent } from './types';
import { parseISO, isSameDay, addDays, addWeeks, addMonths, isBefore, isAfter, getDay, format } from 'date-fns';

/**
 * 繰り返しイベントを展開して、指定された日付範囲内のイベントを生成する
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  const expandedEvents: CalendarEvent[] = [];

  console.log(`🔄 expandRecurringEvents called with ${events.length} events`);

  for (const event of events) {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    const duration = eventEnd.getTime() - eventStart.getTime();

    // 繰り返しなしの場合は範囲チェックせずそのまま含める
    if (!event.repeat || event.repeat === 'none') {
      expandedEvents.push(event);
      continue;
    }

    // 週繰り返しなのにrepeatDaysが設定されていない場合はスキップ（データ不整合）
    if (event.repeat === 'weekly' && (!event.repeatDays || event.repeatDays.length === 0)) {
      console.warn(`⚠️ Skipping weekly event "${event.title}" with invalid repeatDays:`, event.repeatDays);
      // 単発イベントとして追加（繰り返さない）
      expandedEvents.push(event);
      continue;
    }

    // 繰り返しありの場合
    // イベント開始日と範囲開始日の遅い方から開始（過去には繰り返さない）
    const recurringStartDate = isAfter(eventStart, startDate) ? eventStart : startDate;
    let currentDate = new Date(eventStart);

    // 終了日のチェック（recurrenceEndDateが設定されている場合）
    const recurrenceEndDate = event.recurrenceEndDate ? parseISO(event.recurrenceEndDate) : null;
    const actualEndDate = recurrenceEndDate && isBefore(recurrenceEndDate, endDate) ? recurrenceEndDate : endDate;

    // 例外日のセット作成（高速検索用）
    const exceptionDatesSet = new Set(event.exceptionDates || []);

    // イベント開始日から範囲開始日まで進める（範囲開始日がイベント開始日より後の場合のみ）
    while (isBefore(currentDate, recurringStartDate)) {
      const nextDate = getNextOccurrence(currentDate, event.repeat, event.repeatDays, event.repeatDate);
      if (!nextDate) break;
      currentDate = nextDate;
    }

    // 範囲内のすべての繰り返しを生成（最大100回まで）
    // ただし、イベント開始日より前の日付には生成しない
    let count = 0;
    const maxOccurrences = 100;

    console.log(`  📅 Expanding recurring event: "${event.title}", repeat: ${event.repeat}, repeatDays: ${JSON.stringify(event.repeatDays)}, endDate: ${event.recurrenceEndDate || 'none'}, exceptions: ${event.exceptionDates?.length || 0}`);

    while (currentDate && !isAfter(currentDate, actualEndDate) && count < maxOccurrences) {
      // イベント開始日以降のみ繰り返しを生成
      if (!isBefore(currentDate, eventStart)) {
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');

        // 例外日でない場合のみ追加
        if (!exceptionDatesSet.has(currentDateStr)) {
          const newEnd = new Date(currentDate.getTime() + duration);

          expandedEvents.push({
            ...event,
            id: `${event.id}-${currentDate.toISOString()}`,
            start: currentDate.toISOString(),
            end: newEnd.toISOString(),
            _originalId: event.id, // 元のイベントIDを保持
            _isRecurring: true, // 繰り返しイベントであることを示す
          } as CalendarEvent);
          count++;
        } else {
          console.log(`  ⏭️ Skipping exception date: ${currentDateStr}`);
        }
      }

      const nextDate = getNextOccurrence(currentDate, event.repeat, event.repeatDays, event.repeatDate);
      if (!nextDate) break;
      currentDate = nextDate;
    }

    console.log(`  ✅ Expanded "${event.title}" into ${count} occurrences`);
  }

  console.log(`🔄 expandRecurringEvents completed: ${expandedEvents.length} total events`);
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
      // repeatDaysが配列でない、または空の場合は1週間後
      if (!Array.isArray(repeatDays) || repeatDays.length === 0) {
        console.warn(`⚠️ repeatDays is invalid:`, repeatDays, 'defaulting to 1 week later');
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
      // 7日探しても見つからなかった場合（ありえないはずだが）
      console.warn(`⚠️ Could not find next occurrence for repeatDays:`, repeatDays);
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
