-- Google Calendar Clone - Initial Database Schema
-- Created: 2025-11-30
-- Description: カレンダー、Todo、ユーザー設定、実績管理のテーブル定義

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. templates（タスクテンプレート）
-- ============================================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('学習', '勤務', 'その他')),
  default_duration INTEGER NOT NULL, -- 分単位
  priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)), -- 1=高, 2=中, 3=低
  color TEXT NOT NULL, -- HEX color code
  is_default BOOLEAN DEFAULT false, -- デフォルトテンプレートか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);

-- デフォルトテンプレートの挿入
INSERT INTO templates (name, category, default_duration, priority, color, is_default) VALUES
  ('起床', 'その他', 30, 2, '#6B7280', true),
  ('朝食', 'その他', 30, 2, '#6B7280', true),
  ('昼食', 'その他', 60, 2, '#6B7280', true),
  ('夕食', 'その他', 60, 2, '#6B7280', true),
  ('就寝準備', 'その他', 30, 2, '#6B7280', true),
  ('会議', '勤務', 60, 1, '#3B82F6', true),
  ('レポート作成', '学習', 120, 1, '#8B5CF6', true),
  ('休憩', 'その他', 10, 3, '#10B981', true);

-- ============================================================
-- 2. calendar_events（カレンダーイベント）
-- ============================================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,

  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,

  category TEXT NOT NULL CHECK (category IN ('学習', '勤務', 'その他')),
  priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)),
  color TEXT NOT NULL,

  is_fixed BOOLEAN DEFAULT false, -- マストタスクか（時間変更不可）
  is_auto_generated BOOLEAN DEFAULT false, -- 自動生成されたタスクか

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),

  -- 通知設定
  notification_enabled BOOLEAN DEFAULT false,
  notification_minutes_before INTEGER[], -- [5, 10, 15] など複数指定可能

  -- 繰り返し設定
  recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'custom')),
  recurrence_days INTEGER[], -- 曜日（0=日曜, 6=土曜）または月の日付
  recurrence_end_date DATE,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE, -- 繰り返しの親イベント

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_date ON calendar_events(scheduled_start, scheduled_end);
CREATE INDEX idx_events_template ON calendar_events(template_id);
CREATE INDEX idx_events_status ON calendar_events(status);
CREATE INDEX idx_events_parent ON calendar_events(parent_event_id);

-- サンプルイベントの挿入（今日の日付で）
INSERT INTO calendar_events (title, scheduled_start, scheduled_end, category, priority, color, is_fixed, notification_enabled, notification_minutes_before, status) VALUES
  ('会議', CURRENT_DATE + TIME '09:00', CURRENT_DATE + TIME '10:00', '勤務', 1, '#EF4444', true, true, ARRAY[5, 10], 'pending'),
  ('レポート作成', CURRENT_DATE + TIME '11:00', CURRENT_DATE + TIME '13:00', '学習', 1, '#8B5CF6', false, false, NULL, 'pending'),
  ('昼食', CURRENT_DATE + TIME '13:00', CURRENT_DATE + TIME '14:00', 'その他', 2, '#6B7280', false, false, NULL, 'pending');

-- ============================================================
-- 3. todos（Todoリスト）
-- ============================================================
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,

  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  completed_date DATE,

  carried_over BOOLEAN DEFAULT false, -- 繰り越しフラグ
  original_due_date DATE, -- 元の期限（繰り越し時）
  carry_over_count INTEGER DEFAULT 0, -- 繰り越し回数

  priority INTEGER CHECK (priority IN (1, 2, 3)),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_completed ON todos(completed);

-- サンプルTodoの挿入
INSERT INTO todos (content, completed, due_date, priority) VALUES
  ('レポート提出', false, CURRENT_DATE, 1),
  ('メール返信', false, CURRENT_DATE, 2),
  ('資料整理', false, CURRENT_DATE + 1, 2);

