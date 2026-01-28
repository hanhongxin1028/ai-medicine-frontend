# 工作流编排对话型应用 API

对话应用支持会话持久化，可将之前的聊天记录作为上下文进行回答，可适用于聊天/客服 AI 等。

## 基础 URL
```
[https://api.dify.ai/v1](https://api.dify.ai/v1)
```

## 鉴权

Service API 使用 `API-Key` 进行鉴权。 **强烈建议开发者把 `API-Key` 放在后端存储**，而非分享或者放在客户端存储，以免 `API-Key` 泄露，导致财产损失。

所有 API 请求都应在 `Authorization` HTTP Header 中包含您的 `API-Key`，如下所示：

```http
Authorization: Bearer {API_KEY}
```

---

## 1. 发送对话消息

`POST /chat-messages`

创建会话消息。

### Request Body

| 参数名称 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `query` | string | 是 | 用户输入/提问内容。 |
| `inputs` | object | 否 | 允许传入 App 定义的各变量值。`inputs` 参数包含了多组键值对，每组的键对应一个特定变量。默认 `{}`。 |
| `response_mode` | string | 是 | `streaming` 流式模式（推荐），基于 SSE 实现打字机效果。<br>`blocking` 阻塞模式，等待执行完毕后返回结果（超时时间 100s）。 |
| `user` | string | 是 | 用户标识，用于定义终端用户的身份，方便检索、统计。需保证在应用内唯一。 |
| `conversation_id` | string | 否 | 会话 ID。若需要基于之前的聊天记录继续对话，必须传之前消息的 `conversation_id`。 |
| `files` | array[object] | 否 | 文件列表，适用于传入文件结合文本理解。仅当模型支持 Vision/Video 能力时可用。（详见下方说明） |
| `auto_generate_name` | bool | 否 | 自动生成标题，默认 `true`。 |
| `workflow_id` | string | 否 | 工作流ID，用于指定特定版本。如果不提供则使用默认的已发布版本。 |
| `trace_id` | string | 否 | 链路追踪ID。优先级：Header(`X-Trace-Id`) > Query(`trace_id`) > Body(`trace_id`)。 |

**关于 `files` 参数的详细说明：**

* `type` (string): 支持类型：
    * `document`: 'TXT', 'MD', 'MARKDOWN', 'MDX', 'PDF', 'HTML', 'XLSX', 'XLS', 'VTT', 'PROPERTIES', 'DOC', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB'
    * `image`: 'JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'
    * `audio`: 'MP3', 'M4A', 'WAV', 'WEBM', 'MPGA'
    * `video`: 'MP4', 'MOV', 'MPEG', 'WEBM'
    * `custom`: 其他文件类型
* `transfer_method` (string): 传递方式。
    * `remote_url`: 图片地址。
    * `local_file`: 上传文件。
* `url`: 图片地址（仅当 `transfer_method` 为 `remote_url` 时）。
* `upload_file_id`: 上传文件 ID（仅当 `transfer_method` 为 `local_file` 时）。

### Response

#### 阻塞模式 (`blocking`)

返回 `ChatCompletionResponse` 对象 (`application/json`)。

```json
{
    "event": "message",
    "task_id": "c3800678-a077-43df-a102-53f23ed20b88",
    "id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "message_id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
    "mode": "chat",
    "answer": "iPhone 13 Pro Max specs are listed here:...",
    "metadata": {
        "usage": {
            "total_tokens": 1161,
            "total_price": "0.0012890",
            "currency": "USD",
            "latency": 0.768
        },
        "retriever_resources": [...]
    },
    "created_at": 1705407629
}
```

#### 流式模式 (`streaming`)

返回 `ChunkChatCompletionResponse` 流式序列 (`text/event-stream`)。每个流式块以 `data:` 开头，块之间以 `\n\n` 分隔。

**事件类型 (`event`) 说明：**

