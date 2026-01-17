-- Enable RLS and create public access policies
-- Created: 2026-01-15
-- Description: RLSを有効化し、パブリックアクセスポリシーを設定

-- ============================================================
-- 1. RLSを有効化
-- ============================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. パブリックアクセスポリシーを作成
-- ============================================================

-- calendar_events
CREATE POLICY "Enable read access for all users" ON calendar_events
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON calendar_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON calendar_events
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON calendar_events
  FOR DELETE USING (true);

-- todos
CREATE POLICY "Enable read access for all users" ON todos
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON todos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON todos
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON todos
  FOR DELETE USING (true);

-- categories
CREATE POLICY "Enable read access for all users" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON categories
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON categories
  FOR DELETE USING (true);

-- templates
CREATE POLICY "Enable read access for all users" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON templates
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON templates
  FOR DELETE USING (true);

-- user_preferences
CREATE POLICY "Enable read access for all users" ON user_preferences
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON user_preferences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON user_preferences
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON user_preferences
  FOR DELETE USING (true);

-- ============================================================
-- 完了メッセージ
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS enabled for all tables with public access policies';
  RAISE NOTICE 'Security warning: All data is accessible to anyone with the anon key';
  RAISE NOTICE 'For production use, consider implementing authentication';
END $$;
