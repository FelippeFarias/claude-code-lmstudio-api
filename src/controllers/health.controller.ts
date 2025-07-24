import type { NextFunction, Request, Response } from 'express'
import { healthService } from '../services/health.service.js'
import { metricsService } from '../services/metrics.service.js'
import { logger } from '../utils/logger.js'

// GET /health エンドポイントのハンドラー（詳細版）
export async function getHealthDetailed(req: Request, res: Response, next: NextFunction) {
  try {
    const health = await healthService.getHealth()
    const statusCode = health.status === 'healthy' ? 200 : 503

    res.status(statusCode).json(health)
  } catch (error) {
    logger.error('Health check endpoint failed', { error })
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: 'Health check failed',
    })
  }
}

// GET /health/live エンドポイントのハンドラー（簡易版）
export function getHealthLive(req: Request, res: Response) {
  const health = healthService.getSimpleHealth()
  res.json(health)
}

// GET /metrics エンドポイントのハンドラー
export function getMetrics(req: Request, res: Response) {
  try {
    const metrics = metricsService.getMetrics()
    res.json(metrics)
  } catch (error) {
    logger.error('Metrics endpoint failed', { error })
    res.status(500).json({
      error: {
        message: 'Failed to retrieve metrics',
        type: 'internal_error',
        code: 'metrics_error',
      },
    })
  }
}
