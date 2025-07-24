// OpenAI API互換の型定義

// メッセージロール
export type MessageRole = 'system' | 'user' | 'assistant'

// メッセージ
export interface OpenAIMessage {
  role: MessageRole
  content: string
}

// チャットリクエスト
export interface OpenAIChatRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  top_p?: number
  n?: number
  stop?: string | string[]
  presence_penalty?: number
  frequency_penalty?: number
  user?: string
}

// テキスト補完リクエスト
export interface OpenAICompletionRequest {
  model: string
  prompt: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  top_p?: number
  n?: number
  stop?: string | string[]
  presence_penalty?: number
  frequency_penalty?: number
  best_of?: number
  logprobs?: number
  echo?: boolean
  user?: string
}

// 埋め込みリクエスト
export interface OpenAIEmbeddingRequest {
  model: string
  input: string | string[]
  encoding_format?: 'float' | 'base64'
  dimensions?: number
  user?: string
}

// チャット選択肢
export interface OpenAIChatChoice {
  index: number
  message: OpenAIMessage
  finish_reason: 'stop' | 'length' | 'content_filter' | null
}

// テキスト補完選択肢
export interface OpenAICompletionChoice {
  index: number
  text: string
  finish_reason: 'stop' | 'length' | 'content_filter' | null
  logprobs?: null
}

// 使用量情報
export interface OpenAIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

// チャットレスポンス
export interface OpenAIChatResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: OpenAIChatChoice[]
  usage: OpenAIUsage
  system_fingerprint?: string
}

// ストリーミングチャットレスポンス
export interface OpenAIChatStreamResponse {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: OpenAIChatStreamChoice[]
  system_fingerprint?: string
}

// ストリーミングチャット選択肢
export interface OpenAIChatStreamChoice {
  index: number
  delta: {
    role?: MessageRole
    content?: string
  }
  finish_reason: 'stop' | 'length' | 'content_filter' | null
}

// テキスト補完レスポンス
export interface OpenAICompletionResponse {
  id: string
  object: 'text_completion'
  created: number
  model: string
  choices: OpenAICompletionChoice[]
  usage: OpenAIUsage
  system_fingerprint?: string
}

// 埋め込みレスポンス
export interface OpenAIEmbeddingResponse {
  object: 'list'
  data: OpenAIEmbedding[]
  model: string
  usage: OpenAIUsage
}

// 埋め込みデータ
export interface OpenAIEmbedding {
  object: 'embedding'
  embedding: number[]
  index: number
}

// モデル情報
export interface OpenAIModel {
  id: string
  object: 'model'
  created: number
  owned_by: string
}

// モデル一覧レスポンス
export interface OpenAIModelsResponse {
  object: 'list'
  data: OpenAIModel[]
}

// エラーレスポンス
export interface OpenAIErrorResponse {
  error: {
    message: string
    type: string
    param?: string | null
    code: string | null
  }
}
