# Presigned URL 功能架构分析

## 1. 当前实现概述

### 1.1 组件结构

```
@cmtx/markdown-it-presigned-url (markdown-it 插件)
  - 纯渲染插件，无 Node.js 依赖
  - 运行在 Webview (Markdown Preview)
  - 拦截图片渲染，调用回调函数获取 presigned URL
                          ↕ postMessage (通过 VS Code API)
@cmtx/vscode-extension (VS Code 扩展)
  - Extension Host (Workspace)
  - presigned-url/ 目录
    - UrlSigner: 调用 ali-oss SDK 生成 presigned URL
    - UrlCacheManager: 缓存管理
    - VsCodeAdapter: 与 markdown-it 插件通信的桥梁
```

### 1.2 当前架构流程

```
用户打开 Markdown 预览
    ↓
VS Code 调用 extendMarkdownIt(md)
    ↓
    - 初始化 UrlSigner (Extension Host)
        └── 配置 ali-oss/tencent SDK
    - 注册 markdown-it 插件
            ↓
    Webview (Markdown Preview)
            ↓
        markdown-it 渲染
                ↓
            遇到图片 URL
                    ↓
                检查是否匹配配置的域名
                    ↓
                调用 getSignedUrl() (同步)
                        ↓
                    有缓存？返回缓存
                    无缓存？返回 null
                        ↓
                调用 requestSignedUrl() (异步)
                        ↓
                    postMessage → Extension Host
                                    ↓
                                UrlSigner.signUrl()
                                        ↓
                                    调用 ali-oss SDK
                                        ↓
                                    生成 presigned URL
                                        ↓
                                    返回给 Webview
                        ↓
                渲染图片（使用 presigned URL）
            ↓
    onSignedUrlReady 回调
            ↓
        刷新 Markdown 预览
```

---

## 2. 关键设计决策

### 2.1 markdown-it 插件的设计

**原始设计意图**：

- ✅ **纯渲染插件**：不依赖 Node.js 模块，可以在任何 markdown-it 环境中使用
- ✅ **零 VS Code 依赖**：理论上可以在 Web、Node.js、VS Code 中使用
- ✅ **异步支持**：通过回调机制支持异步 URL 生成

**实际使用情况**：

- ✅ **在 VS Code 中使用**：通过 `extendMarkdownIt` 注册
- ✅ **与 Extension Host 通信**：通过 `getSignedUrl`/`requestSignedUrl` 回调
- ✅ **调用云存储 SDK**：SDK 调用在 Extension Host 中进行

**结论**：当前设计**基本正确**，markdown-it 插件可以直接导入使用。

---

### 2.2 是否需要在 markdown-it 插件中实现 postMessage？

**当前实现**：

```typescript
// handler.ts (markdown-it 插件)
private getSignedUrl(src: string | null): string | null {
    // 直接调用回调函数
    const cachedUrl = this.options.getSignedUrl(src);
    if (cachedUrl) {
        return cachedUrl;
    }

    // 异步请求
    if (this.options.requestSignedUrl) {
        this.options
            .requestSignedUrl(src)
            .then((signedUrl: string) => {
                scheduleRefresh(this.options.onSignedUrlReady);
            });
    }

    return null; // 返回 null，使用原始 URL
}
```

**VS Code Adapter**：

```typescript
// vscode-adapter.ts (VS Code 扩展)
export function createVsCodeAdapter(options: VsCodeAdapterOptions) {
    return {
        getSignedUrl: (src: string): string | null => {
            // 从缓存获取
            return cacheManager.get(src);
        },
        requestSignedUrl: async (src: string): Promise<string> => {
            // 调用 UrlSigner 生成 presigned URL
            return urlSigner.signUrl(src);
        },
        onSignedUrlReady: () => {
            // 刷新 Markdown 预览
            vscode.commands.executeCommand("markdown.preview.refresh");
        },
    };
}
```

