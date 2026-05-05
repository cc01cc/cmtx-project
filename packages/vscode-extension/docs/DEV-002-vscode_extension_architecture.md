# VS Code 扩展架构层次详解

## 1. 核心架构概览

VS Code 扩展运行在**Extension Host**进程中，与 VS Code 主进程隔离。这种设计保证了扩展的稳定性不会影响编辑器本身。

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────────┐
│         本地机器 (Local Machine)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │      VS Code 主进程 (Electron Main Process)      │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │      原生 UI 渲染层 (Chromium)            │   │   │
│  │  │  Tree View, Status Bar, Editors...      │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↕ JSON-RPC                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  UI Extension Host (本地 Node.js 进程)          │   │
│  │  - 主题、快捷键、代码片段                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         远程机器 (Remote Machine)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Workspace Extension Host (远程 Node.js 进程)    │   │
│  │  - GitLens, Python, Debugger...                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕ JSON-RPC
```

---

## 2. 关键概念：代码运行位置 vs UI 渲染位置

### 2.1 核心区别

| 概念               | 说明                                              |
| ------------------ | ------------------------------------------------- |
| **Extension Host** | 扩展**代码执行**的地方（Node.js 进程）            |
| **VS Code 主进程** | **UI 渲染**的地方（Chromium 进程）                |
| **原生 UI**        | 由**本地 VS Code 主进程**渲染，无论扩展代码在哪里 |

### 2.2 工作流程示例

```
远程 Extension Host          本地 VS Code 主进程
        │                            │
        ├── 执行扩展代码              │
        ├── 访问远程文件系统          │
        ├── 计算数据                  │
        ├── JSON-RPC 传输 ──────────>│
        │                            ├── 渲染 Tree View
        │                            ├── 渲染 Status Bar
        │                            └── 渲染 Editor 装饰
```

**代码示例**：

```typescript
// 这段代码运行在远程 Workspace Extension Host
export function activate(context: vscode.ExtensionContext) {
    // 1. 扩展代码在远程执行
    const data = await getGitRepositories(); // 访问远程文件系统

    // 2. 通过 API 通知本地 VS Code 主进程渲染 UI
    const treeDataProvider = {
        getChildren: () => data, // 数据通过 JSON-RPC 传输到本地
    };

    // 3. UI 在本地渲染
    vscode.window.createTreeView("gitlens", { treeDataProvider });
}
```

### 2.3 关键澄清

| 问题                                   | 答案                          |
| -------------------------------------- | ----------------------------- |
| 扩展代码在哪里执行？                   | Extension Host（本地或远程）  |
| 扩展的 UI 在哪里渲染？                 | **始终**在本地 VS Code 主进程 |
| Workspace Extension 能控制本地 UI 吗？ | **能**，通过 JSON-RPC 通信    |

---

## 3. 官方术语：UI Extension vs Workspace Extension

### 3.1 extensionKind 配置

根据 [VS Code 官方文档](https://code.visualstudio.com/api/references/extension-manifest)：

```json
{
    "extensionKind": ["ui", "workspace"]
}
```

| 值            | 官方说明                  | 含义                              |
| ------------- | ------------------------- | --------------------------------- |
| `"ui"`        | Run locally               | 扩展代码运行在本地 Extension Host |
| `"workspace"` | Run on the remote machine | 扩展代码运行在远程 Extension Host |

### 3.2 ExtensionKind 枚举（VS Code API）

```typescript
enum ExtensionKind {
    UI = 1, // Extension runs where the UI runs
    Workspace = 2, // Extension runs where the remote extension host runs
}
```

**代码中使用**：

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
    const extension = vscode.extensions.getExtension("my.extension");

    if (extension.extensionKind === vscode.ExtensionKind.UI) {
        console.log("I am a UI Extension (running locally)");
    } else if (extension.extensionKind === vscode.ExtensionKind.Workspace) {
        console.log("I am a Workspace Extension (running remotely)");
    }
}
```

### 3.3 extensionKind 是偏好顺序

**重要**：`extensionKind` 数组定义的是**偏好顺序**，扩展**只会运行在一个** Extension Host。

```json
{
    "extensionKind": ["ui", "workspace"]
}
```

**含义**：

1. 优先尝试在 UI Extension Host（本地）运行
2. 如果无法运行，回退到 Workspace Extension Host（远程）
3. **最终只在一个 Extension Host 中运行**

### 3.4 两类扩展对比

| 类型                    | 代码运行位置        | 访问能力         | 典型用途                   |
| ----------------------- | ------------------- | ---------------- | -------------------------- |
| **UI Extension**        | 本地 Extension Host | 只能访问本地资源 | 主题、快捷键、代码片段     |
| **Workspace Extension** | 远程 Extension Host | 可访问工作区文件 | 语言服务、调试器、Git 操作 |

**注意**：两类扩展的 UI **都**在本地 VS Code 主进程渲染。

### 3.5 本地资源 vs 远程资源

在远程开发场景下，理解"本地资源"和"远程资源"的区别至关重要：

#### 资源分布图

