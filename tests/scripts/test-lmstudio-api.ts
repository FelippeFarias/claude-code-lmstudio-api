#!/usr/bin/env node

/**
 * LM Studio API互換性テスト
 *
 * このスクリプトは、Claude Code SDKをバックエンドとしたLM Studio API互換サーバーの
 * 動作を確認するためのテストです。
 */

const PROXY_URL = process.env.PROXY_URL || 'http://localhost:1235'

interface TestResult {
  name: string
  passed: boolean
  message: string
  response?: any
  error?: any
}

async function runTest(name: string, testFn: () => Promise<TestResult>): Promise<TestResult> {
  console.log(`\n🧪 Testing: ${name}`)
  try {
    const result = await testFn()
    if (result.passed) {
      console.log(`✅ PASS: ${result.message}`)
      if (result.response) {
        console.log('Response:', JSON.stringify(result.response, null, 2))
      }
    } else {
      console.log(`❌ FAIL: ${result.message}`)
      if (result.error) {
        console.log('Error:', result.error)
      }
    }
    return result
  } catch (error) {
    console.log(`❌ ERROR: ${error}`)
    return { name, passed: false, message: `Unexpected error: ${error}`, error }
  }
}

// テスト: v1 モデル一覧
async function testV1Models(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/models`)
  const data = await response.json()

  const passed =
    response.ok &&
    data.object === 'list' &&
    Array.isArray(data.data) &&
    data.data.length > 0 &&
    data.data[0].object === 'model'

  return {
    name: 'GET /v1/models',
    passed,
    message: passed ? 'v1 models endpoint working correctly' : 'v1 models endpoint failed',
    response: data,
  }
}

// テスト: v0 モデル一覧
async function testV0Models(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/api/v0/models`)
  const data = await response.json()

  const passed =
    response.ok &&
    data.object === 'list' &&
    Array.isArray(data.data) &&
    data.data.length > 0 &&
    data.data[0].type !== undefined &&
    data.data[0].state !== undefined

  return {
    name: 'GET /api/v0/models',
    passed,
    message: passed ? 'v0 models endpoint working correctly' : 'v0 models endpoint failed',
    response: data,
  }
}

// テスト: v0 個別モデル情報
async function testV0ModelDetails(): Promise<TestResult> {
  const modelId = 'claude-3-opus'
  const response = await fetch(`${PROXY_URL}/api/v0/models/${modelId}`)
  const data = await response.json()

  const passed = response.ok && data.object === 'model' && data.id === modelId && data.type === 'llm'

  return {
    name: `GET /api/v0/models/${modelId}`,
    passed,
    message: passed ? 'v0 model details endpoint working correctly' : 'v0 model details endpoint failed',
    response: data,
  }
}

// テスト: チャット補完
async function testChatCompletion(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-sonnet',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in Japanese' },
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  })

  const data = await response.json()

  const passed =
    response.ok &&
    data.object === 'chat.completion' &&
    data.choices?.[0]?.message?.content &&
    data.usage !== undefined &&
    data.stats !== undefined // LM Studio形式にはstatsが含まれる

  return {
    name: 'POST /v1/chat/completions',
    passed,
    message: passed ? 'Chat completions working with stats' : 'Chat completions failed',
    response: data,
  }
}

// テスト: テキスト補完
async function testCompletion(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-8b-dwq',
      prompt: 'Once upon a time',
      max_tokens: 50,
      temperature: 0.7,
    }),
  })

  const data = await response.json()

  const passed =
    response.ok &&
    data.object === 'text_completion' &&
    data.choices?.[0]?.text &&
    data.usage !== undefined &&
    data.stats !== undefined // LM Studio形式にはstatsが含まれる

  return {
    name: 'POST /v1/completions',
    passed,
    message: passed ? 'Text completions working with stats' : 'Text completions failed',
    response: data,
  }
}

// テスト: ストリーミング
async function testStreaming(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-opus',
      prompt: 'Count from 1 to 5:',
      max_tokens: 30,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    return {
      name: 'Streaming completions',
      passed: false,
      message: 'Failed to initiate streaming',
      error: await response.text(),
    }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let hasData = false
  let hasDone = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    chunks.push(chunk)

    if (chunk.includes('data:')) hasData = true
    if (chunk.includes('[DONE]')) hasDone = true
  }

  const passed = hasData && hasDone

  return {
    name: 'Streaming completions',
    passed,
    message: passed ? 'Streaming working correctly' : 'Streaming failed',
    response: {
      chunkCount: chunks.length,
      sample: chunks.slice(0, 3).join(''),
      hasData,
      hasDone,
    },
  }
}

// テスト: エンベディング（未対応）
async function testEmbeddings(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'text-embedding-nomic-embed-text-v1.5',
      input: 'Test embedding',
    }),
  })

  const data = await response.json()

  // エンベディングは未対応なので501エラーが期待される
  const passed = response.status === 501 && data.error !== undefined

  return {
    name: 'POST /v1/embeddings',
    passed,
    message: passed
      ? 'Embeddings correctly returns 501 Not Implemented'
      : 'Embeddings endpoint not behaving as expected',
    response: data,
  }
}

// テスト: ヘルスチェック
async function testHealth(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/health`)
  const data = await response.json()

  const passed = response.ok && data.status === 'healthy' && data.services?.claudeCodeSdk === 'up'

  return {
    name: 'GET /health',
    passed,
    message: passed ? 'Health check working' : 'Health check failed',
    response: data,
  }
}

// テスト: 不明なモデル
async function testUnknownModel(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'unknown-model-xyz',
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  })

  const data = await response.json()

  // 不明なモデルでも動作するはず（Claude Codeのデフォルトに任せる）
  const passed = response.ok || (response.status === 400 && data.error)

  return {
    name: 'Unknown model handling',
    passed,
    message: passed ? 'Unknown models handled correctly' : 'Unknown model handling failed',
    response: data,
  }
}

// メインテスト実行
async function main() {
  console.log('🚀 LM Studio API Compatibility Test Suite')
  console.log('==========================================')
  console.log(`Testing server at: ${PROXY_URL}`)
  console.log(`Time: ${new Date().toISOString()}`)

  // サーバーが起動しているか確認
  try {
    const response = await fetch(`${PROXY_URL}/health`)
    if (!response.ok) {
      console.error('❌ Server health check failed. Is the server running?')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Cannot connect to server. Please ensure the server is running.')
    console.error('   Command: npm start')
    console.error(`   URL: ${PROXY_URL}`)
    process.exit(1)
  }

  const tests: TestResult[] = []

  // すべてのテストを実行
  tests.push(await runTest('Health Check', testHealth))
  tests.push(await runTest('v1 Models List', testV1Models))
  tests.push(await runTest('v0 Models List', testV0Models))
  tests.push(await runTest('v0 Model Details', testV0ModelDetails))
  tests.push(await runTest('Chat Completions', testChatCompletion))
  tests.push(await runTest('Text Completions', testCompletion))
  tests.push(await runTest('Streaming', testStreaming))
  tests.push(await runTest('Embeddings (Not Implemented)', testEmbeddings))
  tests.push(await runTest('Unknown Model Handling', testUnknownModel))

  // 結果サマリー
  console.log('\n========== Test Summary ==========')
  const passed = tests.filter((t) => t.passed).length
  const failed = tests.filter((t) => !t.passed).length

  console.log(`Total: ${tests.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`- ${t.name}: ${t.message}`)
      })
  }

  console.log('\n✨ Test suite completed!')
  process.exit(failed > 0 ? 1 : 0)
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  process.exit(1)
})

// 実行
main().catch(console.error)
