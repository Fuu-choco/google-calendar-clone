-- 繰り返しイベントの例外日と終了日を管理するカラムを追加

-- calendar_events テーブルに例外日のリストを追加（この日は表示しない）
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS exception_dates TEXT[] DEFAULT '{}';

-- calendar_events テーブルに繰り返し終了日を追加
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

-- コメント追加
COMMENT ON COLUMN calendar_events.exception_dates IS '繰り返しイベントから除外する日付のリスト (YYYY-MM-DD形式)';
COMMENT ON COLUMN calendar_events.recurrence_end_date IS '繰り返しイベントの終了日';
