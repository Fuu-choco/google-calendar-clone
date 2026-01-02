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

### 3. 日表示での長押し時間範囲選択機能（1秒長押し + 下方向ドラッグ）

**追加機能:**
- 1秒間長押しで範囲選択モードを開始
- 下方向へのドラッグのみ時間範囲を選択
- 上方向へのドラッグは通常のスクロール
- 選択範囲を青色でハイライト表示
- 15分単位で精密な範囲選択が可能
- プルトゥリフレッシュを完全に防止

**変更ファイル:**
- `components/calendar/DayTimeline.tsx`

**使い方:**

| 操作 | 結果 |
|------|------|
| **短いタップ** | 1時間分の予定作成 |
| **タップ + スクロール** | 通常のスクロール |
| **1秒長押し + 下ドラッグ** | 時間範囲選択 |
| **1秒長押し + 上ドラッグ** | キャンセル |

**ステップバイステップ（範囲選択）:**
```
1. 空白の時間枠を1秒間長押し
2. バイブレーション + 緑色のインジケーター「下にドラッグして範囲を選択」
3. 下方向にドラッグして範囲を選択（青色ハイライト表示）
4. 指を離すと予定作成画面が開く
5. 選択した時間範囲が自動的に設定される
```

**技術実装:**

**状態管理:**
```typescript
const [selecting, setSelecting] = useState(false);
const [selectionStart, setSelectionStart] = useState<number | null>(null);
const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
const [longPressStartY, setLongPressStartY] = useState<number | null>(null);
const [isLongPressActivated, setIsLongPressActivated] = useState(false);
const [hasMoved, setHasMoved] = useState(false);
```

**1秒長押しタイマー:**
```typescript
const timer = setTimeout(() => {
  setIsLongPressActivated(true);
  if (navigator.vibrate) {
    navigator.vibrate(50); // バイブレーション
  }
}, 1000);
```

**移動方向の検知:**
```typescript
const moveDistance = touch.clientY - longPressStartY;

// 下方向への移動（正の値）のみ選択モードを開始
if (moveDistance > 20) {
  setSelecting(true);
} else if (moveDistance < -10) {
  // 上方向への移動は選択をキャンセル
  setIsLongPressActivated(false);
}
```

**5重のリロード防止システム:**
1. **useEffect - グローバルリスナー**
   ```typescript
   useEffect(() => {
     const preventScroll = (e: TouchEvent) => {
       if (selecting || isLongPressActivated) {
         e.preventDefault();
       }
     };

     if (selecting || isLongPressActivated) {
       document.addEventListener('touchmove', preventScroll, { passive: false });
       document.body.style.overflow = 'hidden';
       document.body.style.overscrollBehavior = 'none';
     }

     return () => {
       document.removeEventListener('touchmove', preventScroll);
       document.body.style.overflow = '';
       document.body.style.overscrollBehavior = 'auto';
     };
   }, [selecting, isLongPressActivated]);
   ```

2. **handleTouchMove - preventDefault**
   ```typescript
   if (!selecting && longPressStartY !== null) {
     e.preventDefault(); // 長押し有効化中は常に呼ぶ
   }
   ```

3. **react-swipeable無効化**
   ```typescript
   <ScrollArea {...((selecting || isLongPressActivated) ? {} : handlers)}>
   ```

4. **touchAction CSS**
   ```typescript
   style={{
     touchAction: (selecting || isLongPressActivated) ? 'none' : 'auto'
   }}
   ```

5. **body overscrollBehavior**
   - useEffectで`'none'`に設定

