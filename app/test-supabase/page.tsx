'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // calendar_eventsを取得
        const { data: eventsData, error: eventsError } = await supabase
          .from('calendar_events')
          .select('*')
          .order('scheduled_start', { ascending: true });

        if (eventsError) throw eventsError;

        // templatesを取得
        const { data: templatesData, error: templatesError } = await supabase
          .from('templates')
          .select('*');

        if (templatesError) throw templatesError;

        // todosを取得
        const { data: todosData, error: todosError } = await supabase
          .from('todos')
          .select('*');

        if (todosError) throw todosError;

        setEvents(eventsData || []);
        setTemplates(templatesData || []);
        setTodos(todosData || []);
      } catch (err: any) {
        console.error('Supabaseエラー:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">
            Supabase 接続テスト
          </h1>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">
            Supabase 接続テスト
          </h1>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-4">
              ❌ エラーが発生しました
            </h2>
            <p className="text-red-600 dark:text-red-300 font-mono text-sm">
              {error}
            </p>
            <div className="mt-6 text-sm text-red-600 dark:text-red-400">
              <p className="font-semibold mb-2">確認事項：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>.env.local ファイルに正しいURLとキーが設定されているか</li>
                <li>Supabaseでテーブルが作成されているか</li>
                <li>Row Level Security (RLS) が無効になっているか</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">
          ✅ Supabase 接続テスト成功！
        </h1>

        <div className="space-y-6">
          {/* Calendar Events */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              📅 Calendar Events ({events.length}件)
            </h2>
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {event.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(event.scheduled_start).toLocaleString('ja-JP')} 〜{' '}
                          {new Date(event.scheduled_end).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {event.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">データがありません</p>
            )}
          </div>

          {/* Templates */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              📝 Templates ({templates.length}件)
            </h2>
            {templates.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <p className="font-medium text-sm text-slate-900 dark:text-white">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {template.default_duration}分
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">データがありません</p>
            )}
          </div>

          {/* Todos */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              ✓ Todos ({todos.length}件)
            </h2>
            {todos.length > 0 ? (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      readOnly
                      className="w-4 h-4"
                    />
                    <span
                      className={`flex-1 ${
                        todo.completed
                          ? 'line-through text-slate-500 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {todo.content}
                    </span>
                    {todo.due_date && (
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(todo.due_date).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">データがありません</p>
            )}
          </div>

          <div className="flex gap-4">
            <a
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ← アプリに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
