import { CalendarEvent, Todo } from './types';
import {
  parseISO,
  differenceInMinutes,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
  getHours,
  subMonths,
  startOfYear,
  eachMonthOfInterval,
  eachYearOfInterval,
  subYears
} from 'date-fns';

/**
 * カテゴリ別の時間配分を計算
 */
export function calculateCategoryDistribution(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
) {
  const filteredEvents = events.filter((event) => {
    const eventDate = parseISO(event.start);
    return isWithinInterval(eventDate, { start: startDate, end: endDate });
  });

  const categoryTotals = new Map<string, number>();

  filteredEvents.forEach((event) => {
    const minutes = differenceInMinutes(parseISO(event.end), parseISO(event.start));
    const current = categoryTotals.get(event.category) || 0;
    categoryTotals.set(event.category, current + minutes);
  });

  // 分を時間に変換してデータを作成
  return Array.from(categoryTotals.entries()).map(([name, minutes]) => ({
    name,
    value: Math.round((minutes / 60) * 10) / 10, // 時間（小数点1桁）
    minutes,
  }));
}

/**
 * 時間帯別の活動状況を計算（0-23時）
 */
export function calculateHourlyActivity(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
) {
  const filteredEvents = events.filter((event) => {
    const eventDate = parseISO(event.start);
    return isWithinInterval(eventDate, { start: startDate, end: endDate });
  });

  // 各時間帯の総分数を記録
  const hourlyMinutes = new Array(24).fill(0);

  filteredEvents.forEach((event) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);

    const startHour = getHours(start);
    const startMinute = start.getMinutes();
    const endHour = getHours(end);
    const endMinute = end.getMinutes();

    const totalMinutes = differenceInMinutes(end, start);

    // 同じ時間内に収まる場合
    if (startHour === endHour) {
      hourlyMinutes[startHour] += totalMinutes;
      return;
    }

    // 日付をまたぐかどうかを判定
    const crossesMidnight = end.getDate() !== start.getDate() || end < start;

    if (!crossesMidnight) {
      // 同じ日内で複数時間にまたがる場合（通常ケース）
      // 最初の時間帯の残り分数
      const minutesInFirstHour = 60 - startMinute;
      hourlyMinutes[startHour] += minutesInFirstHour;

      // 中間の完全な時間帯（すべて60分）
      for (let h = startHour + 1; h < endHour; h++) {
        hourlyMinutes[h] += 60;
      }

      // 最後の時間帯
      if (endMinute > 0) {
        hourlyMinutes[endHour] += endMinute;
      }
    } else {
      // 日付をまたぐ場合（例: 23:00 - 01:00）
      // 開始日の残り時間を処理
      const minutesInFirstHour = 60 - startMinute;
      hourlyMinutes[startHour] += minutesInFirstHour;

      // 開始時刻から23:59までの完全な時間帯
      for (let h = startHour + 1; h <= 23; h++) {
        hourlyMinutes[h] += 60;
      }

      // 翌日の0:00から終了時刻までの完全な時間帯
      for (let h = 0; h < endHour; h++) {
        hourlyMinutes[h] += 60;
      }

      // 終了時刻の時間帯
      if (endMinute > 0) {
        hourlyMinutes[endHour] += endMinute;
      }
    }
  });

  // 強度を計算（0分=none, 1-20分=low, 21-40分=medium, 41分以上=high）
  return hourlyMinutes.map((minutes, hour) => {
    let intensity: 'none' | 'low' | 'medium' | 'high';
    if (minutes === 0) {
      intensity = 'none';
    } else if (minutes <= 20) {
      intensity = 'low';
    } else if (minutes <= 40) {
      intensity = 'medium';
    } else {
      intensity = 'high';
    }

    return {
      hour,
      minutes,
      intensity,
    };
  });
}

/**
 * 月別の達成率を計算（過去N ヶ月）
 */
