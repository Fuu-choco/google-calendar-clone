# 更新履歴 - 2026年1月2日

## 概要

Google Calendar CloneにTodoリストの繰り返し機能、日表示での長押し時間範囲選択機能、モバイル互換性の大幅改善を実施しました。

---

## ✨ 新機能

### 1. Todoリストの繰り返し機能

**追加機能:**
- Todoに繰り返し設定を追加（毎日・毎週・毎月）
- 自動的に未来の日付にTodoを生成（30日先まで）
- 繰り返しアイコンとラベルで視覚的に表示

**変更ファイル:**
- `lib/types.ts` - RepeatType型、Todo型に繰り返しフィールドを追加
- `lib/repeatTodoGenerator.ts` - 新規作成（繰り返しTodo生成ロジック）
- `components/todo/TodoList.tsx` - 繰り返し選択UIの追加
- `components/todo/TodoItem.tsx` - 繰り返しバッジの表示
- `lib/store.ts` - fetchData時に自動的に繰り返しTodoを生成

**使い方:**
```
1. Todoリストで新しいTodoを追加する際に繰り返しタイプを選択
2. [繰り返しなし] [毎日] [毎週] [毎月] から選択
3. 保存すると自動的に未来の日付にTodoが生成される
```

**表示例:**
```
☐ 毎朝の運動 [🔁 毎日]
☐ 週次レビュー [🔁 毎週]
☐ 月次振り返り [🔁 毎月]
```

**技術詳細:**
- `calculateNextRepeatDate()` - 次の繰り返し日を計算
- `generateNextTodo()` - 親Todoから新しいTodoを生成
- `generateRepeatTodos()` - 既存Todoから30日分のTodoを一括生成
- `parentTodoId` - 繰り返しTodoの親を追跡

---

### 2. Todoリストのソート機能（チェック済みは下部へ）

**追加機能:**
- 未完了のTodoを上部に表示
- 完了済みのTodoを下部に自動移動
- 日付ごとにグループ化された状態でソート

**変更ファイル:**
- `components/todo/TodoList.tsx`

**実装:**
```typescript
{dateTodos
  .sort((a, b) => {
    // 未完了を上に、完了済みを下に
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  })
  .map((todo) => (...))}
```

**効果:**
- タスク管理の効率化
- 未完了タスクに集中できる
- 視覚的に整理された表示

---

### 3. 日表示での長押し時間範囲選択機能

**追加機能:**
- タイムライン上で長押しして時間範囲を選択
- 選択範囲を青色でハイライト表示
- 選択完了時に予定作成画面を自動的に開く
- 15分単位で精密な範囲選択が可能

**変更ファイル:**
- `components/calendar/DayTimeline.tsx`

**使い方:**
```
1. 空白の時間枠を長押し
2. 上または下にドラッグして範囲を選択
3. 指を離すと予定作成画面が開く
4. 選択した時間範囲が自動的に設定される
```

**技術実装:**
- `handleTouchStart()` - タッチ開始時に選択モードを開始
- `handleTouchMove()` - ドラッグ中に選択範囲を更新
- `handleTouchEnd()` - 選択完了時に予定作成画面を開く
- `getMinuteFromY()` - Y座標から時刻（分）を計算
- 15分単位でスナップ処理

**視覚フィードバック:**
```typescript
{selecting && selectionStart !== null && selectionEnd !== null && (
  <div
    className="absolute left-16 right-0 bg-blue-200 dark:bg-blue-900 opacity-50 pointer-events-none z-20 border-2 border-blue-500 dark:border-blue-400"
    style={{
      top: `${Math.min(selectionStart, selectionEnd)}px`,
      height: `${Math.abs(selectionEnd - selectionStart) + 15}px`,
    }}
  />
)}
```

---

## 🐛 バグ修正

### 1. モバイルブラウザでの予定追加エラー修正

**問題:**
- モバイルブラウザで「+」ボタンを押すとエラー画面が表示される
- "A client-side exception has occurred"
- "A <Select.Item /> must have a value prop that is not an empty string"

**原因:**
1. `crypto.randomUUID()`が古いモバイルブラウザでサポートされていない
2. `SelectValue`コンポーネントにplaceholderが設定されていない
3. `SelectItem`内に不正なネストされたdiv要素

**修正内容:**

**1. crypto.randomUUID()のフォールバック実装**
- `lib/utils.ts`に`generateId()`関数を作成
- crypto.randomUUID()が利用できない環境ではUUID v4をフォールバック生成

