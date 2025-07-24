import crypto from 'node:crypto'
import { AbortError, type Options, type Query, type SDKMessage, query } from '@anthropic-ai/claude-code'
import { config } from '../config.js'
import { ApiError } from '../middleware/errorHandler.js'
import type {
  ClaudeCodeModel,
  ClaudeCodeModelId,
  ClaudeCodeRequest,
  ClaudeCodeResponse,
  ClaudeCodeSession,
  WorkspaceConfig,
} from '../types/claude-code.js'
import { CLAUDE_CODE_MODELS, MODEL_INFO } from '../types/claude-code.js'
import { logger } from '../utils/logger.js'

// Claude Code SDKクライアントの実装
export class ClaudeCodeClient {
  private sessions: Map<string, ClaudeCodeSession> = new Map()
  private workspaceConfig: WorkspaceConfig
  private initialized = false

  constructor() {
    this.workspaceConfig = {
      baseDir: process.cwd(), // デフォルトは現在のディレクトリ
      timeoutMs: config.claude.timeout,
    }
  }

  // 初期化
  async initialize(workspaceConfig?: Partial<WorkspaceConfig>): Promise<void> {
    try {
      if (workspaceConfig) {
        this.workspaceConfig = { ...this.workspaceConfig, ...workspaceConfig }
      }

      logger.info('Initializing Claude Code SDK client', { workspaceConfig: this.workspaceConfig })

      // 初期化完了
      this.initialized = true

      logger.info('Claude Code SDK client initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Claude Code SDK client', { error })
      throw new ApiError(500, 'sdk_initialization_failed', 'Failed to initialize Claude Code SDK')
    }
  }

