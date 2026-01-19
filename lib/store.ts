import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalendarEvent, Todo, Template, UserSettings, Goal, CategoryItem } from './types';
import { AppNotification } from './types/notification';
import { addDays, format } from 'date-fns';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchTodos,
  createTodo,
  updateTodo as updateTodoSupabase,
  deleteTodo as deleteTodoSupabase,
  fetchTemplates,
  createTemplate,
  updateTemplate as updateTemplateSupabase,
  deleteTemplate as deleteTemplateSupabase,
  fetchCategories,
  createCategory,
  updateCategory as updateCategorySupabase,
  deleteCategory as deleteCategorySupabase,
  fetchUserPreferences,
  updateUserPreferences,
} from './supabase-helpers';
import {
  eventsDB,
  todosDB,
  templatesDB,
  categoriesDB,
  settingsDB,
  goalsDB,
  initializeDatabase,
} from './indexedDB';
import { generateRepeatTodos } from './repeatTodoGenerator';
import { generateId } from './utils';

// Supabaseが設定されているかチェック
const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

interface AppState {
  currentDate: Date;
  selectedDate: Date | null;
  viewMode: 'month' | 'day';
  currentTab: 'calendar' | 'todo' | 'dashboard' | 'settings';
  events: CalendarEvent[];
  todos: Todo[];
  templates: Template[];
  categories: CategoryItem[];
  userSettings: UserSettings;
  goals: Goal;
  selectedEvent: CalendarEvent | null;
  isLoading: boolean;
  notifications: AppNotification[];

  // データ取得
  fetchData: () => Promise<void>;

  // UI状態
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setViewMode: (mode: 'month' | 'day') => void;
  setCurrentTab: (tab: 'calendar' | 'todo' | 'dashboard' | 'settings') => void;

  // イベント操作
  addEvent: (event: CalendarEvent) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setSelectedEvent: (event: CalendarEvent | null) => void;

