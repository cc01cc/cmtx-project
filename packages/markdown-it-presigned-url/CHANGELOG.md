# @cmtx/markdown-it-presigned-url Changelog

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test

## 0.1.0 - 2026-04-11

### Initial Release

#### 核心功能

- **预签名 URL 插件** (`presignedUrlPlugin`)

  - 为私有云存储（OSS、S3、COS）的图片 URL 生成预签名
  - 支持 Markdown 图片格式：`![alt](url)`
  - 支持 HTML 图片格式：`<img src="url" />`
  - 异步 URL 签名与刷新回调机制

- **双模式处理**

  - 同步模式：从缓存获取签名 URL
  - 异步模式：按需生成签名 URL 并触发刷新

- **灵活的配置选项**
  - 域名白名单过滤
  - 图片格式选择（markdown/html/all）
  - 可选的日志接口

#### API 接口

- `presignedUrlPlugin(md, options)` - Markdown-it 插件函数
- `Logger` - 日志接口（debug/info/warn/error）

#### 配置选项

| 选项               | 类型                               | 必需 | 描述                      |
| ------------------ | ---------------------------------- | ---- | ------------------------- |
| `domains`          | `string[]`                         | 是   | 需要签名 URL 的主机名列表 |
| `imageFormat`      | `'markdown' \| 'html' \| 'all'`    | 是   | 要处理的图片格式          |
| `logger`           | `Logger`                           | 否   | 可选的日志接口            |
| `getSignedUrl`     | `(src: string) => string \| null`  | 是   | 同步获取缓存的签名 URL    |
| `requestSignedUrl` | `(src: string) => Promise<string>` | 否   | 异步生成签名 URL          |
| `onSignedUrlReady` | `() => void`                       | 否   | 异步签名完成时的回调      |

#### 技术特性

- **零 VS Code 依赖** - 适用于任何 markdown-it 应用
- **异步签名机制** - 不阻塞渲染过程
- **缓存友好** - 支持宿主应用自定义缓存策略
- **TypeScript** - 完整的类型支持

#### 测试覆盖

- 16 个单元测试
- 测试覆盖：
  - 插件初始化
  - URL 匹配逻辑
  - 缓存机制
  - 异步签名流程
  - 日志功能

#### 依赖

- **Peer Dependencies**:

  - `markdown-it`: `^14.0.0`

- **Dev Dependencies**:
  - `@types/markdown-it`: `^14.1.2`
  - `@vitest/coverage-v8`: `catalog:`
  - `typedoc`: `catalog:`
  - `typescript`: `catalog:`
  - `vitest`: `catalog:`

#### 文档

- 中文 README：`README.md`
- 英文 README：`README.en.md`
- API 文档：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）