```typescript
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバック: ランダムなUUID v4を生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

**2. SelectValueコンポーネントの修正**
- すべての`SelectValue`にplaceholderを追加

```typescript
<SelectValue placeholder="カテゴリを選択" />
<SelectValue placeholder="優先度を選択" />
<SelectValue placeholder="繰り返しなし" />
```

**3. SelectItem内の不正なネストを修正**
- カテゴリ選択のSelectItemから不要なdivを削除

**変更ファイル:**
- `lib/utils.ts` - 新規作成（generateId関数）
- `components/calendar/TaskEditModal.tsx`
- `components/todo/TodoList.tsx`
- `components/settings/SettingsView.tsx`
- `components/settings/TemplateEditModal.tsx`

---

### 2. 長押し選択時のプルトゥリフレッシュ防止

**問題:**
- 時間範囲を選択するために下にドラッグするとブラウザがリロードされる
- プルトゥリフレッシュが誤って発動
- 選択中にスクロールが発生

**修正内容（5重の防御システム）:**

**1. handleTouchStartでpreventDefault**
```typescript
const handleTouchStart = (e: React.TouchEvent, containerRef: HTMLElement) => {
  e.preventDefault();
  // タッチ開始処理...
  document.body.style.overscrollBehavior = 'none';
};
```

**2. handleTouchMoveでpreventDefault**
```typescript
const handleTouchMove = (e: React.TouchEvent, containerRef: HTMLElement) => {
  if (!selecting || selectionStart === null) return;
  e.preventDefault();
  // タッチ移動処理...
};
```

**3. グローバルtouchmoveイベントをブロック**
```typescript
useEffect(() => {
  const preventScroll = (e: TouchEvent) => {
    if (selecting) {
      e.preventDefault();
    }
  };

  if (selecting) {
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.style.overflow = 'hidden';
  }

  return () => {
    document.removeEventListener('touchmove', preventScroll);
    document.body.style.overflow = '';
  };
}, [selecting]);
```

**4. touchActionプロパティで制御**
```typescript
style={{
  height: '1440px',
  touchAction: selecting ? 'none' : 'auto'
}}
```

**5. react-swipeableハンドラーの条件付き無効化**
```typescript
<ScrollArea className="flex-1" {...(selecting ? {} : handlers)}>
```

**変更ファイル:**
- `components/calendar/DayTimeline.tsx`

**効果:**
- 確実にプルトゥリフレッシュを防止
- スムーズな時間範囲選択が可能
- 選択完了後は通常のスクロールに戻る

---

### 3. 長押し選択時のテキスト選択防止

**問題:**
- 時間範囲を選択する際にテキストが青く選択されてしまう
- イベントカードをタップした時も選択モードが開始される

**修正内容:**

**1. イベントカードとボタンをタップした場合は無視**
```typescript
const handleTouchStart = (e: React.TouchEvent, containerRef: HTMLElement) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-event-card]') || target.closest('button')) {
    return;
  }
  // 選択処理...
};
```

**2. タイムスロットにselect-noneクラスを追加**
```typescript
<div className="ml-16 h-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative z-0 select-none">
```

**3. data-event-card属性を追加**
```typescript
<div
  ref={setNodeRef}
  className="absolute pointer-events-auto"
  style={style}
  data-event-card
  {...listeners}
  {...attributes}
>
```

**変更ファイル:**
- `components/calendar/DayTimeline.tsx`

---

### 4. TaskEditModalのdefaultDate未設定エラー修正

**問題:**
- 日表示で「+」ボタンを押してもTaskEditModalが開かない
- defaultDateプロパティが渡されていない

**修正内容:**
- `app/page.tsx`で`currentDate`をstoreから取得
- TaskEditModalに`defaultDate={currentDate}`を渡す

```typescript
const { currentTab, fetchData, isLoading, events, addNotification, currentDate } = useAppStore();

<TaskEditModal
  open={showAddEvent}
  onOpenChange={setShowAddEvent}
  defaultDate={currentDate}
/>
```

**変更ファイル:**
- `app/page.tsx`

---

## 🎨 UI改善

### 1. エラーページの追加

**追加内容:**
- カスタムエラーページを作成（`app/error.tsx`）
- エラーメッセージとスタックトレースを表示
- 再試行ボタンとホームに戻るボタンを配置
- モバイルでのデバッグを容易に

**変更ファイル:**
- `app/error.tsx` - 新規作成

**表示内容:**
```
❌ エラーが発生しました

[エラーメッセージ]

詳細を表示 ▼
  [スタックトレース]

[再試行] [ホームに戻る]

