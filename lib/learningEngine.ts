/**
 * 学習エンジン - タスク実行履歴から学習してスケジュール最適化
 * Phase 14: Learning Feature
 */

import { CalendarEvent } from './types';
import {
  parseISO,
  differenceInMinutes,
  getHours,
  getDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';

/**
 * タスク実行履歴
 */
export interface TaskHistory {
  id: string;
  eventId: string;
  templateId?: string;
  title: string;
  category: string;
  priority: number;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  durationScheduled: number; // 分
  durationActual?: number; // 分
  editType?: 'none' | 'shortened' | 'extended' | 'moved' | 'deleted';
  status: 'completed' | 'partial' | 'canceled';
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  weekday: number; // 0-6
}

/**
 * 時間帯別集中度スコア
 */
export interface ConcentrationScore {
  hour: number;
  score: number; // 0.0 - 1.0
  tasksCompleted: number;
  tasksTotal: number;
}

/**
 * タスク別所要時間の学習データ
 */
export interface TaskDurationLearning {
  taskName: string;
  category: string;
  averageDuration: number; // 分
  scheduledDuration: number; // 分
  variance: number; // 分散
  sampleSize: number;
  accuracy: number; // 0.0 - 1.0
}

/**
 * イベントからタスク実行履歴を生成
 */
export function createTaskHistory(event: CalendarEvent): TaskHistory {
  const scheduledStart = parseISO(event.start);
  const scheduledEnd = parseISO(event.end);
  const actualStart = event.status === 'completed' ? scheduledStart : undefined;
  const actualEnd = event.status === 'completed' ? scheduledEnd : undefined;

  const durationScheduled = differenceInMinutes(scheduledEnd, scheduledStart);
  const durationActual = actualStart && actualEnd
    ? differenceInMinutes(parseISO(actualEnd.toISOString()), parseISO(actualStart.toISOString()))
    : undefined;

  const hour = getHours(scheduledStart);
  let timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 6 && hour < 12) timeSlot = 'morning';
  else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
  else if (hour >= 18 && hour < 22) timeSlot = 'evening';
  else timeSlot = 'night';

  const weekday = getDay(scheduledStart);

  return {
    id: `history-${event.id}`,
    eventId: event.id,
    title: event.title,
    category: event.category,
    priority: event.priority === 'high' ? 1 : event.priority === 'medium' ? 2 : 3,
    scheduledStart: event.start,
    scheduledEnd: event.end,
    actualStart: actualStart?.toISOString(),
    actualEnd: actualEnd?.toISOString(),
    durationScheduled,
    durationActual,
    editType: 'none',
    status: event.status === 'completed' ? 'completed' : 'canceled',
    timeSlot,
    weekday,
  };
}

/**
 * 時間帯別の集中度スコアを計算
 * 完了率を基にスコアを算出
 */
export function calculateConcentrationScores(
  histories: TaskHistory[]
): ConcentrationScore[] {
  const hourlyStats: Record<number, { completed: number; total: number }> = {};

  // 0-23時の初期化
  for (let hour = 0; hour < 24; hour++) {
    hourlyStats[hour] = { completed: 0, total: 0 };
  }

  // 履歴から集計
  for (const history of histories) {
    const hour = getHours(parseISO(history.scheduledStart));
    hourlyStats[hour].total += 1;

    if (history.status === 'completed') {
      hourlyStats[hour].completed += 1;
    }
  }

  // スコア計算
  const scores: ConcentrationScore[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const stats = hourlyStats[hour];
    const score = stats.total > 0 ? stats.completed / stats.total : 0.5; // デフォルト0.5

    scores.push({
      hour,
      score,
      tasksCompleted: stats.completed,
      tasksTotal: stats.total,
    });
  }

  return scores;
}

/**
 * タスク別の所要時間を学習
 */
export function learnTaskDurations(
  histories: TaskHistory[]
): TaskDurationLearning[] {
  const taskMap: Record<string, {
    durations: number[];
    scheduled: number[];
    category: string;
  }> = {};

  // 完了したタスクのみ学習対象
  const completedTasks = histories.filter(h => h.status === 'completed' && h.durationActual);

  for (const history of completedTasks) {
    if (!taskMap[history.title]) {
      taskMap[history.title] = {
        durations: [],
        scheduled: [],
        category: history.category,
      };
    }

    taskMap[history.title].durations.push(history.durationActual!);
    taskMap[history.title].scheduled.push(history.durationScheduled);
  }

  // 統計計算
  const learnings: TaskDurationLearning[] = [];

  for (const [taskName, data] of Object.entries(taskMap)) {
    if (data.durations.length === 0) continue;

    const averageDuration = data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length;
    const averageScheduled = data.scheduled.reduce((sum, d) => sum + d, 0) / data.scheduled.length;

    // 分散の計算
    const variance = data.durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / data.durations.length;

    // 精度の計算（実際の時間と予定時間の差が小さいほど高い）
    const accuracy = data.durations.reduce((sum, actual, i) => {
      const scheduled = data.scheduled[i];
      const diff = Math.abs(actual - scheduled);
      const maxDiff = Math.max(actual, scheduled);
      return sum + (1 - diff / maxDiff);
    }, 0) / data.durations.length;

    learnings.push({
      taskName,
      category: data.category,
      averageDuration: Math.round(averageDuration),
      scheduledDuration: Math.round(averageScheduled),
      variance: Math.round(variance),
      sampleSize: data.durations.length,
      accuracy: Math.min(1.0, Math.max(0.0, accuracy)),
    });
  }

  return learnings;
}

