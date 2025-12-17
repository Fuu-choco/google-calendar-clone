/**
 * OpenAI AIクライアント
 */

import OpenAI from 'openai';

// OpenAIクライアントのシングルトンインスタンス
let openaiClient: OpenAI | null = null;

/**
 * OpenAIクライアントを取得
 */
export function getOpenAIClient(): OpenAI | null {
  // APIキーが設定されていない場合はnullを返す
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY が設定されていません。AI機能は無効です。');
    return null;
  }

  // 既存のクライアントがあればそれを返す
  if (openaiClient) {
    return openaiClient;
  }

  // 新しいクライアントを作成
  try {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI クライアントを初期化しました');
    return openaiClient;
  } catch (error) {
    console.error('❌ OpenAI クライアントの初期化に失敗しました:', error);
    return null;
  }
}

/**
 * AI機能が利用可能かチェック
 */
export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * AI APIのステータスメッセージを取得
 */
export function getAIStatusMessage(): string {
  if (isAIAvailable()) {
    return 'AI機能が有効です';
  }
  return 'AI機能を使用するには、.env.local ファイルに OPENAI_API_KEY を設定してください';
}
