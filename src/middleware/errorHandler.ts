import type { NextFunction, Request, Response } from 'express'
import { logError } from '../utils/logger.js'

// エラーレスポンスの型定義
export interface ErrorResponse {
  error: {
    message: string
    type: string
    code: string
  }
}

// カスタムエラークラス
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public type = 'api_error',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// OpenAI互換のエラーレスポンスを生成
function createErrorResponse(error: ApiError | Error): ErrorResponse {
  if (error instanceof ApiError) {
    return {
      error: {
        message: error.message,
        type: error.type,
        code: error.code,
      },
    }
  }

  // 一般的なエラーの場合
  return {
    error: {
      message: 'Internal server error',
      type: 'internal_error',
      code: 'internal_error',
    },
  }
}

// エラーハンドリングミドルウェア
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  // ログに記録
  logError(error, {
    requestId: req.id,
    method: req.method,
    url: req.url,
  })

  // ステータスコードの決定
  const statusCode = error instanceof ApiError ? error.statusCode : 500

  // エラーレスポンスの送信
  res.status(statusCode).json(createErrorResponse(error))
}
