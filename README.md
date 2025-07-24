# Claude Code LM Studio API

OpenAI と LM Studio API互換のプロキシサーバーで、Claude Code SDKをバックエンドとして使用します。  
既存のOpenAI または LM Studio APIクライアントを変更することなく、Claude Codeの機能を利用できます。（例: IntelliJ IDEA AI Assistant）

> [!CAUTION]
> Claude Pro および Claude Maxサブスクリプションは個人向けです。このサーバーを他人に使用させないでください。

## 特徴

- 🔄 **OpenAI API互換**: 既存のOpenAI APIクライアントがそのまま動作
- 🔄 **LM Studio API互換**: 既存のLM Studio APIクライアントがそのまま動作
- 🐳 **Docker対応**: Docker Composeで簡単に起動
- 🔒 **セキュリティ**: ファイルシステム隔離により安全な実行環境

## サポートされているエンドポイント

- ✅ `GET /v1/models` - 利用可能なモデル一覧
- ✅ `POST /v1/chat/completions` - チャット補完（ストリーミング対応）
- ✅ `POST /v1/completions` - テキスト補完（ストリーミング対応）
- ❌ `POST /v1/embeddings` - 埋め込み生成（未対応）
- ✅ `GET /health` - ヘルスチェック
- ✅ `GET /metrics` - メトリクス情報

## 利用可能なモデル

- `claude-code-auto` - Claude Codeのデフォルトモデル選択に任せる
- `claude-code-opus` - Opus を使用
- `claude-code-sonnet` - Sonnet を使用

### モデル設定について

環境変数`CLAUDE_MODEL`の動作：

- **未設定の場合**：すべてのモデル指定がそのまま使用されます
  - `claude-code-auto` → Claude Codeのデフォルトモデル選択
  - `claude-code-opus` → Opusモデル
  - `claude-code-sonnet` → Sonnetモデル

- **設定されている場合**（例：`CLAUDE_MODEL=sonnet`）：
  - `claude-code-auto` → 環境変数の値に上書きされます
  - `claude-code-opus` → 環境変数の値に上書きされます
  - `claude-code-sonnet` → 常に`sonnet`モデルを使用します（上書きされません）

これにより、サブスクリプションプラン（とくにProプラン）に応じて利用可能なモデルを制限できます。
例: `CLAUDE_MODEL=sonnet`を設定すると、クライアントが`claude-code-auto`や`claude-code-opus`を指定しても`sonnet`モデルが使用されます。

## クイックスタート

### 必要な要件

- Docker
- Docker Compose 2.22.0以上
- Claude Pro または Claude Maxのサブスクリプション

### インストールと起動

1. リポジトリをクローン

```bash
git clone https://github.com/common-creation/claude-code-lmstudio-api.git
cd claude-code-lmstudio-api
```

2. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して必要な設定を行う
```

3. Docker Composeで起動

```bash
docker compose up -d
```

4. セットアップ（Claude Code SDKの認証）

```bash
docker compose exec /bin/sh
# コンテナ内部
claude
# 認証を行う
```

## 使用例

### IntelliJ IDEA AI Assistant

設定 > ツール > AI Assistant > モデル

- サードパーティー AI プロバイダー
  - LM Studio: 有効
    - URL: http://localhost:1235
    - 接続のテストを実行して `✅ 接続完了` になればOK
- ローカルモデル
  - 接続テスト後に指定できるようになる
  - コア機能: `lmstudio/claude-code-auto`
  - インスタントヘルパー: `lmstudio/claude-code-sonnet`
    - それぞれ `lmstudio/claude-code-opus` も指定できますが、インスタントヘルパーにOpusを使うのは非推奨です
- オフラインモード: お好みで（有効を推奨）

![](https://i.imgur.com/Sb8VEG9.png)

### その他

https://lmstudio.ai/docs/app/api/endpoints/rest

## 設定

### 環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| PORT | 1235 | サーバーのリスニングポート |
| LOG_LEVEL | info | ログレベル (error, warn, info, debug) |
| TIMEOUT_MS | 30000 | リクエストタイムアウト（ミリ秒） |
| CORS_ENABLED | true | CORS有効化フラグ |
| CORS_ORIGINS | * | 許可するオリジン |
| CLAUDE_TIMEOUT | 30000 | Claude Code SDKのタイムアウト（ミリ秒） |
| CLAUDE_MODEL | - | Claude Codeのモデル指定（opus/sonnet/未設定） |

### Docker設定

| 変数名 | デフォルト値 | 説明 |
|--------|--------------|------|
| UID | 1000 | コンテナ内のユーザーID |
| GID | 1000 | コンテナ内のグループID |

## トラブルシューティング

### サーバーが起動しない

1. ポート1235が他のプロセスで使用されていないか確認
2. Docker Composeのログを確認: `docker compose logs`
3. 環境変数が正しく設定されているか確認

### Claude Code SDKエラー・レスポンス生成エラー

1. ~/.claudeディレクトリの権限を確認
2. コンテナ内のClaude Codeのアカウント認証が正しく設定されているか確認
3. ネットワーク接続を確認

## ライセンス

MIT License