* `message`: LLM 返回文本块事件。
* `message_file`: 文件事件，表示有新文件需要展示（目前仅支持 image）。
* `message_end`: 消息结束事件。
* `tts_message`: TTS 音频流事件 (MP3 base64)。
* `tts_message_end`: TTS 音频流结束事件。
* `message_replace`: 消息内容替换事件（内容审查触发）。
* `workflow_started`: workflow 开始执行。
* `node_started`: node 开始执行。
* `node_finished`: node 执行结束。
* `workflow_finished`: workflow 执行结束。
* `error`: 异常事件。
* `ping`: 每 10s 一次的心跳。

**流式响应示例：**

```text
data: {"event": "workflow_started", "task_id": "...", "data": {...}}
data: {"event": "node_started", "task_id": "...", "data": {...}}
data: {"event": "message", "answer": "Hello", ...}
data: {"event": "message_end", "metadata": {...}, ...}
```

### curl 请求示例

```bash
curl -X POST '[https://api.dify.ai/v1/chat-messages](https://api.dify.ai/v1/chat-messages)' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "inputs": {},
  "query": "What are the specs of the iPhone 13 Pro Max?",
  "response_mode": "streaming",
  "conversation_id": "",
  "user": "abc-123",
  "files": [
      {
          "type": "image",
          "transfer_method": "remote_url",
          "url": "[https://cloud.dify.ai/logo/logo-site.png](https://cloud.dify.ai/logo/logo-site.png)"
      }
  ]
}'
```

---

## 2. 上传文件

`POST /files/upload`

上传文件并在发送消息时使用，可实现图文多模态理解。

### Request Body (multipart/form-data)

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `file` | file | 要上传的文件。 |
| `user` | string | 用户标识，必须和发送消息接口传入 user 保持一致。 |

### Response

```json
{
  "id": "72fa9618-8f89-4a37-9b33-7e1178a24a67",
  "name": "example.png",
  "size": 1024,
  "extension": "png",
  "mime_type": "image/png",
  "created_by": 123,
  "created_at": 1577836800
}
```

### curl 请求示例

```bash
curl -X POST '[https://api.dify.ai/v1/files/upload](https://api.dify.ai/v1/files/upload)' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/png' \
--form 'user=abc-123'
```

---

## 3. 文件预览

`GET /files/:file_id/preview`

预览或下载已上传的文件。文件只能在属于请求应用程序的消息范围内访问。

### 参数

