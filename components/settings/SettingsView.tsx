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
  const { userSettings, updateSettings, goals, updateGoals, templates, deleteTemplate, addTemplate, updateTemplate, categories, events } =
    useAppStore();

  const [localSettings, setLocalSettings] = useState(userSettings);
  const [localGoals, setLocalGoals] = useState(goals);
  const [localCategories, setLocalCategories] = useState(categories);
  const [hasChanges, setHasChanges] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(undefined);

  useEffect(() => {
    setLocalSettings(userSettings);
    setLocalGoals(goals);
    setLocalCategories(categories);
  }, [userSettings, goals, categories]);

  const handleSettingsChange = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleGoalChange = (key: string, value: number | string) => {
    setLocalGoals((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleNumberInput = (key: string, valueStr: string, min: number = 0, max: number = 9999) => {
    if (valueStr === '') {
      handleGoalChange(key, min);
      return;
    }
    const value = parseInt(valueStr);
    if (isNaN(value)) return;
    const clampedValue = Math.max(min, Math.min(max, value));
    handleGoalChange(key, clampedValue);
  };

  const checkCategoryUsage = (categoryName: string) => {
    const usedInEvents = events.filter(e => e.category === categoryName).length;
    const usedInTemplates = templates.filter(t => t.category === categoryName).length;
    return { usedInEvents, usedInTemplates, total: usedInEvents + usedInTemplates };
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      await updateGoals(localGoals);

      // カテゴリーは即座に保存されているため、ここでは処理不要

      setHasChanges(false);
      toast.success('設定を保存しました');
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
        // 新規作成（IDはストア側で自動生成される）
        await addTemplate(templateData as Template);
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
                      <SelectValue placeholder="選択してください" />
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
                      <SelectValue placeholder="選択してください" />
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
                      <SelectValue placeholder="選択してください" />
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
                        <SelectValue placeholder="選択してください" />
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
                        <SelectValue placeholder="選択してください" />
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
              {templates.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p className="text-sm">テンプレートがありません</p>
                  <p className="text-xs mt-1">「追加」ボタンから新しいテンプレートを作成できます</p>
                </div>
              ) : (
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => handleOpenTemplateModal(template)}
                        >
                          <Edit2 className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12"
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
                          <Trash2 className="h-5 w-5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((category) => category.id && category.id.trim() !== '')
                        .map((category) => (
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
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((category) => category.id && category.id.trim() !== '')
                        .map((category) => (
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
                    min="0"
                    max="744"
                    value={localGoals.studyHours}
                    onChange={(e) => handleNumberInput('studyHours', e.target.value, 0, 744)}
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
                    min="0"
                    max="100000"
                    value={localGoals.studyLongTermHours}
                    onChange={(e) => handleNumberInput('studyLongTermHours', e.target.value, 0, 100000)}
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
                    min="0"
                    max="100"
                    value={localGoals.todoCompletionRate}
                    onChange={(e) => handleNumberInput('todoCompletionRate', e.target.value, 0, 100)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle>カテゴリー管理</CardTitle>
                  <Button
                    size="sm"
                    onClick={async (e) => {
                      console.log('🔵 カテゴリー追加ボタンがクリックされました');
                      e.preventDefault();
                      e.stopPropagation();

                      const newCategory = {
                        name: '新しいカテゴリー',
                        color: '#8B5CF6',
                        isDefault: false,
                      };
                      console.log('📝 新規カテゴリー:', newCategory);

                      try {
                        console.log('⏳ ストアのaddCategoryを呼び出し中...');
                        // ストアに追加（IDが自動生成される）
                        await useAppStore.getState().addCategory(newCategory);
                        console.log('✅ addCategory完了');

                        toast.success('カテゴリーを追加しました');

                        // ストアから最新のcategoriesを取得してlocalCategoriesも更新
                        const updatedCategories = useAppStore.getState().categories;
                        console.log('📊 更新後のカテゴリー数:', updatedCategories.length);
                        console.log('📊 カテゴリーリスト:', updatedCategories);

                        setLocalCategories(updatedCategories);
                        console.log('✅ localCategories更新完了');
                      } catch (error) {
                        console.error('❌ カテゴリー追加エラー:', error);
                        if (error instanceof Error) {
                          console.error('エラーメッセージ:', error.message);
                          console.error('エラースタック:', error.stack);
                        }
                        toast.error('カテゴリーの追加に失敗しました');
                      }
                    }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                名前と色の変更は自動的に保存されます
              </p>
            </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {localCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <Input
                      type="color"
                      value={category.color}
                      onChange={async (e) => {
                        const newColor = e.target.value;
                        // 即座にローカル状態を更新（UIの反応を早くする）
                        setLocalCategories((prev) =>
                          prev.map((c) =>
                            c.id === category.id ? { ...c, color: newColor } : c
                          )
                        );

                        // データベースにも即座に保存
                        try {
                          await useAppStore.getState().updateCategory(category.id, {
                            color: newColor
                          });
                          console.log('✅ カテゴリー色を保存:', category.name, newColor);
                        } catch (error) {
                          console.error('❌ カテゴリー色の保存に失敗:', error);
                          toast.error('色の変更を保存できませんでした');
                        }
                      }}
                      className="w-16 h-12 cursor-pointer"
                    />
                    <Input
                      value={category.name}
                      onChange={(e) => {
                        // 入力中はローカル状態のみ更新
                        setLocalCategories((prev) =>
                          prev.map((c) =>
                            c.id === category.id ? { ...c, name: e.target.value } : c
                          )
                        );
                      }}
                      onBlur={async (e) => {
                        const newName = e.target.value.trim();
                        if (!newName) {
                          toast.error('カテゴリー名を入力してください');
                          // 元の名前に戻す
                          const original = categories.find(c => c.id === category.id);
                          if (original) {
                            setLocalCategories((prev) =>
                              prev.map((c) =>
                                c.id === category.id ? { ...c, name: original.name } : c
                              )
                            );
                          }
                          return;
                        }

                        // データベースに保存
                        try {
                          await useAppStore.getState().updateCategory(category.id, {
                            name: newName
                          });
                          console.log('✅ カテゴリー名を保存:', category.id, newName);
                          toast.success('カテゴリー名を保存しました');
                        } catch (error) {
                          console.error('❌ カテゴリー名の保存に失敗:', error);
                          toast.error('名前の変更を保存できませんでした');
                        }
                      }}
                      className="flex-1 h-12 text-base"
                      placeholder="カテゴリー名"
                    />
                    {!category.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12"
                        onClick={async () => {
                          const usage = checkCategoryUsage(category.name);
                          if (usage.total > 0) {
                            toast.error(
                              `このカテゴリーは${usage.usedInEvents}件のスケジュールと${usage.usedInTemplates}件のテンプレートで使用されています。先にそれらを削除または変更してください。`,
                              { duration: 5000 }
                            );
                            return;
                          }

                          try {
                            await useAppStore.getState().deleteCategory(category.id);
                            toast.success('カテゴリーを削除しました');

                            // ストアから最新のcategoriesを取得してlocalCategoriesも更新
                            const updatedCategories = useAppStore.getState().categories;
                            setLocalCategories(updatedCategories);
                          } catch (error) {
                            console.error('Error deleting category:', error);
                            toast.error('カテゴリーの削除に失敗しました');
                          }
                        }}
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
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
        categories={localCategories}
      />
    </div>
  );
}
