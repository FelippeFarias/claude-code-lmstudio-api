import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../middleware/errorHandler.js'
import { claudeCodeClient } from '../services/claude-code-client.js'
import { RequestTransformer } from '../services/request-transformer.js'
import { ResponseTransformer } from '../services/response-transformer.js'
import type { OpenAIChatRequest } from '../types/openai.js'
import { createRequestLogger } from '../utils/logger.js'

// POST /v1/chat/completions エンドポイントのハンドラー
export async function chatCompletions(req: Request, res: Response, next: NextFunction) {
  const logger = createRequestLogger(req.id)

  try {
    const openaiRequest = req.body as OpenAIChatRequest

    logger.info('Processing chat completion request', {
      model: openaiRequest.model,
      messageCount: openaiRequest.messages?.length,
      stream: openaiRequest.stream,
    })

    // リクエストの検証
    RequestTransformer.validateChatRequest(openaiRequest)

    // ストリーミングの場合
    if (openaiRequest.stream) {
      return handleStreamingChat(req, res, openaiRequest)
    }

    // セッションIDの取得または作成
    const sessionId = (req.headers['x-session-id'] as string) || (await claudeCodeClient.createSession())

    // OpenAI形式からClaude Code形式に変換
    const claudeRequest = RequestTransformer.transformChatRequest(openaiRequest, sessionId)

    // Claude Code SDKを呼び出し
    const claudeResponse = await claudeCodeClient.chat(claudeRequest)

    // Claude Code形式からOpenAI/LM Studio形式に変換
    let response = ResponseTransformer.transformChatResponse(claudeResponse, openaiRequest)

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
    const errorMessage = error instanceof Error ? error.message : 'Chat completion failed'
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('Chat completion request failed', {
      error: {
        message: errorMessage,
        stack: errorStack,
        name: error instanceof Error ? error.name : 'UnknownError',
        raw: String(error),
      },
    })
    next(error)
  }
}

// ストリーミングチャットの処理
async function handleStreamingChat(req: Request, res: Response, openaiRequest: OpenAIChatRequest) {
  const logger = createRequestLogger(req.id)

  try {
    // SSEヘッダーの設定
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // nginxのバッファリング無効化

    // セッションIDの取得または作成
    const sessionId = (req.headers['x-session-id'] as string) || (await claudeCodeClient.createSession())
    res.setHeader('X-Session-ID', sessionId)

    // OpenAI形式からClaude Code形式に変換
    const claudeRequest = RequestTransformer.transformChatRequest(openaiRequest, sessionId)

    logger.info('Starting streaming chat', { sessionId })

    // Claude Code SDKのストリーミングを呼び出し
    const stream = claudeCodeClient.chatStream(claudeRequest)

    let isFirst = true
    let chunkCount = 0
    let lastMetadata: any = null

    for await (const claudeResponse of stream) {
      chunkCount++

      // デバッグ: 受信したチャンクをログ
      logger.debug('Received streaming chunk', {
        sessionId,
        chunkNumber: chunkCount,
        content: claudeResponse.content,
        metadata: claudeResponse.metadata,
      })

      // 最後のメタデータを保持（usage情報のため）
      if (claudeResponse.metadata) {
        lastMetadata = claudeResponse.metadata
      }

      // 空のコンテンツで使用量情報を持つチャンクはスキップ（最後に送信するため）
      if (!claudeResponse.content && claudeResponse.metadata?.totalTokens) {
        continue
      }

      // Claude Code形式からOpenAI形式に変換
      const openaiResponse = ResponseTransformer.transformChatStreamResponse(
        claudeResponse,
        openaiRequest,
        isFirst,
        false,
      )

      // デバッグ: 変換後のレスポンスをログ
      logger.debug('Transformed stream response', {
        sessionId,
        chunkNumber: chunkCount,
        response: openaiResponse,
      })

      // SSE形式でレスポンスを送信
      const sseData = ResponseTransformer.formatStreamResponse(openaiResponse)
      res.write(sseData)

      // デバッグ: 送信したSSEデータをログ
      logger.debug('Sent SSE data', {
        sessionId,
        chunkNumber: chunkCount,
        data: sseData,
      })

      isFirst = false
    }

    // 最終チャンクを送信（finish_reason: "stop"を含む）
    const finalResponse = ResponseTransformer.transformChatStreamResponse(
      {
        content: '',
        metadata: lastMetadata,
      },
      openaiRequest,
      false,
      true, // isLast = true
    )

    // usage情報を追加（LM Studio互換）
    if (lastMetadata?.totalTokens) {
      ;(finalResponse as any).usage = {
        prompt_tokens: lastMetadata.inputTokens || 0,
        completion_tokens: lastMetadata.outputTokens || 0,
        total_tokens: lastMetadata.totalTokens || 0,
      }
    }

    const finalSseData = ResponseTransformer.formatStreamResponse(finalResponse)
    res.write(finalSseData)

    logger.debug('Sent final chunk with finish_reason', {
      sessionId,
      finalResponse,
      data: finalSseData,
    })

    // ストリーミング終了
    res.write(ResponseTransformer.formatStreamEnd())
    res.end()

    logger.info('Streaming chat completed', { sessionId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Streaming failed'
    const errorStack = error instanceof Error ? error.stack : undefined

    logger.error('Streaming chat failed', {
      error: {
        message: errorMessage,
        stack: errorStack,
        name: error instanceof Error ? error.name : 'UnknownError',
        raw: String(error),
      },
    })

    // エラーレスポンスをSSE形式で送信
    const errorResponse = {
      error: {
        message: errorMessage,
        type: 'stream_error',
      },
    }

    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`)
    res.end()
  }
}