```
┌─────────────────────────────────────────────────────────┐
│         本地机器 (Local Machine)                        │
│                                                         │
│  本地资源：                                              │
│  ├── 本地文件系统（~/Documents, C:\Users\...）           │
│  ├── 本地设备（摄像头、麦克风、打印机）                   │
│  ├── 本地 CLI 工具（本地安装的 git、node、python）       │
│  ├── 本地环境变量                                       │
│  ├── 本地网络服务 (localhost:3000)                       │
│  ├── 本地数据库（本地 MySQL、MongoDB）                   │
│  ├── 系统剪贴板                                         │
│  ├── 系统通知                                           │
│  └── 文件选择对话框                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│         远程机器 (Remote Machine)                       │
│                                                         │
│  远程资源：                                              │
│  ├── 远程文件系统（工作区文件）                          │
│  ├── 远程 CLI 工具（远程环境中的 git、node、python）     │
│  ├── 远程环境变量                                       │
│  ├── 远程网络服务                                       │
│  └── 远程数据库                                         │
└─────────────────────────────────────────────────────────┘
```

#### UI Extension 可直接访问的本地资源

| 资源类型           | 示例                                  | API                     |
| ------------------ | ------------------------------------- | ----------------------- |
| **本地文件**       | `fs.readFile('~/local-config.json')`  | Node.js `fs`            |
| **本地 CLI**       | `child_process.exec('git --version')` | Node.js `child_process` |
| **本地环境变量**   | `process.env.HOME`                    | Node.js `process`       |
| **本地网络**       | `fetch('http://localhost:3000')`      | Node.js `http`          |
| **系统剪贴板**     | `vscode.env.clipboard.readText()`     | VS Code API             |
| **系统通知**       | 本地系统通知                          | VS Code API             |
| **文件选择对话框** | `vscode.window.showOpenDialog()`      | VS Code API             |

#### Workspace Extension 的资源访问

| 资源类型         | 访问方式     | 说明                            |
| ---------------- | ------------ | ------------------------------- |
| **工作区文件**   | 直接访问     | `vscode.workspace.fs`           |
| **远程 CLI**     | 直接访问     | `child_process.exec` 在远程执行 |
| **远程环境变量** | 直接访问     | `process.env` 是远程环境        |
| **远程网络**     | 直接访问     | 可以访问远程网络服务            |
| **本地资源**     | 需要特殊 API | 通过 VS Code API 间接访问       |

#### Workspace Extension 访问本地资源的特殊 API

**asExternalUri：转发本地服务**

```typescript
// Workspace Extension 想访问本地 localhost:3000
const localUri = vscode.Uri.parse("http://localhost:3000");

// 使用 asExternalUri 转发
const externalUri = await vscode.env.asExternalUri(localUri);

// externalUri 可能变成类似 http://localhost:12345（端口转发）
const response = await fetch(externalUri.toString());
```

**Clipboard：访问剪贴板**

```typescript
// Workspace Extension 可以访问剪贴板（通过 VS Code API）
const text = await vscode.env.clipboard.readText();
await vscode.env.clipboard.writeText("copied text");
```

**文件选择对话框**

```typescript
// Workspace Extension 可以打开本地文件选择对话框
const files = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
});
// 用户选择的是本地文件，但 VS Code 会处理路径转换
```

#### 关键区别总结

| 场景                                | UI Extension   | Workspace Extension                         |
| ----------------------------------- | -------------- | ------------------------------------------- |
| 访问 `~/Documents/file.txt`         | ✓ 直接访问     | ✗ 不能直接访问                              |
| 访问工作区文件 `/workspace/file.md` | ✗ 不能直接访问 | ✓ 直接访问                                  |
| 执行 `git status`                   | 在本地执行     | 在远程执行                                  |
| 访问 `localhost:3000`               | 访问本地服务   | 访问远程服务（或通过 `asExternalUri` 转发） |
| 访问剪贴板                          | ✓              | ✓（通过 VS Code API）                       |
| 打开文件选择对话框                  | ✓              | ✓（通过 VS Code API）                       |

#### Workspace Extension 的功能能力

**重要澄清**：Workspace Extension **可以**做以下事情：

| 能力           | 是否支持 | 说明                             |
| -------------- | -------- | -------------------------------- |
| 注册命令       | ✓        | 完全支持                         |
| 使用快捷键     | ✓        | 通过 `keybindings` contribution  |
| 修改文档内容   | ✓        | 通过 `TextEditor.edit()`         |
| 访问编辑器     | ✓        | `vscode.window.activeTextEditor` |
| 访问工作区文件 | ✓        | 完全支持                         |
| 提供 CodeLens  | ✓        | 完全支持                         |
| 提供代码补全   | ✓        | 完全支持                         |
| 提供 Tree View | ✓        | 完全支持                         |
| 显示通知       | ✓        | 完全支持                         |

**UI Extension vs Workspace Extension 的真正区别**：

| 维度               | UI Extension        | Workspace Extension   |
| ------------------ | ------------------- | --------------------- |
| **代码运行位置**   | 本地 Extension Host | 远程 Extension Host   |
| **访问工作区文件** | ✗ 不能直接访问      | ✓ 可以直接访问        |
| **访问本地资源**   | ✓ 可以访问          | 有限（需要特殊 API）  |
| **UI 响应延迟**    | 低（本地执行）      | 稍高（JSON-RPC 通信） |
| **功能能力**       | 几乎相同            | 几乎相同              |

