# Markdown-it 插件开发指南

## 1. 概述

VS Code 的 Markdown 预览功能基于 [markdown-it](https://github.com/markdown-it/markdown-it) 库，扩展可以通过提供 markdown-it 插件来修改渲染输出。

## 2. 核心概念

### 2.1 Markdown Preview 的本质

**重要**：Markdown Preview 是 **Webview**，不是原生 UI。

| 特性 | 原生 UI | Webview | Markdown Preview |
|------|---------|---------|------------------|
| **渲染技术** | VS Code 原生组件 | 自定义 HTML/CSS/JS | 自定义 HTML/CSS/JS |
| **运行进程** | VS Code 主进程 | 独立渲染进程 | 独立渲染进程 |
| **通信方式** | 直接 API 调用 | postMessage | postMessage |
| **markdown-it** | ❌ 不支持 | ✅ 支持 | ✅ 使用 markdown-it |
| **自定义渲染规则** | ❌ 不支持 | ✅ 支持 | ✅ 支持 |

### 2.2 架构位置

```
VS Code 主进程
    Webview 渲染进程
        Markdown Preview
            - 加载 markdown-it
            - 执行 markdown-it 插件
            - 渲染 Markdown 为 HTML
            
Extension Host (Node.js)
    - 注册 markdown-it 插件
    - 提供插件配置和回调函数
    - 调用外部 API 或 SDK
```

## 3. 基本用法

### 3.1 注册 markdown-it 插件

```typescript
// extension.ts
import * as vscode from 'vscode';
import type MarkdownIt from 'markdown-it';

export function activate(context: vscode.ExtensionContext) {
    return {
        extendMarkdownIt(md: MarkdownIt) {
            // 注册你的插件
            return md.use(myPlugin, options);
        }
    };
}
```

### 3.2 简单的 markdown-it 插件

```typescript
// my-plugin.ts
import type MarkdownIt from 'markdown-it';

export function myPlugin(md: MarkdownIt, options: any) {
    // 保存原始渲染规则
    const originalImageRule = md.renderer.rules.image;
    
    // 覆盖 image 渲染规则
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const src = token.attrGet('src');
        
        // 修改图片 URL
        if (src && shouldModify(src)) {
            token.attrSet('src', modifyUrl(src));
        }
        
        // 调用原始渲染规则
        return originalImageRule(tokens, idx, options, env, self);
    };
}
```

## 4. 支持多个插件

### 4.1 链式注册

```typescript
// extension.ts
export function activate(context: vscode.ExtensionContext) {
    return {
        extendMarkdownIt(md: MarkdownIt) {
            // 注册多个插件（链式调用）
            return md
                .use(plugin1, options1)
                .use(plugin2, options2)
                .use(plugin3, options3);
        }
    };
}
```

### 4.2 插件执行顺序

插件按注册顺序执行，后注册的插件可以覆盖先注册插件的规则。

**重要**：需要注意插件之间的冲突。

### 4.3 避免插件冲突

```typescript
// 好的做法：保存原始规则
export function safePlugin(md: MarkdownIt) {
    const originalRule = md.renderer.rules.image;
    
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
        // 你的自定义逻辑
        modifyToken(tokens[idx]);
        
        // 调用原始规则（而不是直接渲染）
        return originalRule(tokens, idx, options, env, self);
    };
}
```

## 5. 与 Extension Host 通信

### 5.1 为什么需要通信？

markdown-it 插件运行在 Webview（浏览器环境），而某些功能需要：
- 访问文件系统
- 调用 Node.js SDK
- 访问网络资源（受 CSP 限制）

### 5.2 通信机制

VS Code 的 extendMarkdownIt API 已经封装了通信，通过回调函数实现：

```typescript
// extension.ts (Extension Host)
export function activate(context: vscode.ExtensionContext) {
    return {
        extendMarkdownIt(md: MarkdownIt) {
            return md.use(myPlugin, {
                // 通过回调函数与 Extension Host 通信
                getData: (key: string) => {
                    // 在 Extension Host 中执行
                    return getDataFromFileSystem(key);
                },
                requestData: async (key: string) => {
                    // 异步调用 Extension Host
                    return await fetchFromAPI(key);
                },
            });
        }
    };
}
```

### 5.3 完整示例

```typescript
// 插件定义（纯渲染，零依赖）
export interface PluginOptions {
    getData: (key: string) => string;
    requestData: (key: string) => Promise<string>;
}

export function myPlugin(md: MarkdownIt, options: PluginOptions) {
    md.renderer.rules.image = (tokens, idx, opts, env, self) => {
        const token = tokens[idx];
        const src = token.attrGet('src');
        
        // 调用回调函数（实际在 Extension Host 执行）
        const data = options.getData(src);
        
        // 异步请求
        options.requestData(src).then((result) => {
            // 处理结果
            refreshPreview();
        });
        
        return self.renderToken(tokens, idx, opts);
    };
}
```

## 6. 插件设计原则

### 6.1 纯渲染原则

推荐：markdown-it 插件只负责渲染，不直接依赖 Node.js 模块。

```typescript
// 好的设计：纯渲染
export function goodPlugin(md: MarkdownIt, options: Options) {
    md.renderer.rules.image = (tokens, idx, opts, env, self) => {
        // 只操作 token，不调用外部 API
        modifyToken(tokens[idx]);
        return self.renderToken(tokens, idx, opts);
    };
}

// 坏的设计：直接依赖 Node.js 模块
export function badPlugin(md: MarkdownIt) {
    const fs = require('fs');  // 在 Webview 中会报错！
    
    md.renderer.rules.image = (tokens, idx, opts, env, self) => {
        const data = fs.readFileSync('...');  // 错误！
        return self.renderToken(tokens, idx, opts);
    };
}
```

### 6.2 回调函数设计

推荐：通过回调函数与外部通信，保持插件通用性。

```typescript
// 好的设计：通过回调获取数据
export interface PluginOptions {
    getData: (key: string) => string;
    requestData: (key: string) => Promise<string>;
}

export function goodPlugin(md: MarkdownIt, options: PluginOptions) {
    // 使用 options.getData 和 options.requestData
}
```

### 6.3 错误处理

```typescript
export function robustPlugin(md: MarkdownIt, options: Options) {
    const originalRule = md.renderer.rules.image;
    
    md.renderer.rules.image = (tokens, idx, opts, env, self) => {
        try {
            // 你的逻辑
            modifyToken(tokens[idx]);
        } catch (error) {
            // 出错时返回原始渲染
            console.error('Plugin error:', error);
        }
        
        return originalRule(tokens, idx, opts, env, self);
    };
}
```

## 7. 常见问题

### Q1: 一个扩展可以注册多个 markdown-it 插件吗？

**A**: 可以，使用链式调用：

```typescript
return md
    .use(plugin1)
    .use(plugin2)
    .use(plugin3);
```

### Q2: 插件之间会有冲突吗？

**A**: 可能会有，如果多个插件修改同一个渲染规则。解决方案：
- 保存原始规则
- 在自定义逻辑后调用原始规则
- 注意插件注册顺序

### Q3: markdown-it 插件可以在 Webview 外使用吗？

**A**: 可以，markdown-it 插件是纯 JavaScript，可以在任何支持 markdown-it 的环境中使用（Node.js、浏览器等）。

### Q4: 如何在插件中调用外部 API？

**A**: 通过回调函数。插件不直接调用 API，而是通过 options 中的回调函数让调用方（Extension Host）处理。

## 8. 参考文档

- [VS Code Markdown Extension API](https://code.visualstudio.com/api/extension-guides/markdown-extension)
- [markdown-it 官方文档](https://markdown-it.github.io/)
- [DEV-002-vscode_extension_architecture.md](./DEV-002-vscode_extension_architecture.md) - 扩展架构层次详解
- [TODO-002-presigned-url-architecture.md](./TODO-002-presigned-url-architecture.md) - Presigned URL 架构分析

---

*创建日期：2026-04-08*
