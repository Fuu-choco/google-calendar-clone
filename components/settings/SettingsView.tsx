'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Edit2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateEditModal } from './TemplateEditModal';
import { Template } from '@/lib/types';

export function SettingsView() {
  const { userSettings, updateSettings, goals, updateGoals, templates, deleteTemplate, addTemplate, updateTemplate, categories } =
    useAppStore();

  const [localSettings, setLocalSettings] = useState(userSettings);
  const [localGoals, setLocalGoals] = useState(goals);
  const [hasChanges, setHasChanges] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(undefined);

  useEffect(() => {
    setLocalSettings(userSettings);
    setLocalGoals(goals);
  }, [userSettings, goals]);

  const handleSettingsChange = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleGoalChange = (key: string, value: number | string) => {
    setLocalGoals((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      await updateGoals(localGoals);
      setHasChanges(false);
      setRefreshKey((prev) => prev + 1);
      toast.success('すべての設定を保存しました');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('設定の保存に失敗しました');
    }
  };

  const handleOpenTemplateModal = (template?: Template) => {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(undefined);
  };

  const handleSaveTemplate = async (templateData: Omit<Template, 'id'>) => {
    try {
      if (editingTemplate) {
        // 編集
        await updateTemplate(editingTemplate.id, templateData);
        toast.success('テンプレートを更新しました');
      } else {
        // 新規作成
        await addTemplate({ id: '', ...templateData });
        toast.success('テンプレートを追加しました');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('テンプレートの保存に失敗しました');
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">設定</h2>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ユーザー設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>集中タイプ</Label>
                  <Select
                    value={localSettings.focusType}
                    onValueChange={(value: any) =>
                      handleSettingsChange('focusType', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="朝型">朝型</SelectItem>
                      <SelectItem value="夜型">夜型</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>作業時間（分）</Label>
                  <Select
                    value={localSettings.workDuration.toString()}
                    onValueChange={(value) =>
                      handleSettingsChange('workDuration', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25分</SelectItem>
                      <SelectItem value="50">50分</SelectItem>
                      <SelectItem value="90">90分</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>休憩時間（分）</Label>
                  <Select
                    value={localSettings.breakDuration.toString()}
                    onValueChange={(value) =>
                      handleSettingsChange('breakDuration', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5分</SelectItem>
                      <SelectItem value="10">10分</SelectItem>
                      <SelectItem value="15">15分</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>起床時刻</Label>
                  <Input
                    type="time"
                    value={localSettings.wakeTime}
                    onChange={(e) => handleSettingsChange('wakeTime', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>就寝時刻</Label>
                  <Input
                    type="time"
                    value={localSettings.sleepTime}
                    onChange={(e) => handleSettingsChange('sleepTime', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>ブラウザ通知を有効化</Label>
                <Switch
                  checked={localSettings.notificationEnabled}
                  onCheckedChange={(checked) =>
                    handleSettingsChange('notificationEnabled', checked)
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>タスク開始リマインド</Label>
                  <Switch
                    checked={localSettings.taskReminder}
                    onCheckedChange={(checked) =>
                      handleSettingsChange('taskReminder', checked)
                    }
                  />
                </div>
                {localSettings.taskReminder && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">デフォルト</Label>
                    <Select
                      value={localSettings.taskReminderMinutes.toString()}
                      onValueChange={(value) =>
                        handleSettingsChange('taskReminderMinutes', parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5分前</SelectItem>
                        <SelectItem value="10">10分前</SelectItem>
                        <SelectItem value="15">15分前</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>朝のスケジュール確認</Label>
                  <Switch
                    checked={localSettings.morningReview}
                    onCheckedChange={(checked) =>
                      handleSettingsChange('morningReview', checked)
                    }
                  />
                </div>
                {localSettings.morningReview && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">時刻</Label>
                    <Input
                      type="time"
                      value={localSettings.morningReviewTime}
                      onChange={(e) =>
                        handleSettingsChange('morningReviewTime', e.target.value)
                      }
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>就寝リマインド</Label>
                  <Switch
                    checked={localSettings.sleepReminder}
                    onCheckedChange={(checked) =>
                      handleSettingsChange('sleepReminder', checked)
                    }
                  />
                </div>
                {localSettings.sleepReminder && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">時刻</Label>
                    <Input
                      type="time"
                      value={localSettings.sleepReminderTime}
                      onChange={(e) =>
                        handleSettingsChange('sleepReminderTime', e.target.value)
                      }
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>長時間作業アラート</Label>
                  <Switch
                    checked={localSettings.longWorkAlert}
                    onCheckedChange={(checked) =>
                      handleSettingsChange('longWorkAlert', checked)
                    }
                  />
                </div>
                {localSettings.longWorkAlert && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">休憩なしで通知</Label>
                    <Select
                      value={localSettings.longWorkAlertHours.toString()}
                      onValueChange={(value) =>
                        handleSettingsChange('longWorkAlertHours', parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1時間</SelectItem>
                        <SelectItem value="2">2時間</SelectItem>
                        <SelectItem value="3">3時間</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>テンプレート管理</CardTitle>
                <Button size="sm" onClick={() => handleOpenTemplateModal()}>
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {template.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {template.duration}分 · {template.category} · 優先度:{' '}
                        {template.priority === 'high'
                          ? '高'
                          : template.priority === 'medium'
                          ? '中'
                          : '低'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenTemplateModal(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await deleteTemplate(template.id);
                            toast.success('テンプレートを削除しました');
                          } catch (error) {
                            console.error('Error deleting template:', error);
                            toast.error('テンプレートの削除に失敗しました');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>目標設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  カテゴリー設定
                </h4>
                <div className="space-y-2">
                  <Label>学習カテゴリー</Label>
                  <Select
                    value={localGoals.studyCategoryId}
                    onValueChange={(value: string) =>
                      handleGoalChange('studyCategoryId', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>勤務カテゴリー</Label>
                  <Select
                    value={localGoals.workCategoryId}
                    onValueChange={(value: string) =>
                      handleGoalChange('workCategoryId', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  短期目標（月次）
                </h4>
                <div className="space-y-2">
                  <Label>学習時間（時間/月）</Label>
                  <Input
                    type="number"
                    value={localGoals.studyHours}
                    onChange={(e) =>
                      handleGoalChange('studyHours', parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  長期目標（学習）
                </h4>
                <div className="space-y-2">
                  <Label>目標学習時間（合計時間）</Label>
                  <Input
                    type="number"
                    value={localGoals.studyLongTermHours}
                    onChange={(e) =>
                      handleGoalChange('studyLongTermHours', parseInt(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>達成期限</Label>
                  <Input
                    type="date"
                    value={localGoals.studyLongTermDeadline}
                    onChange={(e) =>
                      handleGoalChange('studyLongTermDeadline', e.target.value)
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  その他
                </h4>
                <div className="space-y-2">
                  <Label>Todo達成率（%）</Label>
                  <Input
                    type="number"
                    value={localGoals.todoCompletionRate}
                    onChange={(e) =>
                      handleGoalChange('todoCompletionRate', parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>カテゴリー管理</CardTitle>
                <Button
                  size="sm"
                  onClick={async () => {
                    const newCategory = {
                      name: '新しいカテゴリー',
                      color: '#8B5CF6',
                      isDefault: false,
                    };
                    try {
                      await useAppStore.getState().addCategory(newCategory);
                      toast.success('カテゴリーを追加しました');
                      setRefreshKey((prev) => prev + 1);
                    } catch (error) {
                      console.error('Error adding category:', error);
                      toast.error('カテゴリーの追加に失敗しました');
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" key={refreshKey}>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <Input
                      type="color"
                      value={category.color}
                      onChange={async (e) => {
                        try {
                          await useAppStore.getState().updateCategory(category.id, { color: e.target.value });
                        } catch (error) {
                          console.error('Error updating category color:', error);
                          toast.error('カテゴリーの更新に失敗しました');
                        }
                      }}
                      className="w-12 h-10 cursor-pointer"
                    />
                    <Input
                      value={category.name}
                      onChange={async (e) => {
                        try {
                          await useAppStore.getState().updateCategory(category.id, { name: e.target.value });
                        } catch (error) {
                          console.error('Error updating category name:', error);
                          toast.error('カテゴリーの更新に失敗しました');
                        }
                      }}
                      className="flex-1"
                    />
                    {!category.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await useAppStore.getState().deleteCategory(category.id);
                            toast.success('カテゴリーを削除しました');
                          } catch (error) {
                            console.error('Error deleting category:', error);
                            toast.error('カテゴリーの削除に失敗しました');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                    {category.isDefault && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
                        デフォルト
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>データ管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info('この機能は準備中です')}
              >
                学習データをリセット
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info('この機能は準備中です')}
              >
                古いデータを削除
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <TemplateEditModal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplateModal}
        onSave={handleSaveTemplate}
        template={editingTemplate}
        categories={categories}
      />
    </div>
  );
}
