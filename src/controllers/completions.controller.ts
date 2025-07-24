import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { claudeCodeClient } from '../services/claude-code-client.js'
import { RequestTransformer } from '../services/request-transformer.js'
import { ResponseTransformer } from '../services/response-transformer.js'
import type { OpenAICompletionRequest } from '../types/openai.js'
import { createRequestLogger } from '../utils/logger.js'

// POST /v1/completions エンドポイントのハンドラー
export async function completions(req: Request, res: Response, next: NextFunction) {
  const logger = createRequestLogger(req.id)

  try {
    const openaiRequest = req.body as OpenAICompletionRequest

    logger.info('Processing completion request', {
      model: openaiRequest.model,
      promptLength: openaiRequest.prompt?.length,
      stream: openaiRequest.stream,
    })

    // リクエストの検証
    RequestTransformer.validateCompletionRequest(openaiRequest)

    // ストリーミングの場合
    if (openaiRequest.stream) {
      return handleStreamingCompletion(req, res, openaiRequest)
    }

    // セッションIDの取得または作成
    const sessionId = (req.headers['x-session-id'] as string) || (await claudeCodeClient.createSession())

    // OpenAI形式からClaude Code形式に変換
    const claudeRequest = RequestTransformer.transformCompletionRequest(openaiRequest, sessionId)

    // Claude Code SDKを呼び出し
    const claudeResponse = await claudeCodeClient.complete(claudeRequest)

    // Claude Code形式からOpenAI/LM Studio形式に変換
    let response = ResponseTransformer.transformCompletionResponse(claudeResponse, openaiRequest)

    // LM Studio形式の場合、statsフィールドを追加
    const isLMStudioRequest = req.path.includes('/v1/') || req.path.includes('/api/v0/')
    if (isLMStudioRequest) {
      const stats = ResponseTransformer.generateLMStudioStats(claudeResponse.metadata)
      response = ResponseTransformer.addStatsToResponse(response, stats)
    }

    // セッションIDをヘッダーに含める
    res.setHeader('X-Session-ID', sessionId)

    // レスポンスを送信
    res.json(response)
  } catch (error) {
    logger.error('Completion request failed', { error })
    next(error)
  }
}

// ストリーミング補完の処理
async function handleStreamingCompletion(req: Request, res: Response, openaiRequest: OpenAICompletionRequest) {
  const logger = createRequestLogger(req.id)

  try {
    // SSEヘッダーの設定
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // セッションIDの取得または作成
    const sessionId = (req.headers['x-session-id'] as string) || (await claudeCodeClient.createSession())
    res.setHeader('X-Session-ID', sessionId)

    // OpenAI形式からClaude Code形式に変換
    const claudeRequest = RequestTransformer.transformCompletionRequest(openaiRequest, sessionId)

    logger.info('Starting streaming completion', { sessionId })

    // Claude Code SDKのストリーミングを呼び出し
    const stream = claudeCodeClient.chatStream(claudeRequest)

    for await (const claudeResponse of stream) {
      // ストリーミング用のレスポンス形式に変換
      const streamResponse = {
        id: `cmpl-${crypto.randomUUID()}`,
        object: 'text_completion',
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            text: claudeResponse.content,
            index: 0,
            logprobs: null,
            finish_reason: null,
          },
        ],
        model: openaiRequest.model,
      }

      // SSE形式でレスポンスを送信
      res.write(`data: ${JSON.stringify(streamResponse)}\n\n`)
    }

    // 最後のレスポンスでfinish_reasonを設定
    const finalResponse = {
      id: `cmpl-${crypto.randomUUID()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      choices: [
        {
          text: '',
          index: 0,
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
      model: openaiRequest.model,
    }

    res.write(`data: ${JSON.stringify(finalResponse)}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()

    logger.info('Streaming completion completed', { sessionId })
  } catch (error) {
    logger.error('Streaming completion failed', { error })

    // エラーレスポンスをSSE形式で送信
    const errorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Streaming failed',
        type: 'stream_error',
      },
    }

    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`)
    res.end()
  }
}
