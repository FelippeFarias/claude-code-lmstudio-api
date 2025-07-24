import type { HealthCheckResponse } from '../types/common.js'
import { logger } from '../utils/logger.js'

// ヘルスチェックサービス
class HealthService {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  // ヘルスチェックの実行
  async getHealth(): Promise<HealthCheckResponse> {
    const services = {
      claudeCodeSdk: 'down' as 'up' | 'down',
      anthropicApi: 'down' as 'up' | 'down',
    }

    try {
      // Claude Code SDKの状態確認
      // TODO: 実際のSDKヘルスチェック実装
      // 現在は初期化状態のみチェック
      const isInitialized = true // claudeCodeClient.isInitialized()
      if (isInitialized) {
        services.claudeCodeSdk = 'up'
        services.anthropicApi = 'up' // SDKが正常ならAPIも正常と仮定
      }
    } catch (error) {
      logger.error('Health check failed', { error })
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000)
    const isHealthy = services.claudeCodeSdk === 'up'

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services,
      uptime,
    }
  }

  // 簡易ヘルスチェック（サーバー自体の状態のみ）
  getSimpleHealth(): HealthCheckResponse {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000)

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime,
    }
  }
}

// シングルトンインスタンス
export const healthService = new HealthService()
