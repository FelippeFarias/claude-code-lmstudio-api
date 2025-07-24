import type { NextFunction, Request, Response } from 'express'
import { claudeCodeClient } from '../services/claude-code-client.js'
import { ResponseTransformer } from '../services/response-transformer.js'
import { logger } from '../utils/logger.js'

// GET /v1/models, /api/v0/models エンドポイントのハンドラー
export async function getModels(req: Request, res: Response, next: NextFunction) {
  try {
    const isV0Api = req.path.startsWith('/api/v0/')
    const modelId = req.params.model

    logger.info('Fetching available models', {
      requestId: req.id,
      apiVersion: isV0Api ? 'v0' : 'v1',
      modelId,
    })

    // Claude Code SDKから利用可能なモデルを取得
    const claudeModels = await claudeCodeClient.getModels()

    // 個別モデル情報の要求（v0 APIのみ）
    if (modelId) {
      const model = claudeModels.find((m) => m.id === modelId)
      if (!model) {
        return res.status(404).json({
          error: {
            message: `Model ${modelId} not found`,
            type: 'invalid_request_error',
            code: 'model_not_found',
          },
        })
      }

      // 単一モデルをv0形式で返す
      const response = ResponseTransformer.transformModelsResponseV0([model])
      return res.json({
        ...response.data[0],
        object: 'model',
      })
    }

    // モデル一覧の返却
    const response = isV0Api
      ? ResponseTransformer.transformModelsResponseV0(claudeModels)
      : ResponseTransformer.transformModelsResponseV1(claudeModels)

    res.json(response)
  } catch (error) {
    logger.error('Failed to fetch models', { error })
    next(error)
  }
}
