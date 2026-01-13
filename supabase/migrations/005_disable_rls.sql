-- Disable Row Level Security for public access
-- Created: 2026-01-13
-- Description: RLSを無効化してデータへのアクセスを許可

-- すべてのテーブルのRLSを無効化
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'RLS disabled for all tables - public access enabled';
END $$;
