/**
 * スケジュール自動生成ロジック
 * Phase 2: 空き時間抽出とタスク配置アルゴリズム
 */

import { CalendarEvent, Template, UserSettings, FocusType } from './types';
import {
  parseISO,
  format,
  addMinutes,
  differenceInMinutes,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ConcentrationScore, TaskDurationLearning } from './learningEngine';

/**
 * 空き時間のスロット
 */
export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

/**
 * 配置候補のタスク
 */
export interface TaskCandidate {
  templateId: string;
  title: string;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  color?: string;
}

/**
 * 時間帯別の集中度スコア（0-1）
 * 朝型・夜型に応じて調整
 */
function getFocusScore(hour: number, focusType: FocusType): number {
  if (focusType === '朝型') {
    // 朝型: 6-12時が最も集中できる
    if (hour >= 6 && hour < 9) return 1.0;
    if (hour >= 9 && hour < 12) return 0.9;
    if (hour >= 12 && hour < 15) return 0.7;
    if (hour >= 15 && hour < 18) return 0.6;
    if (hour >= 18 && hour < 21) return 0.5;
    return 0.3;
  } else {
    // 夜型: 15-21時が最も集中できる
    if (hour >= 6 && hour < 9) return 0.5;
    if (hour >= 9 && hour < 12) return 0.6;
    if (hour >= 12 && hour < 15) return 0.7;
    if (hour >= 15 && hour < 18) return 0.9;
    if (hour >= 18 && hour < 21) return 1.0;
    if (hour >= 21 && hour < 24) return 0.8;
    return 0.4;
  }
}

/**
 * 指定日の空き時間を抽出
 */
export function extractFreeTimeSlots(
  date: Date,
  existingEvents: CalendarEvent[],
  settings: UserSettings
): TimeSlot[] {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // ユーザーの稼働時間帯を設定
  const [wakeHour, wakeMinute] = settings.wakeTime.split(':').map(Number);
  const [sleepHour, sleepMinute] = settings.sleepTime.split(':').map(Number);

  const workStart = new Date(dayStart);
  workStart.setHours(wakeHour, wakeMinute, 0, 0);

  const workEnd = new Date(dayStart);
  workEnd.setHours(sleepHour, sleepMinute, 0, 0);

  // 指定日の既存イベント（固定タスク含む）を取得
  const dayEvents = existingEvents
    .filter((event) => {
      const eventStart = parseISO(event.start);
      return eventStart >= dayStart && eventStart <= dayEnd;
    })
    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());

  // 空き時間スロットを抽出
  const freeSlots: TimeSlot[] = [];
  let currentTime = workStart;

  for (const event of dayEvents) {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);

    // 現在時刻からイベント開始までの空き時間
    if (currentTime < eventStart) {
      const duration = differenceInMinutes(eventStart, currentTime);
      if (duration >= 15) {
        // 最低15分以上の空き時間のみ
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(eventStart),
          durationMinutes: duration,
        });
      }
    }

    // 次のイベント後に進める
    currentTime = eventEnd > currentTime ? eventEnd : currentTime;
  }

  // 最後のイベント後から就寝時間までの空き時間
  if (currentTime < workEnd) {
    const duration = differenceInMinutes(workEnd, currentTime);
    if (duration >= 15) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(workEnd),
        durationMinutes: duration,
      });
    }
  }

  return freeSlots;
}

/**
 * タスク候補をテンプレートから生成
 */
export function createTaskCandidates(templates: Template[]): TaskCandidate[] {
  return templates
    .filter((template) => !template.isDefault) // デフォルトテンプレートは除外
    .map((template) => ({
      templateId: template.id,
      title: template.name,
      durationMinutes: template.duration,
      priority: template.priority,
      category: template.category,
      color: template.color,
    }));
}

/**
 * 休憩時間を自動挿入
 */
function insertBreaks(
  slots: TimeSlot[],
  settings: UserSettings
): TimeSlot[] {
  const result: TimeSlot[] = [];
  const breakDuration = settings.breakDuration;

  for (const slot of slots) {
    const workDuration = slot.durationMinutes;

    // 長時間作業が可能な場合、休憩を挿入
    if (workDuration > settings.workDuration + breakDuration) {
      // 作業時間
      result.push({
        start: slot.start,
        end: addMinutes(slot.start, settings.workDuration),
        durationMinutes: settings.workDuration,
      });

      // 休憩時間
      const breakStart = addMinutes(slot.start, settings.workDuration);
      result.push({
        start: breakStart,
        end: addMinutes(breakStart, breakDuration),
        durationMinutes: breakDuration,
      });

      // 残りの時間
      const remainingStart = addMinutes(breakStart, breakDuration);
      const remainingDuration = differenceInMinutes(slot.end, remainingStart);
      if (remainingDuration >= 15) {
        result.push({
          start: remainingStart,
          end: slot.end,
          durationMinutes: remainingDuration,
        });
      }
    } else {
      result.push(slot);
    }
  }

  return result;
}

