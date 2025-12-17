import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalendarEvent, Todo, Template, UserSettings, Goal, CategoryItem } from './types';
import { AppNotification } from './types/notification';
import { addDays, format } from 'date-fns';
import {
  eventsDB,
  todosDB,
  templatesDB,
  categoriesDB,
  settingsDB,
  goalsDB,
  initializeDatabase,
} from './indexedDB';

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
      viewMode: 'month',
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

      // IndexedDBからデータを取得
      fetchData: async () => {
        set({ isLoading: true });
        try {
          // IndexedDBを初期化（デフォルトデータを投入）
          await initializeDatabase();

          // 全データを取得
          const [events, todos, templates, categories, userSettings, goals] = await Promise.all([
            eventsDB.getAll(),
            todosDB.getAll(),
            templatesDB.getAll(),
            categoriesDB.getAll(),
            settingsDB.get(),
            goalsDB.get(),
          ]);

          set({
            events,
            todos,
            templates: templates.length > 0 ? templates : mockTemplates,
            categories: categories.length > 0 ? categories : defaultCategories,
            userSettings: userSettings || defaultSettings,
            goals: goals || defaultGoals,
            isLoading: false,
          });

          console.log('✅ IndexedDB data loaded successfully');
        } catch (error) {
          console.error('❌ Error fetching data from IndexedDB:', error);
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
          // IndexedDBに保存（そのまま保存）
          await eventsDB.add(event);
          console.log('✅ Store: Event saved to IndexedDB');

          // ローカル状態を更新
          set((state) => ({ events: [...state.events, event] }));
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
          await eventsDB.update(updatedEvent);

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
          await eventsDB.delete(id);
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
          await todosDB.add(todo);
          set((state) => ({ todos: [...state.todos, todo] }));
          console.log('✅ Todo added successfully');
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
          await todosDB.update(updatedTodo);

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
          await todosDB.delete(id);
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
          await todosDB.update(updatedTodo);

          set((state) => ({
            todos: state.todos.map((t) => (t.id === id ? updatedTodo : t)),
          }));
          console.log('✅ Todo toggled successfully');
        } catch (error) {
          console.error('❌ Error toggling todo:', error);
          throw error;
        }
      },

      // テンプレート操作
      addTemplate: async (template) => {
        try {
          await templatesDB.add(template);
          set((state) => ({ templates: [...state.templates, template] }));
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
          await templatesDB.update(updatedTemplate);

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
          await templatesDB.delete(id);
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
          const newCategory: CategoryItem = {
            id: crypto.randomUUID(),
            ...category,
          };
          await categoriesDB.add(newCategory);
          set((state) => ({ categories: [...state.categories, newCategory] }));
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
          await categoriesDB.update(updatedCategory);

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
          await categoriesDB.delete(id);
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

        try {
          // ローカル状態を即座に更新
          set({ userSettings: newSettings });

          // IndexedDBに保存
          await settingsDB.save(newSettings);
          console.log('✅ Settings saved successfully');
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

        try {
          // ローカル状態を即座に更新
          set({ goals: newGoals });

          // IndexedDBに保存
          await goalsDB.save(newGoals);
          console.log('✅ Goals saved successfully');
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
          id: crypto.randomUUID(),
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
    }
  )
);
