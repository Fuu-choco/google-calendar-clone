/**
 * 高度なデータ分析とインサイト生成
 */

import { CalendarEvent } from './types';
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  format,
  parseISO,
  differenceInMinutes,
  eachWeekOfInterval,
  eachDayOfInterval,
  getDay,
  getHours,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 週ごとの生産性データ
 */
export interface WeeklyProductivity {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  totalHours: number;
  completedEvents: number;
  totalEvents: number;
  completionRate: number;
  categoryBreakdown: Array<{
    category: string;
    hours: number;
    percentage: number;
  }>;
}

/**
 * カテゴリ別詳細統計
 */
export interface CategoryInsight {
  category: string;
  color: string;
  totalHours: number;
  eventCount: number;
  averageHours: number;
  longestSession: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * パターン認識結果
 */
export interface Pattern {
  mostProductiveDay: string;
  mostProductiveDayHours: number;
  mostProductiveHour: number;
  mostProductiveHourMinutes: number;
  leastProductiveDay: string;
  leastProductiveDayHours: number;
  averageSessionLength: number;
}

/**
 * インサイトメッセージ
 */
export interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  message: string;
  icon: string;
}

/**
 * 過去N週間の生産性トレンドを計算
 */
export function calculateWeeklyProductivity(
  events: CalendarEvent[],
  weeks: number = 4
): WeeklyProductivity[] {
  const now = new Date();
  const startDate = subMonths(now, Math.ceil(weeks / 4));
  const endDate = now;

  const weeksInRange = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { locale: ja, weekStartsOn: 0 }
  ).slice(-weeks);

  return weeksInRange.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { locale: ja, weekStartsOn: 0 });
    const weekEvents = events.filter((event) => {
      const eventStart = parseISO(event.start);
      return eventStart >= weekStart && eventStart <= weekEnd;
    });

    const totalMinutes = weekEvents.reduce((sum, event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return sum + differenceInMinutes(end, start);
    }, 0);

    const totalHours = totalMinutes / 60;
    const completedEvents = weekEvents.filter((e) => e.status === 'completed').length;
    const totalEvents = weekEvents.length;
    const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

    // カテゴリ別内訳
    const categoryMap = new Map<string, number>();
    weekEvents.forEach((event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      const minutes = differenceInMinutes(end, start);
      const current = categoryMap.get(event.category) || 0;
      categoryMap.set(event.category, current + minutes);
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, minutes]) => ({
        category,
        hours: minutes / 60,
        percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
      }))
      .sort((a, b) => b.hours - a.hours);

    return {
      weekStart,
      weekEnd,
      weekLabel: format(weekStart, 'M/d', { locale: ja }),
      totalHours,
      completedEvents,
      totalEvents,
      completionRate,
      categoryBreakdown,
    };
  });
}

/**
 * カテゴリ別の詳細統計を計算
 */
