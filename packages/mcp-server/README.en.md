# @cmtx/mcp-server

[![npm version](https://img.shields.io/npm/v/@cmtx/mcp-server.svg)](https://www.npmjs.com/package/@cmtx/mcp-server)
[![License](https://img.shields.io/npm/l/@cmtx/mcp-server.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Model Context Protocol (MCP) server for Markdown asset management. Lets AI agents scan, upload, transfer, and delete images without handling cloud credentials directly.

## Installation

```bash
pnpm install @cmtx/mcp-server
```

## Quick Start

Claude Desktop configuration:

See [CFG-001 Configuration Reference](../../docs/CFG-001-configuration-reference.md#环境变量) for the full list of environment variable names.

```json
{
    "mcpServers": {
        "cmtx": {
            "command": "node",
            "args": ["path/to/mcp-server/dist/bin/cmtx-mcp.js"],
            "env": {
                "CMTX_ALIYUN_REGION": "oss-cn-hangzhou",
                "CMTX_ALIYUN_BUCKET": "my-bucket",
                "CMTX_ALIYUN_ACCESS_KEY_ID": "your-key-id",
                "CMTX_ALIYUN_ACCESS_KEY_SECRET": "your-secret"
            }
        }
    }
}
```

## Documentation

- [Installation & Setup](./docs/USR-001-installation-setup.md)
- [Tools Reference](./docs/USR-002-tools-reference.md)
- [Configuration Guide](./docs/USR-003-configuration.md)
- [Agent Integration](./docs/USR-004-agent-integration.md)
- [Error Handling](./docs/USR-005-error-handling.md)
- [Index](./docs/INDEX.md)

## License

Apache-2.0
