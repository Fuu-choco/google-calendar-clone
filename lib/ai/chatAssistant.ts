/**
 * AI チャットアシスタント
 */

import { getOpenAIClient } from './client';
import { CalendarEvent } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * ユーザーの質問に対してAIが回答
 */
export async function chatWithAssistant(
  userMessage: string,
  events: CalendarEvent[],
  conversationHistory: ChatMessage[]
): Promise<string> {
  const client = getOpenAIClient();

  if (!client) {
    return 'AI機能を使用するには、OpenAI APIキーを設定してください。\n\n基本的な提案:\n- 休憩時間を定期的に取りましょう\n- 優先度の高いタスクから取り組みましょう\n- 1日の作業時間は8時間程度が理想的です';
  }

  try {
    // イベントの概要を作成
    const eventSummary = events
      .slice(0, 20) // 最新20件まで
      .map((e) => ({
        title: e.title,
        date: format(parseISO(e.start), 'M月d日(E)', { locale: ja }),
        time: `${format(parseISO(e.start), 'HH:mm')}-${format(parseISO(e.end), 'HH:mm')}`,
        category: e.category,
        priority: e.priority,
      }));

    // 会話履歴を準備
    const messages: any[] = [
      {
        role: 'system',
        content: `あなたは優秀なスケジュール管理アシスタントです。
ユーザーのスケジュールを確認しながら、以下のような質問に答えてください：

- スケジュールの見直しのアドバイス
- タスクの優先順位付けのヒント
- 効率的な時間の使い方の提案
- ワークライフバランスのアドバイス
- モチベーション維持のためのヒント

回答は：
- 親しみやすく、丁寧な口調で
- 具体的で実行可能なアドバイスを
- 200文字程度で簡潔に

現在のスケジュール（最新20件）:
${JSON.stringify(eventSummary, null, 2)}`,
      },
    ];

    // 会話履歴を追加（最新5件まで）
    conversationHistory.slice(-5).forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // ユーザーの最新メッセージを追加
    messages.push({
      role: 'user',
      content: userMessage,
    });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('AI応答が空です');
    }

    console.log('✅ AI チャット応答を生成しました');
    return response;
  } catch (error) {
    console.error('❌ AI チャットエラー:', error);
    throw error;
  }
}