このエラーメッセージのスクリーンショットを撮って共有してください
```

---

### 2. 繰り返しTodoの視覚的表示

**追加内容:**
- Todoアイテムに繰り返しバッジを表示
- 紫色のバッジで「🔁 毎日」「🔁 毎週」「🔁 毎月」を表示

**実装:**
```typescript
{todo.repeat && todo.repeat !== 'none' && (
  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
    <Repeat className="h-3 w-3" />
    {todo.repeat === 'daily' && '毎日'}
    {todo.repeat === 'weekly' && '毎週'}
    {todo.repeat === 'monthly' && '毎月'}
  </span>
)}
```

**変更ファイル:**
- `components/todo/TodoItem.tsx`

---

## 🔧 技術改善

### 1. generateId()ユーティリティ関数の作成

**目的:**
- ブラウザ互換性を向上
- すべてのID生成を統一的に管理

**実装場所:** `lib/utils.ts`

**使用箇所:**
- `components/calendar/TaskEditModal.tsx`
- `components/todo/TodoList.tsx`
- その他のID生成が必要な場所

---

### 2. repeatTodoGenerator.tsの作成

**目的:**
- 繰り返しTodo生成ロジックを分離
- テスト可能で保守しやすいコード

**主要関数:**
- `generateNextTodo(parentTodo, nextDate)` - 親Todoから新しいTodoを生成
- `calculateNextRepeatDate(todo, fromDate)` - 次の繰り返し日を計算
- `generateRepeatTodos(todos, targetDate, daysAhead)` - 未来のTodoを一括生成

**変更ファイル:**
- `lib/repeatTodoGenerator.ts` - 新規作成

---

## 📦 デプロイ

### Gitコミット履歴

1. **feat: Todoリストに繰り返し機能を追加 & チェック済みを下部へ移動**
2. **fix: TaskEditModalのdefaultDate未設定エラーを修正**
3. **fix: モバイルブラウザ互換性の修正（crypto.randomUUID、Select要素）**
4. **feat: 日表示に長押し時間範囲選択機能を追加**
5. **fix: 長押し選択時の不要なテキスト選択を防止**
6. **fix: 長押し選択中のプルトゥリフレッシュを防止**
7. **fix: 選択中のスワイプハンドラーとプルトゥリフレッシュを完全に無効化**
8. **fix: プルトゥリフレッシュを5重の防御で完全ブロック**

### デプロイ先
- **GitHub:** https://github.com/Fuu-choco/google-calendar-clone
- **Vercel:** https://google-calendar-clone-phi-lovat.vercel.app

---

## 📊 影響範囲

### ✅ ユーザーへの影響

**ポジティブ:**
- 繰り返しTodoで日常的なタスク管理が簡単に
- 完了済みTodoが下部に移動し、未完了タスクに集中できる
- モバイルで予定追加がスムーズに動作
- 長押しで複数時間枠の予定が素早く作成可能
- プルトゥリフレッシュが防止され、快適な操作性

**ネガティブ:**
- なし（既存データに影響なし、後方互換性を維持）

### ✅ 開発者への影響

**改善点:**
- generateId()で統一的なID生成
- repeatTodoGenerator.tsで保守性向上
- エラーページでデバッグが容易
- モバイル互換性が大幅に向上

---

## 🔍 PWAキャッシュに関する注意事項

**問題:**
ホーム画面に保存したPWAアイコンからアクセスすると、古いバージョンが表示される場合があります。

**原因:**
Service Workerが古いバージョンのキャッシュを保持しています。

**解決策:**
1. ホーム画面のアイコンを削除
2. QRコードまたはブラウザから新しくアクセス
3. ホーム画面に再度追加

または：
1. ブラウザの設定から「サイトデータを削除」
2. ページを再読み込み

---

## 🔮 今後の改善候補

### 高優先度
1. **繰り返しTodoの編集・削除機能の強化**
   - 単体のみ削除 or すべて削除
   - 単体のみ編集 or すべて編集

2. **時間範囲選択の視覚的フィードバック向上**
   - 選択開始時のバイブレーション
   - 選択範囲の時間表示（例: 12:00-15:00）

### 中優先度
1. **繰り返しTodoの詳細設定**
   - 終了日の設定
   - 特定の曜日のみ繰り返し（例: 月・水・金）
   - 隔週、隔月の繰り返し

2. **カレンダーとTodoの連携強化**
   - Todoからカレンダーにイベントをドラッグアンドドロップ
   - カレンダーイベントからTodoを生成

---

## 📝 技術スタック

- **Frontend:** Next.js 13.5.1 (App Router)
- **State Management:** Zustand with persist
- **Database:** IndexedDB
- **UI Components:** shadcn/ui (Radix UI)
- **Styling:** Tailwind CSS
- **Date Handling:** date-fns
- **Drag & Drop:** @dnd-kit/core
- **Touch Gestures:** react-swipeable
- **PWA:** Service Worker
- **Deployment:** Vercel (Static Export)

---

## 🛠️ 主要な変更ファイル一覧

### 新規作成
- `lib/repeatTodoGenerator.ts` - 繰り返しTodo生成ロジック
- `app/error.tsx` - カスタムエラーページ

### 大幅な変更
- `components/calendar/DayTimeline.tsx` - 長押し時間範囲選択機能
- `components/todo/TodoList.tsx` - 繰り返し選択UI、ソート機能
- `lib/types.ts` - RepeatType、Todo型の拡張

### 中程度の変更
- `lib/utils.ts` - generateId()関数の追加
- `components/todo/TodoItem.tsx` - 繰り返しバッジ表示
- `components/calendar/TaskEditModal.tsx` - Select修正、generateId使用
- `lib/store.ts` - 繰り返しTodo自動生成
- `app/page.tsx` - defaultDate修正

### 軽微な変更
- `components/settings/SettingsView.tsx` - SelectValue修正
- `components/settings/TemplateEditModal.tsx` - SelectValue修正

---

## 🙏 謝辞

本日の更新は Claude Code を使用して実装されました。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
