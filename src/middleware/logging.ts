import type { NextFunction, Request, Response } from 'express'
import { httpLogger } from '../utils/logger.js'

// リクエストとレスポンスをログに記録するミドルウェア
export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  // ヘルスチェックエンドポイントはログをスキップ
  const isHealthCheck = req.url === '/health' || req.url === '/health/live'

  if (!isHealthCheck) {
    // リクエスト情報をログに記録
    const logData: any = {
      requestId: req.id,
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      ip: req.ip,
    }

    // POSTリクエストの場合はボディも記録（デバッグレベル）
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      logData.body = req.body
    }

    httpLogger.info('Incoming request', logData)

    // デバッグレベルでより詳細な情報を記録
    httpLogger.debug('Request details', {
      requestId: req.id,
      body: req.body,
      rawHeaders: req.rawHeaders,
    })
  }

  // レスポンスが終了したときにログを記録
  res.on('finish', () => {
    if (!isHealthCheck) {
      const duration = Date.now() - startTime

      httpLogger.info('Request completed', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length'),
      })
    }
  })

  next()
}
