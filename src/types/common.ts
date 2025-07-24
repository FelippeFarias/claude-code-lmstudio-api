// 共通の型定義

// HTTPメソッド
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

// API設定
export interface ApiConfig {
  baseUrl: string
  timeout: number
  headers?: Record<string, string>
}

// ページネーション
export interface Pagination {
  page: number
  limit: number
  total?: number
  hasMore?: boolean
}

// ヘルスチェックレスポンス
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  services?: {
    claudeCodeSdk: 'up' | 'down'
    anthropicApi: 'up' | 'down'
  }
  uptime?: number
}

// メトリクス情報
export interface MetricsResponse {
  requests: {
    total: number
    successful: number
    failed: number
    byEndpoint: Record<string, number>
  }
  responseTime: {
    average: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
  }
  errors: {
    total: number
    byType: Record<string, number>
  }
  uptime: number
  timestamp: string
}

// ストリーミングイベント
export interface StreamEvent {
  event: string
  data: string
  id?: string
  retry?: number
}

// リクエストコンテキスト
export interface RequestContext {
  requestId: string
  startTime: number
  method: HttpMethod
  path: string
  userId?: string
}

// レート制限情報
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// 型ガード関数
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function hasMessage(value: unknown): value is { message: string } {
  return typeof value === 'object' && value !== null && 'message' in value
}

export function isApiError(error: unknown): error is { statusCode: number; code: string; message: string } {
  return typeof error === 'object' && error !== null && 'statusCode' in error && 'code' in error && 'message' in error
}
