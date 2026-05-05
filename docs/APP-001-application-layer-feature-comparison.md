---
title: APP-001 - 应用层功能对比（CLI / VS Code / MCP Server）
status: 动态文档
last_updated: 2026-05-02T20:53:00+08:00
---

# APP-001: 应用层功能对比（CLI / VS Code / MCP Server）

> **动态文档**：本文档随各应用层功能的迭代持续更新。
> 新增/修改应用层功能时，应同步检查并更新本文档。

## 1. 功能矩阵总览

### 1.1. 图片管理

| 功能 | CLI | VS Code | MCP Server | 共享库包 |
|------|:---:|:-------:|:----------:|----------|
| 上传图片 | `upload` | `Upload selected` | `upload.preview` / `upload.run` | `@cmtx/asset` |
| 下载远程图片 | `download` | `Download remote images` | 无 | `@cmtx/asset/download` |
| 删除图片 | 无（上传时可选） | `Delete image` | `delete.safe` / `delete.force` | `@cmtx/asset` |
| 复制远程图片 | `copy` | 无 | 无 | `@cmtx/asset/transfer` |
| 移动远程图片 | `move` | 无 | 无 | `@cmtx/asset/transfer` |
| 分析远程图片 | 无 | 无 | `transfer.analyze` / `transfer.preview` | `@cmtx/asset/transfer` |
| 扫描本地图片 | `analyze` | 分析并报告 | `scan.analyze` | `@cmtx/asset/file` |
| 调整图片尺寸 | 无 | `Set/Zoom In/Zoom Out` / `rule.resize-image` | 无 | `@cmtx/rule-engine` |
| 生成预签名 URL | `presign` | 预览自动生成 + Toggle + Cache | 无 | `@cmtx/storage` |
| 查找图片引用 | 无 | `Find references` | `find.filesReferencingImage` / `find.referenceDetails` | `@cmtx/core` |

### 1.2. 文档发布与格式处理

| 功能 | CLI | VS Code | MCP Server | 共享库包 |
|------|:---:|:-------:|:----------:|----------|
| 文档处理（发布/平台适配/等） | `publish` | `Apply preset` | 无 | `@cmtx/rule-engine` |
| Markdown <-> HTML | `format` | `Convert to HTML` | 无 | `@cmtx/rule-engine` |

### 1.3. 配置管理

| 功能 | CLI | VS Code | MCP Server | 共享库包 |
|------|:---:|:-------:|:----------:|----------|
| 配置管理 | `config` (show) | 向导/刷新/重载 | 环境变量 / 工具参数 | `@cmtx/asset/config` |
| 生成初始配置 | `config init` | `Create configuration...` | 无（环境变量/工具参数） | `@cmtx/asset/config` |

### 1.4. Frontmatter 与文档元数据

| 功能 | CLI | VS Code | MCP Server | 共享库包 |
|------|:---:|:-------:|:----------:|----------|
| 章节编号管理 | 无 | `Add/Remove section numbers` / Rule | 无 | `@cmtx/rule-engine` |
| 元数据管理 | 无 | 多项命令 / Rule | 无 | `@cmtx/rule-engine` |
| 标题级别提升 | 无 | Rule `promote-headings` | 无 | `@cmtx/rule-engine` |

## 2. CLI 命令列表

| 命令 | 描述 | 库包依赖 | 独立实现 |
|------|------|----------|----------|
| `image analyze <searchDir>` | 扫描并分析 Markdown 文件中的图片 | `@cmtx/asset/file` | formatter |
| `image upload <filePath>` | 上传图片到对象存储并替换引用 | `@cmtx/storage`, `@cmtx/rule-engine` | formatter, logger |
| `image download <file>` | 下载 Markdown 中的远程图片 | `@cmtx/asset/download` | formatter |
| `image copy <file>` | 复制远程图片到目标存储 | `@cmtx/asset/transfer`, `@cmtx/storage` | formatter, logger |
| `image move <file>` | 移动远程图片（默认删除源文件） | `@cmtx/asset/transfer` (复用 copy) | formatter |
| `image presign [input]` | 生成预签名 URL | `@cmtx/core`, `@cmtx/storage` | formatter, logger |
| `config <action>` | 配置管理 (init/show) | `@cmtx/asset/config` | formatter |
| `publish <input>` | 文档处理（发布/平台适配等） | `@cmtx/rule-engine` | formatter, logger |
| `format <file>` | Markdown <-> HTML 格式转换 | `@cmtx/rule-engine` | formatter |

## 3. VS Code 命令列表

### 3.1. 常规命令

