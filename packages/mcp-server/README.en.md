# @cmtx/mcp-server

[![npm version](https://img.shields.io/npm/v/@cmtx/mcp-server.svg)](https://www.npmjs.com/package/@cmtx/mcp-server)
[![License](https://img.shields.io/npm/l/@cmtx/mcp-server.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Model Context Protocol (MCP) server for Markdown asset management. Lets AI agents scan, upload, transfer, and delete images in Markdown documents — without handling cloud credentials directly.

---

## Why a Markdown MCP Server?

AI agents that write or edit Markdown face the same pain points as humans:

- **Upload barrier**: Images must be uploaded to cloud storage, which requires credentials the agent shouldn't have
- **Reference management**: After upload, image references in Markdown must be updated
- **Cleanup**: Unused images should be detected and removed safely
- **Presigned URLs**: Private bucket images need temporary access URLs

CMTX MCP server acts as a **capability delegation layer**: the agent describes what it wants, and CMTX handles the permission-heavy operations.

---

## Quick Start

### Installation

```bash
pnpm install @cmtx/mcp-server
```

### Claude Desktop Configuration

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

## Tools

### scan.analyze

Scan a directory for local images and analyze their references across Markdown files.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| projectRoot | string | yes | Project root directory for path safety |
| searchDir | string | yes | Directory to scan |

**Returns:** Image list with reference counts, skipped files, and totals.

### upload.preview

Preview what an upload operation would do — dry run without modifying files.

### upload.run

Execute upload and reference replacement.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| projectRoot | string | yes | Project root directory |
| searchDir | string | yes | Directory to scan |
| region | string | no | OSS region |
| bucket | string | no | OSS bucket name |
| uploadPrefix | string | no | Upload path prefix |
| namingTemplate | string | no | Naming template (e.g. `{date}_{md5_8}{ext}`) |

### find.filesReferencingImage

List all Markdown files that reference a specific image.

### find.referenceDetails

Get detailed reference locations (line, column, text) for an image.

### delete.safe

Delete an image only if no Markdown files reference it.

### delete.force

Force-delete an image with explicit confirmation (`allowHardDelete: true` required).

### transfer.analyze

Analyze remote images for transfer between storage providers.

### transfer.preview

Preview what a transfer operation would do — dry run without modifying files.

### transfer.execute

Execute the remote image transfer between storage providers.

---

## Error Handling

Standard JSON-RPC 2.0 error codes:

| Code | Message | Description |
|---|---|---|
| 4001 | PATH_OUTSIDE_ROOT | Path is outside the allowed project root |
| 4101 | ADAPTER_UNAVAILABLE | Storage adapter is not configured or unavailable |
| 4102 | UNSUPPORTED_PROVIDER | Unsupported cloud storage provider |
| 4300 | DELETE_REFERENCED | Image is still referenced and cannot be safely deleted |
| 4301 | DELETE_FAILED | Deletion operation failed |
| 4400 | INVALID_ARGS | Missing or invalid parameters |
| 5000 | INTERNAL_ERROR | Generic server error |

---

## Environment Variables

```bash
# Aliyun OSS
export ALIYUN_OSS_REGION=oss-cn-hangzhou
export ALIYUN_OSS_BUCKET=my-bucket
export ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret

# Tencent COS
export TENCENT_COS_REGION=ap-guangzhou
export TENCENT_COS_BUCKET=my-bucket-123456
export TENCENT_COS_SECRET_ID=your_secret_id
export TENCENT_COS_SECRET_KEY=your_secret_key
```

---

## Use Cases

### Automatic image upload

```
User: "Upload all local images in docs/ to cloud storage and update Markdown references"
Agent: Calls upload.run with the configured storage credentials
```

### Image usage analysis

```
User: "Which files reference logo.png?"
Agent: Calls find.filesReferencingImage to get the list
```

### Safe cleanup

```
User: "Remove all unused images from the assets/ directory"
Agent: Calls scan.analyze to identify unused images, then delete.safe for each
```

### Cross-storage transfer

```
User: "Transfer all images from Aliyun OSS to Tencent COS"
Agent: Calls transfer tools to move assets between providers
```

---

## Testing

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools.call","params":{"name":"scan.analyze","arguments":{"projectRoot":".","searchDir":"./docs"}}}' | \
node packages/mcp-server/dist/bin/cmtx-mcp.js
```

---

## See Also

- [Root README](../../README.md) — Project overview and architecture
- [@cmtx/core](../core/README.md) — Markdown text processing
- [@cmtx/asset](../asset/README.md) — Asset management pipeline
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

## License

Apache-2.0
