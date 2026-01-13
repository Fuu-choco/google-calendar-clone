# Supabaseへのデータ移行ガイド

このガイドでは、IndexedDBからSupabaseへのデータ移行手順を説明します。

## 📋 目次

1. [なぜSupabaseに移行するのか](#なぜsupabaseに移行するのか)
2. [Supabaseプロジェクトのセットアップ](#supabaseプロジェクトのセットアップ)
3. [環境変数の設定](#環境変数の設定)
4. [データベーススキーマの作成](#データベーススキーマの作成)
5. [データ移行の実行](#データ移行の実行)
6. [トラブルシューティング](#トラブルシューティング)

---

## なぜSupabaseに移行するのか

### 現在の問題（IndexedDB）
- ✗ ブラウザごと、デバイスごとにデータが独立
- ✗ 別のブラウザやデバイスでアクセスすると、データが見えない
- ✗ ブラウザのキャッシュをクリアすると、データが消える
- ✗ 他のユーザーとデータを共有できない

### Supabaseのメリット
- ✓ クラウドにデータを保存、どこからでもアクセス可能
- ✓ 複数のデバイス間でデータを同期
- ✓ データのバックアップが自動的に行われる
- ✓ 無料プラン: 2GBのデータベース容量

---

## Supabaseプロジェクトのセットアップ

### 1. Supabaseアカウントの作成

1. [https://supabase.com](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubまたはGoogleアカウントでサインアップ

### 2. 新しいプロジェクトの作成

1. ダッシュボードで「New Project」をクリック
2. 以下の情報を入力：
   - **Name**: `google-calendar-clone`（または任意の名前）
   - **Database Password**: 強力なパスワードを設定（メモしておく）
   - **Region**: `Northeast Asia (Tokyo)` （日本の場合）
   - **Pricing Plan**: `Free`
3. 「Create new project」をクリック
4. プロジェクトの準備が完了するまで1-2分待つ

### 3. APIキーの取得

1. 左メニューから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...`（長いトークン）

---

## 環境変数の設定

### 1. `.env.local` ファイルを編集

プロジェクトのルートディレクトリにある `.env.local` ファイルを開いて、以下を追加：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（あなたのanon key）
```

**注意**:
- `xxxxx.supabase.co` を実際のProject URLに置き換えてください
- `eyJ...` を実際のanon public keyに置き換えてください

### 2. 環境変数の確認

正しく設定されているか確認：

```bash
cd project
cat .env.local
```

---

## データベーススキーマの作成

### 方法1: SQL Editorを使用（推奨）

1. Supabaseダッシュボードの左メニューから「SQL Editor」を選択
2. 「New query」をクリック
3. 以下の順番でSQLファイルの内容をコピー＆ペーストして実行：

#### ステップ1: 初期スキーマ
`supabase/migrations/001_initial_schema.sql` の内容を貼り付けて「Run」

#### ステップ2: カテゴリテーブル
`supabase/migrations/002_add_categories_table.sql` の内容を貼り付けて「Run」

#### ステップ3: カテゴリ制約の削除
`supabase/migrations/003_remove_category_constraint.sql` の内容を貼り付けて「Run」

### 方法2: Supabase CLIを使用（上級者向け）

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref your-project-ref

# マイグレーションの実行
supabase db push
```

### スキーマの確認

SQL Editorで以下のクエリを実行して、テーブルが作成されたことを確認：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

以下のテーブルが表示されるはずです：
- `calendar_events`
- `todos`
- `templates`
- `categories`
- `user_preferences`
- `task_history`
- `weekly_achievements`
- `monthly_achievements`
- `sync_conflicts`

---

## データ移行の実行

### 1. アプリケーションの起動

```bash
cd project
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス

### 2. データ移行の実行

1. アプリ内の「設定」タブを開く
2. 下にスクロールして「データ管理」セクションを表示
3. **IndexedDBにデータがある場合**、青い通知が表示されます：
   ```
   ローカルデータが検出されました
   ブラウザのIndexedDBにデータが保存されています。
   Supabaseに移行することで、他のデバイスからもアクセスできるようになります。
   ```
4. 「IndexedDB → Supabase に移行」ボタンをクリック
5. 移行が完了するまで待つ（数秒〜数分）
6. 成功メッセージが表示されたら完了！

### 3. 移行内容の確認

移行が成功すると、以下の情報が表示されます：
```
移行完了！
イベント: XX件
TODO: XX件
テンプレート: XX件
カテゴリ: XX件
```

### 4. データの確認

Supabaseダッシュボードで「Table Editor」を開いて、データが正しく移行されたことを確認できます。

---

## データのバックアップ（オプション）

移行前に念のためローカルデータをバックアップしたい場合：

1. 設定画面の「データ管理」セクションを開く
2. 「ローカルデータをエクスポート」ボタンをクリック
3. JSONファイルがダウンロードされます
4. このファイルを安全な場所に保存

---

## トラブルシューティング

### エラー: "Supabase環境変数が設定されていません"

**原因**: `.env.local` ファイルが正しく設定されていない

**解決方法**:
1. `.env.local` ファイルが存在することを確認
2. `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているか確認
3. 開発サーバーを再起動：
   ```bash
   # Ctrl+C で停止
   npm run dev
   ```

### エラー: "relation 'calendar_events' does not exist"

**原因**: データベーススキーマが作成されていない

**解決方法**:
1. Supabaseダッシュボードの「SQL Editor」を開く
2. [データベーススキーマの作成](#データベーススキーマの作成)の手順を実行

### エラー: "duplicate key value violates unique constraint"

**原因**: 既にSupabaseにデータが存在する

**解決方法**:
1. Supabaseダッシュボードの「Table Editor」を開く
2. 各テーブルのデータを確認
3. 必要に応じて既存のデータを削除してから再度移行

### データが表示されない

**解決方法**:
1. ブラウザのコンソールを開いて（F12）、エラーメッセージを確認
2. ネットワークタブで、Supabaseへのリクエストが成功しているか確認
3. `.env.local` ファイルの設定を再確認
4. ページをリロード（Ctrl+R または Cmd+R）

### プロジェクトが一時停止されている

**原因**: Supabaseの無料プランでは、1週間アクティビティがないとプロジェクトが一時停止されます

**解決方法**:
1. Supabaseダッシュボードでプロジェクトを選択
2. 「Restore」または「Resume」ボタンをクリック
3. 数分待ってから再試行

---

## Vercelへのデプロイ

Supabase移行後、Vercelにデプロイする場合：

### 1. Vercelダッシュボードで環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. 以下の環境変数を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabaseのプロジェクト URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseのanon key
5. 「Save」をクリック

### 2. 再デプロイ

```bash
git add .
git commit -m "Add Supabase configuration"
git push
```

Vercelが自動的に再デプロイします。

### 3. 本番環境でのデータ移行

1. デプロイされたURLにアクセス
2. 設定画面を開く
3. 「IndexedDB → Supabase に移行」ボタンをクリック
4. 本番環境のデータが Supabase に移行されます

---

## よくある質問（FAQ）

### Q1: IndexedDBのデータは移行後も残りますか？
A: はい、IndexedDBのデータは移行後も残ります。必要に応じて「ローカルデータをエクスポート」してバックアップを取ることができます。

### Q2: 移行は何度でも実行できますか？
A: はい、何度でも実行できますが、重複データが作成される可能性があります。初回の移行後は、Supabaseのデータを直接編集することをお勧めします。

### Q3: 複数のデバイスでデータを共有できますか？
A: はい、Supabaseに移行後は、同じSupabaseプロジェクトを設定すれば、複数のデバイスでデータを共有できます。

### Q4: Supabaseの料金は？
A: 無料プランでは2GBのデータベース容量が提供されます。通常の使用では無料プランで十分です。

### Q5: データのバックアップはどうすればいい？
A: Supabaseは自動的にバックアップを作成します。また、設定画面の「ローカルデータをエクスポート」機能で手動バックアップも可能です。

---

## サポート

問題が解決しない場合は、以下を確認してください：

1. [Supabaseドキュメント](https://supabase.com/docs)
2. [プロジェクトのGitHubリポジトリ](https://github.com/your-repo)
3. ブラウザのコンソール（F12）でエラーメッセージを確認

---

## まとめ

✅ Supabaseプロジェクトを作成
✅ 環境変数を設定
✅ データベーススキーマを作成
✅ データを移行
✅ Vercelにデプロイ

これで、データは安全にクラウドに保存され、どこからでもアクセスできるようになりました！
