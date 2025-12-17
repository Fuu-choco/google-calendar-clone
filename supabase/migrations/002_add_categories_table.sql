-- Google Calendar Clone - Categories Table
-- Created: 2025-12-01
-- Description: カテゴリ管理テーブルの追加

-- ============================================================
-- categories（カテゴリ管理）
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL, -- HEX color code
  is_default BOOLEAN DEFAULT false, -- デフォルトカテゴリか（削除不可）
  sort_order INTEGER DEFAULT 0, -- 表示順
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- デフォルトカテゴリの挿入
INSERT INTO categories (name, color, is_default, sort_order) VALUES
  ('学習', '#3B82F6', true, 1),
  ('勤務', '#10B981', true, 2),
  ('その他', '#6B7280', true, 3);

-- updated_at 自動更新トリガー
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Categories table created successfully!';
  RAISE NOTICE 'Default categories inserted: 学習, 勤務, その他';
END $$;
