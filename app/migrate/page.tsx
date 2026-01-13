'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MigratePage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ events: 0, todos: 0, errors: 0 });

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '📝';
    const log = `${icon} ${message}`;
    setLogs(prev => [...prev, log]);
    console.log(log);
  };

  const runMigration = async () => {
    setIsRunning(true);
    setLogs([]);
    setStats({ events: 0, todos: 0, errors: 0 });

    addLog('データ移行を開始します...', 'info');

    const SUPABASE_URL = 'https://neojybsjggkddmmzubjk.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lb2p5YnNqZ2drZGRtbXp1YmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MTU1ODQsImV4cCI6MjA4MDA5MTU4NH0.8mUqhh_MoPxfs8r54y1UkHfh8sPEnAv9ZUL1a7mG5ZA';

    try {
      // IndexedDBを開く
      const dbName = 'CalendarAppDB';
      const request = indexedDB.open(dbName);

      request.onerror = () => {
        addLog('IndexedDBを開けませんでした', 'error');
        setIsRunning(false);
      };

      request.onsuccess = async (event: any) => {
        const db = event.target.result;
        addLog('IndexedDBに接続しました', 'success');

        let eventSuccess = 0;
        let todoSuccess = 0;
        let errorCount = 0;

        // カレンダーイベントを移行
        try {
          const eventsTx = db.transaction('events', 'readonly');
          const eventsStore = eventsTx.objectStore('events');
          const eventsRequest = eventsStore.getAll();

          eventsRequest.onsuccess = async () => {
            const events = eventsRequest.result;
            addLog(`${events.length}件のイベントを移行開始...`, 'info');

            for (let i = 0; i < events.length; i++) {
              const event = events[i];
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
                  eventSuccess++;
                  if (i % 5 === 0 || i === events.length - 1) {
                    addLog(`[${i + 1}/${events.length}] ${event.title}`, 'success');
                  }
                } else {
                  errorCount++;
                  const errorText = await response.text();
                  addLog(`失敗: ${event.title} - ${errorText.substring(0, 50)}`, 'error');
                }
              } catch (error: any) {
                errorCount++;
                addLog(`エラー: ${event.title} - ${error.message}`, 'error');
              }

              // 進捗を更新
              setStats(prev => ({ ...prev, events: eventSuccess, errors: errorCount }));

              // レート制限対策
              if (i % 10 === 9) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }

            addLog(`イベント移行完了: ${eventSuccess}件`, 'success');
          };
        } catch (error: any) {
          addLog(`イベント移行エラー: ${error.message}`, 'error');
        }

        // Todoを移行
        try {
          const todosTx = db.transaction('todos', 'readonly');
          const todosStore = todosTx.objectStore('todos');
          const todosRequest = todosStore.getAll();

          todosRequest.onsuccess = async () => {
            const todos = todosRequest.result;
            addLog(`${todos.length}件のTodoを移行開始...`, 'info');

            for (let i = 0; i < todos.length; i++) {
              const todo = todos[i];
              try {
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
                    priority: todo.priority
                  })
                });

                if (response.ok || response.status === 409) {
                  todoSuccess++;
                  if (i % 5 === 0 || i === todos.length - 1) {
                    addLog(`[${i + 1}/${todos.length}] ${todo.content}`, 'success');
                  }
                } else {
                  errorCount++;
                  const errorText = await response.text();
                  addLog(`失敗: ${todo.content} - ${errorText.substring(0, 50)}`, 'error');
                }
              } catch (error: any) {
                errorCount++;
                addLog(`エラー: ${todo.content} - ${error.message}`, 'error');
              }

              // 進捗を更新
              setStats(prev => ({ ...prev, todos: todoSuccess, errors: errorCount }));

              // レート制限対策
              if (i % 10 === 9) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }

            addLog(`Todo移行完了: ${todoSuccess}件`, 'success');
            addLog(`🎉 すべての移行が完了しました！`, 'success');
            setIsRunning(false);
          };
        } catch (error: any) {
          addLog(`Todo移行エラー: ${error.message}`, 'error');
          setIsRunning(false);
        }
      };
    } catch (error: any) {
      addLog(`エラー: ${error.message}`, 'error');
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          ホームに戻る
        </Button>

        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Database className="h-8 w-8" />
              データ移行コンソール
            </CardTitle>
            <p className="text-sm text-blue-100 mt-2">
              ホーム画面追加アプリ内のデータをSupabaseに移行します
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* 統計 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.events}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">イベント</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.todos}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Todo</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {stats.errors}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">エラー</div>
              </div>
            </div>

            {/* 説明 */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>📱 ホーム画面追加アプリ専用</strong>
                <br />
                このページは、ホーム画面追加アプリ内のIndexedDBデータを直接Supabaseに移行します。
                移行中は画面を閉じないでください。
              </p>
            </div>

            {/* 実行ボタン */}
            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  移行中...
                </>
              ) : (
                <>
                  <Database className="h-6 w-6 mr-2" />
                  データ移行を開始
                </>
              )}
            </Button>

            {/* ログ */}
            {logs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">実行ログ</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full rounded-md border p-4 bg-slate-900 text-slate-100">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="font-mono text-xs mb-1 whitespace-pre-wrap"
                      >
                        {log}
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* 完了後の案内 */}
            {!isRunning && stats.events + stats.todos > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-900 dark:text-green-100 font-bold mb-2">
                  ✅ 移行が完了しました！
                </p>
                <p className="text-xs text-green-800 dark:text-green-200">
                  イベント {stats.events}件、Todo {stats.todos}件を移行しました。
                  <br />
                  PCや他のデバイスでアプリにアクセスして、データが表示されることを確認してください。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
