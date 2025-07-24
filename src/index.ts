import { createApp, startServer } from './app.js'
import { claudeCodeClient } from './services/claude-code-client.js'
import { logger } from './utils/logger.js'

// メイン関数
async function main() {
  try {
    logger.info('Initializing Claude Code OpenAI Compatible API...')

    // Claude Code SDKクライアントの初期化
    await claudeCodeClient.initialize()
    logger.info('Claude Code SDK client initialized')

    // Expressアプリケーションの作成
    const app = createApp()

    // サーバーの起動
    await startServer(app)
  } catch (error) {
    logger.error('Failed to start server', { error })
    process.exit(1)
  }
}

// アプリケーションの起動
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