-- ============================================================
-- 4. user_preferences（ユーザー設定）
-- ============================================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 基本設定
  concentration_type TEXT DEFAULT 'morning' CHECK (concentration_type IN ('morning', 'afternoon', 'night')),
  work_duration_pref INTEGER DEFAULT 50, -- 分
  break_duration_pref INTEGER DEFAULT 10, -- 分
  ideal_wake_time TIME DEFAULT '06:00',
  ideal_sleep_time TIME DEFAULT '23:00',

  -- 通知設定
  notifications_enabled BOOLEAN DEFAULT true,
  task_reminder_default_minutes INTEGER DEFAULT 5,
  morning_schedule_check_enabled BOOLEAN DEFAULT true,
  morning_schedule_check_time TIME DEFAULT '06:00',
  sleep_reminder_enabled BOOLEAN DEFAULT true,
  sleep_reminder_time TIME DEFAULT '23:00',
  long_work_alert_enabled BOOLEAN DEFAULT true,
  long_work_alert_hours INTEGER DEFAULT 2,
  todo_reminder_enabled BOOLEAN DEFAULT true,
  todo_reminder_time TIME DEFAULT '17:00',

  -- 目標設定
  weekly_study_hours_goal INTEGER DEFAULT 20,
  weekly_work_hours_goal INTEGER DEFAULT 40,
  todo_completion_goal INTEGER DEFAULT 90, -- パーセント

  -- 達成率の重み付け
  achievement_weight_study DECIMAL(3,2) DEFAULT 0.30,
  achievement_weight_work DECIMAL(3,2) DEFAULT 0.30,
  achievement_weight_todo DECIMAL(3,2) DEFAULT 0.30,
  achievement_weight_sleep DECIMAL(3,2) DEFAULT 0.10,

  -- 学習データ（JSON）
  concentration_scores JSONB DEFAULT '{}', -- {"6-9": 0.8, "9-12": 0.9, ...}
  task_durations JSONB DEFAULT '{}', -- {"会議": 65, "レポート作成": 130, ...}
  break_pattern JSONB DEFAULT '{}', -- {"average_work_duration": 90, ...}

  -- UI設定
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  week_starts_on INTEGER DEFAULT 1 CHECK (week_starts_on IN (0, 1)), -- 0=日曜, 1=月曜

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 単一ユーザーなので1レコードのみ許可
CREATE UNIQUE INDEX idx_user_preferences_singleton ON user_preferences ((id IS NOT NULL));

-- デフォルト設定の挿入
INSERT INTO user_preferences (concentration_type, work_duration_pref, break_duration_pref) VALUES
  ('morning', 50, 10);

-- ============================================================
-- 5. task_history（タスク実行履歴）
-- ============================================================
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority INTEGER NOT NULL,

  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,

  duration_scheduled INTEGER, -- 予定所要時間（分）
  duration_actual INTEGER, -- 実際の所要時間（分）

  edit_type TEXT CHECK (edit_type IN ('none', 'shortened', 'extended', 'moved', 'deleted')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'canceled')),

  -- 分析用
  time_slot TEXT CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'night')), -- 6-12, 12-18, 18-22, 22-6
  weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6), -- 0=日曜

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_history_event ON task_history(event_id);
CREATE INDEX idx_history_template ON task_history(template_id);
CREATE INDEX idx_history_date ON task_history(scheduled_start);
CREATE INDEX idx_history_time_slot ON task_history(time_slot);

-- ============================================================
-- 6. weekly_achievements（週次実績）
-- ============================================================
CREATE TABLE weekly_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start_date DATE NOT NULL UNIQUE, -- 週の開始日（月曜）

  -- 目標
  study_hours_goal DECIMAL(5,2),
  work_hours_goal DECIMAL(5,2),
  todo_completion_goal INTEGER,
  sleep_achievement_goal INTEGER, -- 日数

  -- 実績
  study_hours_actual DECIMAL(5,2) DEFAULT 0,
  work_hours_actual DECIMAL(5,2) DEFAULT 0,
  todo_completion_rate DECIMAL(5,2) DEFAULT 0, -- パーセント
  sleep_achievement_days INTEGER DEFAULT 0,

  -- 達成率
  study_achievement_rate DECIMAL(5,2),
  work_achievement_rate DECIMAL(5,2),
  todo_achievement_rate DECIMAL(5,2),
  sleep_achievement_rate DECIMAL(5,2),
  overall_achievement_rate DECIMAL(5,2), -- 総合達成率

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weekly_achievements_date ON weekly_achievements(week_start_date);

-- 今週のサンプルデータ
INSERT INTO weekly_achievements (
  week_start_date,
  study_hours_goal, work_hours_goal, todo_completion_goal, sleep_achievement_goal,
  study_hours_actual, work_hours_actual, todo_completion_rate, sleep_achievement_days,
  study_achievement_rate, work_achievement_rate, todo_achievement_rate, sleep_achievement_rate, overall_achievement_rate
) VALUES (
  DATE_TRUNC('week', CURRENT_DATE)::DATE + 1, -- 今週の月曜日
  20, 40, 90, 7,
  15.0, 38.0, 85.0, 5,
  75.0, 95.0, 94.4, 71.4, 83.6
);

-- ============================================================
-- 7. monthly_achievements（月次実績）
-- ============================================================
CREATE TABLE monthly_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_start_date DATE NOT NULL UNIQUE, -- 月の開始日（1日）

  -- 目標（週次×4で計算）
  study_hours_goal DECIMAL(5,2),
  work_hours_goal DECIMAL(5,2),
  todo_completion_goal INTEGER,
  sleep_achievement_goal INTEGER,

  -- 実績
  study_hours_actual DECIMAL(5,2) DEFAULT 0,
  work_hours_actual DECIMAL(5,2) DEFAULT 0,
  todo_completion_rate DECIMAL(5,2) DEFAULT 0,
  sleep_achievement_days INTEGER DEFAULT 0,

  -- 達成率
  study_achievement_rate DECIMAL(5,2),
  work_achievement_rate DECIMAL(5,2),
  todo_achievement_rate DECIMAL(5,2),
  sleep_achievement_rate DECIMAL(5,2),
  overall_achievement_rate DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_monthly_achievements_date ON monthly_achievements(month_start_date);