export function calculateCategoryInsights(
  events: CalendarEvent[],
  categories: Array<{ name: string; color: string }>
): CategoryInsight[] {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonthEvents = events.filter((event) => {
    const eventStart = parseISO(event.start);
    return eventStart >= currentMonthStart && eventStart <= currentMonthEnd;
  });

  const lastMonthEvents = events.filter((event) => {
    const eventStart = parseISO(event.start);
    return eventStart >= lastMonthStart && eventStart <= lastMonthEnd;
  });

  const totalMinutesThisMonth = currentMonthEvents.reduce((sum, event) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    return sum + differenceInMinutes(end, start);
  }, 0);

  return categories.map((category) => {
    const categoryEventsThisMonth = currentMonthEvents.filter(
      (e) => e.category === category.name
    );
    const categoryEventsLastMonth = lastMonthEvents.filter(
      (e) => e.category === category.name
    );

    const totalMinutes = categoryEventsThisMonth.reduce((sum, event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return sum + differenceInMinutes(end, start);
    }, 0);

    const lastMonthMinutes = categoryEventsLastMonth.reduce((sum, event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return sum + differenceInMinutes(end, start);
    }, 0);

    const totalHours = totalMinutes / 60;
    const eventCount = categoryEventsThisMonth.length;
    const averageHours = eventCount > 0 ? totalHours / eventCount : 0;

    const longestSession = categoryEventsThisMonth.reduce((max, event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      const minutes = differenceInMinutes(end, start);
      return Math.max(max, minutes);
    }, 0);

    const percentage = totalMinutesThisMonth > 0 ? (totalMinutes / totalMinutesThisMonth) * 100 : 0;

    // トレンド計算
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (lastMonthMinutes > 0) {
      const change = ((totalMinutes - lastMonthMinutes) / lastMonthMinutes) * 100;
      if (change > 10) trend = 'up';
      else if (change < -10) trend = 'down';
    } else if (totalMinutes > 0) {
      trend = 'up';
    }

    return {
      category: category.name,
      color: category.color,
      totalHours,
      eventCount,
      averageHours,
      longestSession: longestSession / 60,
      percentage,
      trend,
    };
  }).filter(insight => insight.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * パターン認識（最も生産的な曜日・時間帯）
 */
export function recognizePatterns(events: CalendarEvent[]): Pattern {
  const now = new Date();
  const pastMonthStart = subMonths(now, 1);

  const recentEvents = events.filter((event) => {
    const eventStart = parseISO(event.start);
    return eventStart >= pastMonthStart && eventStart <= now;
  });

  // 曜日別の集計（0=日曜, 6=土曜）
  const dayMap = new Map<number, number>();
  const hourMap = new Map<number, number>();

  recentEvents.forEach((event) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const minutes = differenceInMinutes(end, start);

    const day = getDay(start);
    dayMap.set(day, (dayMap.get(day) || 0) + minutes);

    const hour = getHours(start);
    hourMap.set(hour, (hourMap.get(hour) || 0) + minutes);
  });

  // 最も生産的な曜日
  let mostProductiveDay = 0;
  let mostProductiveDayMinutes = 0;
  let leastProductiveDay = 0;
  let leastProductiveDayMinutes = Number.MAX_VALUE;

  for (let day = 0; day < 7; day++) {
    const minutes = dayMap.get(day) || 0;
    if (minutes > mostProductiveDayMinutes) {
      mostProductiveDayMinutes = minutes;
      mostProductiveDay = day;
    }
    if (minutes < leastProductiveDayMinutes) {
      leastProductiveDayMinutes = minutes;
      leastProductiveDay = day;
    }
  }

  // 最も生産的な時間帯
  let mostProductiveHour = 0;
  let mostProductiveHourMinutes = 0;

  hourMap.forEach((minutes, hour) => {
    if (minutes > mostProductiveHourMinutes) {
      mostProductiveHourMinutes = minutes;
      mostProductiveHour = hour;
    }
  });

  // 平均セッション時間
  const averageSessionLength =
    recentEvents.length > 0
      ? recentEvents.reduce((sum, event) => {
          const start = parseISO(event.start);
          const end = parseISO(event.end);
          return sum + differenceInMinutes(end, start);
        }, 0) / recentEvents.length
      : 0;

  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

  return {
    mostProductiveDay: dayNames[mostProductiveDay],
    mostProductiveDayHours: mostProductiveDayMinutes / 60,
    mostProductiveHour,
    mostProductiveHourMinutes,
    leastProductiveDay: dayNames[leastProductiveDay],
    leastProductiveDayHours: leastProductiveDayMinutes / 60,
    averageSessionLength,
  };
}

/**
 * インサイトメッセージを自動生成
 */
