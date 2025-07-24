// LM Studio API 型定義

// LM Studio v0 モデル情報
export interface LMStudioModelV0 {
  id: string
  object: 'model'
  type: 'llm' | 'embeddings'
  publisher: string
  arch: string
  compatibility_type: string
  quantization: string
  state: 'loaded' | 'not-loaded'
  max_context_length: number
  loaded_context_length?: number
}

// LM Studio v1 モデル情報（OpenAI互換）
export interface LMStudioModelV1 {
  id: string
  object: 'model'
  owned_by: string
}

// LM Studio モデル一覧レスポンス
export interface LMStudioModelsResponse {
  data: LMStudioModelV0[] | LMStudioModelV1[]
  object: 'list'
}

// LM Studio 統計情報（オプション）
export interface LMStudioStats {
  tokens_per_second?: number
  time_to_first_token?: number
  generation_time?: number
  stop_reason?: string
}

// LM Studio チャット/補完レスポンス（OpenAI互換 + stats）
export interface LMStudioCompletionResponse {
  id: string
  object: 'chat.completion' | 'text_completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message?: {
      role: string
      content: string
    }
    text?: string
    logprobs: null | any
    finish_reason: string | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  stats?: LMStudioStats
}

// LM Studio エンベディングレスポンス（OpenAI互換）
export interface LMStudioEmbeddingResponse {
  object: 'list'
  data: Array<{
    object: 'embedding'
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// モデル名マッピング設定
export interface ModelMapping {
  // LM Studioのモデル名 -> Claude Codeのモデル指定
  [lmStudioModel: string]: string | undefined
}

// デフォルトのモデルマッピング
export const DEFAULT_MODEL_MAPPING: ModelMapping = {
  // Claude系モデル
  'claude-3-opus': 'opus',
  'claude-3-sonnet': 'sonnet',
  'claude-3-haiku': 'sonnet', // haikuがない場合のフォールバック

  // 汎用マッピング（全てClaude Codeのデフォルトに任せる）
  'qwen3-8b-dwq': undefined,
  'qwen3-14b-awq': undefined,
  'llama-3-8b': undefined,
  'mistral-7b': undefined,
  'text-embedding-nomic-embed-text-v1.5': undefined,

  // デフォルト（マッピングにない場合）
  default: undefined,
}

// Claude Code用に変換したモデル情報
export interface ClaudeCodeModelInfo {
  id: string
  name: string
  description: string
  type: 'llm' | 'embeddings'
  claudeModel?: string // 'opus' | 'sonnet' | undefined
}