-- ============================================================
-- 8. sync_conflicts（同期競合）
-- ============================================================
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'todo')),
  entity_id UUID NOT NULL,

  local_version JSONB NOT NULL, -- ローカルの変更内容
  server_version JSONB NOT NULL, -- サーバーの変更内容

  local_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  server_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

  resolution TEXT CHECK (resolution IN ('pending', 'local', 'server', 'both', 'canceled')),
  resolved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX idx_conflicts_resolution ON sync_conflicts(resolution);

-- ============================================================
-- データベース関数
-- ============================================================

-- 古いデータの自動削除
CREATE OR REPLACE FUNCTION delete_old_data()
RETURNS void AS $$
BEGIN
  -- 1年以上前のカレンダーイベントを削除
  DELETE FROM calendar_events
  WHERE scheduled_end < NOW() - INTERVAL '1 year';

  -- 完了後90日以上経過したTodoを削除
  DELETE FROM todos
  WHERE completed = true
    AND completed_date < CURRENT_DATE - INTERVAL '90 days';

  -- 1年以上前のタスク履歴を削除
  DELETE FROM task_history
  WHERE created_at < NOW() - INTERVAL '1 year';

END;
$$ LANGUAGE plpgsql;

-- 週次集計の更新
CREATE OR REPLACE FUNCTION update_weekly_achievements(week_date DATE)
RETURNS void AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  study_hours DECIMAL(5,2);
  work_hours DECIMAL(5,2);
  todo_rate DECIMAL(5,2);
  sleep_days INTEGER;
  prefs RECORD;
BEGIN
  -- 週の開始日（月曜）を計算
  week_start := DATE_TRUNC('week', week_date)::DATE + 1;
  week_end := week_start + INTERVAL '6 days';

  -- ユーザー設定を取得
  SELECT * INTO prefs FROM user_preferences LIMIT 1;

  -- 学習時間を集計
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (actual_end - actual_start)) / 3600), 0)
  INTO study_hours
  FROM task_history
  WHERE category = '学習'
    AND status = 'completed'
    AND scheduled_start::DATE BETWEEN week_start AND week_end;

  -- 勤務時間を集計
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (actual_end - actual_start)) / 3600), 0)
  INTO work_hours
  FROM task_history
  WHERE category = '勤務'
    AND status = 'completed'
    AND scheduled_start::DATE BETWEEN week_start AND week_end;

  -- Todo達成率を計算
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE completed = true)::DECIMAL / COUNT(*) * 100)
    END
  INTO todo_rate
  FROM todos
  WHERE created_date BETWEEN week_start AND week_end;

  -- 起床時間達成日数を計算（簡易版）
  sleep_days := 0;

  -- weekly_achievements に挿入または更新
  INSERT INTO weekly_achievements (
    week_start_date,
    study_hours_goal,
    work_hours_goal,
    todo_completion_goal,
    study_hours_actual,
    work_hours_actual,
    todo_completion_rate,
    sleep_achievement_days,
    study_achievement_rate,
    work_achievement_rate,
    todo_achievement_rate
  ) VALUES (
    week_start,
    prefs.weekly_study_hours_goal,
    prefs.weekly_work_hours_goal,
    prefs.todo_completion_goal,
    study_hours,
    work_hours,
    todo_rate,
    sleep_days,
    CASE WHEN prefs.weekly_study_hours_goal > 0 THEN (study_hours / prefs.weekly_study_hours_goal * 100) ELSE 0 END,
    CASE WHEN prefs.weekly_work_hours_goal > 0 THEN (work_hours / prefs.weekly_work_hours_goal * 100) ELSE 0 END,
    CASE WHEN prefs.todo_completion_goal > 0 THEN (todo_rate / prefs.todo_completion_goal * 100) ELSE 0 END
  )
  ON CONFLICT (week_start_date)
  DO UPDATE SET
    study_hours_actual = EXCLUDED.study_hours_actual,
    work_hours_actual = EXCLUDED.work_hours_actual,
    todo_completion_rate = EXCLUDED.todo_completion_rate,
    sleep_achievement_days = EXCLUDED.sleep_achievement_days,
    study_achievement_rate = EXCLUDED.study_achievement_rate,
    work_achievement_rate = EXCLUDED.work_achievement_rate,
    todo_achievement_rate = EXCLUDED.todo_achievement_rate,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー適用
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_achievements_updated_at BEFORE UPDATE ON weekly_achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_achievements_updated_at BEFORE UPDATE ON monthly_achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 完了
-- ============================================================

-- スキーマ作成完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables: templates, calendar_events, todos, user_preferences, task_history, weekly_achievements, monthly_achievements, sync_conflicts';
  RAISE NOTICE 'Sample data inserted for testing';
END $$;