**視覚フィードバック:**
```typescript
{/* 長押し準備中のインジケーター */}
{isLongPressActivated && !selecting && selectionStart !== null && (
  <div className="absolute left-16 right-0 bg-green-200 dark:bg-green-900 opacity-30 pointer-events-none z-20 border-2 border-green-500 dark:border-green-400"
    style={{
      top: `${selectionStart}px`,
      height: '60px',
    }}
  >
    <div className="flex items-center justify-center h-full text-green-700 dark:text-green-300 text-xs font-bold">
      下にドラッグして範囲を選択
    </div>
  </div>
)}

{/* 選択範囲の表示 */}
{selecting && selectionStart !== null && selectionEnd !== null && (
  <div className="absolute left-16 right-0 bg-blue-200 dark:bg-blue-900 opacity-50 pointer-events-none z-20 border-2 border-blue-500 dark:border-blue-400"
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

### 2. 長押し選択時のプルトゥリフレッシュ防止（最終版）

**問題の変遷:**
1. 初期実装: 下にドラッグするとリロードが発生
2. 第1回修正後: まだリロードが発生
3. 第2回修正後: スクロールができない、タップで予定追加できない
4. 最終修正: すべて解決！

**最終的な修正内容（5重の防御システム + スマート検知）:**

**1. useEffect - グローバルリスナー（selecting OR isLongPressActivated）**
```typescript
useEffect(() => {
  const preventScroll = (e: TouchEvent) => {
    if (selecting || isLongPressActivated) {
      e.preventDefault();
    }
  };

  if (selecting || isLongPressActivated) {
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }

  return () => {
    document.removeEventListener('touchmove', preventScroll);
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = 'auto';
  };
}, [selecting, isLongPressActivated]);
```

**2. handleTouchMove - 長押し有効化中は常にpreventDefault**
```typescript
if (!selecting && longPressStartY !== null) {
  e.preventDefault(); // ここが重要！
  // 移動方向の判定...
}
```

**3. react-swipeable無効化（isLongPressActivated時も）**
```typescript
<ScrollArea {...((selecting || isLongPressActivated) ? {} : handlers)}>
```

**4. touchAction CSS（isLongPressActivated時も）**
```typescript
style={{
  touchAction: (selecting || isLongPressActivated) ? 'none' : 'auto'
}}
```

**5. hasMoved フラグで移動を追跡**
```typescript
const [hasMoved, setHasMoved] = useState(false);

// スクロールした場合は予定作成しない
if (!hasMoved && longPressStartY !== null && selectionStart !== null) {
  // 短いタップのみ予定作成
}
```

**変更ファイル:**
- `components/calendar/DayTimeline.tsx`

**効果:**
- ✅ プルトゥリフレッシュを完全に防止
- ✅ 通常のスクロールは正常に動作
- ✅ 短いタップで予定追加が可能
- ✅ 1秒長押し + 下ドラッグで範囲選択
- ✅ すべての操作が干渉せずに共存

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

**基本機能の実装:**
1. **feat: Todoリストに繰り返し機能を追加 & チェック済みを下部へ移動**
   - 繰り返し設定（毎日・毎週・毎月）を実装
   - 完了済みTodoの自動ソート

2. **fix: TaskEditModalのdefaultDate未設定エラーを修正**
   - currentDateをstoreから取得して渡す

3. **fix: モバイルブラウザ互換性の修正（crypto.randomUUID、Select要素）**
   - generateId()関数でフォールバック実装
   - SelectValueにplaceholder追加

**長押し機能の実装と改善:**
4. **feat: 日表示に長押し時間範囲選択機能を追加**
   - タッチイベントでの時間範囲選択
   - 15分単位のスナップ処理

5. **fix: 長押し選択時の不要なテキスト選択を防止**
   - select-noneクラス追加
   - data-event-card属性で検出

6. **fix: 長押し選択中のプルトゥリフレッシュを防止**
   - preventDefault追加
   - overscrollBehavior設定

7. **fix: 選択中のスワイプハンドラーとプルトゥリフレッシュを完全に無効化**
   - react-swipeableハンドラーを条件付き無効化
   - touchAction CSS追加

8. **fix: プルトゥリフレッシュを5重の防御で完全ブロック**
   - グローバルリスナー追加
   - { passive: false }で強制ブロック

**長押し機能の最適化:**
9. **feat: 長押し時間範囲選択を2秒長押し+下方向ドラッグに改善**
   - 2秒タイマー実装
   - 移動方向検知（下のみ選択開始）
   - 緑色インジケーター追加

10. **fix: 長押し機能の修正 - スクロールと短いタップを正常に動作させる**
    - hasMovedフラグ追加
    - 短いタップで1時間分の予定作成
    - スクロール干渉を解決

11. **fix: 長押し時間を1秒に変更 & リロード問題を完全修正**
    - タイマーを2秒→1秒に短縮
    - isLongPressActivated時もpreventDefault
    - すべての操作が共存

12. **docs: 2026年1月2日の更新履歴を追加**
    - CHANGELOG_20260102.md作成

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
- **1秒長押し + 下ドラッグ**で複数時間枠の予定が素早く作成可能
- 短いタップで1時間分の予定を即座に作成
- 通常のスクロールと時間範囲選択が干渉しない
- プルトゥリフレッシュが完全に防止され、快適な操作性
- バイブレーションと視覚的フィードバックで直感的な操作

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
