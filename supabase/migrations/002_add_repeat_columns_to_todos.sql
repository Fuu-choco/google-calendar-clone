-- Add repeat functionality to todos table
-- Created: 2026-01-19
-- Description: 週繰り返し、月繰り返しなどの機能をサポートするためのカラムを追加

-- 繰り返し設定のカラムを追加（既に存在する場合はスキップ）
ALTER TABLE todos ADD COLUMN IF NOT EXISTS repeat TEXT CHECK (repeat IN ('none', 'daily', 'weekly', 'monthly'));
ALTER TABLE todos ADD COLUMN IF NOT EXISTS repeat_days INTEGER[]; -- 週繰り返しの場合：曜日(0-6)の配列
ALTER TABLE todos ADD COLUMN IF NOT EXISTS repeat_date INTEGER CHECK (repeat_date >= 1 AND repeat_date <= 31); -- 月繰り返しの場合：日付(1-31)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS parent_todo_id UUID REFERENCES todos(id) ON DELETE CASCADE; -- 繰り返しTodoの親ID

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_todos_repeat ON todos(repeat) WHERE repeat IS NOT NULL AND repeat != 'none';
CREATE INDEX IF NOT EXISTS idx_todos_parent ON todos(parent_todo_id) WHERE parent_todo_id IS NOT NULL;

-- 既存のレコードにデフォルト値を設定（repeat = 'none'）
UPDATE todos SET repeat = 'none' WHERE repeat IS NULL;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Successfully added repeat columns to todos table!';
  RAISE NOTICE 'New columns: repeat, repeat_days, repeat_date, parent_todo_id';
END $$;
