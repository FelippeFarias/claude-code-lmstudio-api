import type { HttpMethod, MetricsResponse } from '../types/common.js'

// メトリクス管理クラス
class MetricsService {
  private startTime: number
  private requests: Map<string, number> = new Map()
  private successfulRequests = 0
  private failedRequests = 0
  private responseTimes: number[] = []
  private errors: Map<string, number> = new Map()

  constructor() {
    this.startTime = Date.now()
  }

  // リクエストの記録
  recordRequest(endpoint: string, method: HttpMethod) {
    const key = `${method} ${endpoint}`
    this.requests.set(key, (this.requests.get(key) || 0) + 1)
  }

  // 成功レスポンスの記録
  recordSuccess(responseTime: number) {
    this.successfulRequests++
    this.responseTimes.push(responseTime)

    // メモリ効率のため、最新1000件のみ保持
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }
  }

  // エラーの記録
  recordError(errorType: string) {
    this.failedRequests++
    this.errors.set(errorType, (this.errors.get(errorType) || 0) + 1)
  }

  // メトリクスの取得
  getMetrics(): MetricsResponse {
    const totalRequests = this.successfulRequests + this.failedRequests
    const uptime = Math.floor((Date.now() - this.startTime) / 1000) // 秒単位

    // レスポンスタイムの統計計算
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b)
    const responseTimeStats = {
      average: this.calculateAverage(this.responseTimes),
      min: sortedTimes[0] || 0,
      max: sortedTimes[sortedTimes.length - 1] || 0,
      p50: this.calculatePercentile(sortedTimes, 50),
      p95: this.calculatePercentile(sortedTimes, 95),
      p99: this.calculatePercentile(sortedTimes, 99),
    }

    // エンドポイント別のリクエスト数
    const byEndpoint: Record<string, number> = {}
    for (const [endpoint, count] of this.requests.entries()) {
      byEndpoint[endpoint] = count
    }

    // エラータイプ別の集計
    const byType: Record<string, number> = {}
    for (const [errorType, count] of this.errors.entries()) {
      byType[errorType] = count
    }

    return {
      requests: {
        total: totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        byEndpoint,
      },
      responseTime: responseTimeStats,
      errors: {
        total: this.failedRequests,
        byType,
      },
      uptime,
      timestamp: new Date().toISOString(),
    }
  }

  // 平均値の計算
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    const sum = values.reduce((acc, val) => acc + val, 0)
    return Math.round(sum / values.length)
  }

  // パーセンタイルの計算
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[index] || 0
  }

  // メトリクスのリセット（テスト用）
  reset() {
    this.requests.clear()
    this.successfulRequests = 0
    this.failedRequests = 0
    this.responseTimes = []
    this.errors.clear()
    this.startTime = Date.now()
  }
}

// シングルトンインスタンス
export const metricsService = new MetricsService()
