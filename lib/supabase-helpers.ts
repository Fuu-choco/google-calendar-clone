import { supabase } from './supabase';
import { CalendarEvent, Todo, Template } from './types';
import { TaskHistory } from './learningEngine';

// ============================================================
// Calendar Events
// ============================================================

export async function fetchCalendarEvents() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  // Supabaseのデータ形式をアプリの形式に変換
  return (data || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    start: event.scheduled_start,
    end: event.scheduled_end,
    priority: event.priority === 1 ? 'high' : event.priority === 2 ? 'medium' : 'low',
    category: event.category,
    color: event.color,
    isFixed: event.is_fixed,
    notificationEnabled: event.notification_enabled,
    notificationMinutes: event.notification_minutes_before || [],
    repeat: event.recurrence_type || 'none',
    repeatDays: event.recurrence_days || undefined,
    repeatDate: undefined, // TODO: 月繰り返しの日付は別途実装が必要
    exceptionDates: event.exception_dates || [],
    recurrenceEndDate: event.recurrence_end_date || undefined,
  })) as CalendarEvent[];
}

export async function createCalendarEvent(event: CalendarEvent) {
  console.log('📝 Creating event:', event);

  const insertData = {
    title: event.title,
    scheduled_start: event.start,
    scheduled_end: event.end,
    category: event.category,
    priority: event.priority === 'high' ? 1 : event.priority === 'medium' ? 2 : 3,
    color: event.color || '#3B82F6',
    is_fixed: event.isFixed || false,
    notification_enabled: event.notificationEnabled || false,
    notification_minutes_before: event.notificationMinutes || [],
    recurrence_type: event.repeat || 'none',
    recurrence_days: event.repeatDays || null,
    exception_dates: event.exceptionDates || [],
    recurrence_end_date: event.recurrenceEndDate || null,
    status: 'pending',
  };

  console.log('📤 Inserting to Supabase:', insertData);

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating calendar event:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('✅ Event created successfully:', data);
  return data;
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>) {
  const dbUpdates: any = {};

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.start !== undefined) dbUpdates.scheduled_start = updates.start;
  if (updates.end !== undefined) dbUpdates.scheduled_end = updates.end;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.priority !== undefined) {
    dbUpdates.priority = updates.priority === 'high' ? 1 : updates.priority === 'medium' ? 2 : 3;
  }
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.isFixed !== undefined) dbUpdates.is_fixed = updates.isFixed;
  if (updates.notificationEnabled !== undefined) dbUpdates.notification_enabled = updates.notificationEnabled;
  if (updates.notificationMinutes !== undefined) dbUpdates.notification_minutes_before = updates.notificationMinutes;
  if (updates.repeat !== undefined) dbUpdates.recurrence_type = updates.repeat;
  if (updates.repeatDays !== undefined) dbUpdates.recurrence_days = updates.repeatDays;
  if (updates.exceptionDates !== undefined) dbUpdates.exception_dates = updates.exceptionDates;
  if (updates.recurrenceEndDate !== undefined) dbUpdates.recurrence_end_date = updates.recurrenceEndDate;

  const { data, error} = await supabase
    .from('calendar_events')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }

  return data;
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

// ============================================================
// Todos
// ============================================================

export async function fetchTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('Error fetching todos:', error);
    return [];
  }

  return (data || []).map((todo: any) => ({
    id: todo.id,
    content: todo.content,
    completed: todo.completed,
    dueDate: todo.due_date,
    createdDate: todo.created_date,
    priority: todo.priority,
    repeat: todo.repeat || 'none',
    repeatDays: todo.repeat_days || undefined,
    repeatDate: todo.repeat_date || undefined,
    parentTodoId: todo.parent_todo_id || undefined,
  })) as Todo[];
}

