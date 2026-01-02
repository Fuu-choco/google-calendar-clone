'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error occurred:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full bg-white dark:bg-slate-950 rounded-lg shadow-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
          エラーが発生しました
        </h2>

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-4">
          <p className="text-sm font-mono text-red-800 dark:text-red-300 break-all">
            {error.message}
          </p>
        </div>

        {error.stack && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
              詳細を表示
            </summary>
            <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-auto text-xs">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-2">
          <Button
            onClick={reset}
            className="flex-1"
          >
            再試行
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            ホームに戻る
          </Button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
          このエラーメッセージのスクリーンショットを撮って共有してください
        </p>
      </div>
    </div>
  );
}
