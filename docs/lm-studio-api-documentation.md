# LM Studio API ドキュメント

## 概要

LM Studioは2つのAPIバージョンを提供しています：

1. **v0 API** - LM Studio独自のREST API（より詳細な統計情報を含む）
2. **v1 API** - OpenAI互換API

## v0 API (LM Studio Native)

### Base URL
```
http://localhost:1234/api/v0
```

### エンドポイント一覧

#### 1. GET /api/v0/models
モデル一覧を取得

**レスポンス例：**
```json
{
  "data": [
    {
      "id": "granite-3.0-2b-instruct",
      "type": "llm",
      "publisher": "ibm-granite",
      "arch": "granite",
      "compatibility_type": "gguf",
      "quantization": "Q4_K_M",
      "state": "loaded",
      "max_context_length": 4096,
      "path": "/path/to/model.gguf"
    }
  ]
}
```

#### 2. GET /api/v0/models/{model}
特定モデルの詳細情報を取得

**レスポンス例：**
```json
{
  "id": "granite-3.0-2b-instruct",
  "type": "llm",
  "publisher": "ibm-granite",
  "arch": "granite",
  "quantization": "Q4_K_M",
  "state": "loaded",
  "max_context_length": 4096,
  "compatibility_type": "gguf",
  "size_on_disk": 1234567890,
  "capabilities": {
    "completion": true,
    "chat_completion": true,
    "embedding": true,
    "function_calling": false,
    "vision": false
  }
}
```

#### 3. POST /api/v0/chat/completions
チャット補完を生成

**リクエスト：**
```json
{
  "model": "granite-3.0-2b-instruct",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": -1,
  "stream": false
}
```

**レスポンス（非ストリーミング）：**
```json
{
  "id": "chatcmpl-i3gkjwthhw96whukek9tz",
  "object": "chat.completion",
  "created": 1731990317,
  "model": "granite-3.0-2b-instruct",
  "choices": [
    {
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 24,
    "completion_tokens": 10,
    "total_tokens": 34
  },
  "stats": {
    "tokens_per_second": 51.43,
    "time_to_first_token": 0.111,
    "generation_time": 0.194,
    "stop_reason": "eosFound"
  },
  "model_info": {
    "arch": "granite",
    "quant": "Q4_K_M",
    "format": "gguf",
    "context_length": 4096
  },
  "runtime": {
    "name": "llama.cpp-mac-arm64-apple-metal-advsimd",
    "version": "1.3.0",
    "supported_formats": ["gguf"]
  }
}
```

**ストリーミングレスポンス：**
```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"stats":{"tokens_per_second":45.2,"time_to_first_token":0.120,"generation_time":0.220}}

data: [DONE]
```

#### 4. POST /api/v0/completions
テキスト補完を生成

**リクエスト：**
```json
{
  "model": "granite-3.0-2b-instruct",
  "prompt": "Once upon a time",
  "temperature": 0.7,
  "max_tokens": 50,
  "stream": false
}
```

**レスポンス：**
```json
{
  "id": "cmpl-xyz789",
  "object": "text_completion",
  "created": 1731990317,
  "model": "granite-3.0-2b-instruct",
  "choices": [
    {
      "text": ", there was a brave knight who lived in a castle...",
      "index": 0,
      "logprobs": null,
      "finish_reason": "length"
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 50,
    "total_tokens": 54
  },
  "stats": {
    "tokens_per_second": 48.3,
    "generation_time": 1.035
  }
}
```

#### 5. POST /api/v0/embeddings
テキスト埋め込みを生成

**リクエスト：**
```json
{
  "model": "nomic-embed-text",
  "input": "Hello world"
}
```

