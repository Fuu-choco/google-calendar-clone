/**
 * IndexedDB ヘルパー - 完全オフライン対応
 * モバイルPWA専用ストレージ
 */

import { CalendarEvent, Todo, Template, CategoryItem, UserSettings, Goal } from './types';
import { TaskHistory } from './learningEngine';

const DB_NAME = 'GoogleCalendarClone';
const DB_VERSION = 1;

// テーブル名
const STORES = {
  EVENTS: 'events',
  TODOS: 'todos',
  TEMPLATES: 'templates',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  GOALS: 'goals',
  TASK_HISTORY: 'taskHistory',
};

/**
 * データベースを開く
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // calendar_events
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        const eventStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventStore.createIndex('start', 'start');
        eventStore.createIndex('category', 'category');
      }

      // todos
      if (!db.objectStoreNames.contains(STORES.TODOS)) {
        const todoStore = db.createObjectStore(STORES.TODOS, { keyPath: 'id' });
        todoStore.createIndex('dueDate', 'dueDate');
        todoStore.createIndex('completed', 'completed');
      }

      // templates
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
      }

      // categories
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      // settings (single record)
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }

      // goals (single record)
      if (!db.objectStoreNames.contains(STORES.GOALS)) {
        db.createObjectStore(STORES.GOALS, { keyPath: 'id' });
      }

      // task_history
      if (!db.objectStoreNames.contains(STORES.TASK_HISTORY)) {
        const historyStore = db.createObjectStore(STORES.TASK_HISTORY, { keyPath: 'id' });
        historyStore.createIndex('scheduledStart', 'scheduledStart');
      }
    };
  });
}

/**
 * 汎用的なCRUD操作
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function add<T>(storeName: string, data: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

async function update<T>(storeName: string, data: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// Calendar Events
// ============================================================

export const eventsDB = {
  getAll: () => getAll<CalendarEvent>(STORES.EVENTS),
  getById: (id: string) => getById<CalendarEvent>(STORES.EVENTS, id),
  add: (event: CalendarEvent) => add(STORES.EVENTS, event),
  update: (event: CalendarEvent) => update(STORES.EVENTS, event),
  delete: (id: string) => remove(STORES.EVENTS, id),
};

// ============================================================
// Todos
// ============================================================

export const todosDB = {
  getAll: () => getAll<Todo>(STORES.TODOS),
  getById: (id: string) => getById<Todo>(STORES.TODOS, id),
  add: (todo: Todo) => add(STORES.TODOS, todo),
  update: (todo: Todo) => update(STORES.TODOS, todo),
  delete: (id: string) => remove(STORES.TODOS, id),
};

// ============================================================
// Templates
// ============================================================

export const templatesDB = {
  getAll: () => getAll<Template>(STORES.TEMPLATES),
  getById: (id: string) => getById<Template>(STORES.TEMPLATES, id),
  add: (template: Template) => add(STORES.TEMPLATES, template),
  update: (template: Template) => update(STORES.TEMPLATES, template),
  delete: (id: string) => remove(STORES.TEMPLATES, id),
};

// ============================================================
// Categories
// ============================================================

export const categoriesDB = {
  getAll: () => getAll<CategoryItem>(STORES.CATEGORIES),
  getById: (id: string) => getById<CategoryItem>(STORES.CATEGORIES, id),
  add: (category: CategoryItem) => add(STORES.CATEGORIES, category),
  update: (category: CategoryItem) => update(STORES.CATEGORIES, category),
  delete: (id: string) => remove(STORES.CATEGORIES, id),
};

// ============================================================
// Settings (singleton)
// ============================================================

export const settingsDB = {
  get: async (): Promise<UserSettings | null> => {
    const settings = await getById<{ id: string; data: UserSettings }>(STORES.SETTINGS, 'user-settings');
    return settings?.data || null;
  },
  save: async (settings: UserSettings): Promise<void> => {
    await update(STORES.SETTINGS, { id: 'user-settings', data: settings });
  },
};

// ============================================================
// Goals (singleton)
// ============================================================

export const goalsDB = {
  get: async (): Promise<Goal | null> => {
    const goals = await getById<{ id: string; data: Goal }>(STORES.GOALS, 'user-goals');
    return goals?.data || null;
  },
  save: async (goals: Goal): Promise<void> => {
    await update(STORES.GOALS, { id: 'user-goals', data: goals });
  },
};

// ============================================================
// Task History
// ============================================================

export const taskHistoryDB = {
  getAll: () => getAll<TaskHistory>(STORES.TASK_HISTORY),
  add: (history: TaskHistory) => add(STORES.TASK_HISTORY, history),
  getRecent: async (days: number = 30): Promise<TaskHistory[]> => {
    const all = await getAll<TaskHistory>(STORES.TASK_HISTORY);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return all
      .filter(h => new Date(h.scheduledStart) >= startDate)
      .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
  },
};

// ============================================================
// 初期化・デフォルトデータの投入
// ============================================================

export async function initializeDatabase(): Promise<void> {
  console.log('📦 Initializing IndexedDB...');

  // デフォルトカテゴリ
  const categories = await categoriesDB.getAll();
  if (categories.length === 0) {
    console.log('📁 Creating default categories...');
    await categoriesDB.add({ id: 'cat-1', name: '学習', color: '#8B5CF6', isDefault: true });
    await categoriesDB.add({ id: 'cat-2', name: '勤務', color: '#3B82F6', isDefault: true });
    await categoriesDB.add({ id: 'cat-3', name: 'その他', color: '#6B7280', isDefault: true });
  }

  // デフォルト設定
  const settings = await settingsDB.get();
  if (!settings) {
    console.log('⚙️ Creating default settings...');
    await settingsDB.save({
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
    });
  }

  // デフォルト目標
  const goals = await goalsDB.get();
  if (!goals) {
    console.log('🎯 Creating default goals...');
    await goalsDB.save({
      studyHours: 80,
      studyLongTermHours: 0,
      studyLongTermDeadline: '',
      workHours: 160,
      todoCompletionRate: 90,
      studyCategoryId: 'cat-1',
      workCategoryId: 'cat-2',
    });
  }

  console.log('✅ IndexedDB initialized successfully!');
}
