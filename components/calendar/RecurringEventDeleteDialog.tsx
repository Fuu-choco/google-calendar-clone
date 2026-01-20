'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type DeleteOption = 'this' | 'following' | 'all';

interface RecurringEventDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (option: DeleteOption) => void;
  eventTitle: string;
}

export function RecurringEventDeleteDialog({
  open,
  onOpenChange,
  onDelete,
  eventTitle,
}: RecurringEventDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>繰り返しイベントを削除</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-4">
            <p className="font-medium text-slate-900 dark:text-white">「{eventTitle}」を削除しますか？</p>
            <p className="text-sm">このイベントは繰り返しイベントです。削除範囲を選択してください：</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <button
            onClick={() => onDelete('this')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <div className="font-medium text-slate-900 dark:text-white">このイベントのみ</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">この日のイベントのみを削除します</div>
          </button>

          <button
            onClick={() => onDelete('following')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <div className="font-medium text-slate-900 dark:text-white">このイベント以降</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">この日以降のすべてのイベントを削除します</div>
          </button>

          <button
            onClick={() => onDelete('all')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <div className="font-medium text-slate-900 dark:text-white">すべてのイベント</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">過去・未来すべてのイベントを削除します</div>
          </button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