**レスポンス：**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.1234, -0.5678, 0.9012, ...],
      "index": 0
    }
  ],
  "model": "nomic-embed-text",
  "usage": {
    "prompt_tokens": 2,
    "total_tokens": 2
  }
}
```

## v1 API (OpenAI Compatible)

### Base URL
```
http://localhost:1234/v1
```

### エンドポイント一覧

#### 1. GET /v1/models
OpenAI互換形式でモデル一覧を取得

**レスポンス例：**
```json
{
  "object": "list",
  "data": [
    {
      "id": "granite-3.0-2b-instruct",
      "object": "model",
      "created": 1731990317,
      "owned_by": "ibm-granite"
    }
  ]
}
```

#### 2. POST /v1/chat/completions
OpenAI互換形式でチャット補完を生成

**リクエスト：**
```json
{
  "model": "granite-3.0-2b-instruct",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "stream": false
}
```

**レスポンス（非ストリーミング）：**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1731990317,
  "model": "granite-3.0-2b-instruct",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 9,
    "total_tokens": 24
  }
}
```

**ストリーミングレスポンス（SSE形式）：**
```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1731990317,"model":"granite-3.0-2b-instruct","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

#### 3. POST /v1/completions
OpenAI互換形式でテキスト補完を生成

**注意：** OpenAIは/v1/completionsエンドポイントを廃止していますが、LM Studioでは引き続きサポートされています。

**リクエスト：**
```json
{
  "model": "granite-3.0-2b-instruct",
  "prompt": "Once upon a time",
  "temperature": 0.7,
  "max_tokens": 50
}
```

**レスポンス：**
```json
{
  "id": "cmpl-xyz789",
  "object": "text_completion",
  "created": 1731990317,
  "model": "granite-3.0-2b-instruct",
  "choices": [
    {
      "text": ", there was a brave knight...",
      "index": 0,
      "logprobs": null,
      "finish_reason": "length"
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 50,
    "total_tokens": 54
  }
}
```

#### 4. POST /v1/embeddings
OpenAI互換形式でテキスト埋め込みを生成

**リクエスト：**
```json
{
  "model": "nomic-embed-text",
  "input": "Hello world",
  "encoding_format": "float"
}
```

**レスポンス：**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.1234, -0.5678, 0.9012, ...],
      "index": 0
    }
  ],
  "model": "nomic-embed-text",
  "usage": {
    "prompt_tokens": 2,
    "total_tokens": 2
  }
}
```

## エラーレスポンス

### v0 API エラー形式
```json
{
  "error": {
    "message": "Model not found: invalid-model",
    "type": "model_not_found",
    "code": "MODEL_NOT_FOUND"
  }
}
```

### v1 API エラー形式（OpenAI互換）
```json
{
  "error": {
    "message": "The model `invalid-model` does not exist",
    "type": "invalid_request_error",
    "param": "model",
    "code": null
  }
}
```

## ヘッダー情報

### 共通ヘッダー
- `Content-Type: application/json` （リクエスト・レスポンス）
- `X-Request-ID: <request-id>` （レスポンス）

### ストリーミング時のヘッダー
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no` （nginxプロキシ環境用）

### v1 API認証
- `Authorization: Bearer <api-key>` （任意の値を受け入れる）

## v0とv1 APIの主な違い

1. **統計情報**
   - v0: `stats`フィールドに詳細な統計情報（tokens/秒、TTFT等）を含む
   - v1: 基本的な`usage`情報のみ

2. **モデル情報**
   - v0: `model_info`フィールドにアーキテクチャ、量子化、形式等の詳細を含む
   - v1: モデルIDのみ

3. **ランタイム情報**
   - v0: `runtime`フィールドにLLMエンジンの情報を含む
   - v1: なし

4. **エンドポイントパス**
   - v0: `/api/v0/`プレフィックス
   - v1: `/v1/`プレフィックス

5. **互換性**
   - v0: LM Studio独自形式
   - v1: OpenAI APIと互換性あり（既存のOpenAIクライアントライブラリが使用可能）

## 使用上の注意

1. v0 APIはベータ版であり、エンドポイントは変更される可能性があります
2. ストリーミング時は`stream: true`をリクエストに含める必要があります
3. チャット用にチューニングされたモデルで`/completions`エンドポイントを使用すると、予期しない結果になる可能性があります
4. 埋め込みモデルは別途ロードする必要があります（LLMモデルとは別）