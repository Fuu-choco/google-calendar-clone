/**
 * AI チャットAPI
 */

import { NextResponse } from 'next/server';
import { chatWithAssistant, ChatMessage } from '@/lib/ai/chatAssistant';
import { CalendarEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { message, events, conversationHistory } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'イベントデータが必要です' },
        { status: 400 }
      );
    }

    const response = await chatWithAssistant(
      message,
      events as CalendarEvent[],
      (conversationHistory || []) as ChatMessage[]
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
