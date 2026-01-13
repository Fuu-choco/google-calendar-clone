/**
 * IndexedDB → Supabase データ移行ヘルパー
 */

import {
  eventsDB,
  todosDB,
  templatesDB,
  categoriesDB,
  settingsDB,
  goalsDB,
  initializeDatabase,
} from './indexedDB';
import {
  createCalendarEvent as createCalendarEventSupabase,
  createTodo as createTodoSupabase,
  createTemplate as createTemplateSupabase,
  createCategory as createCategorySupabase,
  updateUserPreferences,
  fetchCategories,
} from './supabase-helpers';
import { CalendarEvent, Todo, Template, CategoryItem, UserSettings, Goal } from './types';

export interface MigrationResult {
  success: boolean;
  eventsCount: number;
  todosCount: number;
  templatesCount: number;
  categoriesCount: number;
  settingsMigrated: boolean;
  goalsMigrated: boolean;
  errors: string[];
}

/**
 * IndexedDBからSupabaseへ全データを移行
 */
export async function migrateIndexedDBToSupabase(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    eventsCount: 0,
    todosCount: 0,
    templatesCount: 0,
    categoriesCount: 0,
    settingsMigrated: false,
    goalsMigrated: false,
    errors: [],
  };

  try {
    console.log('📦 Starting migration from IndexedDB to Supabase...');

    // IndexedDBを初期化
    await initializeDatabase();

    // カテゴリを移行
    console.log('🏷️ Migrating categories...');
    try {
      const categories = await categoriesDB.getAll();
      const existingCategories = await fetchCategories();
      const existingCategoryNames = new Set(existingCategories.map((c: any) => c.name));

      for (const category of categories) {
        if (!existingCategoryNames.has(category.name)) {
          await createCategorySupabase({
            name: category.name,
            color: category.color,
          });
          result.categoriesCount++;
        }
      }
      console.log(`✅ Migrated ${result.categoriesCount} categories`);
    } catch (error: any) {
      console.error('❌ Error migrating categories:', error);
      result.errors.push(`Categories: ${error.message}`);
    }

    // テンプレートを移行
    console.log('📝 Migrating templates...');
    try {
      const templates = await templatesDB.getAll();
      for (const template of templates) {
        await createTemplateSupabase({
          name: template.name,
          duration: template.duration,
          category: template.category,
          priority: template.priority,
          color: template.color,
        });
        result.templatesCount++;
      }
      console.log(`✅ Migrated ${result.templatesCount} templates`);
    } catch (error: any) {
      console.error('❌ Error migrating templates:', error);
      result.errors.push(`Templates: ${error.message}`);
    }

    // イベントを移行
    console.log('📅 Migrating events...');
    try {
      const events = await eventsDB.getAll();
      for (const event of events) {
        await createCalendarEventSupabase(event);
        result.eventsCount++;
      }
      console.log(`✅ Migrated ${result.eventsCount} events`);
    } catch (error: any) {
      console.error('❌ Error migrating events:', error);
      result.errors.push(`Events: ${error.message}`);
    }

    // Todosを移行
    console.log('✅ Migrating todos...');
    try {
      const todos = await todosDB.getAll();
      for (const todo of todos) {
        await createTodoSupabase(todo);
        result.todosCount++;
      }
      console.log(`✅ Migrated ${result.todosCount} todos`);
    } catch (error: any) {
      console.error('❌ Error migrating todos:', error);
      result.errors.push(`Todos: ${error.message}`);
    }

    // 設定と目標を移行
    console.log('⚙️ Migrating settings and goals...');
    try {
      const settings = await settingsDB.get();
      const goals = await goalsDB.get();

      if (settings && goals) {
        await updateUserPreferences(settings, goals);
        result.settingsMigrated = true;
        result.goalsMigrated = true;
        console.log('✅ Migrated settings and goals');
      }
    } catch (error: any) {
      console.error('❌ Error migrating settings/goals:', error);
      result.errors.push(`Settings/Goals: ${error.message}`);
    }

    result.success = result.errors.length === 0;
    console.log('🎉 Migration completed!', result);

    return result;
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    result.errors.push(`Migration failed: ${error.message}`);
    return result;
  }
}

/**
 * IndexedDBからデータをエクスポート（JSON形式）
 */
export async function exportIndexedDBData(): Promise<string> {
  try {
    await initializeDatabase();

    const [events, todos, templates, categories, settings, goals] = await Promise.all([
      eventsDB.getAll(),
      todosDB.getAll(),
      templatesDB.getAll(),
      categoriesDB.getAll(),
      settingsDB.get(),
      goalsDB.get(),
    ]);

    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        events,
        todos,
        templates,
        categories,
        settings,
        goals,
      },
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  }
}

/**
 * IndexedDBにデータが存在するかチェック
 */
export async function hasIndexedDBData(): Promise<boolean> {
  try {
    await initializeDatabase();
    const [events, todos] = await Promise.all([
      eventsDB.getAll(),
      todosDB.getAll(),
    ]);

    return events.length > 0 || todos.length > 0;
  } catch (error) {
    console.error('❌ Error checking IndexedDB data:', error);
    return false;
  }
}
