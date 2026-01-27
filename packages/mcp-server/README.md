# @cmtx/mcp-server

JSON-RPC 2.0 MCP (Model Context Protocol) 服务器，通过标准输入/输出（stdio）为 AI 代理提供 Markdown 图片管理工具接口。

## 概述

该服务器实现了完整的 Model Context Protocol 2.0，提供 7 个工具用于 Markdown 图片的分析、上传、查询和删除操作。支持与 AI 代理（如 Claude）集成，使代理能够自动管理项目中的图片资源。

## 快速开始

### 安装

```bash
pnpm install @cmtx/mcp-server
```

### 使用

作为 stdio 服务器运行（通常由代理框架调用）：

```bash
node packages/mcp-server/dist/bin/cmtx-mcp.js < input.jsonl > output.jsonl
```

或在代理配置中：

```json
{
  "tools": {
    "cmtx": {
      "command": "node",
      "args": ["packages/mcp-server/dist/bin/cmtx-mcp.js"],
      "env": {
        "OSS_REGION": "oss-cn-hangzhou",
        "OSS_BUCKET": "your-bucket",
        "OSS_ACCESS_KEY_ID": "your-key-id",
        "OSS_ACCESS_KEY_SECRET": "your-secret"
      }
    }
  }
}
```

## 实现的工具

### 1. scan.analyze

扫描本地图片并分析其引用情况。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| localPrefixes | string[] | - | 本地路径前缀 |
| uploadPrefix | string | - | 上传路径前缀 |
| namingStrategy | string | - | 命名策略 |
| maxFileSize | number | - | 最大文件大小（字节） |
| allowedExtensions | string[] | - | 允许的扩展名 |

**返回值：**

```typescript
{
  images: Array<{
    localPath: string;
    fileSize: number;
    referencedIn: string[];
  }>;
  skipped: Array<{
    path: string;
    reason: string;
  }>;
  totalSize: number;
  totalCount: number;
}
```

**示例：**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools.call",
  "params": {
    "name": "scan.analyze",
    "arguments": {
      "projectRoot": "/project",
      "searchDir": "/project/docs"
    }
  }
}
```

### 2. upload.preview

预览上传操作的结果（干运行），不实际执行上传或修改文件。

**参数：** 同 scan.analyze，另加存储适配器配置

**返回值：**

```typescript
{
  preview: Array<{
    imagePath: string;
    remotePath: string;
    referencedIn: string[];
  }>;
  totals: {
    toReplace: number;
    toDelete: number;
  };
}
```

### 3. upload.run

执行实际的上传和 Markdown 引用更新。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| adapter | object | 是 | 存储适配器配置 |
| uploadPrefix | string | - | 上传路径前缀 |
| namingStrategy | string | - | 命名策略 |
| deletionStrategy | string | - | 删除策略 |
| trashDir | string | - | 回收目录 |
| maxDeletionRetries | number | - | 最大重试次数 |

**返回值：**

```typescript
{
  count: number;
  results: Array<{
    localPath: string;
    remotePath: string;
    updated: string[];
    deleted: boolean;
    error?: string;
  }>;
}
```

**事件：** 上传过程中发送 JSON-RPC 通知

```json
{
  "jsonrpc": "2.0",
  "method": "upload.event",
  "params": {
    "type": "scan" | "upload" | "replace" | "delete" | "complete",
    "data": {}
  }
}
```

### 4. find.filesReferencingImage

查找引用指定图片的所有 Markdown 文件。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| imagePath | string | 是 | 图片路径 |
| searchDir | string | 是 | 搜索目录 |
| depth | number | - | 递归深度 |

**返回值：**

```typescript
{
  files: string[];  // 相对路径列表
}
```

### 5. find.referenceDetails

获取图片引用的详细位置信息（行号、列号）。

**参数：** 同 find.filesReferencingImage

**返回值：**

```typescript
{
  references: Array<{
    file: string;
    locations: Array<{
      line: number;
      column: number;
      text: string;
    }>;
  }>;
}
```

### 6. delete.safe

安全删除图片（检查引用后删除）。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| imagePath | string | 是 | 图片路径 |
| searchDir | string | 是 | 搜索目录 |

**返回值：**

```typescript
{
  deleted: boolean;
  path?: string;
  reason?: string;
  file?: string;  // 如果未删除，返回引用该图片的文件
}
```

### 7. delete.force

强制删除图片（需显式确认）。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| imagePath | string | 是 | 图片路径 |
| searchDir | string | 是 | 搜索目录 |
| allowHardDelete | boolean | 是 | 必须为 true（安全确认） |

**返回值：** 同 delete.safe，另加 `forced: true`

## 错误处理

服务器返回标准 JSON-RPC 2.0 错误响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 4001,
    "message": "Path is outside project root",
    "data": {
      "path": "/etc/passwd"
    }
  }
}
```

