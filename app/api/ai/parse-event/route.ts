import { NextRequest, NextResponse } from 'next/server';
import { parseEventFromText } from '@/lib/ai/eventParser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: '入力テキストが必要です' },
        { status: 400 }
      );
    }

    console.log('🤖 AI解析リクエスト:', input);

    const parsedEvent = await parseEventFromText(input);

    if (!parsedEvent) {
      return NextResponse.json(
        { error: 'イベント情報を抽出できませんでした' },
        { status: 400 }
      );
    }

    console.log('✅ AI解析成功:', parsedEvent);

    return NextResponse.json(parsedEvent);
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'サーバーエラーが発生しました'
      },
      { status: 500 }
    );
  }
}