#### 选择标准

```
选择 UI Extension 的条件：
1. 不需要访问工作区文件
2. 需要低延迟 UI 响应
3. 需要访问本地设备（如本地数据库、本地 CLI）

选择 Workspace Extension 的条件：
1. 需要访问工作区文件
2. 需要执行文件操作
3. 需要访问远程环境（如远程 Git 仓库、远程数据库）
```

---

## 4. 原生 UI vs Webview

### 4.1 架构位置

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code 主进程                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │           原生 UI 层 (Chromium 渲染)              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │   │
│  │  │Tree View│ │Status Bar│ │Commands │ │ Editors│ │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕ JSON-RPC
┌─────────────────────────────────────────────────────────┐
│                Extension Host (Node.js)                 │
└─────────────────────────────────────────────────────────┘
                          ↕ postMessage
┌─────────────────────────────────────────────────────────┐
│              Webview 渲染进程 (Chromium)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │         自定义 HTML/CSS/JS                       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 详细对比

| 维度                 | VS Code 原生 UI          | Webview                            |
| -------------------- | ------------------------ | ---------------------------------- |
| **运行位置**         | VS Code 主进程           | 独立的 Chromium 渲染进程           |
| **技术栈**           | VS Code API (TypeScript) | HTML/CSS/JS（任意前端框架）        |
| **通信方式**         | JSON-RPC（自动）         | postMessage（手动）                |
| **UI 风格**          | VS Code 原生风格         | 完全自定义                         |
| **性能开销**         | 低                       | 高（独立进程）                     |
| **访问 VS Code API** | 直接访问                 | 通过 `acquireVsCodeApi()` 限制访问 |
| **DOM 访问**         | 无                       | 有（完整 DOM）                     |
| **调试方式**         | Extension Host 调试      | Developer Tools 调试               |

### 4.3 原生 UI 组件

| 组件               | API                                              | 说明                             |
| ------------------ | ------------------------------------------------ | -------------------------------- |
| **Tree View**      | `vscode.window.createTreeView()`                 | 展示层级数据（文件树、依赖列表） |
| **Status Bar**     | `vscode.window.createStatusBarItem()`            | 状态栏项                         |
| **Commands**       | `vscode.commands.registerCommand()`              | 命令                             |
| **Quick Pick**     | `vscode.window.showQuickPick()`                  | 快速选择器                       |
| **Notifications**  | `vscode.window.showInformationMessage()`         | 通知                             |
| **Editor Actions** | `vscode.window.createTextEditorDecorationType()` | 编辑器装饰                       |
| **CodeLens**       | `vscode.languages.registerCodeLensProvider()`    | 代码透镜                         |

### 4.4 代码对比

#### 原生 UI：Tree View

```typescript
// 使用 VS Code 原生 Tree View API
const treeDataProvider: vscode.TreeDataProvider<MyItem> = {
    getTreeItem: (item) => item,
    getChildren: (item) => {
        if (!item) {
            return [new vscode.TreeItem("Root 1"), new vscode.TreeItem("Root 2")];
        }
        return [];
    },
};

vscode.window.createTreeView("myView", { treeDataProvider });
```

**结果**：

- 自动应用 VS Code 主题
- 自动支持键盘导航
- 性能优秀

#### Webview：自定义 UI