export async function createTodo(todo: Omit<Todo, 'id'>) {
  const { data, error } = await supabase
    .from('todos')
    .insert({
      content: todo.content,
      completed: todo.completed || false,
      due_date: todo.dueDate,
      created_date: todo.createdDate || new Date().toISOString().split('T')[0],
      priority: todo.priority,
      repeat: todo.repeat || 'none',
      repeat_days: todo.repeatDays || null,
      repeat_date: todo.repeatDate || null,
      parent_todo_id: todo.parentTodoId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating todo:', error);
    throw error;
  }

  return data;
}

export async function updateTodo(id: string, updates: Partial<Todo>) {
  const dbUpdates: any = {};

  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.completed !== undefined) {
    dbUpdates.completed = updates.completed;
    dbUpdates.completed_date = updates.completed ? new Date().toISOString().split('T')[0] : null;
  }
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.repeat !== undefined) dbUpdates.repeat = updates.repeat;
  if (updates.repeatDays !== undefined) dbUpdates.repeat_days = updates.repeatDays;
  if (updates.repeatDate !== undefined) dbUpdates.repeat_date = updates.repeatDate;
  if (updates.parentTodoId !== undefined) dbUpdates.parent_todo_id = updates.parentTodoId;

  const { data, error } = await supabase
    .from('todos')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating todo:', error);
    throw error;
  }

  return data;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting todo:', error);
    throw error;
  }
}

// ============================================================
// User Preferences
// ============================================================

export async function fetchUserPreferences() {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching user preferences:', error);

    // データが存在しない場合は初期データを作成
    if (error.code === 'PGRST116') {
      console.log('Creating initial user preferences...');
      const { data: newData, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          concentration_type: 'morning',
          work_duration_pref: 50,
          break_duration_pref: 10,
          ideal_wake_time: '06:00',
          ideal_sleep_time: '23:00',
          notifications_enabled: true,
          task_reminder_default_minutes: 5,
          morning_schedule_check_enabled: true,
          morning_schedule_check_time: '06:00',
          sleep_reminder_enabled: true,
          sleep_reminder_time: '23:00',
          long_work_alert_enabled: true,
          long_work_alert_hours: 2,
          todo_reminder_enabled: true,
          weekly_study_hours_goal: 20,
          weekly_work_hours_goal: 40,
          todo_completion_goal: 90,
          study_long_term_hours_goal: 0,
          study_long_term_deadline: '',
          study_category_id: '1',
          work_category_id: '2',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user preferences:', insertError);
        return null;
      }

      return newData;
    }

    return null;
  }

  return data;
}

export async function updateUserPreferences(settings: any, goals: any) {
  // アプリの設定とgoalsをデータベース形式に変換
  const dbSettings = {
    concentration_type: settings.focusType === '朝型' ? 'morning' : 'night',
    work_duration_pref: settings.workDuration,
    break_duration_pref: settings.breakDuration,
    ideal_wake_time: settings.wakeTime,
    ideal_sleep_time: settings.sleepTime,
    notifications_enabled: settings.notificationEnabled,
    task_reminder_default_minutes: settings.taskReminderMinutes,
    morning_schedule_check_enabled: settings.morningReview,
    morning_schedule_check_time: settings.morningReviewTime,
    sleep_reminder_enabled: settings.sleepReminder,
    sleep_reminder_time: settings.sleepReminderTime,
    long_work_alert_enabled: settings.longWorkAlert,
    long_work_alert_hours: settings.longWorkAlertHours,
    todo_reminder_enabled: settings.taskReminder,
    weekly_study_hours_goal: Math.round(goals.studyHours / 4), // 月次 → 週次
    weekly_work_hours_goal: Math.round(goals.workHours / 4), // 月次 → 週次
    todo_completion_goal: goals.todoCompletionRate,
    study_long_term_hours_goal: goals.studyLongTermHours || 0,
    study_long_term_deadline: goals.studyLongTermDeadline || '',
    study_category_id: goals.studyCategoryId || '1',
    work_category_id: goals.workCategoryId || '2',
    updated_at: new Date().toISOString(),
  };

  // まず既存のレコードを取得
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    // レコードが存在する場合は更新
    const { data, error } = await supabase
      .from('user_preferences')
      .update(dbSettings)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }

    return data;
  } else {
    // レコードが存在しない場合は新規作成
    const { data, error } = await supabase
      .from('user_preferences')
      .insert(dbSettings)
      .select()
      .single();

    if (error) {
      console.error('Error creating user preferences:', error);
      throw error;
    }

    return data;
  }
}

// ============================================================
// Templates
// ============================================================

export async function fetchTemplates() {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return (data || []).map((template: any) => ({
    id: template.id,
    name: template.name,
    duration: template.default_duration,
    category: template.category,
    priority: template.priority === 1 ? 'high' : template.priority === 2 ? 'medium' : 'low',
    color: template.color,
  })) as Template[];
}

