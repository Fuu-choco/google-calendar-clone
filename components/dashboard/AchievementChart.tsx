'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateMonthlyAchievements, calculateYearlyAchievements } from '@/lib/analytics';

export function AchievementChart() {
  const { events, todos, categories, goals } = useAppStore();

  const studyCategory = categories.find((c) => c.id === goals.studyCategoryId);
  const workCategory = categories.find((c) => c.id === goals.workCategoryId);

  const monthlyData = useMemo(() => {
    if (!studyCategory || !workCategory) return [];
    return calculateMonthlyAchievements(
      events,
      todos,
      studyCategory.name,
      workCategory.name,
      goals.studyHours,
      goals.workHours,
      goals.todoCompletionRate,
      4
    );
  }, [events, todos, studyCategory, workCategory, goals]);

  const yearlyData = useMemo(() => {
    if (!studyCategory || !workCategory) return [];
    return calculateYearlyAchievements(
      events,
      todos,
      studyCategory.name,
      workCategory.name,
      goals.studyHours,
      goals.workHours,
      goals.todoCompletionRate,
      4
    );
  }, [events, todos, studyCategory, workCategory, goals]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>達成率履歴</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly">
          <TabsList className="mb-4">
            <TabsTrigger value="monthly">月別</TabsTrigger>
            <TabsTrigger value="yearly">年別</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
                  domain={[0, 100]}
                  className="text-xs"
                  stroke="currentColor"
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
                  dataKey="overall"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="総合"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="study"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="学習"
                  dot={{ fill: '#10B981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="work"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="勤務"
                  dot={{ fill: '#F59E0B', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="yearly">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis
                  dataKey="year"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
                  domain={[0, 100]}
                  className="text-xs"
                  stroke="currentColor"
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
                  dataKey="overall"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="総合"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="study"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="学習"
                  dot={{ fill: '#10B981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="work"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="勤務"
                  dot={{ fill: '#F59E0B', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
