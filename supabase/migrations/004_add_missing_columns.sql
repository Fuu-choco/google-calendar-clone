-- Add missing columns for data migration
-- Created: 2026-01-13
-- Description: Todoテーブルにrepeatカラム、templatesテーブルにdurationエイリアスを追加

-- ============================================================
-- 1. todosテーブルにrepeatカラムを追加
-- ============================================================
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS repeat TEXT DEFAULT 'none'
CHECK (repeat IN ('none', 'daily', 'weekly', 'monthly'));

COMMENT ON COLUMN todos.repeat IS '繰り返し設定: none, daily, weekly, monthly';

-- ============================================================
-- 2. templatesテーブルにdurationカラム（エイリアス）を追加
-- ============================================================
-- default_durationをdurationとしても参照できるようにする
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- durationがNULLの場合はdefault_durationから値を設定
UPDATE templates
SET duration = default_duration
WHERE duration IS NULL;

-- 今後はdurationとdefault_durationを同期
CREATE OR REPLACE FUNCTION sync_template_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.duration IS NOT NULL THEN
    NEW.default_duration := NEW.duration;
  END IF;
  IF NEW.default_duration IS NOT NULL AND NEW.duration IS NULL THEN
    NEW.duration := NEW.default_duration;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_template_duration_trigger
BEFORE INSERT OR UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION sync_template_duration();

-- ============================================================
-- 完了
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Missing columns added successfully!';
  RAISE NOTICE '- todos.repeat column added';
  RAISE NOTICE '- templates.duration column added (synced with default_duration)';
END $$;
