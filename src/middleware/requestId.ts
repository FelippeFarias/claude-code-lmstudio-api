import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// リクエストの型を拡張
declare global {
  namespace Express {
    interface Request {
      id: string
    }
  }
}

// リクエストIDを生成してリクエストオブジェクトに追加するミドルウェア
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // X-Request-IDヘッダーがあればそれを使用、なければ新規生成
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID()

  req.id = requestId
  res.setHeader('X-Request-ID', requestId)

  next()
}
