import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../middleware/errorHandler.js'
import { ResponseTransformer } from '../services/response-transformer.js'
import { createRequestLogger } from '../utils/logger.js'

// POST /v1/embeddings エンドポイントのハンドラー
export async function embeddings(req: Request, res: Response, next: NextFunction) {
  const logger = createRequestLogger(req.id)

  logger.info('Embeddings endpoint called (not supported)', {
    model: req.body.model,
  })

  // 未対応機能エラーを返す
  const error = new ApiError(
    501,
    'not_implemented',
    'The embeddings endpoint is not supported by Claude Code proxy',
    'not_implemented_error',
  )

  next(error)
}
