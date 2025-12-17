-- カテゴリのCHECK制約を削除して、カスタムカテゴリを許可する
-- Created: 2025-12-17

-- calendar_eventsテーブルのcategoryカラムのCHECK制約を削除
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_category_check;

-- templatesテーブルのcategoryカラムのCHECK制約も削除
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_category_check;

-- 既存のイベントデータがあればそのまま維持される
-- 今後はcategoriesテーブルに定義されている任意のカテゴリを使用可能