* **Path 参数**: `file_id` (string) - 文件的唯一标识符。
* **Query 参数**: `as_attachment` (boolean) - 是否强制将文件作为附件下载。默认为 `false`。

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/files/72fa9618.../preview](https://api.dify.ai/v1/files/72fa9618.../preview)' \
--header 'Authorization: Bearer {api_key}'
```

---

## 4. 停止响应

`POST /chat-messages/:task_id/stop`

仅支持流式模式。停止正在进行的任务。

### 参数

* **Path 参数**: `task_id` (string) - 任务 ID，可在流式返回 Chunk 中获取。

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `user` | string | 用户标识，必须和发送消息接口传入 user 保持一致。 |

### curl 请求示例

```bash
curl -X POST '[https://api.dify.ai/v1/chat-messages/:task_id/stop](https://api.dify.ai/v1/chat-messages/:task_id/stop)' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json' \
--data-raw '{
  "user": "abc-123"
}'
```

---

## 5. 消息反馈（点赞）

`POST /messages/:message_id/feedbacks`

### 参数

* **Path 参数**: `message_id` (string) - 消息 ID。

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `rating` | string | 点赞 `like`, 点踩 `dislike`, 撤销点赞 `null`。 |
| `user` | string | 用户标识。 |
| `content` | string | 消息反馈的具体信息。 |

### curl 请求示例

```bash
curl -X POST '[https://api.dify.ai/v1/messages/:message_id/feedbacks](https://api.dify.ai/v1/messages/:message_id/feedbacks)' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "rating": "like",
  "user": "abc-123",
  "content": "message feedback information"
}'
```

---

## 错误码 (Errors)

| 代码 | 标识 | 描述 |
| :--- | :--- | :--- |
| 404 | - | 对话不存在 |
| 400 | invalid_param | 传入参数异常 |
| 400 | app_unavailable | App 配置不可用 |
| 400 | provider_not_initialize | 无可用模型凭据配置 |
| 400 | provider_quota_exceeded | 模型调用额度不足 |
| 400 | model_currently_not_support | 当前模型不可用 |
| 400 | workflow_not_found | 指定的工作流版本未找到 |
| 400 | completion_request_error | 文本生成失败 |
| 500 | - | 服务内部异常 |


---

## 6. 获取 APP 的消息点赞和反馈

`GET /app/feedbacks`

获取应用的终端用户反馈、点赞。

### Query 参数

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `page` | string | （选填）分页，默认值：1 |
| `limit` | string | （选填）每页数量，默认值：20 |

### Response

返回该 APP 的点赞、反馈列表 (`data` List)。

```json
{
    "data": [
        {
            "id": "8c0fbed8-e2f9-49ff-9f0e-15a35bdd0e25",
            "app_id": "f252d396-fe48-450e-94ec-e184218e7346",
            "conversation_id": "2397604b-9deb-430e-b285-4726e51fd62d",
            "message_id": "709c0b0f-0a96-4a4e-91a4-ec0889937b11",
            "rating": "like",
            "content": "message feedback information-3",
            "from_source": "user",
            "from_end_user_id": "74286412-9a1a-42c1-929c-01edb1d381d5",
            "from_account_id": null,
            "created_at": "2025-04-24T09:24:38",
            "updated_at": "2025-04-24T09:24:38"
        }
    ]
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/app/feedbacks?page=1&limit=20](https://api.dify.ai/v1/app/feedbacks?page=1&limit=20)' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

---

## 7. 获取下一轮建议问题列表

`GET /messages/{message_id}/suggested`

获取下一轮建议问题列表。

### 参数

* **Path 参数**: `message_id` (string) - Message ID
* **Query 参数**: `user` (string) - 用户标识，由开发者定义规则，需保证用户标识在应用内唯一。

### Response

```json
{
  "result": "success",
  "data": [
        "a",
        "b",
        "c"
    ]
}
```

### curl 请求示例

```bash
curl --location --request GET '[https://api.dify.ai/v1/messages/](https://api.dify.ai/v1/messages/){message_id}/suggested?user=abc-123' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

---

## 8. 获取会话历史消息

`GET /messages`

滚动加载形式返回历史聊天记录，第一页返回最新 `limit` 条，即：倒序返回。

### Query 参数

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `conversation_id` | string | 会话 ID |
| `user` | string | 用户标识。 |
| `first_id` | string | 当前页第一条聊天记录的 ID，默认 null。 |
| `limit` | int | 一次请求返回多少条聊天记录，默认 20 条。 |

### Response 字段说明

* `data` (array[object]): 消息列表
    * `id` (string): 消息 ID
    * `conversation_id` (string): 会话 ID
    * `inputs` (object): 用户输入参数
    * `query` (string): 用户输入 / 提问内容
    * `message_files` (array[object]): 消息文件
        * `type`: 文件类型 (image)
        * `url`: 文件预览地址
        * `belongs_to`: 文件归属方 (user 或 assistant)
    * `answer` (string): 回答消息内容
    * `created_at` (timestamp): 创建时间
    * `feedback` (object): 反馈信息 (rating: like/dislike)
    * `retriever_resources` (array): 引用和归属分段列表

### Response 示例 (文本)

```json
{
"limit": 20,
"has_more": false,
"data": [
    {
        "id": "a076a87f-31e5-48dc-b452-0061adbbc922",
        "conversation_id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
        "inputs": {
            "name": "dify"
        },
        "query": "iphone 13 pro",
        "answer": "The iPhone 13 Pro...",
        "message_files": [],
        "feedback": null,
        "retriever_resources": [
            {
                "position": 1,
                "dataset_name": "iPhone",
                "content": "..."
            }
        ],
        "created_at": 1705569239
    }
  ]
}
```

### Response 示例 (智能助手/图片)

```json
{
"limit": 20,
"has_more": false,
"data": [
    {
        "id": "d35e006c-7c4d-458f-9142-be4930abdf94",
        "inputs": {},
        "query": "draw a cat",
        "answer": "I have generated an image...",
        "message_files": [
            {
                "id": "976990d2-...",
                "type": "image",
                "url": "http://...",
                "belongs_to": "assistant"
            }
        ],
        "created_at": 1705988187
    }
    ]
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/messages?user=abc-123&conversation_id=](https://api.dify.ai/v1/messages?user=abc-123&conversation_id=){conversation_id}' \
--header 'Authorization: Bearer {api_key}'
```

---

## 9. 获取会话列表

`GET /conversations`

获取当前用户的会话列表，默认返回最近的 20 条。

### Query 参数

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `user` | string | 用户标识。 |
| `last_id` | string | （选填）当前页最后面一条记录的 ID，默认 null。 |
| `limit` | int | （选填）一次请求返回多少条记录，默认 20，最大 100。 |
| `sort_by` | string | （选填）排序字段，默认 `-updated_at` (按更新时间倒序)。<br>可选值：`created_at`, `-created_at`, `updated_at`, `-updated_at`。 |

### Response 字段说明

* `data` (array[object]): 会话列表
    * `id`: 会话 ID
    * `name`: 会话名称
    * `inputs`: 用户输入参数
    * `status`: 会话状态
    * `introduction`: 开场白
    * `created_at`: 创建时间
    * `updated_at`: 更新时间

### Response 示例

```json
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
      "id": "10799fb8-64f7-4296-bbf7-b42bfbe0ae54",
      "name": "New chat",
      "inputs": {
          "book": "book",
          "myName": "Lucy"
      },
      "status": "normal",
      "created_at": 1679667915,
      "updated_at": 1679667915
    }
  ]
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/conversations?user=abc-123&last_id=&limit=20](https://api.dify.ai/v1/conversations?user=abc-123&last_id=&limit=20)' \
--header 'Authorization: Bearer {api_key}'
```

---

## 10. 删除会话

`DELETE /conversations/:conversation_id`

删除会话。

### 参数

* **Path 参数**: `conversation_id` (string) - 会话 ID。

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `user` | string | 用户标识，必须保证用户标识在应用内唯一。 |

### Response

返回 `204 No Content`，result 固定返回 `success`。

### curl 请求示例

```bash
curl -X DELETE '[https://api.dify.ai/v1/conversations/](https://api.dify.ai/v1/conversations/){conversation_id}' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer {api_key}' \
--data '{
  "user": "abc-123"
}'
```

---

## 11. 会话重命名

`POST /conversations/:conversation_id/name`

对会话进行重命名，会话名称用于显示在支持多会话的客户端上。

### 参数

* **Path 参数**: `conversation_id` (string) - 会话 ID。

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `name` | string | （选填）名称，若 `auto_generate` 为 `true` 时，该参数可不传。 |
| `auto_generate` | bool | （选填）自动生成标题，默认 `false`。 |
| `user` | string | 用户标识。 |

### Response

```json
{
  "id": "34d511d5-56de-4f16-a997-57b379508443",
  "name": "hello",
  "inputs": {},
  "status": "normal",
  "introduction": "",
  "created_at": 1732731141,
  "updated_at": 1732734510
}
```

### curl 请求示例

```bash
curl -X POST '[https://api.dify.ai/v1/conversations/](https://api.dify.ai/v1/conversations/){conversation_id}/name' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {api_key}' \
--data-raw '{
  "name": "",
  "auto_generate": true,
  "user": "abc-123"
}'
```

---

## 12. 获取对话变量

`GET /conversations/:conversation_id/variables`

从特定对话中检索变量。此端点对于提取对话过程中捕获的结构化数据非常有用。

### 参数

* **Path 参数**: `conversation_id` (string) - 要从中检索变量的对话 ID。
* **Query 参数**:
    * `user` (string): 用户标识符。
    * `last_id` (string): （选填）当前页最后面一条记录的 ID，默认 null。
    * `limit` (int): （选填）每页数量，默认 20，最大 100。
    * `variable_name` (string): （选填，见示例）变量名过滤。

### Response

* `data` (array[object]): 变量列表
    * `id`, `name`, `value_type`, `value`, `description`, `created_at`, `updated_at`

```json
{
  "limit": 100,
  "has_more": false,
  "data": [
    {
      "id": "variable-uuid-1",
      "name": "customer_name",
      "value_type": "string",
      "value": "John Doe",
      "description": "客户名称（从对话中提取）",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    },
    {
      "id": "variable-uuid-2",
      "name": "order_details",
      "value_type": "json",
      "value": "{\"product\":\"Widget\",\"quantity\":5,\"price\":19.99}",
      "description": "客户的订单详情",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    }
  ]
}
```

### curl 请求示例

```bash
# 获取所有变量
curl -X GET '[https://api.dify.ai/v1/conversations/](https://api.dify.ai/v1/conversations/){conversation_id}/variables?user=abc-123' \
--header 'Authorization: Bearer {api_key}'

# 带变量名过滤
curl -X GET '[https://api.dify.ai/v1/conversations/](https://api.dify.ai/v1/conversations/){conversation_id}/variables?user=abc-123&variable_name=customer_name' \
--header 'Authorization: Bearer {api_key}'
```

---

## 13. 更新对话变量

`PUT /conversations/:conversation_id/variables/:variable_id`

更新特定对话变量的值。

### 参数

* **Path 参数**:
    * `conversation_id` (string): 对话 ID。
    * `variable_id` (string): 变量 ID。

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `value` | any | 变量的新值。必须匹配变量的预期类型（字符串、数字、对象等）。 |
| `user` | string | 用户标识符。 |

### Response

返回更新后的变量对象。

### curl 请求示例

```bash
curl -X PUT '[https://api.dify.ai/v1/conversations/](https://api.dify.ai/v1/conversations/){conversation_id}/variables/{variable_id}' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {api_key}' \
--data-raw '{
  "value": "Updated Value",
  "user": "abc-123"
}'
```

---

## 14. 语音转文字

`POST /audio-to-text`

### Request Body (multipart/form-data)

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `file` | file | 语音文件。支持格式：`['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']`。限制 15MB。 |
| `user` | string | 用户标识。 |

### Response

```json
{
  "text": "hello"
}
```

### curl 请求示例

```bash
curl -X POST '[https://api.dify.ai/v1/audio-to-text](https://api.dify.ai/v1/audio-to-text)' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=audio/mp3'
```

---

## 15. 文字转语音

`POST /text-to-audio`

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `message_id` | str | （选填）Dify 生成的 message-id。优先使用此 ID 查找内容合成。 |
| `text` | str | （选填）语音生成内容。若未传 `message_id`，则使用此字段。 |
| `user` | string | 用户标识。 |

### Response

返回音频文件流。
`Content-Type`: `audio/wav`

### curl 请求示例

```bash
curl -o text-to-audio.mp3 -X POST '[https://api.dify.ai/v1/text-to-audio](https://api.dify.ai/v1/text-to-audio)' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290",
  "text": "Hello Dify",
  "user": "abc-123",
}'
```

---

## 16. 获取应用基本信息

`GET /info`

用于获取应用的基本信息。

### Response

```json
{
  "name": "My App",
  "description": "This is my app.",
  "tags": [
    "tag1",
    "tag2"
  ],
  "mode": "advanced-chat",
  "author_name": "Dify"
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/info](https://api.dify.ai/v1/info)' \
-H 'Authorization: Bearer {api_key}'
```

---

## 17. 获取应用参数

`GET /parameters`

用于进入页面一开始，获取功能开关、输入参数名称、类型及默认值等使用。

### Response 字段说明

* `opening_statement`: 开场白
* `suggested_questions`: 开场推荐问题列表
* `suggested_questions_after_answer`: 启用回答后给出推荐问题 (enabled)
* `speech_to_text`: 语音转文本 (enabled)
* `text_to_speech`: 文本转语音 (enabled, voice, language, autoPlay)
* `retriever_resource`: 引用和归属 (enabled)
* `annotation_reply`: 标记回复 (enabled)
* `user_input_form`: 用户输入表单配置 (text-input, paragraph, select)
* `file_upload`: 文件上传配置 (document, image, audio, video, custom)
    * 每个类型包含: `enabled`, `number_limits`, `transfer_methods`
* `system_parameters`: 系统参数 (文档/图片/音频/视频 大小限制)

### Response 示例

```json
{
  "introduction": "nice to meet you",
  "user_input_form": [
    {
      "text-input": {
        "label": "a",
        "variable": "a",
        "required": true,
        "max_length": 48,
        "default": ""
      }
    }
  ],
  "file_upload": {
    "image": {
      "enabled": true,
      "number_limits": 3,
      "transfer_methods": [
        "remote_url",
        "local_file"
      ]
    }
  },
  "system_parameters": {
      "file_size_limit": 15,
      "image_file_size_limit": 10,
      "audio_file_size_limit": 50,
      "video_file_size_limit": 100
  }
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/parameters](https://api.dify.ai/v1/parameters)'
```

---

## 18. 获取应用 Meta 信息

`GET /meta`

用于获取工具 Icon 等元数据信息。

### Response 字段说明

* `tool_icons` (object): 工具图标 Map
    * Key: 工具名称 (string)
    * Value: 图标信息 (object 或 string URL)
        * `background` (string): hex 格式背景色
        * `content` (string): emoji
        * 或直接返回图片 URL (string)

### Response 示例

```json
{
  "tool_icons": {
      "dalle2": "[https://cloud.dify.ai/console/api/workspaces/current/tool-provider/builtin/dalle/icon](https://cloud.dify.ai/console/api/workspaces/current/tool-provider/builtin/dalle/icon)",
      "api_tool": {
          "background": "#252525",
          "content": "😁"
      }
  }
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/meta](https://api.dify.ai/v1/meta)' \
-H 'Authorization: Bearer {api_key}'
```

---

## 19. 获取应用 WebApp 设置

`GET /site`

用于获取应用的 WebApp 配置信息，如标题、图标、颜色主题等。

### Response 字段说明

* `title` (string): WebApp 名称
* `chat_color_theme` (string): 聊天颜色主题，hex 格式
* `chat_color_theme_inverted` (bool): 聊天颜色主题是否反转
* `icon_type` (string): 图标类型 (`emoji` 或 `image`)
* `icon` (string): 图标内容 (Emoji 字符或图片 URL)
* `icon_background` (string): hex 格式的背景色
* `icon_url` (string): 图标 URL
* `description` (string): 描述
* `copyright` (string): 版权信息
* `privacy_policy` (string): 隐私政策链接
* `custom_disclaimer` (string): 自定义免责声明
* `default_language` (string): 默认语言
* `show_workflow_steps` (bool): 是否显示工作流详情
* `use_icon_as_answer_icon` (bool): 是否使用 WebApp 图标替换聊天中的 🤖

### Response 示例

```json
{
  "title": "My App",
  "chat_color_theme": "#ff4a4a",
  "chat_color_theme_inverted": false,
  "icon_type": "emoji",
  "icon": "😄",
  "icon_background": "#FFEAD5",
  "icon_url": null,
  "description": "This is my app.",
  "copyright": "all rights reserved",
  "privacy_policy": "",
  "custom_disclaimer": "All generated by AI",
  "default_language": "en-US",
  "show_workflow_steps": false,
  "use_icon_as_answer_icon": false
}
```

### curl 请求示例

```bash
curl -X GET '[https://api.dify.ai/v1/site](https://api.dify.ai/v1/site)' \
-H 'Authorization: Bearer {api_key}'
```

---

## 20. 获取标注列表

`GET /apps/annotations`

### Query 参数

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `page` | string | 页码 |
| `limit` | string | 每页数量 |

### Response 示例

```json
{
  "data": [
    {
      "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
      "question": "What is your name?",
      "answer": "I am Dify.",
      "hit_count": 0,
      "created_at": 1735625869
    }
  ],
  "has_more": false,
  "limit": 20,
  "total": 1,
  "page": 1
}
```

### curl 请求示例

```bash
curl --location --request GET '[https://api.dify.ai/v1/apps/annotations?page=1&limit=20](https://api.dify.ai/v1/apps/annotations?page=1&limit=20)' \
--header 'Authorization: Bearer {api_key}'
```

---

## 21. 创建标注

`POST /apps/annotations`

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `question` | string | 问题 |
| `answer` | string | 答案内容 |

### Response 示例

```json
{
  "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
  "question": "What is your name?",
  "answer": "I am Dify.",
  "hit_count": 0,
  "created_at": 1735625869
}
```

### curl 请求示例

```bash
curl --location --request POST '[https://api.dify.ai/v1/apps/annotations](https://api.dify.ai/v1/apps/annotations)' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "question": "What is your name?",
  "answer": "I am Dify."
}'
```

---

## 22. 更新标注

`PUT /apps/annotations/{annotation_id}`

### 参数

* **Path 参数**: `annotation_id` (string) - 标注 ID

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `question` | string | 问题 |
| `answer` | string | 答案内容 |

### curl 请求示例

```bash
curl --location --request PUT '[https://api.dify.ai/v1/apps/annotations/](https://api.dify.ai/v1/apps/annotations/){annotation_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "question": "What is your name?",
  "answer": "I am Dify."
}'
```

---

## 23. 删除标注

`DELETE /apps/annotations/{annotation_id}`

### 参数

* **Path 参数**: `annotation_id` (string) - 标注 ID

### Response

返回 `204 No Content`。

### curl 请求示例

```bash
curl --location --request DELETE '[https://api.dify.ai/v1/apps/annotations/](https://api.dify.ai/v1/apps/annotations/){annotation_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

---

## 24. 标注回复初始设置

`POST /apps/annotation-reply/{action}`

开启或关闭标注回复功能。该接口是**异步执行**的。

> **注意**: 嵌入模型的提供商 (`provider`) 和模型名称 (`model`) 可以通过 Knowledge Base API (`v1/workspaces/current/models/model-types/text-embedding`) 获取。

### 参数

* **Path 参数**: `action` (string) - 动作，只能是 `enable` 或 `disable`。

### Request Body

| 参数名称 | 类型 | 描述 |
| :--- | :--- | :--- |
| `embedding_provider_name` | string | 指定的嵌入模型提供商。 |
| `embedding_model_name` | string | 指定的嵌入模型。 |
| `score_threshold` | number | 相似度阈值。当相似度大于该阈值时，系统会自动回复。 |

### Response

返回任务 ID (`job_id`) 用于查询状态。

```json
{
  "job_id": "b15c8f68-1cf4-4877-bf21-ed7cf2011802",
  "job_status": "waiting"
}
```

### curl 请求示例

```bash
curl --location --request POST '[https://api.dify.ai/v1/apps/annotation-reply/](https://api.dify.ai/v1/apps/annotation-reply/){action}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "score_threshold": 0.9,
  "embedding_provider_name": "zhipu",
  "embedding_model_name": "embedding_3"
}'
```

---

## 25. 查询标注回复初始设置任务状态

`GET /apps/annotation-reply/{action}/status/{job_id}`

### 参数

* **Path 参数**:
    * `action` (string): 动作，`enable` 或 `disable` (需与设置接口保持一致)。
    * `job_id` (string): 任务 ID，从设置接口返回。

### Response

```json
{
  "job_id": "b15c8f68-1cf4-4877-bf21-ed7cf2011802",
  "job_status": "waiting",
  "error_msg": ""
}
```

### curl 请求示例

```bash
curl --location --request GET '[https://api.dify.ai/v1/apps/annotation-reply/](https://api.dify.ai/v1/apps/annotation-reply/){action}/status/{job_id}' \
--header 'Authorization: Bearer {api_key}'
```