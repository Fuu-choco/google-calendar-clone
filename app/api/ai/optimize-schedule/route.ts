/**
 * スケジュール最適化API
 */

import { NextResponse } from 'next/server';
import { analyzeSchedule } from '@/lib/ai/scheduleOptimizer';
import { CalendarEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { events, targetDate } = await request.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'イベントデータが必要です' },
        { status: 400 }
      );
    }

    if (!targetDate) {
      return NextResponse.json(
        { error: '対象日が必要です' },
        { status: 400 }
      );
    }

    const analysis = await analyzeSchedule(
      events as CalendarEvent[],
      new Date(targetDate)
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