```typescript
// 使用 Webview 创建完全自定义的 UI
const panel = vscode.window.createWebviewPanel("myWebview", "My Panel", vscode.ViewColumn.One, {
    enableScripts: true,
});

panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial; }
            .custom-tree { /* 自定义样式 */ }
        </style>
    </head>
    <body>
        <div class="custom-tree">
            <div>Root 1</div>
            <div>Root 2</div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            // 可以使用任意 JS 框架
        </script>
    </body>
    </html>
`;
```

**结果**：

- 完全自定义外观
- 需要手动处理主题适配
- 性能开销较大

### 4.5 适用场景

| 场景                | 推荐方案   | 原因                    |
| ------------------- | ---------- | ----------------------- |
| **文件树/列表展示** | Tree View  | 原生风格，性能好        |
| **状态信息显示**    | Status Bar | 轻量，不打扰用户        |
| **命令执行**        | Commands   | 标准交互模式            |
| **复杂数据可视化**  | Webview    | 完全自定义，支持图表    |
| **富文本编辑器**    | Webview    | 需要 Monaco/CodeMirror  |
| **自定义设计界面**  | Webview    | 需要完全控制 UI         |
| **预览功能**        | Webview    | Markdown 预览、图片预览 |

### 4.6 性能对比

| 操作         | 原生 UI     | Webview                  |
| ------------ | ----------- | ------------------------ |
| **创建开销** | 几乎无      | 高（启动 Chromium 进程） |
| **内存占用** | 低          | 高（独立进程）           |
| **更新频率** | 高频更新 OK | 避免高频更新             |
| **启动速度** | 快          | 慢                       |

### 4.7 容易混淆的概念：Markdown Preview 是 Webview

#### 常见误解

| 误解                                          | 正确理解                                      |
| --------------------------------------------- | --------------------------------------------- |
| "Markdown Preview 是原生 UI"                  | **错误**，Markdown Preview 是 Webview         |
| "markdown-it 在 Extension Host 运行"          | **错误**，markdown-it 在 Webview 渲染进程运行 |
| "拦截 markdown-it 渲染是 UI Extension 的功能" | **错误**，这是 Webview 的功能                 |

#### 官方文档确认

根据 [Markdown Extension - VS Code API](https://code.visualstudio.com/api/extension-guides/markdown-extension)：

> "VS Code uses the [markdown-it](https://github.com/markdown-it/markdown-it) library for Markdown rendering. Extensions can provide [markdown-it plugins](https://github.com/markdown-it/markdown-it#plugin) to add custom syntax support or modify the rendering output."

**关键点**：

- Markdown Preview 使用 **markdown-it** 库进行渲染
- 扩展可以提供 **markdown-it plugins** 修改渲染输出
- 这些插件在 **Webview 渲染进程**中执行

#### 架构对比

**原生 UI 层**：

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code 主进程                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Tree View │  │  Status Bar │  │   Text Editor   │ │
│  │  (原生组件)  │  │  (原生组件)  │  │   (原生组件)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Markdown Preview (Webview)**：

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code 主进程                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Webview 渲染进程                         │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  Markdown Preview                       │   │   │
│  │  │  - 加载 markdown-it                     │   │   │
│  │  │  - 自定义 HTML/CSS/JS                   │   │   │
│  │  │  - 独立进程                             │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 特性对比

| 特性               | 原生 UI          | Webview            | Markdown Preview    |
| ------------------ | ---------------- | ------------------ | ------------------- |
| **渲染技术**       | VS Code 原生组件 | 自定义 HTML/CSS/JS | 自定义 HTML/CSS/JS  |
| **运行进程**       | VS Code 主进程   | 独立渲染进程       | 独立渲染进程        |
| **通信方式**       | 直接 API 调用    | postMessage        | postMessage         |
| **可扩展性**       | 有限             | 完全自定义         | 完全自定义          |
| **markdown-it**    | ❌ 不支持        | ✅ 支持            | ✅ 使用 markdown-it |
| **自定义渲染规则** | ❌ 不支持        | ✅ 支持            | ✅ 支持             |

#### 成熟扩展参考

**1. Markdown Preview Mermaid Support**

仓库：[bierner/markdown-preview-mermaid](https://github.com/bierner/markdown-preview-mermaid)

架构：

```
Extension Host (Workspace)
    │
    └── 提供 Mermaid 渲染脚本
            │
            └── postMessage ──> Webview (Markdown Preview)
                    │
                    └── 执行 Mermaid 渲染
```

**2. Markdown Preview Enhanced**

仓库：[shd101wyy/vscode-markdown-preview-enhanced](https://github.com/shd101wyy/vscode-markdown-preview-enhanced)

架构：

```
Extension Host
    │
    ├── 提供自定义渲染逻辑
    ├── 处理文件操作
    └── 调用外部 API
            │
            └── postMessage ──> Webview
                    │
                    └── 渲染 Markdown
                    └── 调用 Extension Host 获取数据
```

#### 实际应用：Presigned URL 场景

**问题**：需要在不修改 Markdown 文件的情况下，渲染需要权限的图片 URL。

**架构设计**：

```
┌─────────────────────────────────────────────────────────┐
│         Windows 本地机器                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  VS Code 主进程                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  Markdown Preview (Webview)             │   │   │
│  │  │  - markdown-it 渲染                      │   │   │
│  │  │  - 拦截图片 URL                          │   │   │
│  │  │  - postMessage 请求数据                  │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕ postMessage
┌─────────────────────────────────────────────────────────┐
│         DevContainer                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Extension Host (Workspace)                     │   │
│  │  - 调用 ali-oss/tencent SDK                     │   │
│  │  - 生成 presigned URL                           │   │
│  │  - 返回给 Webview                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**数据流**：

```
用户打开 Markdown 预览
    │
    ▼
Webview (Markdown Preview)
    │
    ├── 渲染 Markdown
    │
    ├── 遇到图片 URL
    │       │
    │       └── postMessage ──> Extension Host
    │                               │
    │                               ├── 检查是否是私有 bucket
    │                               ├── 调用 ali-oss/tencent SDK
    │                               └── 返回 presigned URL
    │
    └── 替换 URL 并显示
```

**代码示例**：

```typescript
// Extension Host (Workspace)
export function activate(context: vscode.ExtensionContext) {
    // 注册 markdown-it 插件
    return {
        extendMarkdownIt(md: MarkdownIt) {
            // 这个插件在 Webview 中执行
            return md.use((md) => {
                // 拦截图片渲染
                const originalRender = md.renderer.rules.image;
                md.renderer.rules.image = (tokens, idx, options, env, self) => {
                    const token = tokens[idx];
                    const srcIndex = token.attrIndex("src");
                    const src = token.attrs[srcIndex][1];

                    // 通过 postMessage 请求 Extension Host 生成 presigned URL
                    const newSrc = getPresignedUrl(src);
                    token.attrs[srcIndex][1] = newSrc;

                    return originalRender(tokens, idx, options, env, self);
                };
            });
        },
    };
}
```

