# @cmtx/mcp-server

[![npm version](https://img.shields.io/npm/v/@cmtx/mcp-server.svg)](https://www.npmjs.com/package/@cmtx/mcp-server)
[![License](https://img.shields.io/npm/l/@cmtx/mcp-server.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Model Context Protocol (MCP) 服务器，让 AI Agent 直接管理 Markdown 文档中的图片资源。
MCP server for Markdown asset management — lets AI agents scan, upload, transfer, and delete images without handling cloud credentials directly.

---

## 为什么需要 Markdown MCP Server？/ Why?

AI Agent 在编写或编辑 Markdown 时面临和人类一样的痛点：

- **上传门槛**：图片需要上传到云存储，但 AI 不应该持有云凭证
- **引用更新**：上传后 Markdown 中的图片引用需要同步更新
- **清理维护**：不再使用的图片需要检测并安全删除
- **预签名 URL**：私有存储桶的图片需要临时访问链接

CMTX MCP 服务器作为**能力代理层（capability delegation layer）**：AI 描述意图（"上传所有本地图片并更新引用"），CMTX 处理凭证和权限操作。

AI agents face the same pain points as humans when editing Markdown. CMTX MCP server acts as a capability delegation layer — the agent describes what it wants, and CMTX handles the permission-heavy operations.

---

## 快速开始 / Quick Start

### 安装 / Installation

```bash
pnpm install @cmtx/mcp-server
```

### Claude Desktop 配置

```json
{
    "mcpServers": {
        "cmtx": {
            "command": "node",
            "args": ["path/to/mcp-server/dist/bin/cmtx-mcp.js"],
            "env": {
                "ALIYUN_OSS_REGION": "oss-cn-hangzhou",
                "ALIYUN_OSS_BUCKET": "my-bucket",
                "ALIYUN_OSS_ACCESS_KEY_ID": "your-key-id",
                "ALIYUN_OSS_ACCESS_KEY_SECRET": "your-secret"
            }
        }
    }
}
```

### Claude Code / Cursor

```bash
claude mcp add cmtx npx -y @cmtx/mcp-server

# Then ask your agent:
# "Scan the docs/ folder for local images and upload them to cloud storage"
```

---

## 工具列表 / Tools

### scan.analyze

扫描目录中的本地图片，分析其在 Markdown 文件中的引用情况。
Scan a directory for local images and analyze their references across Markdown files.

**参数 / Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| projectRoot | string | 是 | 项目根目录（路径安全限制） |
| searchDir | string | 是 | 扫描目录 |

**返回 / Returns：** 图片列表（含引用计数）、跳过文件、总计统计。

### upload.preview

预览上传操作结果（干运行），不实际修改文件。
Preview what an upload operation would do — dry run without modifying files.

**参数：** 同 scan.analyze，另加存储适配器配置（region、bucket、credentials）。

### upload.run

执行实际上传和引用替换。
Execute upload and reference replacement.

**参数 / Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| region | string | 否 | OSS 区域 |
| bucket | string | 否 | OSS bucket 名称 |
| uploadPrefix | string | 否 | 上传路径前缀 |
| namingTemplate | string | 否 | 命名模板（如 `{date}_{md5_8}{ext}`） |

### find.filesReferencingImage

查找引用指定图片的所有 Markdown 文件。
List all Markdown files that reference a specific image.

### find.referenceDetails

获取图片引用的详细位置信息（行号、列号、原文）。

### delete.safe

安全删除图片（仅当无 Markdown 文件引用时）。
Delete an image only if no Markdown files reference it.

### delete.force

强制删除图片（需显式确认 `allowHardDelete: true`）。
Force-delete an image with explicit confirmation.

### transfer.analyze

分析远程图片的转移需求。
Analyze remote images for transfer between storage providers.

### transfer.preview

预览转移操作结果（干运行）。
Preview what a transfer operation would do — dry run without modifying files.

### transfer.execute

执行远程图片转移。
Execute the remote image transfer between storage providers.

---

## 错误处理 / Error Handling

标准 JSON-RPC 2.0 错误码 / Standard JSON-RPC 2.0 error codes：

| 代码 | 消息 | 说明 |
|---|---|---|
| 4001 | PATH_OUTSIDE_ROOT | 路径超出项目根目录 |
| 4101 | ADAPTER_UNAVAILABLE | 存储适配器未配置或不可用 |
| 4102 | UNSUPPORTED_PROVIDER | 不支持的云存储提供商类型 |
| 4300 | DELETE_REFERENCED | 图片仍被引用，无法安全删除 |
| 4301 | DELETE_FAILED | 删除操作失败 |
| 4400 | INVALID_ARGS | 参数无效或缺失 |
| 5000 | INTERNAL_ERROR | 通用服务器错误 |

---

## 环境变量 / Environment Variables

凭证可通过环境变量或工具调用参数传入：

```bash
# 阿里云 OSS / Aliyun OSS
export ALIYUN_OSS_REGION=oss-cn-hangzhou
export ALIYUN_OSS_BUCKET=my-bucket
export ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret

# 腾讯云 COS / Tencent COS
export TENCENT_COS_REGION=ap-guangzhou
export TENCENT_COS_BUCKET=my-bucket-123456
export TENCENT_COS_SECRET_ID=your_secret_id
export TENCENT_COS_SECRET_KEY=your_secret_key
```

---

## AI Agent 使用场景 / Use Cases

### 自动图片上传 / Automatic image upload

```
User: "Upload all local images in docs/ to cloud storage and update Markdown references"
Agent: Calls upload.run with the configured storage credentials
```

### 图片使用分析 / Image usage analysis

```
User: "Which files reference logo.png?"
Agent: Calls find.filesReferencingImage to get the list
```

### 安全清理 / Safe cleanup

```
User: "Remove all unused images from the assets/ directory"
Agent: Calls scan.analyze to identify unused images, then delete.safe for each
```

### 跨存储转移 / Cross-storage transfer

```
User: "Transfer all images from Aliyun OSS to Tencent COS"
Agent: Calls transfer tools to move assets between providers
```

---

## 测试 / Testing

```bash
# Send a test request via stdin
echo '{"jsonrpc":"2.0","id":1,"method":"tools.call","params":{"name":"scan.analyze","arguments":{"projectRoot":".","searchDir":"./docs"}}}' | \
node packages/mcp-server/dist/bin/cmtx-mcp.js
```

---

## 参见 / See Also

- [根 README](../../README.md) — 项目概览和架构
- [@cmtx/core](../core/README.md) — Markdown 纯文本处理
- [@cmtx/asset](../asset/README.md) — 资产管道
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

## 许可证 / License

Apache-2.0
