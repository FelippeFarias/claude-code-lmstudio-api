import winston from 'winston'
import { config } from '../config.js'

// カスタムフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
)

// 開発環境用の見やすいフォーマット
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : ''
    return `[${timestamp}] ${level}: ${message}${metaStr}`
  }),
)

// ロガーインスタンスの作成
export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.isDevelopment ? devFormat : customFormat,
  defaultMeta: { service: 'claude-code-lmstudio-api' },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
})

// HTTPリクエストログ用のフォーマッター
export const httpLogger = winston.createLogger({
  level: 'info',
  format: customFormat,
  defaultMeta: { service: 'claude-code-lmstudio-api', type: 'http' },
  transports: [new winston.transports.Console()],
})

// リクエストIDを含むロガーを作成する関数
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId })
}

// エラーログ用のヘルパー関数
export function logError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    })
  } else {
    logger.error('Unknown error', { error, ...context })
  }
}
