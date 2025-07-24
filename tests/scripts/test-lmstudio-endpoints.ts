#!/usr/bin/env ts-node

/**
 * LM Studio API エンドポイントテスター
 * v0 API（LM Studio独自）とv1 API（OpenAI互換）の両方をテスト
 */

interface TestResult {
  endpoint: string
  method: string
  request?: any
  response?: any
  error?: any
  headers?: Record<string, string>
  streamingData?: string[]
}

const BASE_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234'
const results: TestResult[] = []

// ヘルパー関数
async function testEndpoint(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any,
  streaming = false,
): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint}`
  const result: TestResult = {
    endpoint,
    method,
    request: body,
  }

  try {
    console.log(`\n🔄 Testing ${method} ${endpoint}...`)

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    // ヘッダー情報を記録
    result.headers = {}
    response.headers.forEach((value, key) => {
      result.headers![key] = value
    })

    if (streaming && response.headers.get('content-type')?.includes('text/event-stream')) {
      // ストリーミングレスポンスの処理
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      const streamData: string[] = []

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            streamData.push(chunk)

            // 最初の5チャンクだけ記録（全部だと長すぎる）
            if (streamData.length >= 5) {
              streamData.push('... (truncated)')
              break
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

      result.streamingData = streamData
      result.response = 'Streaming response - see streamingData'
    } else {
      // 通常のJSONレスポンス
      const text = await response.text()
      try {
        result.response = JSON.parse(text)
      } catch {
        result.response = text
      }
    }

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error: ${result.error}`)
  }

  return result
}

// テスト実行
async function runTests() {
  console.log('🚀 LM Studio API エンドポイントテスト開始')
  console.log(`📍 Base URL: ${BASE_URL}`)

  // サンプルメッセージ
  const chatMessages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say hello in one sentence.' },
  ]

  // ===============================
  // v0 API テスト（LM Studio独自）
  // ===============================
  console.log('\n\n=== v0 API (LM Studio Native) ===')

  // モデル一覧
  results.push(await testEndpoint('GET', '/api/v0/models'))

  // チャット補完（非ストリーミング）
  results.push(
    await testEndpoint('POST', '/api/v0/chat/completions', {
      model: 'test-model',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 50,
      stream: false,
    }),
  )

  // チャット補完（ストリーミング）
  results.push(
    await testEndpoint(
      'POST',
      '/api/v0/chat/completions',
      {
        model: 'test-model',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 50,
        stream: true,
      },
      true,
    ),
  )

  // テキスト補完
  results.push(
    await testEndpoint('POST', '/api/v0/completions', {
      model: 'test-model',
      prompt: 'Once upon a time',
      temperature: 0.7,
      max_tokens: 50,
      stream: false,
    }),
  )

  // 埋め込み
  results.push(
    await testEndpoint('POST', '/api/v0/embeddings', {
      model: 'test-model',
      input: 'Hello world',
    }),
  )

  // ===============================
  // v1 API テスト（OpenAI互換）
  // ===============================
  console.log('\n\n=== v1 API (OpenAI Compatible) ===')

  // モデル一覧
  results.push(await testEndpoint('GET', '/v1/models'))

  // チャット補完（非ストリーミング）
  results.push(
    await testEndpoint('POST', '/v1/chat/completions', {
      model: 'test-model',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 50,
      stream: false,
    }),
  )

  // チャット補完（ストリーミング）
  results.push(
    await testEndpoint(
      'POST',
      '/v1/chat/completions',
      {
        model: 'test-model',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 50,
        stream: true,
      },
      true,
    ),
  )

  // テキスト補完
  results.push(
    await testEndpoint('POST', '/v1/completions', {
      model: 'test-model',
      prompt: 'Once upon a time',
      temperature: 0.7,
      max_tokens: 50,
      stream: false,
    }),
  )

  // 埋め込み
  results.push(
    await testEndpoint('POST', '/v1/embeddings', {
      model: 'test-model',
      input: 'Hello world',
    }),
  )

  // ===============================
  // エラーケースのテスト
  // ===============================
  console.log('\n\n=== Error Cases ===')

  // 無効なエンドポイント
  results.push(await testEndpoint('GET', '/api/v0/invalid-endpoint'))

  // 無効なリクエストボディ
  results.push(
    await testEndpoint('POST', '/v1/chat/completions', {
      // modelフィールドが欠落
      messages: chatMessages,
    }),
  )

  // 結果を出力
  outputResults()
}

// 結果の整形と出力
function outputResults() {
  console.log(`\n\n${'='.repeat(80)}`)
  console.log('📊 テスト結果サマリー')
  console.log('='.repeat(80))

  for (const result of results) {
    console.log(`\n### ${result.method} ${result.endpoint}`)

    if (result.request) {
      console.log('\n📤 Request:')
      console.log(JSON.stringify(result.request, null, 2))
    }

    if (result.headers) {
      console.log('\n📋 Response Headers:')
      console.log(JSON.stringify(result.headers, null, 2))
    }

    if (result.streamingData) {
      console.log('\n📡 Streaming Data (first 5 chunks):')
      result.streamingData.forEach((chunk, i) => {
        console.log(`Chunk ${i + 1}: ${chunk.trim()}`)
      })
    } else if (result.response) {
      console.log('\n📥 Response:')
      console.log(JSON.stringify(result.response, null, 2))
    }

    if (result.error) {
      console.log('\n❌ Error:')
      console.log(result.error)
    }

    console.log(`\n${'-'.repeat(40)}`)
  }

  // スキーマサマリー
  generateSchemaSummary()
}

// レスポンススキーマのサマリー生成
function generateSchemaSummary() {
  console.log(`\n\n${'='.repeat(80)}`)
  console.log('📋 レスポンススキーマサマリー')
  console.log('='.repeat(80))

  const schemas: Record<string, any> = {}

  for (const result of results) {
    if (result.response && typeof result.response === 'object') {
      const key = `${result.method} ${result.endpoint}`
      schemas[key] = {
        fields: Object.keys(result.response),
        example: result.response,
      }
    }
  }

  console.log(JSON.stringify(schemas, null, 2))
}

// メイン実行
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests, testEndpoint }
