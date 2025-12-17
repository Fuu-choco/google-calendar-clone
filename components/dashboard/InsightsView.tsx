'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  calculateWeeklyProductivity,
  calculateCategoryInsights,
  recognizePatterns,
  generateInsights,
} from '@/lib/insights';
import { TrendingUp, TrendingDown, Minus, Award, Clock, Calendar, Lightbulb } from 'lucide-react';

export function InsightsView() {
  const { events, categories } = useAppStore();

  // 週ごとの生産性データ
  const weeklyData = useMemo(() => {
    return calculateWeeklyProductivity(events, 4);
  }, [events]);

  // カテゴリ別詳細統計
  const categoryInsights = useMemo(() => {
    return calculateCategoryInsights(events, categories);
  }, [events, categories]);

  // パターン認識
  const patterns = useMemo(() => {
    return recognizePatterns(events);
  }, [events]);

  // インサイトメッセージ
  const insights = useMemo(() => {
    return generateInsights(events, weeklyData, patterns, categoryInsights);
  }, [events, weeklyData, patterns, categoryInsights]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getInsightTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'tip':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        {/* インサイトメッセージ */}
        {insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                AIインサイト
              </CardTitle>
              <CardDescription>
                データから自動生成されたアドバイスと気づき
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${getInsightTypeColor(insight.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{insight.icon}</span>
                      <div>
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm opacity-90">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 週ごとの生産性トレンド */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              週ごとの生産性トレンド（過去4週間）
            </CardTitle>
            <CardDescription>
              総活動時間とイベント完了率の推移
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="currentColor"
                    className="text-slate-600 dark:text-slate-400"
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-slate-600 dark:text-slate-400"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalHours"
                    stroke="#3b82f6"
                    name="総時間（時間）"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#10b981"
                    name="完了率（%）"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                十分なデータがありません
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* カテゴリ別詳細統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                カテゴリ別詳細統計
              </CardTitle>
              <CardDescription>
                今月のカテゴリごとの活動分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryInsights.length > 0 ? (
                <div className="space-y-4">
                  {categoryInsights.map((insight) => (
                    <div
                      key={insight.category}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: insight.color }}
                          />
                          <h4 className="font-semibold">{insight.category}</h4>
                        </div>
                        {getTrendIcon(insight.trend)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-slate-600 dark:text-slate-400">総時間</div>
                          <div className="font-semibold">{insight.totalHours.toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400">イベント数</div>
                          <div className="font-semibold">{insight.eventCount}件</div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400">平均時間</div>
                          <div className="font-semibold">{insight.averageHours.toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400">最長セッション</div>
                          <div className="font-semibold">{insight.longestSession.toFixed(1)}h</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary">
                          {insight.percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                  今月のデータがありません
                </div>
              )}
            </CardContent>
          </Card>

          {/* パターン認識 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                パターン認識
              </CardTitle>
              <CardDescription>
                過去1ヶ月のデータから見つけたパターン
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      最も生産的な曜日
                    </h4>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200">
                    {patterns.mostProductiveDay}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    平均 {patterns.mostProductiveDayHours.toFixed(1)}時間
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                      最も生産的な時間帯
                    </h4>
                  </div>
                  <p className="text-green-800 dark:text-green-200">
                    {patterns.mostProductiveHour}:00 - {patterns.mostProductiveHour + 1}:00
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    {(patterns.mostProductiveHourMinutes / 60).toFixed(1)}時間の活動
                  </p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                      平均セッション時間
                    </h4>
                  </div>
                  <p className="text-purple-800 dark:text-purple-200">
                    {(patterns.averageSessionLength / 60).toFixed(1)}時間
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                    {patterns.averageSessionLength.toFixed(0)}分
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      活動が少ない曜日
                    </h4>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200">
                    {patterns.leastProductiveDay}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    平均 {patterns.leastProductiveDayHours.toFixed(1)}時間
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* カテゴリ別時間配分（棒グラフ） */}
        {categoryInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別時間配分の比較</CardTitle>
              <CardDescription>
                今月の各カテゴリの活動時間
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryInsights}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    stroke="currentColor"
                    className="text-slate-600 dark:text-slate-400"
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-slate-600 dark:text-slate-400"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar
                    dataKey="totalHours"
                    fill="#3b82f6"
                    name="総時間（時間）"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
