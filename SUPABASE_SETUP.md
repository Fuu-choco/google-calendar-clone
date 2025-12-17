# Supabaseセットアップ手順

## 1. Supabaseプロジェクトの作成

1. https://supabase.com にアクセス
2. 「New Project」をクリック
3. 以下の情報を入力：
   - Name: `google-calendar-clone`
   - Database Password: 強力なパスワードを設定（メモしておく）
   - Region: `Northeast Asia (Tokyo)`
   - Pricing Plan: `Free`
4. 「Create new project」をクリック
5. プロジェクトの準備が完了するまで1-2分待つ

## 2. データベーステーブルの作成

1. 左メニューから「SQL Editor」を選択
2. 「New query」をクリック
3. `supabase/migrations/001_initial_schema.sql` の内容をコピー＆ペースト
4. 「Run」をクリック

5. 新しいクエリを作成して `002_add_categories_table.sql` を実行
6. 新しいクエリを作成して `003_remove_category_constraint.sql` を実行

## 3. API キーの取得

1. 左メニューから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...`（長いトークン）

## 4. 環境変数の設定

`.env.local` ファイルを開いて、以下の値を更新：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（あなたのanon key）
```

## 5. サーバーの再起動

```bash
# 開発サーバーを停止（Ctrl+C）
# 再起動
npm run dev
```

## 6. 動作確認

1. http://localhost:3000 にアクセス
2. タスクを作成して保存を試す
3. 成功すれば完了！

---

## トラブルシューティング

### プロジェクトが一時停止されている場合

1. Supabaseダッシュボードでプロジェクトを選択
2. 「Restore」または「Resume」ボタンをクリック
3. 数分待ってから再試行

### データが表示されない場合

1. SQL Editorで以下のクエリを実行：
```sql
SELECT * FROM calendar_events;
SELECT * FROM categories;
```

2. データがあることを確認

### 接続エラーが続く場合

- ブラウザのキャッシュをクリア
- `.env.local` の設定を再確認
- 開発サーバーを再起動