**关键点**：

- `extendMarkdownIt` 返回的函数在 **Webview** 中执行
- 但可以通过 `postMessage` 与 **Extension Host** 通信
- Extension Host 调用云存储 SDK 生成 presigned URL

#### 总结

| 问题                            | 答案                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| Markdown Preview 是原生 UI 吗？ | **不是**，是 Webview                                        |
| markdown-it 在哪里运行？        | **Webview 渲染进程**                                        |
| 可以与 Extension Host 通信吗？  | **可以**，通过 postMessage                                  |
| 官方有类似实现吗？              | **有**，Markdown 内置预览功能                               |
| 有成熟扩展参考吗？              | **有**，markdown-preview-mermaid、markdown-preview-enhanced |

---

## 5. Webview 通信机制

### 5.1 Extension Host → Webview

```typescript
// Extension Host 向 Webview 发送消息
panel.webview.postMessage({
    command: "update",
    data: value,
});
```

### 5.2 Webview → Extension Host

```typescript
// 在 Webview HTML 中
const vscode = acquireVsCodeApi();
vscode.postMessage({
    command: "save",
    text: editor.value,
});
```

### 5.3 接收消息

```typescript
// Extension Host 接收消息
panel.webview.onDidReceiveMessage((message) => {
    if (message.command === "save") {
        // 处理保存逻辑
    }
});
```

---

## 6. 常见误解澄清

### 6.1 "扩展同时运行在 UI 和 Workspace Extension Host"

**错误**：一个扩展实例只能运行在一个 Extension Host。

**正确理解**：

- `extensionKind` 定义的是**偏好顺序**
- 扩展最终**只会运行在一个** Extension Host
- UI 渲染**始终**在本地 VS Code 主进程

### 6.2 "Workspace Extension 不能控制本地 UI"

**错误**：Workspace Extension 可以控制本地 UI。

**正确理解**：

- 扩展代码在远程执行
- 通过 JSON-RPC 将数据和指令传输到本地
- UI 在本地 VS Code 主进程渲染

### 6.3 "GitLens 同时运行在两端"

**错误**：GitLens 只运行在一个 Extension Host。

**正确理解**：

- GitLens 没有设置 `extensionKind`，使用默认值（Workspace Extension）
- 代码在 Workspace Extension Host 执行
- 使用 Webview 实现复杂 UI（如 Commit Graph）
- 通过 `postMessage` 在 Extension Host 和 Webview 之间通信

---

## 7. CMTX 扩展架构分析

### 7.1 当前组件分布

| 组件                               | 类型           | 说明            |
| ---------------------------------- | -------------- | --------------- |
| Commands (`upload`, `download` 等) | Extension Host | 核心功能入口    |
| Status Bar                         | 原生 UI        | 显示配置状态    |
| Code Action Provider               | Extension Host | 图片代码操作    |
| Markdown Preview Provider          | Webview        | 预签名 URL 预览 |

### 7.2 架构评估

**优点**：

- 主要使用轻量级组件（Commands、Status Bar）
- Webview 仅用于必要的自定义渲染（Markdown 预览）
- 符合官方性能建议

**可选优化**：

- 考虑添加 Tree View 展示图片资源列表
- 可在 Sidebar 中显示文档图片概览

### 7.3 图片上传入口对比

系统共有 5 个上传入口，按触发方式分为**编辑器文本级**和**文件级**两类：

#### 7.3.1 入口总览

| # | 入口 | 触发方式 | 处理范围 | 实现路径 | 如何获取编辑器引用 | 支持未保存编辑器？ |
|---|------|----------|----------|---------|-------------------|-------------------|
| 1 | `cmtx.image.upload` | 编辑器右键 → CMTX 子菜单 / `Ctrl+Shift+P` | **选区**内图片 | editor text → rule → `engine.executeRule("upload-images", { selection })` → `editor.edit()` | `vscode.window.activeTextEditor` — 直接返回当前编辑器 | **是** — 读 editor.document.getText()，写 editor.edit() |
| 2 | `cmtx.rule.upload-images` | `Ctrl+Shift+P` | 整个**编辑器文档** | editor text → rule → `engine.executeRule("upload-images")` → `editor.edit()` | `vscode.window.activeTextEditor` — 同上 | **是** — 同上 |
| 3 | `cmtx.explorer.uploadFile` | Explorer 右键 `.md` 文件 | 整个**文件** | `FileAccessor` → `publishAndReplaceFile` → rule → `FileAccessor.writeText` | `vscode.workspace.textDocuments.find(d => d.uri.fsPath === path)` — 遍历已打开的文档 | **是** — VSCodeFileAccessor 探知文件是否已打开 |
| 4 | `cmtx.explorer.uploadDirectory` | Explorer 右键目录 | 目录内所有 md | `FileAccessor` → `publishAndReplaceDirectory` → rule → 批量写回 | 同上，逐文件探知 | **是** — 同上 |
| 5 | `cmtx upload` (CLI) | 命令行 | 单个 md 文件 | `fs.readFile` → `publishAndReplaceFile` → `fs.writeFile` | 无，CLI 无 VSCode API | **不适用** |

#### 7.3.2 两类获取编辑器引用的方式

