import type { NextFunction, Request, Response } from 'express'
import { metricsService } from '../services/metrics.service.js'
import type { HttpMethod } from '../types/common.js'

// メトリクスを記録するミドルウェア
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // ヘルスチェックエンドポイントはメトリクスをスキップ
  const isHealthCheck = req.path === '/health' || req.path === '/health/live'
  if (isHealthCheck) {
    return next()
  }

  const startTime = Date.now()

  // リクエストを記録
  metricsService.recordRequest(req.path, req.method as HttpMethod)

  // レスポンス終了時にメトリクスを記録
  res.on('finish', () => {
    const responseTime = Date.now() - startTime

    if (res.statusCode >= 200 && res.statusCode < 400) {
      // 成功レスポンス
      metricsService.recordSuccess(responseTime)
    } else if (res.statusCode >= 400) {
      // エラーレスポンス
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error'
      metricsService.recordError(errorType)
    }
  })

  next()
}