/**
 * 学習データに基づいてタスクの推奨所要時間を取得
 */
export function getRecommendedDuration(
  taskName: string,
  learnings: TaskDurationLearning[],
  defaultDuration: number
): number {
  const learning = learnings.find(l => l.taskName === taskName);

  if (!learning || learning.sampleSize < 3) {
    // 学習データが不足している場合はデフォルトを返す
    return defaultDuration;
  }

  // 学習データがある場合は平均所要時間を返す
  // 精度が低い場合はデフォルトに近づける
  const weight = Math.min(learning.accuracy, learning.sampleSize / 10);
  return Math.round(
    learning.averageDuration * weight + defaultDuration * (1 - weight)
  );
}

/**
 * 集中度スコアに基づいて最適な時間帯を推奨
 */
export function recommendBestTimeSlot(
  scores: ConcentrationScore[],
  priority: 'high' | 'medium' | 'low'
): { hour: number; score: number }[] {
  // 優先度に応じた最低スコア閾値
  const threshold = priority === 'high' ? 0.7 : priority === 'medium' ? 0.5 : 0.3;

  // 閾値以上のスコアの時間帯を抽出
  const validSlots = scores
    .filter(s => s.score >= threshold && s.tasksTotal >= 2) // 最低2件のデータが必要
    .sort((a, b) => b.score - a.score);

  if (validSlots.length === 0) {
    // データ不足の場合はスコア上位を返す
    return scores
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => ({ hour: s.hour, score: s.score }));
  }

  return validSlots.slice(0, 3).map(s => ({ hour: s.hour, score: s.score }));
}

/**
 * 曜日別のタスク完了率を分析
 */
export function analyzeWeekdayPerformance(
  histories: TaskHistory[]
): Record<number, { completionRate: number; totalTasks: number }> {
  const weekdayStats: Record<number, { completed: number; total: number }> = {};

  // 0-6（日-土）の初期化
  for (let day = 0; day < 7; day++) {
    weekdayStats[day] = { completed: 0, total: 0 };
  }

  // 履歴から集計
  for (const history of histories) {
    weekdayStats[history.weekday].total += 1;
    if (history.status === 'completed') {
      weekdayStats[history.weekday].completed += 1;
    }
  }

  // 完了率を計算
  const performance: Record<number, { completionRate: number; totalTasks: number }> = {};
  for (let day = 0; day < 7; day++) {
    const stats = weekdayStats[day];
    performance[day] = {
      completionRate: stats.total > 0 ? stats.completed / stats.total : 0,
      totalTasks: stats.total,
    };
  }

  return performance;
}

/**
 * インサイト生成：学習データから気づきを提示
 */
export interface LearningInsight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  message: string;
}

export function generateLearningInsights(
  concentrationScores: ConcentrationScore[],
  taskDurations: TaskDurationLearning[],
  weekdayPerformance: Record<number, { completionRate: number; totalTasks: number }>
): LearningInsight[] {
  const insights: LearningInsight[] = [];

  // 1. 最も集中できる時間帯
  const bestHours = concentrationScores
    .filter(s => s.tasksTotal >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1);

  if (bestHours.length > 0) {
    const hour = bestHours[0].hour;
    insights.push({
      type: 'success',
      title: `${hour}時台が最も生産的`,
      message: `完了率${Math.round(bestHours[0].score * 100)}%。この時間に重要なタスクを配置しましょう。`,
    });
  }

  // 2. タスクの所要時間の傾向
  const underestimatedTasks = taskDurations.filter(
    t => t.averageDuration > t.scheduledDuration * 1.2 && t.sampleSize >= 3
  );

  if (underestimatedTasks.length > 0) {
    const task = underestimatedTasks[0];
    insights.push({
      type: 'warning',
      title: `「${task.taskName}」は時間がかかる傾向`,
      message: `平均${task.averageDuration}分かかっています。予定時間を調整しましょう。`,
    });
  }

  // 3. 曜日別のパフォーマンス
  const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const bestDay = Object.entries(weekdayPerformance)
    .filter(([_, p]) => p.totalTasks >= 3)
    .sort(([_, a], [__, b]) => b.completionRate - a.completionRate)[0];

  if (bestDay) {
    const [day, perf] = bestDay;
    insights.push({
      type: 'info',
      title: `${weekdayNames[Number(day)]}曜日が最も高いパフォーマンス`,
      message: `完了率${Math.round(perf.completionRate * 100)}%。重要なタスクを集中させると良いでしょう。`,
    });
  }

  // 4. 学習データが蓄積されているタスク
  const wellLearnedTasks = taskDurations.filter(t => t.sampleSize >= 5 && t.accuracy >= 0.8);
  if (wellLearnedTasks.length > 0) {
    insights.push({
      type: 'tip',
      title: '学習データが充実しています',
      message: `${wellLearnedTasks.length}件のタスクで精度の高い予測が可能です。`,
    });
  }

  return insights;
}