**入口 1/2（编辑器文本级）**:

依赖 `vscode.window.activeTextEditor` —— 直接获取当前活动编辑器。如果用户没有打开 Markdown 编辑器，命令直接报错退出。

```typescript
// executeRuleCommand -> validateMarkdownEditor
const editor = vscode.window.activeTextEditor;
if (!editor || editor.document.languageId !== "markdown") {
    showError("Please open a Markdown file first");
    return;
}
// 确定知道"当前正在编辑哪个文件"
const context = {
    document: editor.document.getText(),    // 包含未保存修改
    filePath: editor.document.uri.fsPath,
};
```

**入口 3/4（文件级）**:

收到的是 `vscode.Uri`（Explorer 右键传入的文件路径），文件可能没打开。通过遍历 `vscode.workspace.textDocuments` 来**探知**该文件是否已打开。

```typescript
// VSCodeFileAccessor.readText
const doc = vscode.workspace.textDocuments
    .find(d => d.uri.fsPath === path);
if (doc) {
    return doc.getText();         // 编辑器内存版本，包含未保存修改
}
return fs.readFile(path, "utf-8"); // 磁盘版本
```

写回同理：

```typescript
// VSCodeFileAccessor.writeText
const doc = vscode.workspace.textDocuments
    .find(d => d.uri.fsPath === path);
if (doc) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(doc.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);  // 通过 VSCode 编辑引擎
    return;
}
await fs.writeFile(path, content, "utf-8");
```

#### 7.3.3 FileAccessor 策略模式

`FileAccessor` 是库包层（`@cmtx/asset`, `@cmtx/rule-engine`）定义的接口，将"未保存编辑器"的处理与库包逻辑解耦：

```typescript
interface FileAccessor {
    readText(path: string): Promise<string>;
    writeText(path: string, content: string): Promise<void>;
}
```

| 环境 | 实现类 | readText | writeText |
|------|--------|----------|-----------|
| VSCode | `VSCodeFileAccessor` | 编辑器打开 → `doc.getText()` : `fs.readFile` | 编辑器打开 → `WorkspaceEdit.apply` : `fs.writeFile` |
| CLI | `FsFileAccessor` | `fs.readFile` | `fs.writeFile` |

入口 1/2 不经过 `FileAccessor`，它们在 VSCode 应用层直接用 VSCode API。入口 3/4/5 通过 `publishAndReplaceFile` 调用库包，库包函数只认 `FileAccessor` 接口。

#### 7.3.4 统一的上传路径

所有入口最终都收敛于 `batchUploadImages`：

```
入口 1/2 → executeRuleCommand → engine.executeRule("upload-images") → assetService.uploadImagesInDocument → batchUploadImages(sources) → uploadSingleImage
入口 3/4 → publishAndReplaceFile → engine.executeRule("upload-images") → 同上                                      → 同上
入口 5   → publishAndReplaceFile → engine.executeRule("upload-images") → 同上                                      → 同上
```

区别仅在于：1/2 在 VSCode 应用层处理文件 I/O，3/4/5 通过 `publishAndReplaceFile` 和注入的 `FileAccessor` 处理。

```json
{
    "extensionKind": ["workspace"]
}
```

**原因**：

- CMTX 需要访问工作区文件（Markdown 文件、图片）
- 需要执行文件操作（上传、下载）
- 符合 Workspace Extension 的典型用途

---

## 8. 最佳实践

### 8.1 选择扩展类型

| 需求               | 推荐 extensionKind                             |
| ------------------ | ---------------------------------------------- |
| 需要访问工作区文件 | `["workspace"]`                                |
| 只需要本地资源     | `["ui"]`                                       |
| 两者都可以         | `["workspace", "ui"]` 或 `["ui", "workspace"]` |

### 8.2 选择 UI 技术

| 原则                     | 说明                       |
| ------------------------ | -------------------------- |
| **优先使用原生 UI**      | 性能好，风格统一，用户熟悉 |
| **必要时才使用 Webview** | 需要完全自定义 UI 时       |

## 9. WSL2 / DevContainer 环境下的扩展开发

### 9.1 架构适用性

WSL2 和 DevContainer 都是**远程开发场景**，之前的架构说明完全适用：

| 场景                  | 远程类型          | Extension Host 位置           |
| --------------------- | ----------------- | ----------------------------- |
| **本地 Windows 开发** | 无远程            | 本地 Extension Host           |
| **WSL2 开发**         | Remote-WSL        | WSL2 中的 Extension Host      |
| **DevContainer 开发** | Remote-Containers | 容器中的 Extension Host       |
| **Remote-SSH 开发**   | Remote-SSH        | 远程服务器中的 Extension Host |

### 9.2 DevContainer 架构图