export function generateInsights(
  events: CalendarEvent[],
  weeklyProductivity: WeeklyProductivity[],
  pattern: Pattern,
  categoryInsights: CategoryInsight[]
): Insight[] {
  const insights: Insight[] = [];
  let insightId = 0;

  // 生産性トレンドの分析
  if (weeklyProductivity.length >= 2) {
    const lastWeek = weeklyProductivity[weeklyProductivity.length - 1];
    const prevWeek = weeklyProductivity[weeklyProductivity.length - 2];

    if (lastWeek.totalHours > prevWeek.totalHours * 1.2) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'success',
        title: '生産性が向上しています！',
        message: `先週と比べて${((lastWeek.totalHours / prevWeek.totalHours - 1) * 100).toFixed(0)}%活動時間が増えました。`,
        icon: '📈',
      });
    } else if (lastWeek.totalHours < prevWeek.totalHours * 0.8) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'warning',
        title: '活動時間が減少しています',
        message: `先週と比べて${((1 - lastWeek.totalHours / prevWeek.totalHours) * 100).toFixed(0)}%活動時間が減りました。`,
        icon: '📉',
      });
    }

    // 完了率の分析
    if (lastWeek.completionRate >= 80) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'success',
        title: '高い完了率を達成！',
        message: `先週の完了率は${lastWeek.completionRate.toFixed(0)}%でした。素晴らしいペースです。`,
        icon: '✨',
      });
    } else if (lastWeek.completionRate < 50) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'warning',
        title: '完了率を改善しましょう',
        message: `先週の完了率は${lastWeek.completionRate.toFixed(0)}%でした。タスクの優先順位を見直してみては？`,
        icon: '⚠️',
      });
    }
  }

  // パターン認識からのインサイト
  if (pattern.mostProductiveDayHours > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'info',
      title: '最も生産的な曜日',
      message: `${pattern.mostProductiveDay}が最も活動的です（平均${pattern.mostProductiveDayHours.toFixed(1)}時間）。`,
      icon: '📅',
    });
  }

  if (pattern.mostProductiveHourMinutes > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'info',
      title: '最も生産的な時間帯',
      message: `${pattern.mostProductiveHour}時台が最も集中しています（${(pattern.mostProductiveHourMinutes / 60).toFixed(1)}時間）。`,
        icon: '⏰',
      });
  }

  // 平均セッション時間のフィードバック
  if (pattern.averageSessionLength > 0) {
    if (pattern.averageSessionLength > 120) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'tip',
        title: '長時間の作業には休憩を',
        message: `平均セッション時間が${(pattern.averageSessionLength / 60).toFixed(1)}時間です。定期的な休憩を取ることで集中力が維持できます。`,
        icon: '☕',
      });
    } else if (pattern.averageSessionLength < 30) {
      insights.push({
        id: `insight-${insightId++}`,
        type: 'tip',
        title: 'より長いセッションを検討',
        message: `平均セッション時間が${pattern.averageSessionLength.toFixed(0)}分と短めです。集中できる時間を増やしてみては？`,
        icon: '🎯',
      });
    }
  }

  // カテゴリ別のトレンド
  const upTrendCategories = categoryInsights.filter((c) => c.trend === 'up');
  if (upTrendCategories.length > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'success',
      title: '成長カテゴリ',
      message: `${upTrendCategories.map((c) => c.category).join('、')}の時間が増加傾向です！`,
      icon: '🚀',
    });
  }

  const downTrendCategories = categoryInsights.filter((c) => c.trend === 'down');
  if (downTrendCategories.length > 0) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'info',
      title: '減少傾向',
      message: `${downTrendCategories.map((c) => c.category).join('、')}の時間が減少しています。`,
      icon: '📊',
    });
  }

  // 最長セッション
  const longestCategory = categoryInsights.reduce(
    (max, c) => (c.longestSession > max.longestSession ? c : max),
    categoryInsights[0]
  );
  if (longestCategory && longestCategory.longestSession > 3) {
    insights.push({
      id: `insight-${insightId++}`,
      type: 'success',
      title: '長時間の集中達成',
      message: `${longestCategory.category}で${longestCategory.longestSession.toFixed(1)}時間の最長セッションを記録しました！`,
      icon: '🏆',
    });
  }

  return insights.slice(0, 6); // 最大6件
}
