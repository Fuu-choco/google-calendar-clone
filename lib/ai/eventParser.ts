/**
 * 自然言語からイベント情報を抽出
 */

import { getOpenAIClient } from './client';
import { format, addDays, parse, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface ParsedEvent {
  title: string;
  start: string; // ISO 8601形式
  end: string;   // ISO 8601形式
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * 自然言語のテキストからイベント情報を抽出
 * @param input ユーザー入力（例：「明日の午後3時に会議」）
 * @returns 抽出されたイベント情報
 */
export async function parseEventFromText(input: string): Promise<ParsedEvent | null> {
  const client = getOpenAIClient();

  if (!client) {
    console.warn('AI機能が無効です。フォールバック処理を使用します。');
    return parseEventFallback(input);
  }

  try {
    const today = format(new Date(), 'yyyy-MM-dd (E)', { locale: ja });
    const now = format(new Date(), 'HH:mm');

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは日本語のカレンダーイベントを解析するアシスタントです。
現在の日時: ${today} ${now}

ユーザーの入力から以下の情報を抽出してください：
- タイトル（イベントの名前）
- 開始日時（ISO 8601形式: YYYY-MM-DDTHH:mm:ss）
- 終了日時（ISO 8601形式: YYYY-MM-DDTHH:mm:ss）
- カテゴリ（学習、勤務、その他のいずれか）
- 優先度（low、medium、highのいずれか）
- 説明（オプション）

日付の解釈：
- 「今日」→ ${today}
- 「明日」→ ${format(addDays(new Date(), 1), 'yyyy-MM-dd')}
- 「明後日」→ ${format(addDays(new Date(), 2), 'yyyy-MM-dd')}

時刻の解釈：
- 「午前」「AM」→ 00:00-11:59
- 「午後」「PM」→ 12:00-23:59
- 終了時刻が指定されていない場合は、開始時刻の1時間後とする`,
        },
        {
          role: 'user',
          content: input,
        },
      ],
      functions: [
        {
          name: 'create_event',
          description: '抽出したイベント情報を構造化データとして返す',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'イベントのタイトル',
              },
              start: {
                type: 'string',
                description: '開始日時（ISO 8601形式: YYYY-MM-DDTHH:mm:ss）',
              },
              end: {
                type: 'string',
                description: '終了日時（ISO 8601形式: YYYY-MM-DDTHH:mm:ss）',
              },
              category: {
                type: 'string',
                enum: ['学習', '勤務', 'その他'],
                description: 'イベントのカテゴリ',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: '優先度',
              },
              description: {
                type: 'string',
                description: 'イベントの詳細説明（オプション）',
              },
            },
            required: ['title', 'start', 'end'],
          },
        },
      ],
      function_call: { name: 'create_event' },
    });

    const functionCall = completion.choices[0]?.message?.function_call;

    if (!functionCall || !functionCall.arguments) {
      console.warn('AI応答からイベント情報を抽出できませんでした');
      return parseEventFallback(input);
    }

    const parsedEvent = JSON.parse(functionCall.arguments) as ParsedEvent;
    console.log('✅ AIでイベントを解析しました:', parsedEvent);

    return parsedEvent;
  } catch (error) {
    console.error('❌ AI解析エラー:', error);
    return parseEventFallback(input);
  }
}

/**
 * フォールバック: シンプルな正規表現ベースの解析
 * AI APIが使用できない場合に使用
 */
function parseEventFallback(input: string): ParsedEvent | null {
  console.log('📝 フォールバック解析を使用:', input);

  const now = new Date();
  let startDate = new Date(now.getTime() + 60 * 60 * 1000);
  let durationMinutes = 60; // デフォルト: 1時間

  // 日付パターンの解析
  if (input.includes('明日')) {
    startDate = addDays(startOfDay(now), 1);
    startDate.setHours(9, 0, 0, 0); // デフォルト: 午前9時
  } else if (input.includes('明後日')) {
    startDate = addDays(startOfDay(now), 2);
    startDate.setHours(9, 0, 0, 0);
  } else if (input.includes('今日')) {
    startDate = startOfDay(now);
    startDate.setHours(now.getHours() + 1, 0, 0, 0);
  }

  // 時刻パターンの解析（「14時」「10時30分」など）
  const timeMatch = input.match(/(\d{1,2})(時|:)(\d{0,2})?(分)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

    // 午後判定
    if (input.includes('午後') && hour < 12) {
      hour += 12;
    } else if (input.includes('午前') && hour === 12) {
      hour = 0;
    }

    startDate.setHours(hour, minute, 0, 0);
  }

  // 時間の長さ指定（「2時間」「1時間半」など）
  const durationMatch = input.match(/(\d+\.?\d*)時間(半)?/);
  if (durationMatch) {
    let hours = parseFloat(durationMatch[1]);
    if (durationMatch[2]) { // 「半」がある場合
      hours += 0.5;
    }
    durationMinutes = hours * 60;
  }

  // 終了時刻を計算
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  // タイトル抽出（不要な単語を削除）
  let title = input
    .replace(/今日の?|明日の?|明後日の?/g, '')
    .replace(/午前|午後/g, '')
    .replace(/\d{1,2}(時|:)\d{0,2}分?/g, '')
    .replace(/から|まで|に/g, '')
    .replace(/\d+\.?\d*時間半?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    title = '新しいタスク';
  }

  // カテゴリー推測
  let category = 'その他';
  if (/(勉強|学習|授業|講義|テスト|試験|レポート)/g.test(input)) {
    category = '学習';
  } else if (/(会議|仕事|業務|打ち合わせ|ミーティング|勤務|作業)/g.test(input)) {
    category = '勤務';
  }

  return {
    title,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    category,
    priority: 'medium',
  };
}
