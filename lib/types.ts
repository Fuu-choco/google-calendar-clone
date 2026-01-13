export type Priority = 'high' | 'medium' | 'low';
export type FocusType = '朝型' | '夜型';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

export interface Template {
  id: string;
  name: string;
  duration: number;
  category: string;
  priority: Priority;
  color: string;
  isDefault?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  priority: Priority;
  category: string;
  color?: string;
  isFixed: boolean;
  notificationEnabled: boolean;
  notificationMinutes: number[];
  repeat: RepeatType;
  repeatDays?: number[];
  repeatDate?: number;
  showInMonthView?: boolean;
  status?: 'completed' | 'pending' | 'cancelled';
  _originalId?: string; // 繰り返しイベントの元のID
  _isRecurring?: boolean; // 繰り返しイベントであることを示す
}

export interface Todo {
  id: string;
  content: string;
  completed: boolean;
  dueDate: string;
  createdDate: string;
  priority?: Priority;
  repeat?: RepeatType;
  repeatDays?: number[]; // 毎週の場合：曜日(0-6)
  repeatDate?: number; // 毎月の場合：日付(1-31)
  parentTodoId?: string; // 繰り返しTodoの親ID
}

export interface UserSettings {
  focusType: FocusType;
  workDuration: number;
  breakDuration: number;
  wakeTime: string;
  sleepTime: string;
  notificationEnabled: boolean;
  taskReminder: boolean;
  taskReminderMinutes: number;
  morningReview: boolean;
  morningReviewTime: string;
  sleepReminder: boolean;
  sleepReminderTime: string;
  longWorkAlert: boolean;
  longWorkAlertHours: number;
}

export interface Goal {
  studyHours: number;
  studyLongTermHours: number;
  studyLongTermDeadline: string;
  workHours: number;
  todoCompletionRate: number;
  studyCategoryId: string;
  workCategoryId: string;
}

export interface WeeklyProgress {
  studyHours: number;
  workHours: number;
  todoCompletionRate: number;
  wakeTimeDays: number;
}

export interface AchievementHistory {
  week: string;
  overallRate: number;
  studyRate: number;
  workRate: number;
}
