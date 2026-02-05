# MCP Server Agent 使用指南

## 🤖 为 AI Agent 设计的 Markdown 图片管理工具

这个 MCP Server 专为 AI Agent（如 Claude、ChatGPT 等）设计，提供完整的 Markdown 图片管理能力。

## 🚀 快速集成

### Claude Desktop 配置
```json
{
  "tools": {
    "cmtx": {
      "command": "node",
      "args": ["packages/mcp-server/dist/bin/cmtx-mcp.js"],
      "env": {
        "OSS_REGION": "oss-cn-hangzhou",
        "OSS_BUCKET": "your-bucket",
        "OSS_ACCESS_KEY_ID": "your-access-key",
        "OSS_ACCESS_KEY_SECRET": "your-secret"
      }
    }
  }
}
```

## 🛠️ 可用工具

| 工具名称 | 功能描述 | Agent 使用示例 |
|---------|----------|---------------|
| `scan.analyze` | 分析本地图片引用 | "扫描 docs 目录中的所有图片" |
| `upload.preview` | 预览上传变化 | "预览上传操作的影响" |
| `upload.run` | 执行图片上传 | "上传所有本地图片到 OSS" |
| `find.filesReferencingImage` | 查找图片引用 | "哪些文件引用了 logo.png？" |
| `find.referenceDetails` | 详细引用位置 | "显示 logo.png 的具体引用位置" |
| `delete.safe` | 安全删除图片 | "删除不再被引用的图片" |
| `delete.force` | 强制删除图片 | "强制删除指定图片" |

## 💬 典型对话示例

### 示例1：批量图片迁移
```
用户：请帮我把项目文档中的所有本地图片上传到阿里云 OSS
Agent：好的，我会扫描您的文档目录，将本地图片上传到 OSS 并更新引用。

[Agent 调用 scan.analyze → upload.run]

已完成：
- 扫描到 23 个本地图片
- 成功上传 23 个图片到 OSS
- 更新了 15 个 Markdown 文件的图片引用
```

### 示例2：图片引用查询
```
用户：我想知道哪些文档引用了 diagrams/flow.png 这个图片
Agent：正在为您查找引用该图片的所有文档...

[Agent 调用 find.filesReferencingImage]

找到以下文档引用了该图片：
- docs/architecture.md
- docs/workflow.md
- README.md
```

### 示例3：安全清理
```
用户：请清理项目中不再使用的图片文件
Agent：我会先分析图片引用情况，然后安全删除未被引用的图片。

[Agent 调用 scan.analyze → delete.safe]

分析完成：
- 发现 8 个未被引用的图片文件
- 已安全删除 8 个图片文件
- 所有操作都有备份保护
```

## ⚠️ 重要提醒

### 安全注意事项
- **凭证安全**：OSS 凭证通过环境变量传递，避免明文暴露
- **删除保护**：默认使用安全删除模式，可恢复
- **预览机制**：重要操作前建议先预览结果

### 使用建议
- 对于大批量操作，建议先使用 `upload.preview` 预览
- 删除操作前最好先备份重要文件
- 可以随时询问操作进度和详细信息

## 📊 状态说明

✅ **已完成**：所有核心功能都已实现并通过测试
🚧 **持续优化**：根据实际使用反馈不断改进

---
*这个工具让您的 AI Agent 获得专业的 Markdown 图片管理能力*