| 命令 ID | 标题 | 描述 |
|---------|------|------|
| `cmtx.image.upload` | Upload selected images | 上传选中文字中的图片 |
| `cmtx.image.download` | Download remote images | 下载远程图片 |
| `cmtx.image.formatToHtml` | Convert images to HTML format | Markdown 转 HTML |
| `cmtx.image.setWidth` | Set image width... | 设置图片宽度 |
| `cmtx.image.zoomIn` | Increase image size (zoom in) | 图片放大 (Ctrl+Up) |
| `cmtx.image.zoomOut` | Decrease image size (zoom out) | 图片缩小 (Ctrl+Down) |
| `cmtx.applyPreset` | Apply preset... | 应用平台适配预设 |
| `cmtx.configInit` | Create configuration... | 创建配置向导 |
| `cmtx.clearPresignedCache` | Clear presigned URL cache | 清除预签名 URL 缓存 |
| `cmtx.togglePresignedUrls` | Toggle presigned URLs | 开关预签名 URL |
| `cmtx.image.delete` | Delete image... | 删除图片 |
| `cmtx.refreshConfig` | Refresh configuration | 刷新配置 |
| `cmtx.reloadWindow` | Reload window to apply config changes | 重载窗口 |
| `cmtx.addSectionNumbers` | Add/Update section numbers | 添加/更新章节编号 |
| `cmtx.removeSectionNumbers` | Remove section numbers | 移除章节编号 |

### 3.2. Rule 模式命令

| 命令 ID | 标题 | 描述 |
|---------|------|------|
| `cmtx.rule.upload-images` | Upload images | Rule 模式上传图片 |
| `cmtx.rule.frontmatter-id` | Generate frontmatter ID | Rule 模式生成 ID |
| `cmtx.rule.frontmatter-title` | Convert title to frontmatter | Rule 模式标题转 frontmatter |
| `cmtx.rule.strip-frontmatter` | Strip frontmatter | Rule 模式移除 frontmatter |
| `cmtx.rule.promote-headings` | Promote headings | Rule 模式标题提升 |
| `cmtx.rule.add-section-numbers` | Add section numbers | Rule 模式添加章节编号 |
| `cmtx.rule.remove-section-numbers` | Remove section numbers | Rule 模式移除章节编号 |
| `cmtx.rule.convert-images` | Convert images to HTML | Rule 模式图片转 HTML |
| `cmtx.rule.frontmatter-date` | Add frontmatter date | Rule 模式添加日期 |
| `cmtx.rule.frontmatter-updated` | Add frontmatter updated date | Rule 模式添加更新日期 |
| `cmtx.rule.download-images` | Download images | Rule 模式下载图片 |
| `cmtx.rule.delete-image` | Delete image | Rule 模式删除图片 |
| `cmtx.rule.resize-image` | Resize image | Rule 模式调整尺寸 |
| `cmtx.rule.execute-rule` | Execute rule | 执行单个 Rule |
| `cmtx.rule.execute-preset` | Execute preset | 执行预设组合 |

## 4. MCP Server 工具列表

### 4.1. 扫描与分析

| 工具 | 描述 | 必需参数 | 可选参数 |
|------|------|----------|----------|
| `scan.analyze` | 扫描本地图片及引用 | `searchDir` | `projectRoot` |
| `transfer.analyze` | 分析远程图片 | `filePath` | `sourceDomain` |
| `transfer.preview` | 预览转移变更 | `filePath` | `sourceDomain`, `targetDomain`, `prefix` |

### 4.2. 上传工作流

| 工具 | 描述 | 必需参数 | 可选参数 |
|------|------|----------|----------|
| `upload.preview` | 预览上传变更（dry-run） | `searchDir` | `projectRoot`, `region`, `bucket`, `uploadPrefix`, `namingTemplate`, 云凭证 |
| `upload.run` | 执行上传并替换引用 | `searchDir` | `projectRoot`, `provider`, `region`, `bucket`, `uploadPrefix`, `namingTemplate`, 云凭证 |

### 4.3. 转移工作流

| 工具 | 描述 | 必需参数 | 可选参数 |
|------|------|----------|----------|
| `transfer.execute` | 执行远程图片转移 | `filePath` | `provider`, `sourceRegion`/`targetRegion`, `sourceBucket`/`targetBucket`, 源/目标凭证, `sourceDomain`, `targetDomain`, `prefix`, `overwrite`, `concurrency` |

### 4.4. 引用查找

| 工具 | 描述 | 必需参数 | 可选参数 |
|------|------|----------|----------|
| `find.filesReferencingImage` | 列出引用某图片的文件 | `imagePath`, `searchDir` | 无 |
| `find.referenceDetails` | 获取引用详情（行/列位置） | `imagePath`, `searchDir` | 无 |

### 4.5. 删除

| 工具 | 描述 | 必需参数 | 可选参数 |
|------|------|----------|----------|
| `delete.safe` | 安全删除（检查引用后删除） | `imagePath`, `searchDir` | 无 |
| `delete.force` | 强制删除（需确认标志） | `imagePath`, `searchDir`, `allowHardDelete=true` | 无 |

## 5. 云存储支持对比

| 云存储 | CLI | VS Code | MCP Server |
|--------|:---:|:-------:|:----------:|
| 阿里云 OSS | `upload`/`copy`/`move`/`presign` | `upload`/`download`/`delete` | `upload.run`/`transfer.execute` |
| 腾讯云 COS | `upload`/`copy`/`move`/`presign` | `upload`/`download`/`delete` | `upload.run`/`transfer.execute` |

