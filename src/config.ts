import dotenv from 'dotenv'
import { z } from 'zod'

// 環境変数を読み込む
dotenv.config()

// 環境変数のスキーマ定義
const envSchema = z.object({
  PORT: z.string().default('1235').transform(Number),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  TIMEOUT_MS: z.string().default('30000').transform(Number),
  CORS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  CORS_ORIGINS: z.string().default('*'),
  CLAUDE_TIMEOUT: z.string().default('30000').transform(Number),
  CLAUDE_MODEL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// 環境変数をパースして検証
const env = envSchema.parse(process.env)

// 設定オブジェクト
export const config = {
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  timeoutMs: env.TIMEOUT_MS,
  cors: {
    enabled: env.CORS_ENABLED,
    origins: env.CORS_ORIGINS,
  },
  claude: {
    timeout: env.CLAUDE_TIMEOUT,
    model: env.CLAUDE_MODEL,
  },
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const

export type Config = typeof config