  // Todo操作
  addTodo: (todo: Todo) => Promise<void>;
  updateTodo: (id: string, todo: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  createEventsFromTodo: (todo: Todo) => Promise<void>;

  // テンプレート操作
  addTemplate: (template: Template) => Promise<void>;
  updateTemplate: (id: string, template: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // その他
  addCategory: (category: Omit<CategoryItem, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<CategoryItem>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateGoals: (goals: Partial<Goal>) => void;

  // 通知操作
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getUnreadCount: () => number;
}

const mockTemplates: Template[] = [
  { id: '1', name: '会議', duration: 60, category: '勤務', priority: 'high', color: '#EF4444' },
  { id: '2', name: 'レポート作成', duration: 120, category: '学習', priority: 'high', color: '#EF4444' },
  { id: '3', name: '休憩', duration: 10, category: 'その他', priority: 'low', color: '#10B981' },
  { id: '4', name: '朝食', duration: 30, category: 'その他', priority: 'medium', color: '#F59E0B' },
  { id: '5', name: '睡眠', duration: 420, category: 'その他', priority: 'low', color: '#10B981' },
];

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: '睡眠',
    start: `${todayStr}T00:00:00`,
    end: `${todayStr}T06:00:00`,
    priority: 'low',
    category: 'その他',
    isFixed: false,
    notificationEnabled: false,
    notificationMinutes: [],
    repeat: 'none',
  },
  {
    id: '2',
    title: '朝食',
    start: `${todayStr}T07:00:00`,
    end: `${todayStr}T07:30:00`,
    priority: 'medium',
    category: 'その他',
    isFixed: false,
    notificationEnabled: false,
    notificationMinutes: [],
    repeat: 'none',
  },
  {
    id: '3',
    title: '会議',
    start: `${todayStr}T09:00:00`,
    end: `${todayStr}T10:00:00`,
    priority: 'high',
    category: '勤務',
    isFixed: true,
    notificationEnabled: true,
    notificationMinutes: [5, 10],
    repeat: 'none',
  },
  {
    id: '4',
    title: '休憩',
    start: `${todayStr}T10:00:00`,
    end: `${todayStr}T10:10:00`,
    priority: 'low',
    category: 'その他',
    isFixed: false,
    notificationEnabled: false,
    notificationMinutes: [],
    repeat: 'none',
  },
  {
    id: '5',
    title: 'レポート作成',
    start: `${todayStr}T11:00:00`,
    end: `${todayStr}T13:00:00`,
    priority: 'high',
    category: '学習',
    isFixed: false,
    notificationEnabled: true,
    notificationMinutes: [5],
    repeat: 'none',
  },
  {
    id: '6',
    title: 'ランチ',
    start: `${todayStr}T13:00:00`,
    end: `${todayStr}T14:00:00`,
    priority: 'medium',
    category: 'その他',
    isFixed: false,
    notificationEnabled: false,
    notificationMinutes: [],
    repeat: 'none',
  },
];

const mockTodos: Todo[] = [
  { id: '1', content: 'レポート提出', completed: true, dueDate: todayStr, createdDate: todayStr },
  { id: '2', content: 'メール返信', completed: false, dueDate: todayStr, createdDate: todayStr },
  { id: '3', content: '資料整理', completed: false, dueDate: format(addDays(today, 1), 'yyyy-MM-dd'), createdDate: todayStr },
  { id: '4', content: 'プレゼン準備', completed: false, dueDate: todayStr, createdDate: format(addDays(today, -1), 'yyyy-MM-dd') },
];

const defaultSettings: UserSettings = {
  focusType: '朝型',
  workDuration: 50,
  breakDuration: 10,
  wakeTime: '06:00',
  sleepTime: '23:00',
  notificationEnabled: true,
  taskReminder: true,
  taskReminderMinutes: 5,
  morningReview: true,
  morningReviewTime: '06:00',
  sleepReminder: true,
  sleepReminderTime: '23:00',
  longWorkAlert: true,
  longWorkAlertHours: 2,
};

const defaultGoals: Goal = {
  studyHours: 80,
  studyLongTermHours: 1000,
  studyLongTermDeadline: '2025-12-31',
  workHours: 160,
  todoCompletionRate: 90,
  studyCategoryId: '1',
  workCategoryId: '2',
};

const defaultCategories: CategoryItem[] = [
  { id: '1', name: '学習', color: '#3B82F6', isDefault: true },
  { id: '2', name: '勤務', color: '#10B981', isDefault: true },
  { id: '3', name: 'その他', color: '#6B7280', isDefault: true },
];

// Browser check for SSR safety
const isBrowser = typeof window !== 'undefined';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentDate: new Date(),
      selectedDate: null,
      viewMode: 'day',
      currentTab: 'calendar',
      events: [],
      todos: [],
      templates: [],
      categories: defaultCategories,
      userSettings: defaultSettings,
      goals: defaultGoals,
      selectedEvent: null,
      isLoading: false,
      notifications: [],