## 6. 交互方式对比

| 维度 | CLI | VS Code | MCP Server |
|------|-----|---------|------------|
| 操作方式 | 命令行批量操作 | 命令面板/快捷键/右键/状态栏/Code Action | AI Agent 调用工具 |
| 适用场景 | CI/CD、脚本自动化、批量处理 | 实时编辑、交互式操作、即时预览 | AI Agent 驱动的工作流 |
| 规则模式 | 无 | 14 个 Rule 命令 + Preset 执行 | 无 |
| Markdown 预览 | 无 | 集成预览 + 预签名 URL + Toggle 开关 | 无 |
| 凭证传递 | 配置文件/环境变量 | 配置文件 + Settings | 工具参数/环境变量 |

## 7. 已实现的对齐

| 功能 | 对齐内容 | 关联 PLAN | 完成时间 |
|------|----------|-----------|----------|
| 预签名 URL | VS Code 新增 Toggle 开关和 Cache 清理命令 | PLAN-002 | 2026-05-01 |
| URL 存在性检测 | `@cmtx/asset` 新增 URL 存在性检测 API | PLAN-003 | 2026-05-01 |
| 文本 URL 检测 | 从文本提取 URL 并检测存在性 | PLAN-004 | 2026-05-02 |
| CHANGELOG 工作流 | 双轨 CHANGELOG 流程落地 | PLAN-005 | 2026-05-02 |
| 凭证工厂 | CLI upload/presign/copy 统一使用 `@cmtx/storage.createCredentials` | PLAN-009 | 2026-05-01 |
| Rule 引擎上下文 | CLI/VS Code 统一使用 `@cmtx/rule-engine` 上下文工厂 | PLAN-010 | 2026-05-02 |
| CLI 精简 | ConfigLoader 直接使用 `@cmtx/asset/config` | PLAN-011 | 2026-05-02 |
| presign URL 解析 | CLI presign 使用 `new URL()` 简化解析逻辑 | PLAN-012 | 2026-05-02 |
| 用户文档拆分 | 应用层用户文档拆分重组 | PLAN-013 | 2026-05-02 |

## 8. 待对齐功能

### 8.1. CLI 应补充的功能（从 VS Code 迁移）

| 优先级 | 功能 | 建议 |
|--------|------|------|
| P2 | 独立删除图片 | 添加 `delete` 命令，支持按路径或引用删除 |
| P2 | 图片尺寸调整 | 添加 `resize` 命令，支持 width/height 参数 |
| P3 | 章节编号 | 添加 `section-numbers` 命令（add/remove） |
| P3 | Frontmatter 管理 | 添加 `frontmatter` 子命令（generate-id/convert-title/add-date） |
| P3 | 查找引用 | 添加 `find-refs` 命令，查找图片的所有引用位置 |

### 8.2. VS Code 应补充的功能（从 CLI 迁移）

| 优先级 | 功能 | 建议 |
|--------|------|------|
| P1 | 复制/迁移远程图片 | 添加 `Copy remote images` / `Move remote images` 命令 |
| P2 | 双向格式转换 | 支持 HTML -> Markdown 反向转换 |
| P2 | 批量平台适配 | 支持目录批量处理（类似 CLI 的 `--out-dir`） |
| P3 | 下载高级选项 | 支持域名过滤、并发控制、命名模板 |

### 8.3. MCP Server 独有功能

| 功能 | 说明 | 建议对齐 |
|------|------|----------|
| `transfer.analyze` / `transfer.preview` | 远程图片转移分析与预览 | CLI 可补充 transfer 分析能力 |
| `find.referenceDetails` | 获取引用的精确行/列位置 | CLI/VS Code 可补充精确引用定位 |
| `delete.safe` / `delete.force` | 安全/强制删除策略 | CLI 可补充安全删除命令 |

## 9. 维护说明

### 9.1. 更新触发条件

以下变更应同步更新本文档：

- 新增/删除/重命名 CLI 命令
- 新增/删除/修改 VS Code 命令或 Rule 命令
- 新增/删除/修改 MCP Server 工具
- 功能在应用层之间的迁移（如 CLI -> VS Code）
- 库包能力变更影响应用层功能

### 9.2. PLAN 审查检查

在审查 PLAN 时，应检查：

- 涉及应用层功能变更的 PLAN 是否同步更新本文档
- 新增功能是否已添加到对应的命令/工具列表
- 已对齐功能是否已更新到"已实现的对齐"章节
- 待对齐功能列表是否需要增删调整

### 9.3. 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.3 | 2026-05-02 | 功能矩阵按领域拆分为 4 个子表（图片管理/文档发布/配置管理/Frontmatter），新增"生成初始配置"行，更新 CLI config 命令描述，章节重编号 |
| v1.2 | 2026-05-02 | 移除操作模式说明和实现细节，文档聚焦功能对比 |
| v1.1 | 2026-05-02 | 初始版本：三端完整功能矩阵、云存储支持、交互方式对比、已实现对齐记录、待对齐功能列表 |
