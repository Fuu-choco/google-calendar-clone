'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Briefcase, CheckSquare, Target } from 'lucide-react';
import { parseISO, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval, startOfYear } from 'date-fns';
import { expandRecurringEvents } from '@/lib/repeatEventGenerator';

export function GoalProgress() {
  const { goals, events, todos, categories } = useAppStore();

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const yearStart = startOfYear(new Date());

  const studyCategory = categories.find((c) => c.id === goals.studyCategoryId);
  const workCategory = categories.find((c) => c.id === goals.workCategoryId);

  // 繰り返しイベントを展開してから集計
  const expandedMonthEvents = expandRecurringEvents(events, monthStart, monthEnd);
  const expandedYearEvents = expandRecurringEvents(events, yearStart, new Date());

  const studyMinutesMonth = expandedMonthEvents
    .filter((e) => e.category === studyCategory?.name)
    .reduce((acc, e) => {
      return acc + differenceInMinutes(parseISO(e.end), parseISO(e.start));
    }, 0);

  const studyMinutesTotal = expandedYearEvents
    .filter((e) => e.category === studyCategory?.name)
    .reduce((acc, e) => {
      return acc + differenceInMinutes(parseISO(e.end), parseISO(e.start));
    }, 0);

  const workMinutes = expandedMonthEvents
    .filter((e) => e.category === workCategory?.name)
    .reduce((acc, e) => {
      return acc + differenceInMinutes(parseISO(e.end), parseISO(e.start));
    }, 0);

  const studyHoursMonth = Math.round(studyMinutesMonth / 60 * 10) / 10;
  const studyHoursTotal = Math.round(studyMinutesTotal / 60 * 10) / 10;
  const workHours = Math.round(workMinutes / 60 * 10) / 10;

  const completedTodos = todos.filter((t) => t.completed).length;
  const totalTodos = todos.length;
  const todoRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const progressData = [
    {
      icon: BookOpen,
      title: '学習時間（今月）',
      current: studyHoursMonth,
      target: goals.studyHours,
      unit: '時間',
      color: 'text-blue-600 dark:text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
      progressColor: 'bg-blue-600',
      showPercentage: true,
    },
    {
      icon: Target,
      title: '学習時間（長期目標）',
      current: studyHoursTotal,
      target: goals.studyLongTermHours,
      unit: '時間',
      subtitle: `目標: ${goals.studyLongTermDeadline}まで`,
      color: 'text-indigo-600 dark:text-indigo-500',
      bgColor: 'bg-indigo-100 dark:bg-indigo-950',
      progressColor: 'bg-indigo-600',
      showPercentage: false,
    },
    {
      icon: Briefcase,
      title: '勤務時間（今月）',
      current: workHours,
      target: null,
      unit: '時間',
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-950',
      progressColor: 'bg-green-600',
      showPercentage: false,
    },
    {
      icon: CheckSquare,
      title: 'Todo達成率',
      current: todoRate,
      target: goals.todoCompletionRate,
      unit: '%',
      color: 'text-purple-600 dark:text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
      progressColor: 'bg-purple-600',
      showPercentage: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {progressData.map((item, index) => {
        const Icon = item.icon;
        const percentage = item.target
          ? item.unit === '%'
            ? (item.current / item.target) * 100
            : (item.current / item.target) * 100
          : 0;
        const displayPercentage = Math.min(Math.round(percentage), 100);

        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {item.showPercentage && item.target && (
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {displayPercentage}%
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {item.current}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {item.target ? `/ ${item.target}` : ''} {item.unit}
                  </span>
                </div>
                {item.target && (
                  <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.progressColor} transition-all duration-500`}
                      style={{ width: `${displayPercentage}%` }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
