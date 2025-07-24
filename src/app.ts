import cors from 'cors'
import express, { type Express } from 'express'
import { config } from './config.js'
import { getHealthDetailed, getHealthLive, getMetrics } from './controllers/health.controller.js'
import { errorHandler } from './middleware/errorHandler.js'
import { loggingMiddleware } from './middleware/logging.js'
import { metricsMiddleware } from './middleware/metrics.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { createApiRouter } from './routes/api.routes.js'
import { logger } from './utils/logger.js'

// Expressアプリケーションの作成と設定
export function createApp(): Express {
  const app = express()

  // 基本的なミドルウェア
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // CORS設定
  if (config.cors.enabled) {
    const corsOptions = {
      origin: config.cors.origins === '*' ? true : config.cors.origins.split(','),
      credentials: true,
      optionsSuccessStatus: 200,
    }
    app.use(cors(corsOptions))
  }

  // カスタムミドルウェア
  app.use(requestIdMiddleware)
  app.use(loggingMiddleware)
  app.use(metricsMiddleware)

  // ヘルスチェックエンドポイント
  app.get('/health', getHealthDetailed)
  app.get('/health/live', getHealthLive)

  // メトリクスエンドポイント
  app.get('/metrics', getMetrics)

  // APIルートの設定
  const apiRouter = createApiRouter()
  app.use(apiRouter)

  // 404ハンドラー
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'The requested endpoint does not exist',
        type: 'not_found',
        code: 'not_found',
      },
    })
  })

  // エラーハンドリング（最後に配置）
  app.use(errorHandler)

  return app
}

// サーバーの起動
export async function startServer(app: Express): Promise<void> {
  return new Promise((resolve) => {
    const server = app.listen(config.port, () => {
      logger.info('Server started', {
        port: config.port,
        environment: process.env.NODE_ENV,
        corsEnabled: config.cors.enabled,
      })
      resolve()
    })

    // グレースフルシャットダウン
    const shutdown = () => {
      logger.info('Shutting down server...')
      server.close(() => {
        logger.info('Server shut down successfully')
        process.exit(0)
      })
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  })
}
