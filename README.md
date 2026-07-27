# Timecard Persistent Setup

このフォルダには、GitHub Pages をフロントエンドに、Netlify Functions をバックエンドに使って打刻データを永続化するためのサンプルコードが含まれます。

## 使い方

1. このリポジトリを GitHub にアップロードし、GitHub Pages を有効化します。
2. Netlify で新しいサイトを作成し、このリポジトリを接続します。
3. Netlify の環境変数を設定します。

### Netlify の環境変数

- `GITHUB_TOKEN` - GitHub の Personal Access Token
  - `repo` スコープが必要です。
- `GITHUB_REPO` - 保存先リポジトリ名。例: `username/repo`
- `GITHUB_FILEPATH` - 保存先の JSON ファイルパス。デフォルト: `timecard/history.json`

### デプロイ手順

1. GitHub にこのプロジェクトをプッシュ
2. GitHub Pages を公開（`main` ブランチの `/(root)` など）
3. Netlify に GitHub リポジトリを接続
4. `netlify.toml` に従ってビルドを行う
5. Netlify の環境変数を設定

### 使い方

- `index.html` をブラウザで開くと出勤/退勤が記録できます。
- ボタンを押すと `localStorage` に保存され、Netlify Functions 経由で GitHub リポジトリにも送信します。
- 保存先の Netlify URL を `index.html` の `NETLIFY_API_ROOT` に設定してください。

## 注意

- この実装は `localStorage` にも保存するため、ブラウザのデータが消える場合でもバックエンドに残ります。
- GitHub API によるファイル更新は、`GITHUB_TOKEN` の権限設定が必要です。
