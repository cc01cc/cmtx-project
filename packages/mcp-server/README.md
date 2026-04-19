# @cmtx/mcp-server

JSON-RPC 2.0 MCP (Model Context Protocol) 服务器，通过标准输入/输出（stdio）为 AI Agent 提供 Markdown 图片管理工具接口。

> **状态说明**：已完成对 core 和 upload 包大规模重构的全面适配，所有核心功能均已实现并通过测试。

## 概述

该服务器实现了完整的 Model Context Protocol 2.0，提供 7 个工具用于 Markdown 图片的分析、上传、查询和删除操作。支持与 AI Agent（如 Claude）集成，使 Agent 能够自动管理项目中的图片资源。

### 接口完成状态

| 工具名称 | 状态 | 说明 |
|---------|------|------|
| `scan.analyze` | ✅ 完成 | 扫描分析本地图片引用情况 |
| `upload.preview` | ✅ 完成 | 预览上传操作结果（干运行）|
| `upload.run` | ✅ 完成 | 执行实际上传和引用替换 |
| `find.filesReferencingImage` | ✅ 完成 | 查找引用指定图片的文件 |
| `delete.safe` | ✅ 完成 | 安全删除图片（检查引用）|
| `delete.force` | ✅ 完成 | 强制删除图片（需确认）|

> **v0.2.0 更新**：core 包进行了重大重构，移除了精确的位置信息 API，但图片分析、上传、删除等核心功能保持不变。

## 快速开始

### 安装

```bash
pnpm install @cmtx/mcp-server
```

### 使用

作为 stdio 服务器运行（通常由 AI Agent 框架调用）：

```bash
node packages/mcp-server/dist/bin/cmtx-mcp.js < input.jsonl > output.jsonl
```

或在 AI Agent 配置中：

```json
{
  "tools": {
    "cmtx": {
      "command": "node",
      "args": ["packages/mcp-server/dist/bin/cmtx-mcp.js"],
      "env": {
        "ALIYUN_OSS_REGION": "oss-cn-hangzhou",
        "ALIYUN_OSS_BUCKET": "your-bucket",
        "ALIYUN_OSS_ACCESS_KEY_ID": "your-key-id",
        "ALIYUN_OSS_ACCESS_KEY_SECRET": "your-secret"
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
| region | string | - | OSS 区域（默认：oss-cn-hangzhou）|
| accessKeyId | string | - | OSS Access Key ID |
| accessKeySecret | string | - | OSS Access Key Secret |
| bucket | string | - | OSS Bucket 名称 |
| uploadPrefix | string | - | 上传路径前缀 |
| namingPattern | string | - | 命名模式（已更新）|
| deletionStrategy | string | - | 删除策略 |
| maxDeletionRetries | number | - | 最大重试次数 |

**返回值：**

```typescript
{
  count: number;
  results: Array<{
    filePath: string;
    success: boolean;
    uploaded: number;
    replaced: number;
    deleted: number;
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
export ALIYUN_OSS_REGION=oss-cn-hangzhou
export ALIYUN_OSS_BUCKET=my-bucket
export ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret
```

或在工具调用时作为参数传递。

### 技术细节

### JSON-RPC 2.0 协议

- **请求：** 通过 stdin 接收 JSON 行
- **响应：** 通过 stdout 发送 JSON 行
- **通知：** 支持无 id 的通知（用于事件）

### 类型安全

- 全 TypeScript strict 模式
- 参数验证和类型检查
- 完整的 JSDoc 注释

### 依赖

- `@cmtx/core`：Markdown 分析（重构版本）
- `@cmtx/upload`：上传和替换（重构版本）
- `ali-oss`：阿里云 OSS SDK
- `fast-glob`：文件模式匹配

### 重构变更

此版本已完成对 core 和 upload 包大规模重构的适配：

- **API 适配**：更新了 ConfigBuilder 和参数名称
- **功能增强**：实现了目录级别的上传处理
- **引用查找**：新增了文件引用查找和详细位置信息功能
- **错误处理**：改进了错误消息和类型安全性
- **性能优化**：使用了 core 包的快速内容检查机制

## AI Agent 集成指南

### Claude Desktop 配置

在 Claude Desktop 的配置文件中添加：

```json
{
  "tools": {
    "cmtx": {
      "command": "node",
      "args": ["packages/mcp-server/dist/bin/cmtx-mcp.js"],
      "env": {
        "ALIYUN_OSS_REGION": "oss-cn-hangzhou",
        "ALIYUN_OSS_BUCKET": "your-bucket",
        "ALIYUN_OSS_ACCESS_KEY_ID": "your-key-id",
        "ALIYUN_OSS_ACCESS_KEY_SECRET": "your-secret"
      }
    }
  }
}
```

### Claude API（Anthropic）集成

```python
from anthropic import Anthropic

# MCP 工具定义
mcp_tools = [
    {
        "name": "scan.analyze",
        "description": "扫描本地图片并分析引用情况",
        "input_schema": {
            "type": "object",
            "properties": {
                "projectRoot": {"type": "string", "description": "项目根目录"},
                "searchDir": {"type": "string", "description": "扫描目录"}
            },
            "required": ["projectRoot", "searchDir"]
        }
    },
    {
        "name": "upload.run",
        "description": "上传本地图片到云存储并更新 Markdown 引用",
        "input_schema": {
            "type": "object",
            "properties": {
                "projectRoot": {"type": "string"},
                "searchDir": {"type": "string"},
                "region": {"type": "string"},
                "accessKeyId": {"type": "string"},
                "accessKeySecret": {"type": "string"},
                "bucket": {"type": "string"}
            },
            "required": ["projectRoot", "searchDir"]
        }
    }
    # ... 其他工具定义
]

client = Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=mcp_tools,
    messages=[
        {
            "role": "user", 
            "content": "请帮我扫描 docs 目录中的所有本地图片，并上传到 OSS"
        }
    ]
)
```

### 与其他 AI Agent 集成

通过 stdio 连接：

```typescript
const { spawn } = require('child_process');

const server = spawn('node', ['cmtx-mcp.js']);

server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  // 处理 MCP 响应
  console.log('Agent received:', response);
});

// 发送工具调用请求
server.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools.call",
  params: {
    name: "scan.analyze",
    arguments: { 
      projectRoot: "/project", 
      searchDir: "/project/docs" 
    }
  }
}) + '\n');
```

## Agent 使用场景

### 场景1：自动图片迁移
```
用户："请帮我把 docs 目录中所有本地图片上传到 OSS，并更新 Markdown 引用"
Agent：调用 upload.run 工具完成操作
```

### 场景2：图片引用分析
```
用户："我想知道哪些文件引用了 logo.png 这个图片"
Agent：调用 find.filesReferencingImage 工具查找引用
```

### 场景3：安全清理
```
用户："删除不再被引用的旧图片文件"
Agent：先调用 scan.analyze 分析，再调用 delete.safe 清理
```

### 场景4：批量预览
```
用户："预览一下上传操作会有什么变化"
Agent：调用 upload.preview 进行干运行
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

### 为什么某些功能标记为 TODO？

部分高级功能（如精确的位置信息）由于 core 包架构限制暂未实现。重构后的版本已尽可能提供实用功能。

## 许可证

Apache-2.0

## 参见

- [@cmtx/core](../core/README.md) - 图片处理与元数据操作
- [@cmtx/upload](../upload/README.md) - 对象存储上传
- [@cmtx/cli](../cli/README.md) - 命令行工具
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [AGENT-GUIDE.md](AGENT-GUIDE.md) - AI Agent 使用指南
