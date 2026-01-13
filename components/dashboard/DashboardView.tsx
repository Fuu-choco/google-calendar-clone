'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GoalProgress } from './GoalProgress';
import { AchievementChart } from './AchievementChart';
// AI機能は静的エクスポートモードでは無効
// import { ScheduleOptimizer } from '@/components/ai/ScheduleOptimizer';
// import { AIAssistant } from '@/components/ai/AIAssistant';
import { InsightsView } from './InsightsView';
// import { LearningInsightsView } from './LearningInsightsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Tooltip as RadixTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateCategoryDistribution, calculateHourlyActivity } from '@/lib/analytics';
import { startOfMonth, endOfMonth } from 'date-fns';
import { expandRecurringEvents } from '@/lib/repeatEventGenerator';

export function DashboardView() {
  const { events, categories } = useAppStore();
  const [selectedHour, setSelectedHour] = useState<{ hour: number; minutes: number; intensity: string } | null>(null);

  // 今月のカテゴリ別時間配分
  const categoryData = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    // 繰り返しイベントを展開してから集計
    const expandedEvents = expandRecurringEvents(events, monthStart, monthEnd);
    const distribution = calculateCategoryDistribution(expandedEvents, monthStart, monthEnd);

    // カテゴリの色を追加
    return distribution.map((item) => {
      const category = categories.find((c) => c.name === item.name);
      return {
        ...item,
        color: category?.color || '#6B7280',
      };
    });
  }, [events, categories]);

  // 今月の時間帯別活動
  const hourlyActivity = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    // 繰り返しイベントを展開してから集計
    const expandedEvents = expandRecurringEvents(events, monthStart, monthEnd);
    return calculateHourlyActivity(expandedEvents, monthStart, monthEnd);
  }, [events]);
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          ダッシュボード
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          <Tabs defaultValue="goals" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="goals">今月の目標</TabsTrigger>
              <TabsTrigger value="history">達成率履歴</TabsTrigger>
              <TabsTrigger value="analysis">詳細分析</TabsTrigger>
              <TabsTrigger value="insights">インサイト</TabsTrigger>
              <TabsTrigger value="learning">学習データ</TabsTrigger>
              <TabsTrigger value="ai">AI最適化</TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-6 mt-6">
              <GoalProgress />
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <AchievementChart />
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <InsightsView />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>カテゴリ別時間配分（今月）</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => `${value.toFixed(1)}時間`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '0.5rem',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                        今月のデータがありません
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>時間帯別活動（今月）</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      0時〜23時の各時間帯で、どれくらい活動していたかを色で表示
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 色の凡例 - 上部に配置 */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          📊 色の見方
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-600 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              高活動 (41分以上)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              中活動 (21-40分)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-200 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              低活動 (1-20分)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              活動なし (0分)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ヒートマップ */}
                      <div className="space-y-2">
                        <TooltipProvider delayDuration={100}>
                          <div className="grid grid-cols-6 gap-1">
                            {hourlyActivity.map((item) => {
                              const colors = {
                                high: 'bg-blue-600',
                                medium: 'bg-blue-400',
                                low: 'bg-blue-200',
                                none: 'bg-slate-200 dark:bg-slate-800',
                              };

                              const intensityText = {
                                high: '高活動',
                                medium: '中活動',
                                low: '低活動',
                                none: '活動なし',
                              };

                              return (
                                <RadixTooltip key={item.hour}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`h-10 rounded ${colors[item.intensity]} transition-colors cursor-pointer hover:opacity-80 md:hover:scale-105 active:scale-95 relative flex items-center justify-center`}
                                      onClick={() => setSelectedHour({
                                        hour: item.hour,
                                        minutes: item.minutes,
                                        intensity: intensityText[item.intensity]
                                      })}
                                    >
                                      {/* モバイル用：時刻を小さく表示 */}
                                      <span className="md:hidden text-[10px] font-semibold text-white dark:text-slate-200 opacity-70">
                                        {item.hour}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="hidden md:block">
                                    <div className="text-center">
                                      <div className="font-semibold">{item.hour}:00</div>
                                      <div className="text-xs text-slate-400">
                                        {Math.round(item.minutes)}分 ({intensityText[item.intensity]})
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </RadixTooltip>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                          <span>0時</span>
                          <span>6時</span>
                          <span>12時</span>
                          <span>18時</span>
                          <span>23時</span>
                        </div>
                      </div>

                      {/* 補足説明 */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="hidden md:inline">💡 ヒント: 各マスにマウスを合わせると、詳しい時間が表示されます</span>
                        <span className="md:hidden">💡 ヒント: 各マスをタップすると、詳しい時間が表示されます</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* モバイル用詳細ダイアログ */}
                <Dialog open={!!selectedHour} onOpenChange={(open) => !open && setSelectedHour(null)}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>時間帯別活動の詳細</DialogTitle>
                    </DialogHeader>
                    {selectedHour && (
                      <div className="space-y-4 py-4">
                        <div className="text-center space-y-2">
                          <div className="text-4xl font-bold text-slate-900 dark:text-white">
                            {selectedHour.hour}:00
                          </div>
                          <div className="text-lg text-slate-600 dark:text-slate-400">
                            {Math.round(selectedHour.minutes)}分
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                          <div className={`w-4 h-4 rounded ${
                            selectedHour.intensity === '高活動' ? 'bg-blue-600' :
                            selectedHour.intensity === '中活動' ? 'bg-blue-400' :
                            selectedHour.intensity === '低活動' ? 'bg-blue-200' :
                            'bg-slate-200 dark:bg-slate-800'
                          }`} />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {selectedHour.intensity}
                          </span>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            <TabsContent value="learning" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>学習インサイト</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    学習インサイト機能は今後のアップデートで追加予定です。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI機能</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI機能を使用するには、OpenAI APIキーが必要です。
                    <br />
                    .env.local ファイルに OPENAI_API_KEY を設定してください。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
