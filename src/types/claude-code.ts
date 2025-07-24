// Claude Code SDK用の型定義

// Claude Codeリクエスト
export interface ClaudeCodeRequest {
  message: string
  context?: string
  workspace?: string
  tools?: string[]
  sessionId?: string
  model?: string
}

// Claude Codeレスポンス
export interface ClaudeCodeResponse {
  content: string
  toolCalls?: ToolCall[]
  metadata?: ResponseMetadata
}

// ツール呼び出し
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

// レスポンスメタデータ
export interface ResponseMetadata {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  model?: string
  processingTime?: number
}

// Claude Codeモデル情報
export interface ClaudeCodeModel {
  id: string
  name: string
  description?: string
  capabilities?: string[]
}

// Claude Code設定
export interface ClaudeCodeConfig {
  timeout?: number
  workspace?: string
  sessionId?: string
}

// セッション情報
export interface ClaudeCodeSession {
  id: string
  createdAt: Date
  lastUsedAt: Date
  workspace?: string
}

// ワークスペース設定
export interface WorkspaceConfig {
  baseDir: string
  timeoutMs: number
  readOnly?: boolean
}

// Claude Codeエラー
export interface ClaudeCodeError {
  code: string
  message: string
  details?: unknown
}

// ストリーミングレスポンス
export interface ClaudeCodeStreamResponse {
  type: 'content' | 'tool_call' | 'metadata' | 'error'
  data: string | ToolCall | ResponseMetadata | ClaudeCodeError
}

// モデルマッピング
export const CLAUDE_CODE_MODELS = {
  'claude-code-auto': 'claude-code',
  'claude-code-opus': 'claude-code-opus',
  'claude-code-sonnet': 'claude-code-sonnet',
} as const

export type ClaudeCodeModelId = keyof typeof CLAUDE_CODE_MODELS

// モデル情報の定義
export const MODEL_INFO: Record<ClaudeCodeModelId, ClaudeCodeModel> = {
  'claude-code-auto': {
    id: 'claude-code-auto',
    name: 'Claude Code Auto',
    description: 'Automatically selects the best model for the task',
    capabilities: ['chat', 'code', 'tools'],
  },
  'claude-code-opus': {
    id: 'claude-code-opus',
    name: 'Claude Code Opus',
    description: 'Most capable model for complex tasks',
    capabilities: ['chat', 'code', 'tools'],
  },
  'claude-code-sonnet': {
    id: 'claude-code-sonnet',
    name: 'Claude Code Sonnet',
    description: 'Balanced model for general tasks',
    capabilities: ['chat', 'code', 'tools'],
  },
}
