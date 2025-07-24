import { config } from '../config.js'
import { DEFAULT_MODEL_MAPPING } from '../types/lmstudio.js'
import { logger } from '../utils/logger.js'

// モデルマッピングサービス
class ModelMappingService {
  private modelMapping: Record<string, string | undefined>

  constructor() {
    this.modelMapping = { ...DEFAULT_MODEL_MAPPING }
  }

  // LM StudioモデルIDからClaude Code設定へ変換
  mapToClaudeModel(lmStudioModelId: string): string | undefined {
    // Claude Code形式のモデル名の場合の処理
    if (lmStudioModelId.startsWith('claude-code-')) {
      // CLAUDE_MODELが設定されている場合の特別処理
      if (config.claude.model) {
        // claude-code-auto と claude-code-opus は環境変数の値に上書き
        if (lmStudioModelId === 'claude-code-auto' || lmStudioModelId === 'claude-code-opus') {
          logger.debug('Overriding model with CLAUDE_MODEL env var', {
            originalModel: lmStudioModelId,
            overrideModel: config.claude.model,
          })
          return config.claude.model
        }
      }
      // それ以外はそのまま返す（claude-code-sonnetなど）
      return lmStudioModelId
    }

    // 直接マッピングがある場合
    if (lmStudioModelId in this.modelMapping) {
      return this.modelMapping[lmStudioModelId]
    }

    // Claude系のモデル名を含む場合の検出
    const modelLower = lmStudioModelId.toLowerCase()
    if (modelLower.includes('claude')) {
      if (modelLower.includes('opus')) return 'claude-code-opus'
      if (modelLower.includes('sonnet')) return 'claude-code-sonnet'
      if (modelLower.includes('haiku')) return 'claude-code-sonnet' // haikuはsonnetにフォールバック
      if (modelLower.includes('auto')) return 'claude-code-auto'
    }

    // 環境変数で設定されたデフォルトモデル
    if (config.claude.model) {
      logger.debug('Using default Claude model from config', {
        model: config.claude.model,
        requestedModel: lmStudioModelId,
      })
      return config.claude.model
    }

    // マッピングが見つからない場合はundefined（Claude Codeのデフォルトに任せる）
    logger.debug('No model mapping found, using Claude Code default', {
      requestedModel: lmStudioModelId,
    })
    return undefined
  }
}

// シングルトンインスタンス
export const modelMappingService = new ModelMappingService()