export async function createTemplate(template: Omit<Template, 'id'>) {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: template.name,
      category: template.category,
      default_duration: template.duration,
      priority: template.priority === 'high' ? 1 : template.priority === 'medium' ? 2 : 3,
      color: template.color,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    throw error;
  }

  return data;
}

export async function updateTemplate(id: string, updates: Partial<Template>) {
  const dbUpdates: any = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.duration !== undefined) dbUpdates.default_duration = updates.duration;
  if (updates.priority !== undefined) {
    dbUpdates.priority = updates.priority === 'high' ? 1 : updates.priority === 'medium' ? 2 : 3;
  }
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  const { data, error } = await supabase
    .from('templates')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    throw error;
  }

  return data;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

// ============================================================
// Categories
// ============================================================

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data || []).map((category: any) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    isDefault: category.is_default,
  }));
}

export async function createCategory(category: { name: string; color: string }) {
  // 最大のsort_orderを取得
  const { data: maxSortOrder } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: category.name,
      color: category.color,
      is_default: false,
      sort_order: (maxSortOrder?.sort_order || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }

  return data;
}

export async function updateCategory(id: string, updates: { name?: string; color?: string }) {
  const dbUpdates: any = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  const { data, error } = await supabase
    .from('categories')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }

  return data;
}

export async function deleteCategory(id: string) {
  // デフォルトカテゴリは削除不可
  const { data: category } = await supabase
    .from('categories')
    .select('is_default')
    .eq('id', id)
    .single();

  if (category?.is_default) {
    throw new Error('デフォルトカテゴリは削除できません');
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

// ============================================================
// Learning Data (Task History)
// ============================================================

/**
 * タスク実行履歴を保存
 */
export async function saveTaskHistory(history: TaskHistory) {
  const { data, error } = await supabase
    .from('task_history')
    .insert({
      event_id: history.eventId,
      template_id: history.templateId,
      title: history.title,
      category: history.category,
      priority: history.priority,
      scheduled_start: history.scheduledStart,
      scheduled_end: history.scheduledEnd,
      actual_start: history.actualStart,
      actual_end: history.actualEnd,
      duration_scheduled: history.durationScheduled,
      duration_actual: history.durationActual,
      edit_type: history.editType || 'none',
      status: history.status,
      time_slot: history.timeSlot,
      weekday: history.weekday,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving task history:', error);
    throw error;
  }

  return data;
}

/**
 * タスク実行履歴を取得（最近N日間）
 */
export async function fetchTaskHistory(days: number = 30): Promise<TaskHistory[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .gte('scheduled_start', startDate.toISOString())
    .order('scheduled_start', { ascending: false });

  if (error) {
    console.error('Error fetching task history:', error);
    return [];
  }

  return (data || []).map((h: any) => ({
    id: h.id,
    eventId: h.event_id,
    templateId: h.template_id,
    title: h.title,
    category: h.category,
    priority: h.priority,
    scheduledStart: h.scheduled_start,
    scheduledEnd: h.scheduled_end,
    actualStart: h.actual_start,
    actualEnd: h.actual_end,
    durationScheduled: h.duration_scheduled,
    durationActual: h.duration_actual,
    editType: h.edit_type,
    status: h.status,
    timeSlot: h.time_slot,
    weekday: h.weekday,
  }));
}

/**
 * 学習データ（集中度スコア、タスク所要時間）をuser_preferencesに保存
 */
export async function saveLearningData(
  concentrationScores: Record<string, number>,
  taskDurations: Record<string, number>
) {
  const { error } = await supabase
    .from('user_preferences')
    .update({
      concentration_scores: concentrationScores,
      task_durations: taskDurations,
      updated_at: new Date().toISOString(),
    })
    .limit(1); // 単一ユーザーなので1件のみ

  if (error) {
    console.error('Error saving learning data:', error);
    throw error;
  }
}

/**
 * 学習データを取得
 */
export async function fetchLearningData(): Promise<{
  concentrationScores: Record<string, number>;
  taskDurations: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('concentration_scores, task_durations')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching learning data:', error);
    return {
      concentrationScores: {},
      taskDurations: {},
    };
  }

  return {
    concentrationScores: data?.concentration_scores || {},
    taskDurations: data?.task_durations || {},
  };
}
