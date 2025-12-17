/**
 * スケジュール最適化提案機能
 */

import { getOpenAIClient } from './client';
import { CalendarEvent } from '@/lib/types';
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface OptimizationSuggestion {
  type: 'reorder' | 'break' | 'consolidate' | 'priority' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  eventIds?: string[]; // 関連するイベントのID
}

export interface ScheduleAnalysis {
  totalWorkHours: number;
  totalBreakTime: number;
  highPriorityCount: number;
  consecutiveWorkBlocks: number;
  suggestions: OptimizationSuggestion[];
}

/**
 * スケジュールを分析して最適化案を提案
 */
export async function analyzeSchedule(
  events: CalendarEvent[],
  targetDate: Date
): Promise<ScheduleAnalysis> {
  const client = getOpenAIClient();

  // 指定日のイベントをフィルタ
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const dayEvents = events.filter((event) => {
    const eventStart = parseISO(event.start);
    return eventStart >= dayStart && eventStart <= dayEnd;
  });

  // 基本的な分析
  const analysis = analyzeBasicMetrics(dayEvents);

  if (!client) {
    // AI が使えない場合は基本的な提案のみ
    return {
      ...analysis,
      suggestions: generateBasicSuggestions(dayEvents, analysis),
    };
  }

  try {
    // AI による詳細な分析
    const aiSuggestions = await generateAISuggestions(client, dayEvents, analysis);
    return {
      ...analysis,
      suggestions: aiSuggestions,
    };
  } catch (error) {
    console.error('❌ AI分析エラー:', error);
    return {
      ...analysis,
      suggestions: generateBasicSuggestions(dayEvents, analysis),
    };
  }
}

/**
 * 基本的なメトリクスを分析
 */
function analyzeBasicMetrics(events: CalendarEvent[]) {
  let totalWorkHours = 0;
  let totalBreakTime = 0;
  let highPriorityCount = 0;
  let consecutiveWorkBlocks = 0;

  // イベントを時系列順にソート
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  let lastEndTime: Date | null = null;
  let currentBlockMinutes = 0;

  sortedEvents.forEach((event) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const duration = differenceInMinutes(end, start);

    // カテゴリに基づいて作業時間または休憩時間を計算
    if (event.category === '休憩' || event.category === 'その他') {
      totalBreakTime += duration;
    } else {
      totalWorkHours += duration;
    }

    // 高優先度タスクをカウント
    if (event.priority === 'high') {
      highPriorityCount++;
    }

    // 連続作業ブロックを検出
    if (lastEndTime) {
      const gap = differenceInMinutes(start, lastEndTime);
      if (gap <= 15) {
        // 15分以内なら連続とみなす
        currentBlockMinutes += duration;
        if (currentBlockMinutes >= 120) {
          // 2時間以上の連続作業
          consecutiveWorkBlocks++;
        }
      } else {
        currentBlockMinutes = duration;
      }
    } else {
      currentBlockMinutes = duration;
    }

    lastEndTime = end;
  });

  return {
    totalWorkHours: totalWorkHours / 60, // 時間に変換
    totalBreakTime: totalBreakTime / 60,
    highPriorityCount,
    consecutiveWorkBlocks,
    suggestions: [] as OptimizationSuggestion[],
  };
}

/**
 * 基本的な提案を生成（AI不使用）
 */
function generateBasicSuggestions(
  events: CalendarEvent[],
  analysis: Omit<ScheduleAnalysis, 'suggestions'>
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // 休憩時間が少ない場合
  if (analysis.totalWorkHours > 4 && analysis.totalBreakTime < 0.5) {
    suggestions.push({
      type: 'break',
      title: '休憩時間を追加',
      description: `${analysis.totalWorkHours.toFixed(1)}時間の作業に対して休憩が${analysis.totalBreakTime.toFixed(1)}時間しかありません。適度な休憩を入れることで集中力が維持できます。`,
      impact: 'high',
    });
  }

  // 連続作業ブロックが多い場合
  if (analysis.consecutiveWorkBlocks > 0) {
    suggestions.push({
      type: 'break',
      title: '長時間の連続作業を分割',
      description: '2時間以上の連続作業が検出されました。15分程度の休憩を挟むことをおすすめします。',
      impact: 'medium',
    });
  }

  // 高優先度タスクが多い場合
  if (analysis.highPriorityCount > 3) {
    suggestions.push({
      type: 'priority',
      title: '優先度の見直し',
      description: `高優先度タスクが${analysis.highPriorityCount}個あります。本当に全て高優先度でしょうか？優先度を調整することで、より効果的な時間管理ができます。`,
      impact: 'medium',
    });
  }

  // 提案がない場合
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'general',
      title: 'スケジュールは良好です',
      description: '現在のスケジュールはバランスが取れています。このまま進めましょう！',
      impact: 'low',
    });
  }

  return suggestions;
}

/**
 * AI による詳細な提案を生成
 */
async function generateAISuggestions(
  client: any,
  events: CalendarEvent[],
  analysis: Omit<ScheduleAnalysis, 'suggestions'>
): Promise<OptimizationSuggestion[]> {
  const eventSummary = events.map((e) => ({
    title: e.title,
    start: format(parseISO(e.start), 'HH:mm', { locale: ja }),
    end: format(parseISO(e.end), 'HH:mm', { locale: ja }),
    category: e.category,
    priority: e.priority,
    duration: differenceInMinutes(parseISO(e.end), parseISO(e.start)),
  }));

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `あなたは生産性とタイムマネジメントの専門家です。
ユーザーのスケジュールを分析し、具体的で実行可能な改善提案を行ってください。

提案の観点：
- 休憩時間の配置
- タスクの優先順位
- 集中力の維持
- ワークライフバランス
- 効率的なタスクの並び順

提案は以下のJSON配列形式で返してください：
[
  {
    "type": "break" | "reorder" | "consolidate" | "priority" | "general",
    "title": "提案のタイトル（20文字以内）",
    "description": "具体的な提案内容（100文字程度）",
    "impact": "high" | "medium" | "low"
  }
]`,
      },
      {
        role: 'user',
        content: `以下のスケジュールを分析してください：

【基本指標】
- 総作業時間: ${analysis.totalWorkHours.toFixed(1)}時間
- 総休憩時間: ${analysis.totalBreakTime.toFixed(1)}時間
- 高優先度タスク数: ${analysis.highPriorityCount}個
- 長時間連続作業ブロック数: ${analysis.consecutiveWorkBlocks}個

【イベント一覧】
${JSON.stringify(eventSummary, null, 2)}

3〜5個の具体的な改善提案をJSON形式で返してください。`,
      },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI応答が空です');
  }

  // JSON部分を抽出
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('JSON形式の応答が見つかりません');
  }

  const suggestions = JSON.parse(jsonMatch[0]) as OptimizationSuggestion[];
  console.log('✅ AIスケジュール最適化提案を生成しました:', suggestions.length, '件');

  return suggestions;
}
