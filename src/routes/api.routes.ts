import { Router } from 'express'
import { chatCompletions, completions, embeddings, getModels } from '../controllers/index.js'

// APIルーターの作成
export function createApiRouter(): Router {
  const router = Router()

  // LM Studio v1 API互換エンドポイント（OpenAI互換）
  router.get('/v1/models', getModels)
  router.post('/v1/chat/completions', chatCompletions)
  router.post('/v1/completions', completions)
  router.post('/v1/embeddings', embeddings)

  // LM Studio v0 API互換エンドポイント
  router.get('/api/v0/models', getModels)
  router.get('/api/v0/models/:model', getModels) // 個別モデル情報
  router.post('/api/v0/chat/completions', chatCompletions)
  router.post('/api/v0/completions', completions)
  router.post('/api/v0/embeddings', embeddings)

  // エイリアス（一部のクライアントは/v1なしでアクセスする）
  router.get('/models', getModels)
  router.post('/chat/completions', chatCompletions)
  router.post('/completions', completions)
  router.post('/embeddings', embeddings)

  return router
}