**错误代码：**

| 代码 | 消息 | 说明 |
| --- | --- | --- |
| 4001 | PATH_OUTSIDE_ROOT | 路径超出项目根目录 |
| 4101 | ADAPTER_UNAVAILABLE | 存储适配器不可用 |
| 4300 | DELETE_REFERENCED | 图片仍被引用，无法删除 |
| 4301 | DELETE_FAILED | 删除操作失败 |
| 4400 | INVALID_ARGS | 参数无效或缺失 |
| 5000 | 其他错误 | 通用服务器错误 |

## 环境变量

OSS 凭证可通过环境变量配置：

```bash
export OSS_REGION=oss-cn-hangzhou
export OSS_BUCKET=my-bucket
export OSS_ACCESS_KEY_ID=your_access_key
export OSS_ACCESS_KEY_SECRET=your_secret
```

或在工具调用时作为参数传递。

## 技术细节

### JSON-RPC 2.0 协议

- **请求：** 通过 stdin 接收 JSON 行
- **响应：** 通过 stdout 发送 JSON 行
- **通知：** 支持无 id 的通知（用于事件）

### 类型安全

- 全 TypeScript strict 模式
- 参数验证和类型检查
- 完整的 JSDoc 注释

### 依赖

- `@cmtx/core`：Markdown 分析
- `@cmtx/upload`：上传和替换
- `ali-oss`：阿里云 OSS SDK

## 集成示例

### Claude API（Anthropic）

```python
from anthropic import Anthropic

tools = [
    {
        "name": "scan_markdown_images",
        "description": "Scan and analyze Markdown images",
        "input_schema": {
            "type": "object",
            "properties": {
                "projectRoot": {"type": "string"},
                "searchDir": {"type": "string"}
            }
        }
    }
    # ... 其他工具
]

client = Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=tools,
    messages=[...]
)
```

### Node.js 代理

通过 stdio 连接：

```typescript
const { spawn } = require('child_process');

const server = spawn('node', ['cmtx-mcp.js']);

server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  // 处理响应
});

// 发送请求
server.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools.call",
  params: {
    name: "scan.analyze",
    arguments: { projectRoot: "/project", searchDir: "/project/docs" }
  }
}) + '\n');
```

## 常见问题

### 如何测试服务器？

使用 echo 和 node：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools.call","params":{"name":"scan.analyze","arguments":{"projectRoot":".","searchDir":"./docs"}}}' | \
node packages/mcp-server/dist/bin/cmtx-mcp.js
```

### OSS 凭证如何安全传递？

优先使用环境变量，避免在命令行或配置文件中暴露敏感信息。

### 支持其他存储服务吗？

当前实现支持阿里云 OSS。可通过实现 `IStorageAdapter` 接口扩展支持 S3、COS 等。

## 许可证

Apache-2.0

## 参见

- [@cmtx/core](../core/README.md) - 图片提取和引用分析
- [@cmtx/upload](../upload/README.md) - 对象存储上传
- [@cmtx/cli](../cli/README.md) - 命令行工具
- [Model Context Protocol](https://modelcontextprotocol.io/)