**关键点**：

- markdown-it 插件**不直接**使用 postMessage
- 而是通过**回调函数**与 Extension Host 通信
- VS Code Adapter 负责实现回调函数，内部使用 VS Code API

**结论**：当前设计**正确**，不需要在 markdown-it 插件中实现 postMessage。

---

### 2.3 markdown-it 插件是否可以直接导入？

**答案**：**可以**，当前实现已经是正确的。

**原因**：

1. **纯渲染逻辑**：markdown-it 插件只负责拦截渲染，不依赖 Node.js 模块
2. **回调机制**：通过 `getSignedUrl`/`requestSignedUrl` 回调与外部通信
3. **零依赖**：没有直接引用 `ali-oss` 或其他 Node.js 模块
4. **VS Code Adapter**：在 VS Code 扩展中实现回调，处理 SDK 调用

**代码验证**：

```typescript
// plugin.ts - markdown-it 插件入口
export function presignedUrlPlugin(md: MarkdownIt, options: PresignedUrlPluginOptions): void {
    // 纯 markdown-it 插件，无外部依赖
    const handler = new PresignedUrlHandler(md, options);
    // 注册渲染规则...
}

// handler.ts - 处理逻辑
private getSignedUrl(src: string | null): string | null {
    // 调用回调函数，不直接实现
    const cachedUrl = this.options.getSignedUrl(src);
    // ...
}
```

---

## 3. 架构问题与改进建议

### 3.1 当前存在的问题

| 问题             | 说明                                                          | 影响                         |
| ---------------- | ------------------------------------------------------------- | ---------------------------- |
| **日志输出混杂** | markdown-it 插件的日志通过 Logger 适配器输出到 Extension Host | Debug Console 会显示所有日志 |
| **缓存一致性**   | markdown-it 插件和 Extension Host 都有缓存逻辑                | 可能导致缓存不一致           |
| **错误处理**     | 异步错误处理依赖回调                                          | 错误传播链较长               |

### 3.2 改进建议

#### 建议 1：明确日志输出策略

**问题**：markdown-it 插件的日志会输出到 Debug Console，与其他扩展日志混杂。

**建议**：

- 在 `DEV-001-vscode_extension_debugging.md` 中已说明，使用 OutputChannel 隔离
- markdown-it 插件的 Logger 适配器应该使用 OutputChannel

```typescript
// vscode-adapter.ts
export function createLoggerAdapter(): Logger {
    const channel = vscode.window.createOutputChannel("CMTX Presigned URL");
    return {
        debug: (message, ...args) => channel.appendLine(`[DEBUG] ${message}`),
        info: (message, ...args) => channel.appendLine(`[INFO] ${message}`),
        warn: (message, ...args) => channel.appendLine(`[WARN] ${message}`),
        error: (message, ...args) => channel.appendLine(`[ERROR] ${message}`),
    };
}
```

#### 建议 2：简化缓存逻辑

**问题**：markdown-it 插件和 Extension Host 都有缓存，可能导致不一致。

**建议**：

- 统一缓存管理在 Extension Host 的 `UrlCacheManager`
- markdown-it 插件只负责调用回调，不管理缓存状态

#### 建议 3：添加错误边界

**问题**：异步错误处理依赖回调，错误传播链较长。

**建议**：

- 在 `requestSignedUrl` 中添加更明确的错误处理
- 记录失败次数，避免无限重试

---

## 4. 与官方文档的对比

### 4.1 官方 Markdown Extension API

