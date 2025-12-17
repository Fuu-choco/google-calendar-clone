/**
 * AI イベント解析API
 */

import { NextResponse } from 'next/server';
import { parseEventFromText } from '@/lib/ai/eventParser';

// 動的レンダリングを強制（静的生成を無効化）
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: '入力テキストが必要です' },
        { status: 400 }
      );
    }

    const parsedEvent = await parseEventFromText(input);

    if (!parsedEvent) {
      return NextResponse.json(
        { error: 'イベント情報を抽出できませんでした' },
        { status: 400 }
      );
    }

    return NextResponse.json(parsedEvent);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