```
┌─────────────────────────────────────────────────────────┐
│         Windows 本地机器                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │      VS Code 主进程 (Windows UI)                │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │      原生 UI 渲染层 (Chromium)            │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↕ JSON-RPC                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  UI Extension Host (Windows Node.js 进程)       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕ 网络连接
┌─────────────────────────────────────────────────────────┐
│         DevContainer (Docker Container)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /vscode/vscode-server/                         │   │
│  │  ├── bin/              # VS Code Server 二进制   │   │
│  │  └── extensionsCache/  # 扩展缓存               │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↕                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Workspace Extension Host (容器内 Node.js)       │   │
│  │  - 你的扩展代码                                  │   │
│  │  - 访问容器文件系统                              │   │
│  │  - 执行容器内命令                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  /workspace/         # 项目目录（挂载）                 │
│  /home/              # 容器用户主目录                   │
│  /usr/               # 系统程序                         │
└─────────────────────────────────────────────────────────┘
```

### 9.3 VS Code Server 的安装位置

#### 官方文档确认的内容

根据 [Dev Containers FAQ](https://code.visualstudio.com/docs/devcontainers/faq#_what-are-the-connectivity-requirements-for-the-vs-code-server-when-it-is-running-in-a-container)：

> "VS Code Server runs on a random port inside the container and VS Code itself uses `docker exec` to communicate with it over Docker's configured communication channel."

> "The Dev Containers extensions will download VS Code Server locally and copy it to the container once connected."

**官方文档确认**：

- VS Code Server 运行在容器内部
- VS Code 通过 `docker exec` 与容器内的 VS Code Server 通信
- Dev Containers 扩展会下载 VS Code Server 并复制到容器

#### 实际观察的安装路径

| 远程类型         | VS Code Server 位置      | 来源                   |
| ---------------- | ------------------------ | ---------------------- |
| **WSL2**         | `~/.vscode-server/`      | 官方文档               |
| **DevContainer** | `/vscode/vscode-server/` | 实际观察（非官方文档） |
| **Remote-SSH**   | `~/.vscode-server/`      | 官方文档               |

**注意**：`/vscode/vscode-server/` 路径基于实际容器环境观察，官方文档未明确记录此路径。

**为什么 DevContainer 可能使用不同路径？**

- 避免与容器内用户主目录冲突
- 便于管理和清理
- 容器环境下的专用设计

### 9.4 Windows 本地 vs WSL2/DevContainer 开发差异

| 维度             | Windows 本地开发    | WSL2/DevContainer 开发 |
| ---------------- | ------------------- | ---------------------- |
| **扩展运行位置** | 本地 Extension Host | 远程 Extension Host    |
| **文件系统**     | Windows 文件系统    | Linux 文件系统         |
| **路径格式**     | `C:\Users\...`      | `/home/user/...`       |
| **换行符**       | CRLF                | LF                     |
| **CLI 工具**     | Windows 工具        | Linux 工具             |
| **环境变量**     | Windows 环境变量    | Linux 环境变量         |
| **文件权限**     | Windows ACL         | Linux chmod/chown      |
| **符号链接**     | Windows 快捷方式    | Linux 符号链接         |
| **文件监听**     | Windows API         | inotify                |
| **性能**         | 直接访问            | 通过 VS Code Server    |

### 9.4 具体差异与解决方案

#### 文件路径差异

```typescript
// Windows 本地开发
const configPath = "C:\\Users\\username\\.cmtxrc";

// WSL2/DevContainer 开发
const configPath = "/home/username/.cmtxrc";

// 推荐：跨平台方式
import * as path from "path";
import * as os from "os";
const configPath = path.join(os.homedir(), ".cmtxrc");
```

#### 文件系统访问差异

```typescript
// Windows 本地开发 - 可以使用 Node.js fs
import * as fs from "fs";
const content = fs.readFileSync("C:\\path\\to\\file", "utf-8");

// WSL2/DevContainer 开发 - 推荐使用 vscode.workspace.fs
const uri = vscode.Uri.file("/path/to/file");
const content = await vscode.workspace.fs.readFile(uri);
```

**注意**：

- Workspace Extension 在 WSL2/DevContainer 中运行时，`fs` 访问的是 Linux 文件系统
- 使用 `vscode.workspace.fs` 更通用，支持虚拟文件系统

#### CLI 工具执行差异

```typescript
import { exec } from "child_process";

// Windows 本地开发
exec("where git", (err, stdout) => {
    console.log(stdout); // C:\Program Files\Git\cmd\git.exe
});

// WSL2/DevContainer 开发
exec("which git", (err, stdout) => {
    console.log(stdout); // /usr/bin/git
});

// 推荐：使用跨平台命令
exec("git --version", (err, stdout) => {
    console.log(stdout); // git version 2.x.x
});
```

#### 环境变量差异

```typescript
// Windows 本地开发
const home = process.env.USERPROFILE; // C:\Users\username

// WSL2/DevContainer 开发
const home = process.env.HOME; // /home/username

// 推荐：使用跨平台 API
const home = os.homedir(); // 自动适配
```

#### 换行符差异

```typescript
// 问题：Windows 使用 CRLF，Linux 使用 LF
const content = "line1\r\nline2"; // Windows
const content = "line1\nline2"; // Linux

// 解决方案：统一使用 LF
const content = "line1\nline2";
```

### 9.5 extensionKind 配置建议

```json
// 如果扩展需要访问工作区文件（WSL2/DevContainer 中的文件）
{
  "extensionKind": ["workspace"]
}

// 如果扩展只需要访问 Windows 本地资源
{
  "extensionKind": ["ui"]
}

// 如果两者都可以
{
  "extensionKind": ["workspace", "ui"]
}
```

### 9.6 CMTX 的配置

```json
{
    "extensionKind": ["workspace"]
}
```

**原因**：

- CMTX 需要访问工作区中的 Markdown 文件和图片
- 在 WSL2/DevContainer 环境中，这些文件在 Linux 文件系统中
- 扩展代码需要在 WSL2/DevContainer 中执行

### 9.7 最佳实践

| 建议                         | 说明                                               |
| ---------------------------- | -------------------------------------------------- |
| **使用 VS Code API**         | `vscode.Uri`, `vscode.workspace.fs` 自动处理跨平台 |
| **使用 Node.js 跨平台 API**  | `os.homedir()`, `path.join()`                      |
| **避免硬编码路径**           | 使用相对路径或配置                                 |
| **统一换行符**               | 使用 LF                                            |
| **测试多环境**               | 在 CI/CD 中测试 Windows 和 Linux                   |
| **设置正确的 extensionKind** | 根据资源访问需求配置                               |

---

## 10. F5 调试扩展的架构

### 10.1 Extension Development Host 概念

按 F5 启动调试时，VS Code 会创建一个新的 VS Code 窗口，称为 **Extension Development Host**。这个窗口会加载正在开发的扩展。

### 10.2 DevContainer 环境下的 F5 调试架构

```
┌─────────────────────────────────────────────────────────┐
│         Windows 本地机器                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  VS Code 窗口 1 (Host VS Code)                  │   │
│  │  └── UI 渲染层                                   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  VS Code 窗口 2 (Extension Development Host)     │   │
│  │  └── UI 渲染层                                   │   │
│  │  └── 调试器连接 (inspect-brk 端口)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↕ 网络连接
┌─────────────────────────────────────────────────────────┐
│         DevContainer (Docker Container)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  VS Code Server (共用)                           │   │
│  │  - 只有一个实例                                  │   │
│  │  - 所有 VS Code 窗口共用                        │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↕                                │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  Extension Host 1    │  │  Extension Host 2    │    │
│  │  (原 VS Code)        │  │  (Development Host)  │    │
│  │  - 已安装的扩展      │  │  - 正在开发的扩展    │    │
│  │                      │  │  - --inspect-brk     │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 10.3 实际进程验证

通过 `ps aux | grep extensionHost` 可以观察到：

| 进程类型             | PID    | 启动时间 | 说明                       |
| -------------------- | ------ | -------- | -------------------------- |
| **VS Code Server**   | 248    | Apr07    | 共用服务器（只有一个）     |
| **Extension Host 1** | 657    | Apr07    | 原 VS Code 的扩展宿主      |
| **Extension Host 2** | 386911 | 05:54    | F5 启动的 Development Host |

**Extension Host 2 的特殊参数**：

- `--inspect-brk=53273` - 调试端口，用于 attach 调试器
- 这是 Extension Development Host 特有的参数

### 10.4 关键特性

| 特性               | 说明                                                        |
| ------------------ | ----------------------------------------------------------- |
| **UI 渲染**        | 每个 VS Code 窗口在 Windows 本地有独立的 UI 渲染            |
| **VS Code Server** | 同一个 DevContainer 中的所有 VS Code 窗口共用同一个 Server  |
| **Extension Host** | 每个 VS Code 窗口有独立的 Extension Host 进程               |
| **调试支持**       | Development Host 通过 `--inspect-brk` 参数支持调试器 attach |

### 10.5 设计优势

| 优势         | 说明                                                       |
| ------------ | ---------------------------------------------------------- |
| **资源效率** | 共用 Server，减少内存和 CPU 占用                           |
| **隔离性**   | 独立 Extension Host，Development Host 崩溃不影响原 VS Code |
| **调试便利** | 可以在开发环境中直接调试扩展代码                           |
| **实时测试** | 修改代码后重新 F5 即可测试，无需重新安装扩展               |

### 10.6 与本地开发模式的对比

| 维度                    | 本地开发 (无 DevContainer) | DevContainer 开发   |
| ----------------------- | -------------------------- | ------------------- |
| **Host VS Code UI**     | Windows 本地               | Windows 本地        |
| **Dev Host UI**         | Windows 本地               | Windows 本地        |
| **VS Code Server**      | 无（本地模式不需要）       | DevContainer 中共用 |
| **Host Extension Host** | Windows 本地               | DevContainer        |
| **Dev Extension Host**  | Windows 本地               | DevContainer        |

---

## 11. 参考链接

- [VS Code Extension API - Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [VS Code Extension API - extensionKind](https://code.visualstudio.com/api/references/extension-manifest)
- [VS Code Extension API - ExtensionKind Enum](https://code.visualstudio.com/api/references/vscode-api)
- [VS Code Extension API - Webview](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code Extension API - Tree View](https://code.visualstudio.com/api/extension-guides/tree-view)
- [VS Code UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/overview)
- [VS Code Remote Development](https://code.visualstudio.com/api/advanced-topics/remote-extensions)
- [VS Code Dev Containers FAQ](https://code.visualstudio.com/docs/devcontainers/faq)
- [VS Code Server Documentation](https://code.visualstudio.com/docs/remote/vscode-server)