根据 [Markdown Extension - VS Code API](https://code.visualstudio.com/api/extension-guides/markdown-extension)：

```typescript
export function activate(context: vscode.ExtensionContext) {
    return {
        extendMarkdownIt(md: MarkdownIt) {
            return md.use(myPlugin);
        },
    };
}
```

**当前实现**：

```typescript
// markdown-preview.ts
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
    return md.use(presignedUrlPlugin, {
        domains: config.providerConfigs.map((p) => p.domain),
        getSignedUrl: adapter.getSignedUrl,
        requestSignedUrl: adapter.requestSignedUrl,
        onSignedUrlReady: adapter.onSignedUrlReady,
    });
}
```

**结论**：✅ 符合官方 API 设计

### 4.2 官方 Webview 通信机制

根据 [Webview - VS Code API](https://code.visualstudio.com/api/extension-guides/webview)：

> "Webviews communicate with extensions via message passing."

**当前实现**：

- 通过回调函数 `getSignedUrl`/`requestSignedUrl` 实现通信
- 本质上是**同步/异步函数调用**，不是直接的 postMessage

**问题**：VS Code 的 `extendMarkdownIt` API **已经封装**了 Webview 通信，不需要手动实现 postMessage。

**结论**：✅ 当前实现正确，利用了 VS Code 的封装

---

## 5. 与成熟扩展的对比

### 5.1 Markdown Preview Mermaid Support

**仓库**：[bierner/markdown-preview-mermaid](https://github.com/bierner/markdown-preview-mermaid)

**架构**：

```
Extension Host
    ↓
    └── 提供 Mermaid 渲染脚本
            ↓
        Webview 加载脚本并渲染
```

**对比**：

- 相似点：都是 markdown-it 插件 + Extension Host 协作
- 不同点：Mermaid 是纯渲染，不需要外部 API

### 5.2 Markdown Preview Enhanced

**仓库**：[shd101wyy/vscode-markdown-preview-enhanced](https://github.com/shd101wyy/vscode-markdown-preview-enhanced)

**架构**：

```
Extension Host
    ↓
    ├── 提供自定义渲染逻辑
    ├── 处理文件操作
    └── 调用外部 API
            ↓
        Webview 渲染
```

**对比**：

- 相似点：都是 markdown-it 插件 + Extension Host 协作，都调用外部 API
- 不同点：MPE 功能更复杂，支持更多格式

**结论**：当前实现与成熟扩展的架构**一致**。

---

## 6. 总结

### 6.1 当前架构评估

| 方面                       | 评估      | 说明                            |
| -------------------------- | --------- | ------------------------------- |
| **markdown-it 插件设计**   | ✅ 正确   | 纯渲染，无 Node.js 依赖         |
| **与 Extension Host 通信** | ✅ 正确   | 通过回调函数，利用 VS Code 封装 |
| **云存储 SDK 调用**        | ✅ 正确   | 在 Extension Host 中进行        |
| **缓存管理**               | ⚠️ 可优化 | 缓存逻辑分散在两处              |
| **日志输出**               | ⚠️ 可优化 | 应使用 OutputChannel 隔离       |

### 6.2 是否需要重构？

**答案**：**不需要大重构**，当前架构基本正确。

**建议的小改进**：

1. 日志输出使用 OutputChannel 隔离
2. 简化缓存逻辑，统一管理在 Extension Host
3. 添加更明确的错误处理

### 6.3 markdown-it 插件的未来

**当前状态**：

- ✅ 可以直接导入使用
- ✅ 与 VS Code 扩展配合良好
- ✅ 符合官方 API 设计

**未来考虑**：

- 如果需要在其他环境（如 Web 应用）中使用，当前设计已经支持
- 如果需要支持更多云存储提供商，只需在 Extension Host 中添加 SDK

---

## 7. 参考文档

- [DEV-001-vscode_extension_debugging.md](./DEV-001-vscode_extension_debugging.md) - 调试指南与日志最佳实践
- [DEV-002-vscode_extension_architecture.md](./DEV-002-vscode_extension_architecture.md) - 扩展架构层次详解
- [VS Code Markdown Extension API](https://code.visualstudio.com/api/extension-guides/markdown-extension)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

---

_创建日期：2026-04-08_
_基于实际代码分析和官方文档对比_
