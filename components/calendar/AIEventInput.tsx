'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ParsedEvent } from '@/lib/ai/eventParser';

interface AIEventInputProps {
  onEventParsed: (event: ParsedEvent) => void;
}

export function AIEventInput({ onEventParsed }: AIEventInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) {
      toast.error('テキストを入力してください');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai/parse-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'イベントの解析に失敗しました');
      }

      const parsedEvent: ParsedEvent = await response.json();
      onEventParsed(parsedEvent);
      toast.success('AIがイベントを作成しました！');
      setInput('');
    } catch (error) {
      console.error('AI Parse Error:', error);
      toast.error(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          AIでイベントを作成
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 明日の午後3時から会議"
          disabled={loading}
          className="flex-1"
        />
        <Button
          onClick={handleParse}
          disabled={loading || !input.trim()}
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              解析中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              作成
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        💡 ヒント: 「明日の15時に会議」「来週の月曜日 午前9時から勉強」など自然な日本語で入力できます
      </p>
    </div>
  );
}
