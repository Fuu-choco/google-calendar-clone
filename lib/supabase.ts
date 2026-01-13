import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabase設定がない場合は警告のみ（エラーを出さない）
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Supabase環境変数が設定されていません。');
    console.warn('データはブラウザのIndexedDBに保存されます。');
    console.warn('複数デバイスでデータを共有するには、Supabaseのセットアップが必要です。');
    console.warn('詳細: SUPABASE_MIGRATION_GUIDE.md を参照してください。');
  }
}

// ダミーのSupabaseクライアントを作成（設定がない場合）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;