      // データを取得（Supabaseまたはオフライン）
      fetchData: async () => {
        set({ isLoading: true });
        try {
          // Supabaseが設定されているかチェック
          const useSupabase = isSupabaseConfigured();

          if (useSupabase) {
            console.log('📡 Loading data from Supabase...');
            // Supabaseからデータを取得
            const [events, todos, templates, categories, userPrefs] = await Promise.all([
              fetchCalendarEvents(),
              fetchTodos(),
              fetchTemplates(),
              fetchCategories(),
              fetchUserPreferences(),
            ]);

            // Supabaseのuser_preferencesからアプリの設定と目標を変換
            const userSettings: UserSettings = userPrefs ? {
              focusType: userPrefs.concentration_type === 'morning' ? '朝型' : '夜型',
              workDuration: userPrefs.work_duration_pref,
              breakDuration: userPrefs.break_duration_pref,
              wakeTime: userPrefs.ideal_wake_time,
              sleepTime: userPrefs.ideal_sleep_time,
              notificationEnabled: userPrefs.notifications_enabled,
              taskReminder: userPrefs.todo_reminder_enabled,
              taskReminderMinutes: userPrefs.task_reminder_default_minutes,
              morningReview: userPrefs.morning_schedule_check_enabled,
              morningReviewTime: userPrefs.morning_schedule_check_time,
              sleepReminder: userPrefs.sleep_reminder_enabled,
              sleepReminderTime: userPrefs.sleep_reminder_time,
              longWorkAlert: userPrefs.long_work_alert_enabled,
              longWorkAlertHours: userPrefs.long_work_alert_hours,
            } : defaultSettings;

            console.log('📥 Loaded userSettings from Supabase:', userSettings);
            console.log('📊 userPrefs from DB:', userPrefs);

            const goals: Goal = userPrefs ? {
              studyHours: userPrefs.weekly_study_hours_goal * 4, // 週次 → 月次
              studyLongTermHours: userPrefs.study_long_term_hours_goal || 0,
              studyLongTermDeadline: userPrefs.study_long_term_deadline || '',
              workHours: userPrefs.weekly_work_hours_goal * 4, // 週次 → 月次
              todoCompletionRate: userPrefs.todo_completion_goal,
              studyCategoryId: userPrefs.study_category_id || '1',
              workCategoryId: userPrefs.work_category_id || '2',
            } : defaultGoals;

            console.log('🎯 Loaded goals from Supabase:', goals);

            // 繰り返しTodoを自動生成（30日先まで）
            const newRepeatTodos = generateRepeatTodos(todos, new Date(), 30);

            // 新しく生成されたTodoをSupabaseに保存
            if (newRepeatTodos.length > 0) {
              console.log(`📅 Generating ${newRepeatTodos.length} repeat todos...`);
              for (const newTodo of newRepeatTodos) {
                await createTodo(newTodo);
              }
            }

            // 全Todoを再取得（新しく生成されたものを含む）
            const allTodos = [...todos, ...newRepeatTodos];

            set({
              events,
              todos: allTodos,
              templates: templates.length > 0 ? templates : mockTemplates,
              categories: categories.length > 0 ? categories : defaultCategories,
              userSettings,
              goals,
              isLoading: false,
            });

            console.log('✅ Supabase data loaded successfully');
          } else {
            console.log('💾 Loading data from IndexedDB (offline mode)...');
            // IndexedDBからデータを取得
            await initializeDatabase();

            const [events, todos, templates, categories, userSettings, goals] = await Promise.all([
              eventsDB.getAll(),
              todosDB.getAll(),
              templatesDB.getAll(),
              categoriesDB.getAll(),
              settingsDB.get(),
              goalsDB.get(),
            ]);

            // 繰り返しTodoを自動生成（30日先まで）
            const newRepeatTodos = generateRepeatTodos(todos, new Date(), 30);

            // 新しく生成されたTodoをIndexedDBに保存
            if (newRepeatTodos.length > 0) {
              console.log(`📅 Generating ${newRepeatTodos.length} repeat todos...`);
              for (const newTodo of newRepeatTodos) {
                await todosDB.add(newTodo);
              }
            }

            // 全Todoを再取得（新しく生成されたものを含む）
            const allTodos = [...todos, ...newRepeatTodos];

            set({
              events,
              todos: allTodos,
              templates: templates.length > 0 ? templates : mockTemplates,
              categories: categories.length > 0 ? categories : defaultCategories,
              userSettings: userSettings || defaultSettings,
              goals: goals || defaultGoals,
              isLoading: false,
            });

            console.log('✅ IndexedDB data loaded successfully (offline mode)');
          }
        } catch (error) {
          console.error('❌ Error fetching data:', error);
          set({ isLoading: false });
        }
      },

