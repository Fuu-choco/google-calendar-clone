'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface OptimizationSuggestion {
  type: 'reorder' | 'break' | 'consolidate' | 'priority' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  eventIds?: string[];
}

interface ScheduleAnalysis {
  totalWorkHours: number;
  totalBreakTime: number;
  highPriorityCount: number;
  consecutiveWorkBlocks: number;
  suggestions: OptimizationSuggestion[];
}

interface ScheduleOptimizerProps {
  targetDate: Date;
}

export function ScheduleOptimizer({ targetDate }: ScheduleOptimizerProps) {
  const { events } = useAppStore();
  const [analysis, setAnalysis] = useState<ScheduleAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/ai/optimize-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          targetDate: targetDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'スケジュール分析に失敗しました');
      }

      const result: ScheduleAnalysis = await response.json();
      setAnalysis(result);
      toast.success('スケジュールを分析しました！');
    } catch (error) {
      console.error('Analysis Error:', error);
      toast.error(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'break':
        return <Clock className="h-4 w-4" />;
      case 'priority':
        return <AlertCircle className="h-4 w-4" />;
      case 'general':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high':
        return '重要度: 高';
      case 'medium':
        return '重要度: 中';
      case 'low':
        return '重要度: 低';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          AI スケジュール最適化
        </CardTitle>
        <CardDescription>
          {format(targetDate, 'M月d日(E)', { locale: ja })} のスケジュールを分析して改善案を提案します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              スケジュールを分析
            </>
          )}
        </Button>

        {analysis && (
          <div className="space-y-4 mt-6">
            {/* メトリクス */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-600 dark:text-slate-400">総作業時間</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {analysis.totalWorkHours.toFixed(1)}h
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-600 dark:text-slate-400">総休憩時間</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {analysis.totalBreakTime.toFixed(1)}h
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-600 dark:text-slate-400">高優先度タスク</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {analysis.highPriorityCount}個
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="text-xs text-slate-600 dark:text-slate-400">連続作業ブロック</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {analysis.consecutiveWorkBlocks}個
                </div>
              </div>
            </div>

            {/* 提案 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">改善提案</h3>
              {analysis.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getTypeIcon(suggestion.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {suggestion.title}
                        </h4>
                        <Badge className={getImpactColor(suggestion.impact)}>
                          {getImpactLabel(suggestion.impact)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!analysis && !loading && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              「スケジュールを分析」ボタンを押すと、
              <br />
              AIがあなたのスケジュールを分析します
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
