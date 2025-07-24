import crypto from 'node:crypto'
import type { ClaudeCodeError, ClaudeCodeModel, ClaudeCodeResponse } from '../types/claude-code.js'
import type {
  ClaudeCodeModelInfo,
  LMStudioModelV0,
  LMStudioModelV1,
  LMStudioModelsResponse,
  LMStudioStats,
} from '../types/lmstudio.js'
import type {
  OpenAIChatResponse,
  OpenAIChatStreamResponse,
  OpenAICompletionResponse,
  OpenAIErrorResponse,
  OpenAIModel,
  OpenAIModelsResponse,
} from '../types/openai.js'
import { logger } from '../utils/logger.js'

export class ResponseTransformer {
  // チャットレスポンスの変換
  static transformChatResponse(
    claudeResponse: ClaudeCodeResponse,
    originalRequest: { model: string },
  ): OpenAIChatResponse {
    const responseId = `chatcmpl-${crypto.randomUUID()}`
    const created = Math.floor(Date.now() / 1000)

    const response: OpenAIChatResponse = {
      id: responseId,
      object: 'chat.completion',
      created,
      model: originalRequest.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: claudeResponse.content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: claudeResponse.metadata?.inputTokens || 0,
        completion_tokens: claudeResponse.metadata?.outputTokens || 0,
        total_tokens: claudeResponse.metadata?.totalTokens || 0,
      },
      system_fingerprint: 'claude-code-lmstudio-api-v1',
    }

    logger.debug('Transformed chat response', {
      responseId,
      outputTokens: response.usage.completion_tokens,
    })

