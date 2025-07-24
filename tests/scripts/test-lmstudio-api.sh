#!/bin/bash

# LM Studio API エンドポイントテストスクリプト
# v0 API（LM Studio独自）とv1 API（OpenAI互換）の両方をテスト

BASE_URL="${LM_STUDIO_URL:-http://localhost:1234}"
OUTPUT_FILE="lm-studio-api-test-results.json"

echo "🚀 LM Studio API エンドポイントテスト開始"
echo "📍 Base URL: $BASE_URL"
echo ""

# 結果を格納する配列
declare -a results=()

# テスト結果を記録する関数
record_result() {
    local endpoint="$1"
    local method="$2"
    local response="$3"
    local http_code="$4"
    local headers="$5"
    
    echo "✅ Tested: $method $endpoint (HTTP $http_code)"
}

# JSONペイロードを一時ファイルに保存
chat_payload=$(cat <<EOF
{
  "model": "test-model",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Say hello in one sentence."}
  ],
  "temperature": 0.7,
  "max_tokens": 50,
  "stream": false
}
EOF
)

chat_stream_payload=$(cat <<EOF
{
  "model": "test-model",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Say hello in one sentence."}
  ],
  "temperature": 0.7,
  "max_tokens": 50,
  "stream": true
}
EOF
)

completion_payload=$(cat <<EOF
{
  "model": "test-model",
  "prompt": "Once upon a time",
  "temperature": 0.7,
  "max_tokens": 50,
  "stream": false
}
EOF
)

embedding_payload=$(cat <<EOF
{
  "model": "test-model",
  "input": "Hello world"
}
EOF
)

echo "==============================================="
echo "v0 API テスト (LM Studio Native)"
echo "==============================================="
echo ""

# GET /api/v0/models
echo "🔄 Testing GET /api/v0/models..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/api/v0/models" -H "Content-Type: application/json")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# POST /api/v0/chat/completions (non-streaming)
echo "🔄 Testing POST /api/v0/chat/completions (non-streaming)..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/v0/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$chat_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# POST /api/v0/chat/completions (streaming)
echo "🔄 Testing POST /api/v0/chat/completions (streaming)..."
echo "First 5 chunks:"
curl -s -N -X POST "$BASE_URL/api/v0/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$chat_stream_payload" | head -5
echo "... (truncated)"
echo "---"
echo ""

# POST /api/v0/completions
echo "🔄 Testing POST /api/v0/completions..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/v0/completions" \
  -H "Content-Type: application/json" \
  -d "$completion_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# POST /api/v0/embeddings
echo "🔄 Testing POST /api/v0/embeddings..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/v0/embeddings" \
  -H "Content-Type: application/json" \
  -d "$embedding_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

echo ""
echo "==============================================="
echo "v1 API テスト (OpenAI Compatible)"
echo "==============================================="
echo ""

# GET /v1/models
echo "🔄 Testing GET /v1/models..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/v1/models" -H "Content-Type: application/json")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# POST /v1/chat/completions (non-streaming)
echo "🔄 Testing POST /v1/chat/completions (non-streaming)..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio" \
  -d "$chat_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# POST /v1/chat/completions (streaming)
echo "🔄 Testing POST /v1/chat/completions (streaming)..."
echo "First 5 chunks:"
curl -s -N -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio" \
  -d "$chat_stream_payload" | head -5
echo "... (truncated)"
echo "---"
echo ""

# POST /v1/completions
echo "🔄 Testing POST /v1/completions..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/v1/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio" \
  -d "$completion_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# POST /v1/embeddings
echo "🔄 Testing POST /v1/embeddings..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/v1/embeddings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio" \
  -d "$embedding_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

echo ""
echo "==============================================="
echo "エラーケーステスト"
echo "==============================================="
echo ""

# 無効なエンドポイント
echo "🔄 Testing invalid endpoint..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/api/v0/invalid-endpoint")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

# 無効なリクエスト（modelフィールド欠落）
invalid_payload=$(cat <<EOF
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
EOF
)

echo "🔄 Testing invalid request (missing model field)..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio" \
  -d "$invalid_payload")
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')
echo "Response:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo "HTTP Code: $http_code"
echo "---"
echo ""

echo ""
echo "==============================================="
echo "ヘッダー情報の確認"
echo "==============================================="
echo ""

echo "🔄 Checking response headers for /v1/chat/completions..."
curl -s -I -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer lm-studio" \
  -d "$chat_payload"

echo ""
echo "✅ テスト完了！"