  // 初期化チェック
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ApiError(500, 'sdk_not_initialized', 'Claude Code SDK client is not initialized')
    }
  }

  // セッション作成
  async createSession(): Promise<string> {
    this.ensureInitialized()

    const sessionId = crypto.randomUUID()
    const session: ClaudeCodeSession = {
      id: sessionId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      workspace: this.workspaceConfig.baseDir,
    }

    this.sessions.set(sessionId, session)
    logger.info('Created new Claude Code session', { sessionId })

    return sessionId
  }

  // チャット機能
  async chat(request: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    this.ensureInitialized()

    try {
      logger.info('Sending chat request to Claude Code SDK', {
        sessionId: request.sessionId,
        model: request.model,
        messageLength: request.message.length,
      })

      const modelName = this.mapModelNameForSDK(request.model)
      const options: Options = {
        model: modelName,
        cwd: request.workspace || this.workspaceConfig.baseDir,
        maxTurns: 1, // 単一のレスポンスを取得
      }

      // コンテキストがある場合はシステムプロンプトとして追加
      if (request.context) {
        options.customSystemPrompt = request.context
      }

      logger.debug('Sending request to Claude Code SDK', {
        prompt: request.message,
        options: {
          ...options,
          prompt_preview: request.message.substring(0, 100) + (request.message.length > 100 ? '...' : ''),
        },
        originalModel: request.model,
        mappedModel: modelName,
      })

      const response = query({
        prompt: request.message,
        options,
      })

      // SDKからのレスポンスを待つ
      let assistantMessage: SDKMessage | null = null
      let usage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 }

      for await (const message of response) {
        logger.debug('Received SDK message', { type: message.type })

        if (message.type === 'assistant') {
          assistantMessage = message
          // 最後のアシスタントメッセージを保持
        } else if (message.type === 'result' && message.subtype === 'success') {
          // 結果メッセージから使用量情報を取得
          usage = {
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
            total_tokens: message.usage.input_tokens + message.usage.output_tokens,
          }
        }
      }

      if (!assistantMessage || assistantMessage.type !== 'assistant') {
        throw new ApiError(500, 'no_response', 'No assistant response received from Claude Code SDK')
      }

      // コンテンツを抽出
      const content = assistantMessage.message.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n')

      return {
        content,
        metadata: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          totalTokens: usage.total_tokens,
          model: request.model || 'claude-code-auto',
        },
      }
    } catch (error) {
      if (error instanceof AbortError) {
        throw new ApiError(408, 'request_timeout', 'Request was aborted')
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorStack = error instanceof Error ? error.stack : undefined

      logger.error('Chat request failed', {
        error: {
          message: errorMessage,
          stack: errorStack,
          name: error instanceof Error ? error.name : 'UnknownError',
          raw: String(error),
        },
      })
      throw new ApiError(500, 'chat_failed', errorMessage)
    }
  }

  // テキスト補完機能（チャット機能を内部的に使用）
  async complete(request: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    // Claude Code SDKはテキスト補完専用のAPIを持たないため、チャット機能を使用
    return this.chat(request)
  }

  // ストリーミングチャット
  async *chatStream(request: ClaudeCodeRequest): AsyncGenerator<ClaudeCodeResponse, void, unknown> {
    this.ensureInitialized()

    logger.info('Starting streaming chat with Claude Code SDK', {
      sessionId: request.sessionId,
      model: request.model,
    })

    const modelName = this.mapModelNameForSDK(request.model)
    const options: Options = {
      model: modelName,
      cwd: request.workspace || this.workspaceConfig.baseDir,
      maxTurns: 1,
    }

    if (request.context) {
      options.customSystemPrompt = request.context
    }

    logger.debug('Starting streaming with Claude Code SDK', {
      prompt_preview: request.message.substring(0, 100) + (request.message.length > 100 ? '...' : ''),
      options: {
        ...options,
      },
      originalModel: request.model,
      mappedModel: modelName,
    })

    const response = query({
      prompt: request.message,
      options,
    })

    let totalContent = ''
    let usage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 }

    try {
      for await (const message of response) {
        logger.debug('Received SDK message in stream', {
          type: message.type,
          sessionId: request.sessionId,
        })

        if (message.type === 'assistant') {
          // アシスタントメッセージの各部分をストリーミング
          for (const content of message.message.content) {
            if ((content as any).type === 'text') {
              const textChunk = (content as any).text
              totalContent += textChunk

              logger.debug('Yielding text chunk', {
                chunkLength: textChunk.length,
                totalLength: totalContent.length,
                preview: textChunk.substring(0, 50) + (textChunk.length > 50 ? '...' : ''),
              })

              yield {
                content: textChunk,
                metadata: {
                  inputTokens: 0, // ストリーミング中は0
                  outputTokens: 0,
                  totalTokens: 0,
                  model: request.model || 'claude-code-auto',
                },
              }
            }
          }
        } else if (message.type === 'result' && message.subtype === 'success') {
          // 最終的な使用量情報
          usage = {
            input_tokens: message.usage.input_tokens,
            output_tokens: message.usage.output_tokens,
            total_tokens: message.usage.input_tokens + message.usage.output_tokens,
          }

          // 最終チャンクとして使用量情報を送信
          yield {
            content: '',
            metadata: {
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              totalTokens: usage.total_tokens,
              model: request.model || 'claude-code-auto',
            },
          }
        } else {
          logger.warn('unexpected message type in stream', {
            type: message.type,
            sessionId: request.sessionId,
            message,
          })
        }
      }
    } catch (error) {
      if (error instanceof AbortError) {
        throw new ApiError(408, 'request_timeout', 'Streaming request was aborted')
      }

      const errorMessage = error instanceof Error ? error.message : 'Streaming error occurred'
      const errorStack = error instanceof Error ? error.stack : undefined

      logger.error('Streaming chat failed', {
        error: {
          message: errorMessage,
          stack: errorStack,
          name: error instanceof Error ? error.name : 'UnknownError',
          raw: String(error),
        },
      })

      throw error
    }
  }

  // モデル一覧の取得
  async getModels(): Promise<ClaudeCodeModel[]> {
    this.ensureInitialized()

    // Claude Code SDKは動的なモデル一覧APIを提供していないため、
    // 定義済みのモデル情報を返す
    return Object.keys(CLAUDE_CODE_MODELS).map((id) => ({
      ...MODEL_INFO[id as ClaudeCodeModelId],
      created: Math.floor(Date.now() / 1000),
    }))
  }

  // モデル名の変換（静的メソッド）
  static convertModelName(openaiModel: string): ClaudeCodeModelId | undefined {
    // 既にClaude Code形式の場合はそのまま返す
    if (openaiModel in CLAUDE_CODE_MODELS) {
      return openaiModel as ClaudeCodeModelId
    }

    const modelLower = openaiModel.toLowerCase()

    if (modelLower.includes('opus')) return 'claude-code-opus'
    if (modelLower.includes('sonnet')) return 'claude-code-sonnet'
    if (modelLower.includes('auto')) return 'claude-code-auto'

    // デフォルトはauto
    return 'claude-code-auto'
  }

  // プライベートメソッド：SDKのモデル名形式に変換
  private mapModelNameForSDK(model?: ClaudeCodeModelId | string): string | undefined {
    if (!model) return undefined

    // Claude Code SDKが期待する形式に変換
    // SDK内部では完全なモデル名が必要
    const modelMap: Record<string, string> = {
      'claude-code-auto': '', // 自動選択のデフォルト
      'claude-code-opus': 'opus',
      'claude-code-sonnet': 'sonnet',
    }

    return modelMap[model] || modelMap['claude-code-auto']
  }
}

// シングルトンインスタンス
export const claudeCodeClient = new ClaudeCodeClient()