export function calculateMonthlyAchievements(
  events: CalendarEvent[],
  todos: Todo[],
  studyCategoryName: string,
  workCategoryName: string,
  studyGoalHours: number,
  workGoalHours: number | null,
  todoGoalRate: number,
  monthsBack: number = 4
) {
  const now = new Date();
  const months = eachMonthOfInterval({
    start: subMonths(now, monthsBack - 1),
    end: now,
  });

  return months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const monthName = format(monthStart, 'M月');

    // その月のイベントを取得
    const monthEvents = events.filter((event) => {
      const eventDate = parseISO(event.start);
      return isWithinInterval(eventDate, { start: monthStart, end: monthEnd });
    });

    // 学習時間を計算
    const studyMinutes = monthEvents
      .filter((e) => e.category === studyCategoryName)
      .reduce((acc, e) => acc + differenceInMinutes(parseISO(e.end), parseISO(e.start)), 0);
    const studyHours = studyMinutes / 60;
    const studyRate = studyGoalHours > 0 ? (studyHours / studyGoalHours) * 100 : 0;

    // 勤務時間を計算
    const workMinutes = monthEvents
      .filter((e) => e.category === workCategoryName)
      .reduce((acc, e) => acc + differenceInMinutes(parseISO(e.end), parseISO(e.start)), 0);
    const workHours = workMinutes / 60;
    const workRate = workGoalHours && workGoalHours > 0 ? (workHours / workGoalHours) * 100 : 0;

    // Todo達成率を計算
    const monthTodos = todos.filter((todo) => {
      const dueDate = parseISO(todo.dueDate);
      return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
    });
    const completedTodos = monthTodos.filter((t) => t.completed).length;
    const todoRate = monthTodos.length > 0 ? (completedTodos / monthTodos.length) * 100 : 0;

    // 総合達成率（学習とTodoの平均）
    const overall = (studyRate + todoRate) / 2;

    return {
      month: monthName,
      overall: Math.round(overall),
      study: Math.round(studyRate),
      work: Math.round(workRate),
    };
  });
}

/**
 * 年別の達成率を計算（過去N年）
 */
export function calculateYearlyAchievements(
  events: CalendarEvent[],
  todos: Todo[],
  studyCategoryName: string,
  workCategoryName: string,
  studyGoalHours: number,
  workGoalHours: number | null,
  todoGoalRate: number,
  yearsBack: number = 4
) {
  const now = new Date();
  const years = eachYearOfInterval({
    start: subYears(now, yearsBack - 1),
    end: now,
  });

  return years.map((yearStart) => {
    const yearEnd = new Date(yearStart.getFullYear(), 11, 31, 23, 59, 59);
    const yearName = `${yearStart.getFullYear()}年`;

    // その年のイベントを取得
    const yearEvents = events.filter((event) => {
      const eventDate = parseISO(event.start);
      return isWithinInterval(eventDate, { start: yearStart, end: yearEnd });
    });

    // 学習時間を計算（年間目標は月間目標×12と仮定）
    const studyMinutes = yearEvents
      .filter((e) => e.category === studyCategoryName)
      .reduce((acc, e) => acc + differenceInMinutes(parseISO(e.end), parseISO(e.start)), 0);
    const studyHours = studyMinutes / 60;
    const annualStudyGoal = studyGoalHours * 12;
    const studyRate = annualStudyGoal > 0 ? (studyHours / annualStudyGoal) * 100 : 0;

    // 勤務時間を計算
    const workMinutes = yearEvents
      .filter((e) => e.category === workCategoryName)
      .reduce((acc, e) => acc + differenceInMinutes(parseISO(e.end), parseISO(e.start)), 0);
    const workHours = workMinutes / 60;
    const annualWorkGoal = workGoalHours ? workGoalHours * 12 : 0;
    const workRate = annualWorkGoal > 0 ? (workHours / annualWorkGoal) * 100 : 0;

    // Todo達成率を計算
    const yearTodos = todos.filter((todo) => {
      const dueDate = parseISO(todo.dueDate);
      return isWithinInterval(dueDate, { start: yearStart, end: yearEnd });
    });
    const completedTodos = yearTodos.filter((t) => t.completed).length;
    const todoRate = yearTodos.length > 0 ? (completedTodos / yearTodos.length) * 100 : 0;

    // 総合達成率
    const overall = (studyRate + todoRate) / 2;

    return {
      year: yearName,
      overall: Math.round(overall),
      study: Math.round(studyRate),
      work: Math.round(workRate),
    };
  });
}