    return response
  }

  // ストリーミングチャットレスポンスの変換
  static transformChatStreamResponse(
    claudeResponse: ClaudeCodeResponse,
    originalRequest: { model: string },
    isFirst = true,
    isLast = false,
  ): OpenAIChatStreamResponse {
    const responseId = `chatcmpl-${crypto.randomUUID()}`
    const created = Math.floor(Date.now() / 1000)

    const response: OpenAIChatStreamResponse = {
      id: responseId,
      object: 'chat.completion.chunk',
      created,
      model: originalRequest.model,
      choices: [
        {
          index: 0,
          delta: isFirst ? { role: 'assistant', content: claudeResponse.content } : { content: claudeResponse.content },
          finish_reason: isLast ? 'stop' : null,
        },
      ],
      system_fingerprint: 'claude-code-lmstudio-api-v1',
    }

    return response
  }

  // テキスト補完レスポンスの変換
  static transformCompletionResponse(
    claudeResponse: ClaudeCodeResponse,
    originalRequest: { model: string; prompt: string },
  ): OpenAICompletionResponse {
    const responseId = `cmpl-${crypto.randomUUID()}`
    const created = Math.floor(Date.now() / 1000)

    const response: OpenAICompletionResponse = {
      id: responseId,
      object: 'text_completion',
      created,
      model: originalRequest.model,
      choices: [
        {
          index: 0,
          text: claudeResponse.content,
          finish_reason: 'stop',
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: claudeResponse.metadata?.inputTokens || 0,
        completion_tokens: claudeResponse.metadata?.outputTokens || 0,
        total_tokens: claudeResponse.metadata?.totalTokens || 0,
      },
      system_fingerprint: 'claude-code-lmstudio-api-v1',
    }

    logger.debug('Transformed completion response', {
      responseId,
      outputTokens: response.usage.completion_tokens,
    })

    return response
  }

  // モデル一覧レスポンスの変換（v1/OpenAI互換）
  static transformModelsResponse(models: ClaudeCodeModel[]): OpenAIModelsResponse {
    const created = Math.floor(Date.now() / 1000)

    const openaiModels: OpenAIModel[] = models.map((model) => ({
      id: model.id,
      object: 'model',
      created,
      owned_by: 'claude-code',
    }))

    const response: OpenAIModelsResponse = {
      object: 'list',
      data: openaiModels,
    }

    logger.debug('Transformed models response', {
      modelCount: openaiModels.length,
    })

    return response
  }

  // LM Studio v0 モデル一覧レスポンスの変換
  static transformModelsResponseV0(models: ClaudeCodeModel[] | ClaudeCodeModelInfo[]): LMStudioModelsResponse {
    const lmStudioModels: LMStudioModelV0[] = models.map((model) => {
      // ClaudeCodeModel か ClaudeCodeModelInfo かを判定
      const isClaudeCodeModel = !('type' in model)

      return {
        id: model.id,
        object: 'model',
        type: isClaudeCodeModel ? 'llm' : (model as ClaudeCodeModelInfo).type,
        publisher: 'anthropic',
        arch: 'claude',
        compatibility_type: 'mlx',
        quantization: '8bit',
        state: 'loaded',
        max_context_length: 200000,
        loaded_context_length: 200000,
      }
    })

    const response: LMStudioModelsResponse = {
      object: 'list',
      data: lmStudioModels,
    }

    logger.debug('Transformed LM Studio v0 models response', {
      modelCount: lmStudioModels.length,
    })

    return response
  }

  // LM Studio v1 モデル一覧レスポンスの変換
  static transformModelsResponseV1(models: ClaudeCodeModel[] | ClaudeCodeModelInfo[]): LMStudioModelsResponse {
    const lmStudioModels: LMStudioModelV1[] = models.map((model) => ({
      id: model.id,
      object: 'model',
      owned_by: 'claude-code',
    }))

    const response: LMStudioModelsResponse = {
      object: 'list',
      data: lmStudioModels,
    }

    logger.debug('Transformed LM Studio v1 models response', {
      modelCount: lmStudioModels.length,
    })

    return response
  }

  // 未対応機能のエラーレスポンス作成
  static createUnsupportedError(feature: string): OpenAIErrorResponse {
    return {
      error: {
        message: `The ${feature} endpoint is not supported by Claude Code`,
        type: 'invalid_request_error',
        param: null,
        code: 'unsupported_feature',
      },
    }
  }

  // Claude Codeエラーの変換
  static transformError(error: ClaudeCodeError | Error): OpenAIErrorResponse {
    if ('code' in error && 'message' in error) {
      // Claude Codeエラーの場合
      return {
        error: {
          message: error.message,
          type: 'claude_code_error',
          param: null,
          code: error.code,
        },
      }
    }

    // 一般的なエラーの場合
    return {
      error: {
        message: error.message || 'An unexpected error occurred',
        type: 'internal_error',
        param: null,
        code: 'internal_error',
      },
    }
  }

  // ストリーミングレスポンスをSSE形式に変換
  static formatStreamResponse(response: OpenAIChatStreamResponse): string {
    return `data: ${JSON.stringify(response)}\n\n`
  }

  // ストリーミング終了のフォーマット
  static formatStreamEnd(): string {
    return 'data: [DONE]\n\n'
  }

  // LM Studio用のstats生成
  static generateLMStudioStats(metadata?: any): LMStudioStats {
    return {
      tokens_per_second: metadata?.tokensPerSecond || Math.random() * 50 + 30,
      time_to_first_token: metadata?.timeToFirstToken || Math.random() * 100 + 50,
      generation_time: metadata?.generationTime || Math.random() * 2000 + 500,
      stop_reason: 'stop',
    }
  }

  // LM Studio用チャットレスポンスの生成（statsを含む）
  static addStatsToResponse<T extends { id: string }>(
    response: T,
    stats?: LMStudioStats,
  ): T & { stats?: LMStudioStats } {
    if (stats) {
      return { ...response, stats }
    }
    return response
  }

  // 使用量情報の計算（概算）
  static estimateTokenUsage(text: string): number {
    // 簡易的なトークン数推定（実際のトークナイザーとは異なる）
    // 平均的に1トークン≒4文字として計算
    return Math.ceil(text.length / 4)
  }

  // レスポンスのサニタイズ
  static sanitizeResponse(response: unknown): unknown {
    if (typeof response === 'string') {
      // 制御文字の除去
      return response.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    }

    if (Array.isArray(response)) {
      return response.map((item) => ResponseTransformer.sanitizeResponse(item))
    }

    if (response && typeof response === 'object') {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(response)) {
        sanitized[key] = ResponseTransformer.sanitizeResponse(value)
      }
      return sanitized
    }

    return response
  }
}