/**
 * タスク配置アルゴリズム
 * 優先度と集中度スコアを考慮して最適な時間帯にタスクを配置
 * Phase 14: 学習データを活用したバージョン
 */
export function allocateTasks(
  freeSlots: TimeSlot[],
  taskCandidates: TaskCandidate[],
  settings: UserSettings,
  concentrationScores?: ConcentrationScore[],
  taskDurations?: TaskDurationLearning[]
): CalendarEvent[] {
  const generatedEvents: CalendarEvent[] = [];
  const remainingSlots = [...freeSlots];

  // 優先度別にタスクをソート（高→中→低）
  const sortedTasks = [...taskCandidates].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // 学習データからタスクの推奨所要時間を取得する関数
  const getTaskDuration = (taskName: string, defaultDuration: number): number => {
    if (!taskDurations) return defaultDuration;
    const learning = taskDurations.find(l => l.taskName === taskName);
    if (!learning || learning.sampleSize < 3) return defaultDuration;

    // 精度が高い場合は学習データを優先
    const weight = Math.min(learning.accuracy, learning.sampleSize / 10);
    return Math.round(learning.averageDuration * weight + defaultDuration * (1 - weight));
  };

  for (const task of sortedTasks) {
    // 学習データに基づいてタスクの所要時間を調整
    const adjustedDuration = getTaskDuration(task.title, task.durationMinutes);

    // タスクが収まる最適なスロットを見つける
    let bestSlotIndex = -1;
    let bestScore = -1;

    for (let i = 0; i < remainingSlots.length; i++) {
      const slot = remainingSlots[i];

      // タスクがスロットに収まるか確認（学習データに基づく所要時間）
      if (slot.durationMinutes >= adjustedDuration) {
        const hour = slot.start.getHours();

        // 学習データがある場合は集中度スコアを使用、なければデフォルト
        let focusScore: number;
        if (concentrationScores && concentrationScores.length > 0) {
          const scoreData = concentrationScores.find(s => s.hour === hour);
          focusScore = scoreData?.score || getFocusScore(hour, settings.focusType);
        } else {
          focusScore = getFocusScore(hour, settings.focusType);
        }

        // 優先度に応じたスコア加算
        let priorityBonus = 0;
        if (task.priority === 'high') priorityBonus = 0.3;
        if (task.priority === 'medium') priorityBonus = 0.1;

        const totalScore = focusScore + priorityBonus;

        // より高いスコアのスロットを選択
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestSlotIndex = i;
        }
      }
    }

    // 最適なスロットにタスクを配置
    if (bestSlotIndex !== -1) {
      const slot = remainingSlots[bestSlotIndex];
      const taskStart = slot.start;
      const taskEnd = addMinutes(taskStart, adjustedDuration); // 学習データに基づく所要時間

      generatedEvents.push({
        id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: task.title,
        start: taskStart.toISOString(),
        end: taskEnd.toISOString(),
        priority: task.priority,
        category: task.category,
        color: task.color,
        isFixed: false,
        notificationEnabled: false,
        notificationMinutes: [],
        repeat: 'none',
        showInMonthView: true,
      });

      // スロットを更新（使用した時間を除く）
      const remainingDuration = slot.durationMinutes - adjustedDuration;
      if (remainingDuration >= 15) {
        remainingSlots[bestSlotIndex] = {
          start: taskEnd,
          end: slot.end,
          durationMinutes: remainingDuration,
        };
      } else {
        // 残り時間が少ない場合はスロットを削除
        remainingSlots.splice(bestSlotIndex, 1);
      }
    }
  }

  return generatedEvents;
}

/**
 * メイン関数: 指定日のスケジュールを自動生成
 * Phase 14: 学習データを活用
 */
export function generateDaySchedule(
  date: Date,
  existingEvents: CalendarEvent[],
  templates: Template[],
  settings: UserSettings,
  concentrationScores?: ConcentrationScore[],
  taskDurations?: TaskDurationLearning[]
): CalendarEvent[] {
  // 1. 空き時間を抽出
  let freeSlots = extractFreeTimeSlots(date, existingEvents, settings);

  // 2. 休憩時間を自動挿入
  freeSlots = insertBreaks(freeSlots, settings);

  // 3. タスク候補を作成
  const taskCandidates = createTaskCandidates(templates);

  // 4. タスクを配置（学習データを使用）
  const generatedEvents = allocateTasks(
    freeSlots,
    taskCandidates,
    settings,
    concentrationScores,
    taskDurations
  );

  return generatedEvents;
}
