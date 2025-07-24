# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Claude Code LM Studio API - OpenAI API互換のプロキシサーバーで、Claude Code SDKをバックエンドとして使用。既存のOpenAI APIクライアントを変更せずにClaude Codeの機能を利用可能。

### プロジェクトの目標

- このプロジェクトの目標は **OpenAI 互換API および LM Studio 互換API の実装** です。それぞれのサービスのプロキシーを作成するわけではありません。

## 開発コマンド

### 基本コマンド
```bash
npm run dev         # 開発サーバー起動（自動リロード）
npm run build       # TypeScriptビルド
npm run start       # 本番サーバー起動
```

### コード品質
```bash
npm run lint        # Biomeによるリントチェック
npm run lint:fix    # リント問題の自動修正
npm run format      # コードフォーマット
npm run typecheck   # TypeScript型チェック（ビルドなし）
```

### テスト実行
```bash
npm test           # Vitestによるテスト実行（ウォッチモード）
npm run test:unit  # 単体テスト実行（単発）
npm run test:watch # テストウォッチモード
```

### Docker操作
```bash
docker-compose up -d    # バックグラウンドで起動
docker-compose logs -f  # ログ監視
docker-compose down     # サービス停止
```

## アーキテクチャ概要

### レイヤー構成
1. **APIレイヤー**: OpenAI API互換のHTTPエンドポイント
2. **変換レイヤー**: OpenAI API形式とClaude Code SDK間のデータ変換
3. **SDKレイヤー**: Claude Code SDKを使用したClaude Codeとの通信
4. **セキュリティレイヤー**: 認証、認可、ファイルシステム隔離

### 主要コンポーネント

#### ClaudeCodeClient (`services/claude-code-client.ts`)
- Claude Code SDKとのインターフェース
- セッション管理とチャット/補完APIの実装
- ストリーミング対応

#### Request/Response Transformers
- `services/request-transformer.ts`: OpenAI→Claude Code形式変換
- `services/response-transformer.ts`: Claude Code→OpenAI形式変換
- `services/model-mapping.service.ts`: モデル名マッピング

#### コントローラー (`controllers/`)
- `chat.controller.ts`: チャット補完エンドポイント
- `completions.controller.ts`: テキスト補完エンドポイント
- `models.controller.ts`: モデル一覧エンドポイント
- `embeddings.controller.ts`: 埋め込み（未対応）

## サポートされているモデル

- `claude-code-auto`: Claude Codeのデフォルトモデル選択
- `claude-code-opus`: 最高性能モデル（opus）
- `claude-code-sonnet`: バランス型モデル（sonnet）

環境変数`CLAUDE_MODEL`で優先モデルを設定可能。

## 開発時の注意点

### TypeScript設定
- **厳格モード有効**: `strict: true`
- **パスエイリアス**: `@/*`は`src/*`にマッピング
- **モジュール**: NodeNext（ESモジュール）

### Biome設定
- インデント: スペース2つ
- 行幅: 120文字
- クォート: シングル（文字列）、ダブル（JSX）
- `any`型禁止、未使用変数は`const`使用

### セキュリティ
- Dockerコンテナ内での隔離実行
- 読み取り専用ファイルシステム
- UID/GIDマッピング（デフォルト1000）
- Claude設定は`~/.claude`マウント

## プロジェクト仕様

詳細な仕様は`.kiro/specs/claude-code-openai-api/`を参照:
- `requirements.md`: 機能要件とユーザーストーリー
- `design.md`: 技術設計とアーキテクチャ
- `tasks.md`: 実装タスク一覧

## LM Studio互換性

`tests/`配下にLM Studio API互換性テストが存在。将来的にLM Studio/Ollama APIとの互換性も計画。

## 開発準備チェックリスト

- 作業前に必ず @.kiro/specs/claude-code-openai-api/design.md と @.kiro/specs/claude-code-openai-api/requirements.md を確認する必要があります。