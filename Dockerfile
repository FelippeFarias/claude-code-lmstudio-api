FROM node:22-alpine

# 必要なパッケージのインストール
RUN apk add --no-cache dumb-init

# UID/GIDマッピング用のユーザー作成
ARG UID=1000
ARG GID=1000

# アプリケーション用のユーザー作成（GID衝突を避けるため柔軟に対応）
RUN addgroup -S -g ${GID} appgroup 2>/dev/null || addgroup -S appgroup && \
    adduser -S -u ${UID} -G appgroup -D appuser 2>/dev/null || \
    adduser -S -G appgroup -D appuser

WORKDIR /app

# package.jsonとlockファイルのコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# Claude Code SDKのグローバルインストール（ドキュメントの要件）
RUN npm install -g @anthropic-ai/claude-code

# Claude Code設定ディレクトリの準備
RUN mkdir -p /home/appuser/.claude && \
    chown -R appuser:appgroup /home/appuser/.claude

# アプリケーションファイルのコピー
COPY --chown=appuser:appgroup . .

# ビルド
RUN npm run build

# ポート公開
EXPOSE 1235

# 非特権ユーザーに切り替え
USER appuser

# dumb-initを使用してプロセスを起動
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]