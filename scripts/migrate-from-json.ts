import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://neojybsjggkddmmzubjk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lb2p5YnNqZ2drZGRtbXp1YmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MTU1ODQsImV4cCI6MjA4MDA5MTU4NH0.8mUqhh_MoPxfs8r54y1UkHfh8sPEnAv9ZUL1a7mG5ZA';

interface BackupData {
  categories: any[];
  events: any[];
  todos: any[];
  templates?: any[];
  settings?: any[];
  goals?: any[];
}

async function migrateData() {
  console.log('🚀 データ移行を開始します...');

  // JSONファイルを読み込む
  const jsonPath = '/Users/fuuka/Downloads/backup.json';
  const data: BackupData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log('📊 読み込んだデータ:');
  console.log(`  - カテゴリー: ${data.categories?.length || 0}件`);
  console.log(`  - イベント: ${data.events?.length || 0}件`);
  console.log(`  - Todo: ${data.todos?.length || 0}件`);
  console.log(`  - テンプレート: ${data.templates?.length || 0}件`);

  let stats = {
    categories: { success: 0, failed: 0 },
    events: { success: 0, failed: 0 },
    todos: { success: 0, failed: 0 },
    templates: { success: 0, failed: 0 }
  };

  // カテゴリーを移行
  if (data.categories && data.categories.length > 0) {
    console.log('\n📁 カテゴリーを移行中...');
    for (const category of data.categories) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            name: category.name,
            color: category.color,
            is_default: category.isDefault || false
          })
        });

        if (response.ok || response.status === 409) {
          stats.categories.success++;
          console.log(`  ✅ ${category.name}`);
        } else {
          stats.categories.failed++;
          console.error(`  ❌ ${category.name}: ${response.status}`);
        }
      } catch (error: any) {
        stats.categories.failed++;
        console.error(`  ❌ ${category.name}: ${error.message}`);
      }
    }
  }

  // イベントを移行
  if (data.events && data.events.length > 0) {
    console.log('\n📅 イベントを移行中...');
    for (const event of data.events) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/calendar_events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
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
            status: 'pending'
          })
        });

        if (response.ok || response.status === 409) {
          stats.events.success++;
          if (stats.events.success % 10 === 0) {
            console.log(`  ✅ ${stats.events.success}件完了...`);
          }
        } else {
          stats.events.failed++;
          const errorText = await response.text();
          console.error(`  ❌ ${event.title}: ${errorText.substring(0, 100)}`);
        }
      } catch (error: any) {
        stats.events.failed++;
        console.error(`  ❌ ${event.title}: ${error.message}`);
      }

      // レート制限対策
      if (stats.events.success % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log(`  ✅ イベント完了: ${stats.events.success}件`);
  }

  // Todoを移行
  if (data.todos && data.todos.length > 0) {
    console.log('\n✅ Todoを移行中...');
    for (const todo of data.todos) {
      try {
        // priorityを文字列から数値に変換
        let priorityNum = 2; // デフォルト: 中
        if (typeof todo.priority === 'string') {
          if (todo.priority === 'high') priorityNum = 1;
          else if (todo.priority === 'low') priorityNum = 3;
          else priorityNum = 2;
        } else if (typeof todo.priority === 'number') {
          priorityNum = todo.priority;
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/todos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            content: todo.content,
            completed: todo.completed || false,
            due_date: todo.dueDate,
            created_date: todo.createdDate || new Date().toISOString().split('T')[0],
            priority: priorityNum,
            repeat: todo.repeat || 'none'
          })
        });

        if (response.ok || response.status === 409) {
          stats.todos.success++;
          if (stats.todos.success % 5 === 0) {
            console.log(`  ✅ ${stats.todos.success}件完了...`);
          }
        } else {
          stats.todos.failed++;
          const errorText = await response.text();
          console.error(`  ❌ ${todo.content}: ${errorText.substring(0, 100)}`);
        }
      } catch (error: any) {
        stats.todos.failed++;
        console.error(`  ❌ ${todo.content}: ${error.message}`);
      }
    }
    console.log(`  ✅ Todo完了: ${stats.todos.success}件`);
  }

  // テンプレートを移行
  if (data.templates && data.templates.length > 0) {
    console.log('\n📝 テンプレートを移行中...');
    for (const template of data.templates) {
      try {
        // priorityを文字列から数値に変換
        let priorityNum = 2; // デフォルト: 中
        if (typeof template.priority === 'string') {
          if (template.priority === 'high') priorityNum = 1;
          else if (template.priority === 'low') priorityNum = 3;
          else priorityNum = 2;
        } else if (typeof template.priority === 'number') {
          priorityNum = template.priority;
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            name: template.name,
            duration: template.duration,
            category: template.category || 'その他',
            priority: priorityNum,
            color: template.color || '#3B82F6'
          })
        });

        if (response.ok || response.status === 409) {
          stats.templates.success++;
          console.log(`  ✅ ${template.name}`);
        } else {
          stats.templates.failed++;
          console.error(`  ❌ ${template.name}`);
        }
      } catch (error: any) {
        stats.templates.failed++;
        console.error(`  ❌ ${template.name}: ${error.message}`);
      }
    }
  }

  // 最終結果
  console.log('\n🎉 移行完了！');
  console.log('📊 結果:');
  console.log(`  カテゴリー: 成功 ${stats.categories.success}件 / 失敗 ${stats.categories.failed}件`);
  console.log(`  イベント: 成功 ${stats.events.success}件 / 失敗 ${stats.events.failed}件`);
  console.log(`  Todo: 成功 ${stats.todos.success}件 / 失敗 ${stats.todos.failed}件`);
  console.log(`  テンプレート: 成功 ${stats.templates.success}件 / 失敗 ${stats.templates.failed}件`);
}

migrateData().catch(console.error);
