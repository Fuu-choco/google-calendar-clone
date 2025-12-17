'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Lightbulb,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  calculateConcentrationScores,
  learnTaskDurations,
  analyzeWeekdayPerformance,
  generateLearningInsights,
  createTaskHistory,
} from '@/lib/learningEngine';
import { taskHistoryDB } from '@/lib/indexedDB';

export function LearningInsightsView() {
  const { events } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [concentrationData, setConcentrationData] = useState<any[]>([]);
  const [taskDurationData, setTaskDurationData] = useState<any[]>([]);

  useEffect(() => {
    async function loadLearningData() {
      try {
        setLoading(true);

        // タスク実行履歴を取得（過去30日間）
        const histories = await taskHistoryDB.getRecent(30);

        // 完了したイベントからも履歴を生成
        const completedEvents = events.filter(e => e.status === 'completed');
        const eventHistories = completedEvents.map(createTaskHistory);

        const allHistories = [...histories, ...eventHistories];

        if (allHistories.length === 0) {
          setInsights([{
            type: 'info',
            title: 'まだ学習データがありません',
            message: 'タスクを完了すると、学習データが蓄積され、最適化されたスケジュールを提案できます。',
          }]);
          setLoading(false);
          return;
        }

        // 集中度スコアの計算
        const scores = calculateConcentrationScores(allHistories);
        setConcentrationData(scores);

        // タスク別所要時間の学習
        const durations = learnTaskDurations(allHistories);
        setTaskDurationData(durations);

        // 曜日別パフォーマンスの分析
        const weekdayPerf = analyzeWeekdayPerformance(allHistories);

        // インサイトの生成
        const generatedInsights = generateLearningInsights(scores, durations, weekdayPerf);
        setInsights(generatedInsights);

      } catch (error) {
        console.error('学習データの読み込みエラー:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLearningData();
  }, [events]);

  // 学習データの統計
  const stats = useMemo(() => {
    return {
      totalTasks: concentrationData.reduce((sum, s) => sum + s.tasksTotal, 0),
      bestHour: concentrationData.length > 0
        ? concentrationData.reduce((best, s) => s.score > best.score ? s : best, concentrationData[0])
        : null,
      learnedTasks: taskDurationData.filter(t => t.sampleSize >= 3).length,
      avgAccuracy: taskDurationData.length > 0
        ? taskDurationData.reduce((sum, t) => sum + t.accuracy, 0) / taskDurationData.length
        : 0,
    };
  }, [concentrationData, taskDurationData]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-purple-500" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">学習データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              記録されたタスク
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">過去30日間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              最も生産的な時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.bestHour ? `${stats.bestHour.hour}:00` : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.bestHour
                ? `完了率 ${Math.round(stats.bestHour.score * 100)}%`
                : 'データ不足'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              学習済みタスク
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.learnedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              3回以上実行
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              予測精度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.avgAccuracy * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">平均精度</p>
          </CardContent>
        </Card>
      </div>

      {/* インサイト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            学習から得られたインサイト
          </CardTitle>
          <CardDescription>
            あなたの作業パターンから見つけた気づき
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, i) => (
            <Alert key={i}>
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <AlertTitle>{insight.title}</AlertTitle>
                  <AlertDescription>{insight.message}</AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* タスク別学習データ */}
      {taskDurationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              タスク別所要時間の学習
            </CardTitle>
            <CardDescription>
              実績に基づく予測所要時間
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {taskDurationData
                .filter(t => t.sampleSize >= 2)
                .slice(0, 10)
                .map((task, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.taskName}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.sampleSize}回実行
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        平均 {task.averageDuration}分
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={task.accuracy * 100}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {Math.round(task.accuracy * 100)}%
                      </span>
                    </div>
                    {task.averageDuration > task.scheduledDuration * 1.2 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500">
                        予定より{Math.round(task.averageDuration - task.scheduledDuration)}分長くかかる傾向
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 時間帯別集中度 */}
      {concentrationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              時間帯別の作業効率
            </CardTitle>
            <CardDescription>
              各時間帯でのタスク完了率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
              {concentrationData.map((score) => {
                if (score.tasksTotal === 0) return null;

                const percentage = Math.round(score.score * 100);
                const color =
                  percentage >= 80
                    ? 'bg-green-500'
                    : percentage >= 60
                    ? 'bg-blue-500'
                    : percentage >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500';

                return (
                  <div
                    key={score.hour}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="text-xs text-muted-foreground">
                      {score.hour}
                    </div>
                    <div
                      className={`w-full h-16 ${color} rounded`}
                      style={{ opacity: 0.2 + score.score * 0.8 }}
                      title={`${percentage}% (${score.tasksCompleted}/${score.tasksTotal})`}
                    />
                    <div className="text-xs font-medium">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
