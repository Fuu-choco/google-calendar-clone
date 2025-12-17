# Vercelへのデプロイ手順

## ✅ 完了済み

- [x] Gitリポジトリの初期化
- [x] ファイルのコミット

## 📦 次のステップ

### 1. GitHubにリポジトリを作成

1. **GitHubにアクセス**: https://github.com

2. **新しいリポジトリを作成**:
   - 右上の「+」→「New repository」をクリック
   - Repository name: `google-calendar-clone` （または任意の名前）
   - Public または Private （どちらでもOK）
   - **「Initialize this repository with」は全てチェックなし**
   - 「Create repository」をクリック

3. **リポジトリのURLをコピー**:
   - 作成後に表示されるURL（例: `https://github.com/あなたのユーザー名/google-calendar-clone.git`）

### 2. GitHubにプッシュ

ターミナルで以下のコマンドを実行：

```bash
cd "/Users/fuuka/Desktop/googleクローン　自動生成・Todo/project"

# GitHubリポジトリを追加（URLは上でコピーしたものに置き換える）
git remote add origin https://github.com/あなたのユーザー名/google-calendar-clone.git

# プッシュ
git push -u origin main
```

### 3. Vercelにデプロイ

#### 3-1. Vercelアカウント作成

1. **Vercelにアクセス**: https://vercel.com
2. 「Sign Up」をクリック
3. **「Continue with GitHub」** を選択（推奨）
4. GitHubアカウントで認証

#### 3-2. プロジェクトをインポート

1. Vercelダッシュボードで **「Add New...」→「Project」**

2. **「Import Git Repository」**:
   - GitHubリポジトリ一覧から `google-calendar-clone` を選択
   - 「Import」をクリック

3. **プロジェクト設定**:
   - Framework Preset: **Next.js** （自動検出されます）
   - Root Directory: `.` （そのまま）
   - Build Command: `npm run build` （デフォルト）
   - Output Directory: `.next` （デフォルト）

4. **環境変数を設定**:
   - 「Environment Variables」セクションを展開
   - 以下を追加：

   ```
   Key: OPENAI_API_KEY
   Value: あなたのOpenAI APIキー
   ```

   （`.env.local` ファイルの `OPENAI_API_KEY` の値をコピー）

5. **「Deploy」をクリック**

#### 3-3. デプロイ完了

- 2-3分待つとビルドが完了
- 完了すると、URLが表示されます：
  ```
  https://google-calendar-clone-xxx.vercel.app
  ```

### 4. iPhoneでアクセス

1. **Safari でVercelのURLを開く**:
   ```
   https://your-app-name.vercel.app
   ```

2. **ホーム画面に追加**:
   - 共有ボタン → 「ホーム画面に追加」

3. **オフラインテスト**:
   - 一度アプリを開いてページをロード
   - Wi-Fi OFF
   - ホーム画面のアイコンから起動
   - ✅ 完全にオフラインで動作！

## 🎯 Vercel無料プランの制限

### ✅ 含まれるもの

- **プロジェクト数**: 無制限
- **デプロイ**: 無制限
- **帯域幅**: 100GB/月
- **ビルド時間**: 6000分/月
- **自動HTTPS**: 無料
- **カスタムドメイン**: 無料
- **Git統合**: 自動デプロイ

### 📊 このアプリでの使用量

- **静的ファイル**: 5-10MB程度
- **ビルド時間**: 約2分/回
- **帯域幅**: ほぼ使わない（IndexedDBで完結）

→ **無料プランで十分！**

## 🔄 更新方法

コードを変更してGitHubにプッシュするだけで、Vercelが自動的に再デプロイします：

```bash
# ファイルを編集後
git add .
git commit -m "機能追加: xxx"
git push

# → Vercelが自動的にビルド&デプロイ（2-3分）
```

## 🌐 独自ドメインの設定（オプション）

Vercelで独自ドメインを設定できます（無料）：

1. Vercelダッシュボード → プロジェクト → Settings → Domains
2. 独自ドメインを入力（例: `calendar.yourdomain.com`）
3. DNS設定を追加
4. 完了！

## 🔒 環境変数の更新

Vercelダッシュボードで環境変数を変更できます：

1. プロジェクト → Settings → Environment Variables
2. 編集または追加
3. 「Redeploy」をクリックして反映

## ⚡ パフォーマンス

Vercelは世界中のCDNでホスティングされるため：

- ✅ 超高速読み込み
- ✅ 自動スケーリング
- ✅ 99.99%アップタイム
- ✅ 自動HTTPS

## 🐛 トラブルシューティング

### ビルドエラーが出る場合

1. Vercelのビルドログを確認
2. ローカルで `npm run build` を実行してエラーを確認
3. 修正してGitHubにプッシュ

### 環境変数が反映されない

1. Vercelで環境変数を確認
2. 「Redeploy」をクリック

### iPhoneで開けない

1. URLが正しいか確認
2. HTTPSでアクセス（Vercelは自動的にHTTPS）
3. Safariのキャッシュをクリア

## 📱 完全オフラインPWA

Vercelにデプロイすると：

✅ Service Workerが正しく動作
✅ 全ファイルがキャッシュされる
✅ オフラインで完全動作
✅ ホーム画面に追加でアプリ化
✅ プッシュ通知対応（将来）

## 🎉 まとめ

1. GitHubにプッシュ（5分）
2. Vercelでインポート（2分）
3. 自動デプロイ（3分）
4. 完成！

**合計10分で完全オフライン対応PWAが完成します！**
