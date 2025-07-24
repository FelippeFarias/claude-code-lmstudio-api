import { ApiError } from '../middleware/errorHandler.js'
import type { ClaudeCodeRequest } from '../types/claude-code.js'
import type { OpenAIChatRequest, OpenAICompletionRequest, OpenAIMessage } from '../types/openai.js'
import { logger } from '../utils/logger.js'
import { modelMappingService } from './model-mapping.service.js'

export class RequestTransformer {
  // チャットリクエストの変換
  static transformChatRequest(openaiRequest: OpenAIChatRequest, sessionId?: string): ClaudeCodeRequest {
    try {
      // メッセージの結合と整形
      const formattedMessage = RequestTransformer.formatMessages(openaiRequest.messages)

      // モデル名の変換
      const model = modelMappingService.mapToClaudeModel(openaiRequest.model)

      // Claude Code形式のリクエスト作成
      const claudeRequest: ClaudeCodeRequest = {
        message: formattedMessage,
        model,
        sessionId,
        // コンテキストとして前のメッセージを含める
        context: RequestTransformer.extractContext(openaiRequest.messages),
      }

      // パラメータのマッピング
      if (openaiRequest.temperature !== undefined) {
        // TODO: temperatureパラメータのマッピング
        // Claude Code SDKがサポートする場合に実装
      }

      if (openaiRequest.max_tokens !== undefined) {
        // TODO: max_tokensパラメータのマッピング
        // Claude Code SDKがサポートする場合に実装
      }

      logger.debug('Transformed chat request', {
        openaiModel: openaiRequest.model,
        claudeModel: model,
        messageCount: openaiRequest.messages.length,
      })

      return claudeRequest
    } catch (error) {
      logger.error('Failed to transform chat request', { error, openaiRequest })
      throw new ApiError(400, 'invalid_request', 'Failed to transform chat request')
    }
  }

  // テキスト補完リクエストの変換
  static transformCompletionRequest(openaiRequest: OpenAICompletionRequest, sessionId?: string): ClaudeCodeRequest {
    try {
      // モデル名の変換
      const model = modelMappingService.mapToClaudeModel(openaiRequest.model)

      // Claude Code形式のリクエスト作成
      const claudeRequest: ClaudeCodeRequest = {
        message: openaiRequest.prompt,
        model,
        sessionId,
      }

      // パラメータのマッピング
      if (openaiRequest.temperature !== undefined) {
        // TODO: temperatureパラメータのマッピング
      }

      if (openaiRequest.max_tokens !== undefined) {
        // TODO: max_tokensパラメータのマッピング
      }

      logger.debug('Transformed completion request', {
        openaiModel: openaiRequest.model,
        claudeModel: model,
        promptLength: openaiRequest.prompt.length,
      })

      return claudeRequest
    } catch (error) {
      logger.error('Failed to transform completion request', { error, openaiRequest })
      throw new ApiError(400, 'invalid_request', 'Failed to transform completion request')
    }
  }

  // メッセージの整形
  private static formatMessages(messages: OpenAIMessage[]): string {
    if (messages.length === 0) {
      throw new ApiError(400, 'invalid_request', 'Messages array cannot be empty')
    }

    // 最新のユーザーメッセージを取得
    let userMessage = ''
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = messages[i].content
        break
      }
    }

    if (!userMessage) {
      throw new ApiError(400, 'invalid_request', 'No user message found in messages array')
    }

    // システムメッセージがある場合は先頭に追加
    const systemMessages = messages.filter((m) => m.role === 'system')
    if (systemMessages.length > 0) {
      const systemContext = systemMessages.map((m) => m.content).join('\n')
      return `${systemContext}\n\n${userMessage}`
    }

    return userMessage
  }

  // コンテキストの抽出
  private static extractContext(messages: OpenAIMessage[]): string {
    // 最新のメッセージ以外をコンテキストとして使用
    const contextMessages = messages.slice(0, -1)

    if (contextMessages.length === 0) {
      return ''
    }

    // ロールとメッセージをフォーマット
    return contextMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')
  }

  // リクエストの検証
  static validateChatRequest(request: OpenAIChatRequest): void {
    if (!request.model) {
      throw new ApiError(400, 'invalid_request', 'Model is required')
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      throw new ApiError(400, 'invalid_request', 'Messages must be an array')
    }

    if (request.messages.length === 0) {
      throw new ApiError(400, 'invalid_request', 'Messages array cannot be empty')
    }

    // メッセージの検証
    for (const message of request.messages) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        throw new ApiError(400, 'invalid_request', 'Invalid message role')
      }

      if (typeof message.content !== 'string') {
        throw new ApiError(400, 'invalid_request', 'Message content must be a string')
      }
    }

    // パラメータの検証
    if (request.temperature !== undefined) {
      if (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2) {
        throw new ApiError(400, 'invalid_request', 'Temperature must be between 0 and 2')
      }
    }

    if (request.max_tokens !== undefined) {
      if (typeof request.max_tokens !== 'number') {
        throw new ApiError(400, 'invalid_request', `Max tokens must be a number: ${request.max_tokens}`)
      }
      // 負数は無制限として扱う（LM Studio互換）
      // 0や小数の正数のみエラーとする
      if (request.max_tokens >= 0 && request.max_tokens < 1) {
        throw new ApiError(
          400,
          'invalid_request',
          `Max tokens must be a positive integer or -1 for unlimited: ${request.max_tokens}`,
        )
      }
    }
  }

  // 補完リクエストの検証
  static validateCompletionRequest(request: OpenAICompletionRequest): void {
    if (!request.model) {
      throw new ApiError(400, 'invalid_request', 'Model is required')
    }

    if (typeof request.prompt !== 'string') {
      throw new ApiError(400, 'invalid_request', 'Prompt must be a string')
    }

    if (request.prompt.length === 0) {
      throw new ApiError(400, 'invalid_request', 'Prompt cannot be empty')
    }

    // パラメータの検証
    if (request.temperature !== undefined) {
      if (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2) {
        throw new ApiError(400, 'invalid_request', 'Temperature must be between 0 and 2')
      }
    }

    if (request.max_tokens !== undefined) {
      if (typeof request.max_tokens !== 'number') {
        throw new ApiError(400, 'invalid_request', `Max tokens must be a number: ${request.max_tokens}`)
      }
      // 負数は無制限として扱う（LM Studio互換）
      // 0や小数の正数のみエラーとする
      if (request.max_tokens >= 0 && request.max_tokens < 1) {
        throw new ApiError(
          400,
          'invalid_request',
          `Max tokens must be a positive integer or -1 for unlimited: ${request.max_tokens}`,
        )
      }
    }
  }
}