      // UI状態
      setCurrentDate: (date) => set({ currentDate: date }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCurrentTab: (tab) => set({ currentTab: tab }),

      // イベント操作
      addEvent: async (event) => {
        console.log('💾 Store: addEvent called with:', event);
        try {
          // Supabaseに保存
          const savedEvent = await createCalendarEvent(event);
          console.log('✅ Store: Event saved to Supabase');

          // Supabaseのデータをアプリ形式に変換
          const appEvent: CalendarEvent = {
            id: savedEvent.id,
            title: savedEvent.title,
            start: savedEvent.scheduled_start,
            end: savedEvent.scheduled_end,
            priority: savedEvent.priority === 1 ? 'high' : savedEvent.priority === 2 ? 'medium' : 'low',
            category: savedEvent.category,
            color: savedEvent.color,
            isFixed: savedEvent.is_fixed,
            notificationEnabled: savedEvent.notification_enabled,
            notificationMinutes: savedEvent.notification_minutes_before || [],
            repeat: savedEvent.recurrence_type || 'none',
          };

          // ローカル状態を更新
          set((state) => ({ events: [...state.events, appEvent] }));
          console.log('✅ Store: Event added to state successfully');
        } catch (error) {
          console.error('❌ Store: Error adding event:', error);
          throw error;
        }
      },

      updateEvent: async (id, updates) => {
        try {
          const event = get().events.find((e) => e.id === id);
          if (!event) throw new Error('Event not found');

          const updatedEvent = { ...event, ...updates };
          await updateCalendarEvent(id, updates);

          set((state) => ({
            events: state.events.map((e) => (e.id === id ? updatedEvent : e)),
            selectedEvent: state.selectedEvent?.id === id ? updatedEvent : state.selectedEvent,
          }));
          console.log('✅ Event updated successfully');
        } catch (error) {
          console.error('❌ Error updating event:', error);
          throw error;
        }
      },

      deleteEvent: async (id) => {
        try {
          await deleteCalendarEvent(id);
          set((state) => ({
            events: state.events.filter((e) => e.id !== id),
            selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
          }));
          console.log('✅ Event deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting event:', error);
          throw error;
        }
      },

      setSelectedEvent: (event) => set({ selectedEvent: event }),

      // Todo操作
      addTodo: async (todo) => {
        try {
          const savedTodo = await createTodo(todo);
          // Supabaseのデータをアプリ形式に変換
          const appTodo: Todo = {
            id: savedTodo.id,
            content: savedTodo.content,
            completed: savedTodo.completed,
            dueDate: savedTodo.due_date,
            createdDate: savedTodo.created_date,
            priority: savedTodo.priority,
            repeat: savedTodo.repeat || todo.repeat || 'none',
            repeatDays: savedTodo.repeat_days || todo.repeatDays,
            repeatDate: savedTodo.repeat_date || todo.repeatDate,
            parentTodoId: savedTodo.parent_todo_id || todo.parentTodoId,
          };
          set((state) => ({ todos: [...state.todos, appTodo] }));
          console.log('✅ Todo added successfully');

          // Todoからカレンダーイベントを自動生成
          if (!todo.parentTodoId) {
            // 親Todoの場合のみ（子Todoはスキップ）
            await get().createEventsFromTodo(appTodo);
          }
        } catch (error) {
          console.error('❌ Error adding todo:', error);
          throw error;
        }
      },

      updateTodo: async (id, updates) => {
        try {
          const todo = get().todos.find((t) => t.id === id);
          if (!todo) throw new Error('Todo not found');

          const updatedTodo = { ...todo, ...updates };
          await updateTodoSupabase(id, updates);

          set((state) => ({
            todos: state.todos.map((t) => (t.id === id ? updatedTodo : t)),
          }));
          console.log('✅ Todo updated successfully');
        } catch (error) {
          console.error('❌ Error updating todo:', error);
          throw error;
        }
      },

      deleteTodo: async (id) => {
        try {
          await deleteTodoSupabase(id);
          set((state) => ({
            todos: state.todos.filter((t) => t.id !== id),
          }));
          console.log('✅ Todo deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting todo:', error);
          throw error;
        }
      },

      toggleTodo: async (id) => {
        const todo = get().todos.find((t) => t.id === id);
        if (!todo) return;

        try {
          const updatedTodo = { ...todo, completed: !todo.completed };
          await updateTodoSupabase(id, { completed: !todo.completed });

          set((state) => ({
            todos: state.todos.map((t) => (t.id === id ? updatedTodo : t)),
          }));
          console.log('✅ Todo toggled successfully');
        } catch (error) {
          console.error('❌ Error toggling todo:', error);
          throw error;
        }
      },

      createEventsFromTodo: async (todo) => {
        try {
          const userSettings = get().userSettings;

          // デフォルトの時間設定（9:00-10:00）
          const defaultStartTime = '09:00';
          const defaultEndTime = '10:00';

          // カテゴリに基づく色の決定
          const categoryColors: Record<string, string> = {
            '学習': '#8B5CF6',
            '勤務': '#3B82F6',
            'その他': '#6B7280',
          };
          const defaultCategory = 'その他';
          const category = defaultCategory;
          const color = categoryColors[category] || categoryColors['その他'];

          // 繰り返し設定に基づいてイベントを生成
          if (todo.repeat === 'none' || !todo.repeat) {
            // 単発のイベントを生成
            const eventDate = todo.dueDate;
            const newEvent: CalendarEvent = {
              id: generateId(),
              title: todo.content,
              start: `${eventDate}T${defaultStartTime}:00`,
              end: `${eventDate}T${defaultEndTime}:00`,
              priority: todo.priority || 'medium',
              category,
              color,
              isFixed: false,
              notificationEnabled: false,
              notificationMinutes: [],
              repeat: 'none',
            };
            await get().addEvent(newEvent);
            console.log('✅ Created single event from todo:', newEvent.title);
          } else if (todo.repeat === 'weekly' && todo.repeatDays) {
            // 週繰り返しのイベントを30日分生成
            const daysAhead = 30;
            const startDate = new Date(todo.dueDate);
            const endDate = addDays(startDate, daysAhead);

            let currentDate = new Date(startDate);
            const createdEvents: CalendarEvent[] = [];

            while (currentDate <= endDate) {
              const dayOfWeek = currentDate.getDay();

              // 指定された曜日の場合のみイベントを作成
              if (todo.repeatDays.includes(dayOfWeek)) {
                const eventDateStr = format(currentDate, 'yyyy-MM-dd');
                const newEvent: CalendarEvent = {
                  id: generateId(),
                  title: todo.content,
                  start: `${eventDateStr}T${defaultStartTime}:00`,
                  end: `${eventDateStr}T${defaultEndTime}:00`,
                  priority: todo.priority || 'medium',
                  category,
                  color,
                  isFixed: false,
                  notificationEnabled: false,
                  notificationMinutes: [],
                  repeat: 'weekly',
                  repeatDays: todo.repeatDays,
                };
                await get().addEvent(newEvent);
                createdEvents.push(newEvent);
              }

              currentDate = addDays(currentDate, 1);
            }

            console.log(`✅ Created ${createdEvents.length} weekly repeat events from todo:`, todo.content);
          } else if (todo.repeat === 'daily') {
            // 毎日繰り返しのイベントを30日分生成
            const daysAhead = 30;
            const startDate = new Date(todo.dueDate);

            for (let i = 0; i < daysAhead; i++) {
              const eventDate = addDays(startDate, i);
              const eventDateStr = format(eventDate, 'yyyy-MM-dd');

              const newEvent: CalendarEvent = {
                id: generateId(),
                title: todo.content,
                start: `${eventDateStr}T${defaultStartTime}:00`,
                end: `${eventDateStr}T${defaultEndTime}:00`,
                priority: todo.priority || 'medium',
                category,
                color,
                isFixed: false,
                notificationEnabled: false,
                notificationMinutes: [],
                repeat: 'daily',
              };
              await get().addEvent(newEvent);
            }

            console.log(`✅ Created 30 daily repeat events from todo:`, todo.content);
          } else if (todo.repeat === 'monthly' && todo.repeatDate) {
            // 月繰り返しのイベントを生成（次の3ヶ月分）
            const monthsAhead = 3;
            const startDate = new Date(todo.dueDate);

            for (let i = 0; i < monthsAhead; i++) {
              const eventDate = new Date(startDate);
              eventDate.setMonth(eventDate.getMonth() + i);
              eventDate.setDate(todo.repeatDate);

              const eventDateStr = format(eventDate, 'yyyy-MM-dd');

              const newEvent: CalendarEvent = {
                id: generateId(),
                title: todo.content,
                start: `${eventDateStr}T${defaultStartTime}:00`,
                end: `${eventDateStr}T${defaultEndTime}:00`,
                priority: todo.priority || 'medium',
                category,
                color,
                isFixed: false,
                notificationEnabled: false,
                notificationMinutes: [],
                repeat: 'monthly',
                repeatDate: todo.repeatDate,
              };
              await get().addEvent(newEvent);
            }

            console.log(`✅ Created 3 monthly repeat events from todo:`, todo.content);
          }
        } catch (error) {
          console.error('❌ Error creating events from todo:', error);
          throw error;
        }
      },

      // テンプレート操作
      addTemplate: async (template) => {
        try {
          const savedTemplate = await createTemplate(template);
          const appTemplate: Template = {
            id: savedTemplate.id,
            name: savedTemplate.name,
            duration: savedTemplate.default_duration,
            category: savedTemplate.category,
            priority: savedTemplate.priority === 1 ? 'high' : savedTemplate.priority === 2 ? 'medium' : 'low',
            color: savedTemplate.color,
          };
          set((state) => ({ templates: [...state.templates, appTemplate] }));
          console.log('✅ Template added successfully');
        } catch (error) {
          console.error('❌ Error adding template:', error);
          throw error;
        }
      },

      updateTemplate: async (id, updates) => {
        try {
          const template = get().templates.find((t) => t.id === id);
          if (!template) throw new Error('Template not found');

          const updatedTemplate = { ...template, ...updates };
          await updateTemplateSupabase(id, updates);

          set((state) => ({
            templates: state.templates.map((t) => (t.id === id ? updatedTemplate : t)),
          }));
          console.log('✅ Template updated successfully');
        } catch (error) {
          console.error('❌ Error updating template:', error);
          throw error;
        }
      },

      deleteTemplate: async (id) => {
        try {
          await deleteTemplateSupabase(id);
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
          }));
          console.log('✅ Template deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting template:', error);
          throw error;
        }
      },

      // カテゴリ操作
      addCategory: async (category) => {
        try {
          const savedCategory = await createCategory(category);
          const appCategory: CategoryItem = {
            id: savedCategory.id,
            name: savedCategory.name,
            color: savedCategory.color,
            isDefault: savedCategory.is_default,
          };
          set((state) => ({ categories: [...state.categories, appCategory] }));
          console.log('✅ Category added successfully');
        } catch (error) {
          console.error('❌ Error adding category:', error);
          throw error;
        }
      },

      updateCategory: async (id, updates) => {
        try {
          const category = get().categories.find((c) => c.id === id);
          if (!category) throw new Error('Category not found');

          const updatedCategory = { ...category, ...updates };
          await updateCategorySupabase(id, updates);

          set((state) => ({
            categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
          }));
          console.log('✅ Category updated successfully');
        } catch (error) {
          console.error('❌ Error updating category:', error);
          throw error;
        }
      },

      deleteCategory: async (id) => {
        try {
          await deleteCategorySupabase(id);
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
          }));
          console.log('✅ Category deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting category:', error);
          throw error;
        }
      },

      updateSettings: async (settings) => {
        const currentState = get();
        const newSettings = { ...currentState.userSettings, ...settings };

        console.log('💾 Saving settings to Supabase...', newSettings);
        console.log('🎯 Current goals:', currentState.goals);

        try {
          // ローカル状態を即座に更新
          set({ userSettings: newSettings });

          // Supabaseに保存（設定と目標を一緒に更新）
          const result = await updateUserPreferences(newSettings, currentState.goals);
          console.log('✅ Settings saved successfully', result);
        } catch (error) {
          console.error('❌ Error updating settings:', error);
          // エラー時は元に戻す
          set({ userSettings: currentState.userSettings });
          throw error;
        }
      },

      updateGoals: async (goals) => {
        const currentState = get();
        const newGoals = { ...currentState.goals, ...goals };

        console.log('🎯 Saving goals to Supabase...', newGoals);
        console.log('⚙️ Current settings:', currentState.userSettings);

        try {
          // ローカル状態を即座に更新
          set({ goals: newGoals });

          // Supabaseに保存（設定と目標を一緒に更新）
          const result = await updateUserPreferences(currentState.userSettings, newGoals);
          console.log('✅ Goals saved successfully', result);
        } catch (error) {
          console.error('❌ Error updating goals:', error);
          // エラー時は元に戻す
          set({ goals: currentState.goals });
          throw error;
        }
      },

      // 通知操作
      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: generateId(),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      markAllNotificationsAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'calendar-app-storage',
      // userSettingsとgoalsはSupabaseのみに保存（localStorageには保存しない）
      partialize: (state) => ({
        currentDate: state.currentDate,
        selectedDate: state.selectedDate,
        viewMode: state.viewMode,
        currentTab: state.currentTab,
        // userSettings と goals は除外（Supabaseから毎回読み込む）
        // events, todos, templates, categories も除外（Supabaseから読み込む）
      }),
    }
  )
);
