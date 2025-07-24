const PROXY_URL = 'http://localhost:1235'
const LMSTUDIO_URL = 'http://127.0.0.1:1234'

interface TestResult {
  name: string
  success: boolean
  message: string
  response?: any
}

async function runTest(name: string, testFn: () => Promise<TestResult>): Promise<void> {
  console.log(`\n🧪 Testing: ${name}`)
  try {
    const result = await testFn()
    if (result.success) {
      console.log(`✅ ${result.message}`)
      if (result.response) {
        console.log('Response:', JSON.stringify(result.response, null, 2))
      }
    } else {
      console.log(`❌ ${result.message}`)
    }
  } catch (error) {
    console.log(`❌ Error: ${error}`)
  }
}

async function testModels(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/models`)
  const data = await response.json()

  return {
    name: 'GET /v1/models',
    success: response.ok && data.object === 'list',
    message: response.ok ? 'Models endpoint working' : `Failed with status ${response.status}`,
    response: data,
  }
}

async function testCompletions(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-8b-dwq',
      prompt: 'Hello, world',
      max_tokens: 20,
      temperature: 0.7,
    }),
  })

  const data = await response.json()

  return {
    name: 'POST /v1/completions',
    success: response.ok && data.object === 'text_completion',
    message: response.ok ? 'Completions endpoint working' : `Failed: ${JSON.stringify(data)}`,
    response: data,
  }
}

async function testChatCompletions(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-8b-dwq',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 20,
      temperature: 0.7,
    }),
  })

  const data = await response.json()

  return {
    name: 'POST /v1/chat/completions',
    success: response.ok,
    message: response.ok ? 'Chat completions endpoint working' : `Failed: ${JSON.stringify(data)}`,
    response: data,
  }
}

async function testStreamingCompletions(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/v1/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-8b-dwq',
      prompt: 'Once upon a time',
      max_tokens: 30,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    return {
      name: 'POST /v1/completions (streaming)',
      success: false,
      message: `Failed with status ${response.status}`,
    }
  }

  const reader = response.body?.getReader()
  if (!reader) {
    return {
      name: 'POST /v1/completions (streaming)',
      success: false,
      message: 'No response body',
    }
  }

  const decoder = new TextDecoder()
  const chunks: string[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    chunks.push(chunk)
  }

  const fullResponse = chunks.join('')
  const hasStreamData = fullResponse.includes('data:')

  return {
    name: 'POST /v1/completions (streaming)',
    success: hasStreamData,
    message: hasStreamData ? 'Streaming completions working' : 'No streaming data received',
    response: `${fullResponse.substring(0, 200)}...`,
  }
}

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

  return {
    name: 'POST /v1/embeddings',
    success: response.ok && data.object === 'list',
    message: response.ok ? 'Embeddings endpoint working' : `Failed: ${JSON.stringify(data)}`,
    response: data.data?.[0] ? { embedding_length: data.data[0].embedding.length } : data,
  }
}

async function testHealth(): Promise<TestResult> {
  const response = await fetch(`${PROXY_URL}/health`)
  const data = await response.json()

  return {
    name: 'GET /health',
    success: response.ok && data.status === 'healthy',
    message: response.ok ? 'Health endpoint working' : `Failed with status ${response.status}`,
    response: data,
  }
}

async function main() {
  console.log('🚀 LM Studio Proxy API Test Suite')
  console.log('=====================================')
  console.log(`Proxy URL: ${PROXY_URL}`)
  console.log(`LM Studio URL: ${LMSTUDIO_URL}`)

  // Check if proxy is running
  try {
    await fetch(`${PROXY_URL}/health`)
  } catch (error) {
    console.error('❌ Proxy server is not running. Please start the server first.')
    process.exit(1)
  }

  // Check if LM Studio is running
  try {
    await fetch(`${LMSTUDIO_URL}/v1/models`)
  } catch (error) {
    console.error('❌ LM Studio is not running at http://127.0.0.1:1234')
    process.exit(1)
  }

  // Run tests
  await runTest('Health Check', testHealth)
  await runTest('Models Endpoint', testModels)
  await runTest('Completions Endpoint', testCompletions)
  await runTest('Chat Completions Endpoint', testChatCompletions)
  await runTest('Streaming Completions', testStreamingCompletions)
  await runTest('Embeddings Endpoint', testEmbeddings)

  console.log('\n✨ Test suite completed!')
}

main().catch(console.error)
